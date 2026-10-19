# Backup e Restore — PostgreSQL (Parish)

> Cópia versionada deste runbook. A mesma versão fica em `c:\projetos\gitHub\parish\docs\backup-restore.md`.
> Revisado em 19/10/2026 (Onda 0, achado eng-qualidade-09). Primeira versão: 14/07/2026 (Fase 0), validada
> com 35 tabelas; hoje são 94 tabelas, 89+ migrations, dízimo (Asaas), assentos sacramentais e consentimentos
> de menores.

## 0. Resumo

| Camada | O quê | Frequência | Retenção | Protege contra |
|---|---|---|---|---|
| 1. Railway (volume) | Backup agendado do volume do serviço Postgres | diário + semanal + mensal | 6 d / 27 d / 89 d | erro humano, migration ruim, corrupção |
| 2. Fora do provedor | `scripts/backup-prod.sh` (pg_dump `-Fc`, cifrado com GPG) | semanal (e antes de migration arriscada) | 5 semanais + 6 mensais | perda do projeto/conta no Railway, volume apagado |
| 3. Ensaio | `scripts/restore-drill.sh` num Postgres local | mensal (mínimo trimestral) | — | backup que "existe" mas não restaura |

**RPO proposto** (quanto dado se pode perder): **24 h** nos incidentes comuns (camada 1); **7 dias** se o
projeto do Railway inteiro for perdido (camada 2).
**RTO proposto** (quanto tempo fora do ar): **4 h** — restaurar o backup do Railway leva minutos; restaurar do
dump externo num Postgres novo e repontar o backend cabe com folga em 4 h.

## 1. O que o Railway faz (e o que não faz)

Fonte: <https://docs.railway.com/reference/backups> (consultada em 19/10/2026).

- O Postgres do Railway guarda os dados num **volume**; os backups do Railway são **do volume inteiro**
  (cópia incremental, copy-on-write — cobra só o que muda, no preço de volume por GB).
- **Agendamento** (aba *Backups* do serviço Postgres): diário (guarda 6 dias), semanal (27 dias) e mensal
  (89 dias) — dá para ligar os três. Também há backup **manual** (limitado a 50% do tamanho do volume).
- **Restore**: escolhe-se o backup pela data → *Restore* → o Railway monta um volume novo com aquela data no
  mesmo ponto de montagem e deixa o volume antigo desmontado → revisar e clicar *Deploy*. **Só restaura no
  mesmo projeto + ambiente.**
- **Limitações que justificam a camada 2:**
  - "Wiping a volume deletes all backups" — apagar o volume (ou o serviço/projeto) leva os backups junto;
  - os backups ficam no próprio Railway: não há cópia fora do provedor nem download;
  - o recurso ainda é marcado como em desenvolvimento.
- **Plano**: segundo a equipe do Railway (fórum *Central Station*), backups de volume exigem o plano **Pro**;
  no Hobby não aparecem. **Ação do Rodrigo:** abrir o serviço Postgres → aba *Backups* e conferir se há
  agendamento ligado. Se a aba não existir, o plano não permite — então a camada 2 vira a única proteção e
  deve ser **diária**, não semanal.

## 2. Backup fora do provedor — `scripts/backup-prod.sh`

Gera `parish_<label>_<AAAAMMDD_HHMMSS>.dump` (formato custom, comprimido), confere o arquivo com
`pg_restore --list` (precisa ler o índice e ter blocos de dados), grava o `.sha256` e a contagem de linhas por
tabela (`.counts.tsv`, usada no ensaio). Só **lê** a origem: pg_dump e contagem rodam em transação somente
leitura; espera no máximo 60 s por lock.

```bash
cd parish-backend
# .env.imbituva tem o DATABASE_URL do proxy público do Railway (*.proxy.rlwy.net).
# O script prefere DATABASE_PUBLIC_URL e recusa o host interno *.railway.internal.
scripts/backup-prod.sh --env-file .env.imbituva --label prod --gpg-recipient <seu e-mail GPG>
```

Opções: `--out-dir <pasta>` (padrão `~/parish-backups`; **recusa pasta dentro de repositório git**),
`--label <nome>`, `--gpg-recipient <id>` (cifra com a chave pública e apaga a cópia em claro).

**Credenciais:** a URL vem do `.env` indicado (lido, nunca executado) e vira variáveis `PG*` do libpq — a senha
não aparece na linha de comando nem no histórico.

### Ferramentas: com ou sem pg_dump instalado

O script escolhe sozinho (ou force com `PG_MODE=`):

| Modo | Quando | Como |
|---|---|---|
| `local` | `pg_dump`, `pg_restore` e `psql` no PATH | roda direto |
| `docker` | sem cliente no PATH e o container `parish-postgres` rodando (padrão no Windows deste projeto) | `docker exec -i parish-postgres pg_dump ...`; o dump sai por stdout, nada fica no container |
| `image` | `PG_CLIENT_IMAGE=postgres:18-alpine` definido | container descartável `docker run --rm` daquela versão |

O `pg_dump` precisa ser da **mesma versão principal do servidor ou mais nova**. O script compara antes e, se o
servidor for mais novo (ex.: Railway em 18 e container local em 17), para e sugere
`PG_CLIENT_IMAGE=postgres:18-alpine`. Em `localhost`, os modos Docker usam `host.docker.internal`.

Equivalente manual (para conferência):

```bash
# modo docker, origem = banco local de desenvolvimento
docker exec -i parish-postgres pg_dump -U parish -d parish_db -Fc > parish_local.dump
docker exec -i parish-postgres pg_restore --list < parish_local.dump | head
# com cliente instalado
pg_dump -Fc -d "$DATABASE_PUBLIC_URL" -f parish_prod.dump   # (expõe a URL no histórico — prefira o script)
```

### Onde guardar

- **Fora da máquina e fora do Railway**, **cifrado**: o `.dump.gpg` vai para um storage com versionamento e
  regra de expiração (Cloudflare R2 ou S3 com *lifecycle*; ou, no mínimo, uma pasta do Google Drive/OneDrive
  da conta do Rodrigo com 2FA). Nunca o `.dump` em claro.
- A chave **privada** GPG fica só com o Rodrigo (e uma cópia de segurança offline, ex.: impressa/pendrive no
  cofre). Sem ela o backup é inútil — testar a decifragem no ensaio.
- **Nunca** como artefato do GitHub Actions nem dentro de um repositório: os repositórios do Parish são
  **públicos**, e artefatos de repositório público podem ser baixados por qualquer conta logada.
- Depois de enviar, apagar a cópia local (`~/parish-backups`), salvo a mais recente se for usada no ensaio.
- Retenção sugerida: 5 semanais + 6 mensais (um backup por mês até 6 meses). Não guardar além disso — ver LGPD.

### Rotina semanal sugerida (segunda-feira, ~10 min)

1. `scripts/backup-prod.sh --env-file .env.imbituva --label prod --gpg-recipient <id>`
2. Conferir a última linha `OK em ...s: <tamanho>, <n> tabelas, <n> linhas` — tamanho e linhas não podem cair
   de uma semana para outra sem explicação.
3. Enviar `parish_prod_*.dump.gpg`, `.sha256` e `.counts.tsv` para o storage externo.
4. Apagar os da semana retrasada do storage (ou deixar a regra de expiração fazer isso).
5. Uma vez por mês: o ensaio da seção 3 com o backup da semana.

Também rodar o backup **antes** de qualquer migration destrutiva ou script de dados em produção (`prisma/data/*`).

**Próximo passo (automação, decisão do Rodrigo):** GitHub Action noturna (`schedule`) num repositório
**privado** só de operação, com os segredos `DATABASE_PUBLIC_URL`, chave pública GPG e credenciais do bucket;
faz o dump, cifra, envia ao R2/S3 e, uma vez por mês, restaura num Postgres efêmero do próprio job e compara
`.counts.tsv` (o `restore-drill.sh` já roda em Linux). Não foi criada agora porque precisa do bucket e dos
segredos — e não deve ficar nos repositórios públicos.

## 3. Ensaio de restore — `scripts/restore-drill.sh`

Restaura o dump num banco **novo e local**, roda `prisma migrate status` contra ele e compara as linhas de
cada tabela com a referência. Recusa destino que não seja `localhost`/`127.0.0.1`/`::1`, recusa banco que já
exista e recusa o próprio banco do `.env` local.

```bash
cd parish-backend
# 1. Ensaio contra a contagem gravada no backup (exata)
scripts/restore-drill.sh --dump ~/parish-backups/parish_prod_AAAAMMDD_HHMMSS.dump.gpg \
  --target-db parish_restore_drill --drop

# 2. Ou comparando com a produção AO VIVO (consulta de contagem somente leitura)
scripts/restore-drill.sh --dump ~/parish-backups/parish_prod_AAAAMMDD_HHMMSS.dump.gpg \
  --target-db parish_restore_drill --source-env .env.imbituva --drop
```

- O destino vem do `DATABASE_URL` do `.env` local do backend (`--target-env` para outro arquivo); só o nome do
  banco é trocado.
- `.gpg` é decifrado num arquivo temporário, apagado no fim; o `.sha256` é conferido antes.
- `--no-owner --no-privileges`: os papéis da produção não existem localmente.
- `prisma migrate status`: "Database schema is up to date!" se o checkout estiver na mesma migration da
  produção; migrations "not yet applied" são normais quando o checkout está à frente.
- Comparação: só as tabelas com diferença aparecem. Contra o `.counts.tsv` deve bater 100%. Contra a produção
  ao vivo, diferenças pequenas em tabelas de escrita contínua (`audit_logs`, `refresh_tokens`,
  `enforcement_hits`, `notifications`...) são esperadas.
- `--drop` apaga o banco temporário no fim (também se o ensaio falhar no meio); `--keep` mantém; sem nenhum
  dos dois, pergunta. **O banco restaurado contém dados pessoais: não deixá-lo esquecido.**
- Código de saída: `0` = restore sem erro e todas as tabelas bateram; `2` = diferença ou erro; `1` = recusado.

Registrar cada ensaio (data, backup usado, tamanho, tempo de restore, tabelas conferidas, diferenças) — é a
evidência de que o RTO é real.

### Ensaio local de 19/10/2026 (validação dos scripts)

Banco de desenvolvimento `parish_db` (container `parish-postgres`, PostgreSQL 17, modo `docker`):
backup em 6 s (dump de 516 KB, 94 tabelas, 94 blocos de dados, 5.100 linhas); restore em 7–8 s; `migrate
status` em dia; 94/94 tabelas iguais tanto contra o `.counts.tsv` quanto contra a origem ao vivo. Também
conferidos: modo `image`, cifragem/decifragem GPG, diferença detectada (saída 2), dump truncado (saída 2 e
banco apagado), recusa de host remoto, de banco existente e do próprio `parish_db`. O tamanho real da produção
será medido no primeiro backup.

## 4. Restore definitivo (desastre)

Antes de tudo: **parar as escritas** (no Railway, *Settings → Pause* do serviço `parish-backend`, ou retirar o
deploy) e anotar o horário.

**A. Banco ainda existe (erro humano, migration ruim)** — usar o backup do Railway:
aba *Backups* do Postgres → backup anterior ao incidente → *Restore* → revisar → *Deploy*. Religar o backend.

**B. Projeto/volume perdido** — usar o dump externo:

1. Criar um serviço Postgres novo no Railway (mesma versão principal do dump ou mais nova).
2. Decifrar: `gpg --output parish.dump --decrypt parish_prod_<data>.dump.gpg` e conferir `sha256sum --check`.
3. Restaurar (a URL pública do serviço novo, num shell sem histórico):
   `pg_restore --no-owner --no-privileges -d "<DATABASE_PUBLIC_URL do serviço novo>" parish.dump`
   (sem cliente local: `docker exec -i parish-postgres pg_restore --no-owner --no-privileges -d "<url>" < parish.dump`).
4. `DATABASE_URL="<url>" npx prisma migrate status` → deve constar "up to date" (ou só migrations novas).
5. Apontar o `DATABASE_URL` do `parish-backend` para o serviço novo (referência de variável do Railway) e fazer
   deploy; o CMD do container roda `prisma migrate deploy`.
6. Validar `/health` (commit e `database: up`), login no painel e uma listagem autenticada.
7. **Reaplicar as exclusões/anonimizações LGPD** feitas depois da data do backup (ver seção 6).
8. Registrar o incidente: data, causa, backup usado, janela de dados perdida, quem foi avisado.

Nunca rodar `pg_restore --clean` contra produção sem um backup da situação atual tirado antes.

## 5. Recuperação de exclusão acidental (soft delete)

Desde a migration `20260714123347_phase0_blindagem_audit_softdelete`, exclusões de
**Member, Community, Event, Schedule, CommunityPastoral e PastoralGroup** são lógicas
(`deletedAt`). Para recuperar um registro sem recorrer ao backup:

```sql
-- Exemplo: restaurar um membro excluído por engano
UPDATE members SET "deletedAt" = NULL WHERE id = '<id>';
```

A trilha de auditoria (`audit_logs`, ação `SOFT_DELETE`) registra quem excluiu e quando —
consulte via `GET /api/v1/audit?entity=Member&action=SOFT_DELETE` (PARISH_ADMIN+).

## 6. LGPD — o dump é dado pessoal

- O dump tem **tudo**: dados cadastrais, telefones, e-mails, **dados de crianças e adolescentes** (catequese,
  responsáveis, consentimentos), **assentos sacramentais** (convicção religiosa = dado pessoal **sensível**,
  art. 5º, II), contribuições do dízimo e segredos cifrados de provedores. Vale o art. 46 (segurança) e o
  art. 14 (melhor interesse do menor).
- **Cifrado sempre que sair do Railway**; acesso só do Rodrigo (controlador/operador da plataforma);
  nenhum dump em e-mail, WhatsApp, repositório ou artefato de CI.
- **Retenção limitada** (seção 2) — reter "para sempre" contraria a necessidade (art. 6º, III).
- **Pedidos de exclusão/anonimização** feitos depois de um backup continuam valendo: num restore a partir de
  backup antigo, reaplicar as anonimizações registradas em `audit_logs` após a data do backup antes de reabrir
  o sistema. Os backups expiram pela retenção, o que conclui a exclusão.
- **Ensaio**: o banco restaurado localmente é apagado no fim (`--drop`); a máquina do ensaio deve ter disco
  cifrado (BitLocker).
- **Vazamento** de um backup é incidente de segurança: avaliar a comunicação à ANPD e aos titulares (art. 48).

## 7. Checklist periódico

- [ ] Aba *Backups* do Postgres no Railway com agendamento diário (e semanal/mensal) ligado — ou camada 2 diária
- [ ] Backup externo da semana gerado, cifrado e enviado (data/tamanho/linhas coerentes com a semana anterior)
- [ ] Ensaio de restore no mês (mínimo 1×/trimestre), registrado
- [ ] Decifragem testada com a chave privada (no ensaio)
- [ ] Cópias locais e bancos de ensaio apagados
- [ ] Retenção respeitada (nada além de 6 meses)
