#!/usr/bin/env bash
# Backup lógico do Postgres (achado eng-qualidade-09): pg_dump em formato custom
# (-Fc, comprimido, permite restore seletivo), conferido com pg_restore --list.
# Só LÊ o banco de origem (pg_dump e a contagem rodam em transação read-only).
#
# Uso (no Git Bash ou Linux, a partir de qualquer pasta):
#   scripts/backup-prod.sh --env-file <arquivo .env> [opções]
#
#   --env-file <arq>       .env de onde ler DATABASE_PUBLIC_URL (ou DATABASE_URL,
#                          se não for o host interno *.railway.internal).
#                          O arquivo é LIDO, nunca executado. Obrigatório.
#   --out-dir <pasta>      onde gravar (padrão: $HOME/parish-backups). Recusa
#                          pasta dentro de um repositório git — o dump é dado
#                          pessoal (LGPD) e não pode ir parar num commit.
#   --label <nome>         prefixo do arquivo (padrão: nome do banco)
#   --gpg-recipient <id>   cifra o dump com a chave pública GPG <id> (e-mail ou
#                          fingerprint) e apaga a cópia em claro
#
# Saída (mesma pasta):
#   parish_<label>_<AAAAMMDD_HHMMSS>.dump[.gpg]   o backup
#   ...dump.sha256                               hash para conferir a cópia
#   ...dump.counts.tsv                           linhas por tabela logo após o
#                                                dump (o restore-drill compara)
#
# Ferramentas: pg_dump do PATH ou, sem ele, via Docker — ver scripts/backup-lib.sh.
# O pg_dump precisa ser da mesma versão principal do servidor ou mais novo; o
# script confere antes e sugere PG_CLIENT_IMAGE=postgres:<versão>-alpine.
#
# Exemplo (produção — só o Rodrigo/coordenador, com o .env da produção):
#   scripts/backup-prod.sh --env-file .env.imbituva --label prod
set -euo pipefail

SCRIPT_NAME=backup-prod
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./backup-lib.sh
. "$SCRIPT_DIR/backup-lib.sh"

ENV_FILE=""
OUT_DIR="${BACKUP_DIR:-$HOME/parish-backups}"
LABEL=""
GPG_RECIPIENT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --out-dir) OUT_DIR="${2:-}"; shift 2 ;;
    --label) LABEL="${2:-}"; shift 2 ;;
    --gpg-recipient) GPG_RECIPIENT="${2:-}"; shift 2 ;;
    -h | --help) sed -n '2,35p' "$0"; exit 0 ;;
    *) die "opção desconhecida: $1 (veja --help)" ;;
  esac
done

[ -n "$ENV_FILE" ] || die "informe --env-file <arquivo .env> (a URL do banco nunca vai embutida no script)"
[ -f "$ENV_FILE" ] || die "arquivo não encontrado: $ENV_FILE"

# 1. URL: DATABASE_PUBLIC_URL (proxy público do Railway) ou DATABASE_URL
DB_URL="$(read_env_var "$ENV_FILE" DATABASE_PUBLIC_URL)"
URL_VAR=DATABASE_PUBLIC_URL
if [ -z "$DB_URL" ]; then
  DB_URL="$(read_env_var "$ENV_FILE" DATABASE_URL)"
  URL_VAR=DATABASE_URL
fi
[ -n "$DB_URL" ] || die "$ENV_FILE não tem DATABASE_PUBLIC_URL nem DATABASE_URL"
export_pg_env "$DB_URL"
case "$PGHOST" in
  *.railway.internal) die "$URL_VAR aponta para a rede interna do Railway ($PGHOST), inacessível daqui. Use a DATABASE_PUBLIC_URL (aba Variables do serviço Postgres)." ;;
esac
export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}"

# 2. Pasta de saída: fora de qualquer repositório git
mkdir -p "$OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"
if git -C "$OUT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  die "a pasta $OUT_DIR está dentro de um repositório git. O dump contém dados pessoais (LGPD): grave fora do repositório (--out-dir)."
fi
umask 077

[ -n "$LABEL" ] || LABEL="$PGDATABASE"
LABEL="$(printf '%s' "$LABEL" | tr -c 'A-Za-z0-9_-' '_')"
STAMP="$(date +%Y%m%d_%H%M%S)"
DUMP="$OUT_DIR/parish_${LABEL}_${STAMP}.dump"

detect_pg_mode
log "origem: $PGUSER@$PGHOST:$PGPORT/$PGDATABASE (de $URL_VAR em $ENV_FILE)"
log "ferramentas: $(describe_pg_mode)"

# 3. Versões: pg_dump mais velho que o servidor recusa (ou gera dump incompleto)
SERVER_MAJOR="$(server_major | tr -d '\r[:space:]')" || die "não consegui conectar na origem"
CLIENT_MAJOR="$(client_major | tr -d '\r[:space:]')"
log "servidor PostgreSQL $SERVER_MAJOR, pg_dump $CLIENT_MAJOR"
if [ "$CLIENT_MAJOR" -lt "$SERVER_MAJOR" ]; then
  die "pg_dump $CLIENT_MAJOR é mais velho que o servidor $SERVER_MAJOR. Rode de novo com PG_CLIENT_IMAGE=postgres:${SERVER_MAJOR}-alpine"
fi

# 4. Dump (stdout → arquivo; o dump nunca fica guardado dentro de container)
T0=$SECONDS
log "gerando $DUMP ..."
if ! PGOPTIONS="-c default_transaction_read_only=on" pg_tool pg_dump -Fc --lock-wait-timeout=60000 >"$DUMP"; then
  rm -f "$DUMP"
  die "pg_dump falhou (nada foi gravado)"
fi
DUMP_SECS=$((SECONDS - T0))

# 5. Conferência: o arquivo precisa ser um dump custom legível e ter dados
TOC="$(pg_tool pg_restore --list <"$DUMP" | tr -d '\r')" || {
  rm -f "$DUMP"
  die "pg_restore --list não leu o arquivo — dump corrompido (apagado)"
}
N_TABLES="$(printf '%s\n' "$TOC" | grep -c ' TABLE public ' || true)"
N_DATA="$(printf '%s\n' "$TOC" | grep -c ' TABLE DATA public ' || true)"
if [ "$N_DATA" -eq 0 ]; then
  rm -f "$DUMP"
  die "o dump não tem nenhum TABLE DATA — algo deu errado (apagado)"
fi

# 6. Contagem de linhas por tabela (referência para o ensaio de restore)
count_rows >"$DUMP.counts.tsv" || log "aviso: não consegui gravar a contagem de linhas"
TOTAL_ROWS="$(awk -F'\t' '{ s += $2 } END { print s + 0 }' "$DUMP.counts.tsv" 2>/dev/null || echo '?')"

SIZE="$(file_size "$DUMP")"
FINAL="$DUMP"

# 7. Cifragem opcional (o backup guardado fora da máquina deve estar cifrado)
if [ -n "$GPG_RECIPIENT" ]; then
  command -v gpg >/dev/null 2>&1 || die "gpg não encontrado (o dump em claro ficou em $DUMP)"
  gpg --batch --yes --recipient "$GPG_RECIPIENT" --output "$DUMP.gpg" --encrypt "$DUMP" ||
    die "falha ao cifrar (o dump em claro ficou em $DUMP)"
  rm -f "$DUMP"
  FINAL="$DUMP.gpg"
fi

( cd "$OUT_DIR" && sha256sum "$(basename "$FINAL")" >"$FINAL.sha256" )

log "OK em ${DUMP_SECS}s: $(human_size "$SIZE") (dump), $N_TABLES tabelas, $N_DATA blocos de dados, $TOTAL_ROWS linhas"
log "arquivo: $FINAL"
log "hash:    $FINAL.sha256"
log "linhas:  $DUMP.counts.tsv"
if [ -z "$GPG_RECIPIENT" ]; then
  log "ATENÇÃO: dump em claro com dados pessoais (inclusive de menores). Cifre antes de copiar para fora (--gpg-recipient) e não o deixe esquecido nesta máquina."
fi
echo "$FINAL"
