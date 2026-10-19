import type { LoggerService, LogLevel } from '@nestjs/common';
import { currentRequestId } from './request-context';

/**
 * Logs estruturados (eng-qualidade-15, contrato C6). Com `LOG_FORMAT=json` o
 * main.ts troca o logger do Nest por este: uma linha JSON por evento, com
 * `time`, `level`, `context`, `message` e `requestId` (quando há requisição em
 * andamento) — o Railway/qualquer coletor filtra por campo. Sem LOG_FORMAT,
 * nada muda (o ConsoleLogger padrão do Nest continua).
 *
 * Mensagem em objeto (logger.log({ ... })) entra nos campos da linha; os
 * campos reservados (time, level, context, requestId) não são sobrescritos.
 */
export const isJsonLogFormat = (env: NodeJS.ProcessEnv = process.env): boolean =>
  (env.LOG_FORMAT ?? '').trim().toLowerCase() === 'json';

type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'verbose';

export interface JsonLogLine {
  time: string;
  level: Level;
  context?: string;
  message: string;
  requestId?: string;
  stack?: string;
  [key: string]: unknown;
}

/** Monta a linha (pura, para os testes). */
export function formatJsonLog(
  level: Level,
  message: unknown,
  context?: string,
  extra: { stack?: string; requestId?: string; now?: Date } = {},
): JsonLogLine {
  const line: JsonLogLine = {
    time: (extra.now ?? new Date()).toISOString(),
    level,
    message: '',
  };
  if (context) line.context = context;
  if (message instanceof Error) {
    line.message = message.message;
    line.stack = message.stack;
  } else if (message && typeof message === 'object') {
    const { message: inner, ...fields } = message as Record<string, unknown>;
    for (const [key, value] of Object.entries(fields)) {
      if (!['time', 'level', 'context', 'requestId'].includes(key)) line[key] = value;
    }
    line.message = typeof inner === 'string' ? inner : '';
  } else {
    line.message = String(message);
  }
  const requestId = extra.requestId ?? currentRequestId();
  if (requestId) line.requestId = requestId;
  if (extra.stack) line.stack = extra.stack;
  return line;
}

function safeStringify(line: JsonLogLine): string {
  try {
    return JSON.stringify(line);
  } catch {
    // Objeto circular na mensagem: guarda só o texto
    return JSON.stringify({ time: line.time, level: line.level, context: line.context, message: line.message, requestId: line.requestId });
  }
}

/**
 * Separa o contexto (último parâmetro string, como o Logger do Nest manda) e,
 * no error, o stack (penúltimo).
 */
function splitParams(params: unknown[]): { context?: string; rest: unknown[] } {
  if (params.length && typeof params[params.length - 1] === 'string') {
    return { context: params[params.length - 1] as string, rest: params.slice(0, -1) };
  }
  return { rest: params };
}

export class JsonLogger implements LoggerService {
  private levels: Set<LogLevel> | null = null;

  constructor(private readonly write: (line: string, level: Level) => void = defaultWrite) {}

  setLogLevels(levels: LogLevel[]) {
    this.levels = new Set(levels);
  }

  private emit(level: Level, nestLevel: LogLevel, message: unknown, params: unknown[], isError = false) {
    if (this.levels && !this.levels.has(nestLevel)) return;
    const { context, rest } = splitParams(params);
    const stack = isError && typeof rest[0] === 'string' ? (rest[0] as string) : undefined;
    this.write(safeStringify(formatJsonLog(level, message, context, { stack })), level);
  }

  log(message: unknown, ...params: unknown[]) {
    this.emit('info', 'log', message, params);
  }

  error(message: unknown, ...params: unknown[]) {
    this.emit('error', 'error', message, params, true);
  }

  warn(message: unknown, ...params: unknown[]) {
    this.emit('warn', 'warn', message, params);
  }

  debug(message: unknown, ...params: unknown[]) {
    this.emit('debug', 'debug', message, params);
  }

  verbose(message: unknown, ...params: unknown[]) {
    this.emit('verbose', 'verbose', message, params);
  }

  fatal(message: unknown, ...params: unknown[]) {
    this.emit('fatal', 'fatal', message, params, true);
  }
}

function defaultWrite(line: string, level: Level) {
  if (level === 'error' || level === 'fatal') process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}
