# shellcheck shell=bash
# Funções comuns de scripts/backup-prod.sh e scripts/restore-drill.sh (achado
# eng-qualidade-09). Carregado com "source"; sozinho não faz nada.
#
# Ferramentas do Postgres (pg_dump, pg_restore, psql), em ordem de preferência:
#   1. instaladas na máquina (no PATH)                      → PG_MODE=local
#   2. dentro do container do Postgres local (docker exec)  → PG_MODE=docker
#      container: PG_CONTAINER (padrão parish-postgres)
#   3. num container descartável da imagem PG_CLIENT_IMAGE  → PG_MODE=image
#      (ex.: PG_CLIENT_IMAGE=postgres:18-alpine quando o servidor for mais novo
#      que o pg_dump do container local — o pg_dump precisa ser >= o servidor)
# Forçar um modo: PG_MODE=local|docker|image.
#
# Credenciais: a URL do banco é decomposta em PGHOST/PGPORT/PGUSER/PGPASSWORD/
# PGDATABASE (variáveis de ambiente do libpq). A senha nunca vai para a linha de
# comando (nem do docker: "docker exec -e PGPASSWORD" repassa o valor do ambiente).

set -o pipefail

SCRIPT_NAME="${SCRIPT_NAME:-backup}"
PG_CONTAINER="${PG_CONTAINER:-parish-postgres}"
# Nome pelo qual um container enxerga a máquina (Docker Desktop; no Linux o modo
# image acrescenta --add-host=host.docker.internal:host-gateway)
PG_DOCKER_HOST_ALIAS="${PG_DOCKER_HOST_ALIAS:-host.docker.internal}"

log() { echo "[$SCRIPT_NAME] $*" >&2; }
die() {
  echo "[$SCRIPT_NAME] ERRO: $*" >&2
  exit 1
}

# Lê NOME=valor de um arquivo .env SEM executá-lo (nada de "source" num .env).
# Tira "export", aspas e o \r de arquivos salvos no Windows. Última ocorrência vence.
read_env_var() {
  local file="$1" name="$2"
  [ -f "$file" ] || return 0
  tr -d '\r' <"$file" |
    sed -n -E "s/^[[:space:]]*(export[[:space:]]+)?${name}[[:space:]]*=[[:space:]]*//p" |
    tail -n 1 |
    sed -E "s/^[\"'](.*)[\"'][[:space:]]*$/\1/"
}

# Decompõe uma URL postgres(ql):// e exporta as variáveis do libpq.
# Parâmetros só do Prisma (?schema=...) são ignorados; sslmode é respeitado.
export_pg_env() {
  local url="$1" k v
  unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE
  while IFS= read -r -d '' k && IFS= read -r -d '' v; do
    export "$k=$v"
  done < <(PG_URL_IN="$url" node -e '
    let u;
    try { u = new URL(process.env.PG_URL_IN); } catch { process.exit(3); }
    if (!/^postgres(ql)?:$/.test(u.protocol)) process.exit(3);
    const out = {
      PGHOST: u.hostname.replace(/^\[|\]$/g, ""),
      PGPORT: u.port || "5432",
      PGUSER: decodeURIComponent(u.username),
      PGPASSWORD: decodeURIComponent(u.password),
      PGDATABASE: decodeURIComponent(u.pathname.replace(/^\//, "")),
    };
    const ssl = u.searchParams.get("sslmode");
    if (ssl) out.PGSSLMODE = ssl;
    for (const [k, v] of Object.entries(out)) process.stdout.write(k + "\0" + v + "\0");
  ') || die "URL do banco ilegível (esperado postgresql://usuario:senha@host:porta/banco)"
  [ -n "${PGHOST:-}" ] && [ -n "${PGDATABASE:-}" ] || die "URL do banco sem host ou sem nome do banco"
}

# Troca só o nome do banco de uma URL (mantém usuário, senha, host e parâmetros)
url_with_database() {
  PG_URL_IN="$1" PG_DB_IN="$2" node -e '
    const u = new URL(process.env.PG_URL_IN);
    u.pathname = "/" + encodeURIComponent(process.env.PG_DB_IN);
    process.stdout.write(u.toString());
  '
}

is_local_host() {
  case "$1" in
    localhost | 127.0.0.1 | ::1) return 0 ;;
    *) return 1 ;;
  esac
}

# Escolhe como rodar pg_dump/pg_restore/psql (ver o cabeçalho)
detect_pg_mode() {
  if [ -n "${PG_MODE:-}" ]; then
    :
  elif [ -n "${PG_CLIENT_IMAGE:-}" ]; then
    PG_MODE=image
  elif command -v pg_dump >/dev/null 2>&1 && command -v pg_restore >/dev/null 2>&1 && command -v psql >/dev/null 2>&1; then
    PG_MODE=local
  elif command -v docker >/dev/null 2>&1 && docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null | grep -q true; then
    PG_MODE=docker
  else
    die "pg_dump/pg_restore/psql não encontrados no PATH e o container \"$PG_CONTAINER\" não está rodando. Instale o cliente do Postgres, suba o container (docker compose up -d postgres) ou defina PG_CLIENT_IMAGE=postgres:17-alpine."
  fi
  case "$PG_MODE" in
    local | docker | image) ;;
    *) die "PG_MODE inválido: $PG_MODE (use local, docker ou image)" ;;
  esac
  [ "$PG_MODE" != image ] || [ -n "${PG_CLIENT_IMAGE:-}" ] || PG_CLIENT_IMAGE=postgres:17-alpine
  export PG_MODE PG_CLIENT_IMAGE
}

describe_pg_mode() {
  case "$PG_MODE" in
    local) echo "cliente local ($(command -v pg_dump))" ;;
    docker) echo "docker exec no container $PG_CONTAINER" ;;
    image) echo "container descartável $PG_CLIENT_IMAGE" ;;
  esac
}

# Roda uma ferramenta do Postgres com as variáveis PG* atuais. stdin e stdout
# passam direto (dump binário por stdout, restore por stdin), então nenhum
# arquivo precisa entrar ou sair do container.
pg_tool() {
  if [ "$PG_MODE" = local ]; then
    "$@"
    return
  fi
  # Dentro de um container, "localhost" é o próprio container: aponta para a máquina
  local host="$PGHOST"
  if is_local_host "$host"; then host="$PG_DOCKER_HOST_ALIAS"; fi
  local envs=(-e "PGHOST=$host" -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE -e PGOPTIONS -e PGCONNECT_TIMEOUT)
  if [ "$PG_MODE" = docker ]; then
    MSYS_NO_PATHCONV=1 docker exec -i "${envs[@]}" "$PG_CONTAINER" "$@"
  else
    MSYS_NO_PATHCONV=1 docker run --rm -i --add-host=host.docker.internal:host-gateway "${envs[@]}" "$PG_CLIENT_IMAGE" "$@"
  fi
}

# Versão principal (ex.: 17) do servidor e do pg_dump em uso
server_major() { pg_tool psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT current_setting('server_version_num')::int / 10000"; }
client_major() { pg_tool pg_dump --version | sed -E 's/[^0-9]*([0-9]+).*/\1/' | head -n 1; }

# Contagem exata de linhas de cada tabela do schema public, uma consulta só
# (somente leitura). Saída: "tabela<TAB>linhas", ordenada pelo nome.
COUNT_ROWS_SQL="SELECT table_name || E'\t' || (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"

count_rows() {
  PGOPTIONS="-c default_transaction_read_only=on" pg_tool psql -X -A -t -v ON_ERROR_STOP=1 -c "$COUNT_ROWS_SQL" | tr -d '\r'
}

human_size() {
  local bytes="$1"
  awk -v b="$bytes" 'BEGIN { split("B KB MB GB TB", u, " "); i = 1; while (b >= 1024 && i < 5) { b /= 1024; i++ } printf (i == 1 ? "%d %s" : "%.1f %s"), b, u[i] }'
}

file_size() { wc -c <"$1" | tr -d ' '; }
