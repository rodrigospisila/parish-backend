import { Writable } from 'stream';
import * as zlib from 'zlib';

/**
 * Escritor de ZIP em STREAM (sem montar o arquivo em memória e sem
 * dependência nova): cada entrada é comprimida (deflate) enquanto é escrita
 * na resposta, com "data descriptor" (bit 3) — CRC e tamanhos vão depois dos
 * dados — e nomes em UTF-8 (bit 11). Sem ZIP64: cada arquivo e o total ficam
 * abaixo de 4 GB (a exportação de uma paróquia fica na casa dos MB).
 */

const crcTable: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 incremental (zlib.crc32 quando o Node tiver; senão, tabela). */
export function crc32(data: Buffer, previous = 0): number {
  const native = (zlib as unknown as { crc32?: (d: Buffer, v?: number) => number }).crc32;
  if (typeof native === 'function') return native(data, previous) >>> 0;
  let crc = (previous ^ 0xffffffff) >>> 0;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Data/hora no formato MS-DOS, no fuso de Brasília (-03). */
function dosDateTime(date: Date): { time: number; date: number } {
  const local = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const year = Math.max(1980, local.getUTCFullYear());
  return {
    time: (local.getUTCHours() << 11) | (local.getUTCMinutes() << 5) | Math.floor(local.getUTCSeconds() / 2),
    date: ((year - 1980) << 9) | ((local.getUTCMonth() + 1) << 5) | local.getUTCDate(),
  };
}

interface CentralEntry {
  name: Buffer;
  crc: number;
  compressed: number;
  size: number;
  offset: number;
  time: number;
  date: number;
}

const FLAGS = 0x0008 | 0x0800; // data descriptor + nome em UTF-8
const METHOD_DEFLATE = 8;

export class ZipStreamWriter {
  private offset = 0;
  private readonly entries: CentralEntry[] = [];
  private closed = false;

  constructor(
    private readonly out: Writable,
    private readonly now: Date = new Date(),
  ) {
    const markClosed = () => (this.closed = true);
    out.once('close', markClosed);
    out.once('error', markClosed);
  }

  /** O destino fechou antes da hora (cliente desistiu do download). */
  get aborted(): boolean {
    return this.closed || this.out.destroyed;
  }

  private async raw(buffer: Buffer) {
    if (this.aborted) throw new Error('Download interrompido');
    this.offset += buffer.length;
    if (!this.out.write(buffer)) await this.drain();
  }

  private drain(): Promise<void> {
    if (this.aborted) return Promise.reject(new Error('Download interrompido'));
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.out.off('drain', onDrain);
        this.out.off('close', onClose);
        this.out.off('error', onClose);
      };
      const onDrain = () => {
        cleanup();
        resolve();
      };
      const onClose = () => {
        cleanup();
        reject(new Error('Download interrompido'));
      };
      this.out.on('drain', onDrain);
      this.out.on('close', onClose);
      this.out.on('error', onClose);
    });
  }

  /**
   * Acrescenta um arquivo. `produce` recebe `write(texto|Buffer)` e escreve o
   * conteúdo aos poucos (respeitando a contrapressão da resposta).
   */
  async addFile(name: string, produce: (write: (chunk: string | Buffer) => Promise<void>) => Promise<void>) {
    const nameBuffer = Buffer.from(name, 'utf8');
    const { time, date } = dosDateTime(this.now);
    const entry: CentralEntry = { name: nameBuffer, crc: 0, compressed: 0, size: 0, offset: this.offset, time, date };

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4); // versão necessária
    header.writeUInt16LE(FLAGS, 6);
    header.writeUInt16LE(METHOD_DEFLATE, 8);
    header.writeUInt16LE(time, 10);
    header.writeUInt16LE(date, 12);
    // CRC e tamanhos (14..25) ficam zerados: vêm no data descriptor
    header.writeUInt16LE(nameBuffer.length, 26);
    header.writeUInt16LE(0, 28);
    await this.raw(Buffer.concat([header, nameBuffer]));

    const deflate = zlib.createDeflateRaw({ level: 6 });
    const pending: Buffer[] = [];
    deflate.on('data', (chunk: Buffer) => pending.push(chunk));
    const flushPending = async () => {
      while (pending.length) {
        const chunk = pending.shift()!;
        entry.compressed += chunk.length;
        await this.raw(chunk);
      }
    };
    const ended = new Promise<void>((resolve, reject) => {
      deflate.once('end', resolve);
      deflate.once('error', reject);
    });

    const write = async (chunk: string | Buffer) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
      if (!buffer.length) return;
      entry.crc = crc32(buffer, entry.crc);
      entry.size += buffer.length;
      if (!deflate.write(buffer)) await new Promise<void>((resolve) => deflate.once('drain', () => resolve()));
      await flushPending();
    };

    try {
      await produce(write);
      deflate.end();
      await ended;
      await flushPending();
    } catch (error) {
      deflate.destroy();
      throw error;
    }

    const descriptor = Buffer.alloc(16);
    descriptor.writeUInt32LE(0x08074b50, 0);
    descriptor.writeUInt32LE(entry.crc >>> 0, 4);
    descriptor.writeUInt32LE(entry.compressed, 8);
    descriptor.writeUInt32LE(entry.size, 12);
    await this.raw(descriptor);
    this.entries.push(entry);
  }

  /** Diretório central + fim do arquivo. Não fecha o destino. */
  async finish() {
    const start = this.offset;
    for (const entry of this.entries) {
      const header = Buffer.alloc(46);
      header.writeUInt32LE(0x02014b50, 0);
      header.writeUInt16LE(20, 4); // versão de quem criou
      header.writeUInt16LE(20, 6); // versão necessária
      header.writeUInt16LE(FLAGS, 8);
      header.writeUInt16LE(METHOD_DEFLATE, 10);
      header.writeUInt16LE(entry.time, 12);
      header.writeUInt16LE(entry.date, 14);
      header.writeUInt32LE(entry.crc >>> 0, 16);
      header.writeUInt32LE(entry.compressed, 20);
      header.writeUInt32LE(entry.size, 24);
      header.writeUInt16LE(entry.name.length, 28);
      // extra (30), comentário (32), disco (34), atributos (36, 38) = 0
      header.writeUInt32LE(entry.offset, 42);
      await this.raw(Buffer.concat([header, entry.name]));
    }
    const size = this.offset - start;
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(this.entries.length, 8);
    end.writeUInt16LE(this.entries.length, 10);
    end.writeUInt32LE(size, 12);
    end.writeUInt32LE(start, 16);
    await this.raw(end);
  }
}
