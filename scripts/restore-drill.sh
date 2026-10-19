#!/usr/bin/env bash
# Ensaio de restore (achado eng-qualidade-09): restaura um dump num banco LOCAL
# temporário, confere as migrations (prisma migrate status) e compara as linhas
# por tabela com a referência. Nunca escreve fora de localhost.
#
# Uso (no Git Bash ou Linux):
#   scripts/restore-drill.sh --dump <arquivo.dump[.gpg]> --target-db <nome> [opções]
#
#   --dump <arq>          dump custom (-Fc) gerado pelo backup-prod.sh; se terminar
#                         em .gpg, é decifrado num arquivo temporário (precisa da
#                         chave privada) que é apagado no fim
#   --target-db <nome>    banco temporário a CRIAR (não pode existir; letras
#                         minúsculas, números e _). Ex.: parish_restore_drill
#   --target-env <arq>    .env com o DATABASE_URL do Postgres LOCAL de onde tirar
#                         host/porta/usuário/senha (padrão: .env do backend).
#                         Host diferente de localhost/127.0.0.1/::1 → recusado.
#   --source-env <arq>    .env do banco de ORIGEM (DATABASE_PUBLIC_URL ou
#                         DATABASE_URL) para comparar com a contagem ao vivo,
#                         em transação somente leitura. Sem ele, compara com o
#                         <dump>.counts.tsv gravado pelo backup-prod.sh.
#   --drop | --keep       apaga / mantém o banco temporário no fim (sem nenhum
#                         dos dois, pergunta; sem terminal, mantém)
#
# Diferenças esperadas na comparação ao vivo: tabelas que receberam escrita
# depois do dump (audit_logs, refresh_tokens, enforcement_hits...). A comparação
# com o .counts.tsv deve bater exatamente, salvo escrita durante o próprio dump.
#
# Ferramentas: pg_restore/psql do PATH ou via Docker — ver scripts/backup-lib.sh.
set -euo pipefail

SCRIPT_NAME=restore-drill
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=./backup-lib.sh
. "$SCRIPT_DIR/backup-lib.sh"

DUMP=""
TARGET_DB=""
TARGET_ENV="$BACKEND_DIR/.env"
SOURCE_ENV=""
AFTER=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dump) DUMP="${2:-}"; shift 2 ;;
    --target-db) TARGET_DB="${2:-}"; shift 2 ;;
    --target-env) TARGET_ENV="${2:-}"; shift 2 ;;
    --source-env) SOURCE_ENV="${2:-}"; shift 2 ;;
    --drop) AFTER=drop; shift ;;
    --keep) AFTER=keep; shift ;;
    -h | --help) sed -n '2,32p' "$0"; exit 0 ;;
    *) die "opção desconhecida: $1 (veja --help)" ;;
  esac
done

[ -n "$DUMP" ] || die "informe --dump <arquivo>"
[ -f "$DUMP" ] || die "dump não encontrado: $DUMP"
[ -n "$TARGET_DB" ] || die "informe --target-db <nome do banco temporário>"
printf '%s' "$TARGET_DB" | grep -Eq '^[a-z_][a-z0-9_]{0,62}$' ||
  die "nome de banco inválido: $TARGET_DB (use letras minúsculas, números e _)"
case "$TARGET_DB" in
  postgres | template0 | template1) die "nome reservado: $TARGET_DB" ;;
esac
[ -f "$TARGET_ENV" ] || die "arquivo não encontrado: $TARGET_ENV"
[ -z "$SOURCE_ENV" ] || [ -f "$SOURCE_ENV" ] || die "arquivo não encontrado: $SOURCE_ENV"

# --- Banco local de destino --------------------------------------------------
BASE_URL="$(read_env_var "$TARGET_ENV" DATABASE_URL)"
[ -n "$BASE_URL" ] || die "$TARGET_ENV não tem DATABASE_URL"
export_pg_env "$BASE_URL"
is_local_host "$PGHOST" ||
  die "o destino precisa ser um Postgres LOCAL (localhost/127.0.0.1/::1); $TARGET_ENV aponta para $PGHOST. Nada foi feito."
BASE_DB="$PGDATABASE"
[ "$TARGET_DB" != "$BASE_DB" ] ||
  die "--target-db não pode ser o banco do $TARGET_ENV ($BASE_DB): o ensaio usa um banco NOVO"
TARGET_URL="$(url_with_database "$BASE_URL" "$TARGET_DB")"

detect_pg_mode
log "ferramentas: $(describe_pg_mode)"
log "destino: $PGUSER@$PGHOST:$PGPORT/$TARGET_DB (temporário)"

# psql no banco de manutenção (postgres) do servidor local
admin_psql() { PGDATABASE=postgres pg_tool psql -X -A -t -v ON_ERROR_STOP=1 "$@"; }

EXISTS="$(admin_psql -c "SELECT 1 FROM pg_database WHERE datname = '$TARGET_DB'" | tr -d '\r[:space:]')" ||
  die "não consegui conectar no Postgres local ($PGHOST:$PGPORT)"
[ -z "$EXISTS" ] ||
  die "o banco $TARGET_DB já existe. Escolha outro nome ou apague-o antes (DROP DATABASE \"$TARGET_DB\")."

# --- Dump: decifra se preciso ------------------------------------------------
TMP_DIR="$(mktemp -d)"
CREATED=0
DROPPED=0
cleanup() {
  local rc=$?
  rm -rf "$TMP_DIR"
  # Falhou no meio com --drop: não deixa cópia de dados pessoais para trás
  if [ "$rc" -ne 0 ] && [ "$CREATED" = 1 ] && [ "$DROPPED" = 0 ] && [ "$AFTER" = drop ]; then
    admin_psql -c "DROP DATABASE IF EXISTS \"$TARGET_DB\" WITH (FORCE)" >/dev/null 2>&1 &&
      log "falha no ensaio: banco $TARGET_DB apagado (--drop)"
  fi
}
trap cleanup EXIT
RESTORE_FILE="$DUMP"
COUNTS_FILE="${DUMP%.gpg}.counts.tsv"
case "$DUMP" in
  *.gpg)
    command -v gpg >/dev/null 2>&1 || die "gpg não encontrado para decifrar $DUMP"
    RESTORE_FILE="$TMP_DIR/restore.dump"
    log "decifrando $DUMP ..."
    (umask 077 && gpg --batch --yes --output "$RESTORE_FILE" --decrypt "$DUMP") || die "falha ao decifrar"
    ;;
esac
if [ -f "$DUMP.sha256" ]; then
  (cd "$(dirname "$DUMP")" && sha256sum --check --status "$(basename "$DUMP").sha256") ||
    die "o hash não confere com $DUMP.sha256 — arquivo alterado ou corrompido"
  log "hash sha256 conferido"
fi
DUMP_SIZE="$(file_size "$DUMP")"

# --- Restore -----------------------------------------------------------------
T0=$SECONDS
admin_psql -c "CREATE DATABASE \"$TARGET_DB\"" >/dev/null
CREATED=1
log "banco $TARGET_DB criado; restaurando $(basename "$DUMP") ($(human_size "$DUMP_SIZE")) ..."
# --no-owner/--no-privileges: os papéis da origem (ex.: postgres do Railway) não
# existem aqui; tudo fica com o usuário local
RESTORE_LOG="$TMP_DIR/pg_restore.log"
set +e
PGDATABASE="$TARGET_DB" pg_tool pg_restore --no-owner --no-privileges -d "$TARGET_DB" <"$RESTORE_FILE" 2>"$RESTORE_LOG"
RESTORE_RC=$?
set -e
RESTORE_SECS=$((SECONDS - T0))
RESTORE_ERRORS="$(tr -d '\r' <"$RESTORE_LOG" | sed -n -E 's/.*errors ignored on restore: ([0-9]+).*/\1/p' | tail -n 1)"
if [ "$RESTORE_RC" -ne 0 ]; then
  log "pg_restore terminou com código $RESTORE_RC (${RESTORE_ERRORS:-?} erros ignorados). Log:"
  tr -d '\r' <"$RESTORE_LOG" | grep -E 'error|ERRO|warning' | head -n 30 >&2 || true
else
  log "restore concluído em ${RESTORE_SECS}s, sem erros"
fi

# --- Migrations --------------------------------------------------------------
log "prisma migrate status contra $TARGET_DB ..."
set +e
MIGRATE_OUT="$(cd "$BACKEND_DIR" && DATABASE_URL="$TARGET_URL" npx --no-install prisma migrate status 2>&1)"
MIGRATE_RC=$?
set -e
printf '%s\n' "$MIGRATE_OUT" | tr -d '\r' | grep -v -E '^(Environment variables|Prisma schema loaded|Datasource|warn The configuration property|For more information|$)' | sed 's/^/    /' >&2
if [ "$MIGRATE_RC" -eq 0 ]; then
  MIGRATE_STATUS="em dia com prisma/migrations deste checkout"
else
  MIGRATE_STATUS="DIVERGENTE (código $MIGRATE_RC) — veja acima: migrations ainda não aplicadas na origem são normais quando este checkout está à frente da produção"
fi

# --- Contagem de linhas ------------------------------------------------------
RESTORED="$TMP_DIR/restored.tsv"
REFERENCE="$TMP_DIR/reference.tsv"
PGDATABASE="$TARGET_DB" count_rows >"$RESTORED"
if [ -n "$SOURCE_ENV" ]; then
  SRC_URL="$(read_env_var "$SOURCE_ENV" DATABASE_PUBLIC_URL)"
  [ -n "$SRC_URL" ] || SRC_URL="$(read_env_var "$SOURCE_ENV" DATABASE_URL)"
  [ -n "$SRC_URL" ] || die "$SOURCE_ENV não tem DATABASE_PUBLIC_URL nem DATABASE_URL"
  (
    export_pg_env "$SRC_URL"
    export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}"
    count_rows
  ) >"$REFERENCE" || die "não consegui contar as linhas na origem"
  REF_LABEL="origem ao vivo"
elif [ -f "$COUNTS_FILE" ]; then
  tr -d '\r' <"$COUNTS_FILE" >"$REFERENCE"
  REF_LABEL="contagem do backup ($(basename "$COUNTS_FILE"))"
else
  : >"$REFERENCE"
  REF_LABEL=""
  log "sem --source-env e sem $(basename "$COUNTS_FILE"): só listo as linhas restauradas"
fi

echo
printf '%-45s %12s %12s %10s\n' "tabela" "restaurado" "referência" "diferença"
SUMMARY="$(
  awk -F'\t' -v has_ref="$([ -s "$REFERENCE" ] && echo 1 || echo 0)" '
    FILENAME == ARGV[1] { ref[$1] = $2; next }
    {
      seen[$1] = 1
      if (!has_ref) { printf "%-45s %12s %12s %10s\n", $1, $2, "-", "-"; total++; next }
      if (!($1 in ref)) { printf "%-45s %12s %12s %10s\n", $1, $2, "(ausente)", "!"; diff++; total++; next }
      d = $2 - ref[$1]
      if (d != 0) { printf "%-45s %12s %12s %+10d\n", $1, $2, ref[$1], d; diff++ }
      total++
    }
    END {
      for (t in ref) if (!(t in seen)) { printf "%-45s %12s %12s %10s\n", t, "(ausente)", ref[t], "!"; diff++; missing++ }
      printf "RESUMO\t%d\t%d\t%d\n", total, diff + 0, missing + 0
    }
  ' "$REFERENCE" "$RESTORED"
)"
printf '%s\n' "$SUMMARY" | grep -v '^RESUMO' || true
read -r _ N_TABLES N_DIFF N_MISSING <<<"$(printf '%s\n' "$SUMMARY" | grep '^RESUMO' | tr '\t' ' ')"
TOTAL_ROWS="$(awk -F'\t' '{ s += $2 } END { print s + 0 }' "$RESTORED")"
echo
if [ -n "$REF_LABEL" ]; then
  echo "Tabelas conferidas: $N_TABLES (referência: $REF_LABEL) — iguais: $((N_TABLES - N_DIFF + N_MISSING)), diferentes/ausentes: $N_DIFF"
  echo "(tabelas iguais não aparecem na lista acima)"
else
  echo "Tabelas restauradas: $N_TABLES"
fi
echo "Linhas restauradas: $TOTAL_ROWS"
if [ "$RESTORE_RC" -eq 0 ]; then RESTORE_RESULT="sem erros"; else RESTORE_RESULT="FALHOU (código $RESTORE_RC, ${RESTORE_ERRORS:-?} erros)"; fi
echo "Dump: $(human_size "$DUMP_SIZE"); restore: ${RESTORE_SECS}s, $RESTORE_RESULT"
echo "Migrations: $MIGRATE_STATUS"

# --- Limpeza -----------------------------------------------------------------
if [ -z "$AFTER" ]; then
  if [ -t 0 ]; then
    read -r -p "Apagar o banco temporário $TARGET_DB? [s/N] " ans
    case "$ans" in s | S | sim | SIM) AFTER=drop ;; *) AFTER=keep ;; esac
  else
    AFTER=keep
  fi
fi
if [ "$AFTER" = drop ]; then
  admin_psql -c "DROP DATABASE \"$TARGET_DB\" WITH (FORCE)" >/dev/null
  DROPPED=1
  log "banco $TARGET_DB apagado"
else
  log "banco $TARGET_DB mantido (contém dados pessoais da origem: apague quando terminar — DROP DATABASE \"$TARGET_DB\")"
fi

# Código de saída: 0 só se o restore não teve erro, restaurou tabelas e elas bateram
if [ "$RESTORE_RC" -ne 0 ] || [ "${N_DIFF:-0}" -ne 0 ] || [ "${N_TABLES:-0}" -eq 0 ]; then
  exit 2
fi
