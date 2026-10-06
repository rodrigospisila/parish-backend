# Migrations: expandir → código → contrair

No deploy, o container novo roda `npx prisma migrate deploy && node dist/main`
(ver `Dockerfile`). A migration é aplicada **enquanto a versão antiga ainda atende**
— o Railway só troca quando o `/health` do container novo responde 200. Se o boot
do novo falhar, a versão antiga continua no ar **sobre o schema já alterado**.
Por isso toda migration precisa ser compatível com o código que está em produção.

## A regra

1. **Expandir** (deploy N): só mudanças aditivas.
   - coluna nova **nula** ou `NOT NULL DEFAULT <constante>`;
   - tabela nova, índice novo;
   - nada de `DROP`, `RENAME`, `SET NOT NULL` sem default, troca de tipo.
2. **Código** (deploy N, ou N+1): o código passa a escrever/ler o novo formato e
   continua aceitando o antigo (ex.: `refresh_tokens.token` aceita o JWT em claro
   das linhas antigas até expirarem).
3. **Contrair** (deploy N+2, depois que nenhum código antigo roda mais e o
   backfill terminou): `SET NOT NULL`, `DROP COLUMN`, remoção do formato antigo.
   Numa migration própria, nunca junto com a expansão.

Exemplo do que **não** fazer: `20260829100000_attendance_marked_by` cria
`updatedAt` e faz `SET NOT NULL` na mesma migration. Durante a janela do deploy,
o Prisma Client antigo (que não conhece a coluna) falha em todo `INSERT` nessa tabela.

## Antes do push

- Schema: `prisma/schema.prisma` editado + migration escrita à mão em
  `prisma/migrations/<AAAAMMDDHHMMSS>_<nome>/migration.sql`, no padrão das existentes.
- `CREATE INDEX` comum trava escrita na tabela enquanto o índice é criado: em
  tabela grande, prefira `CREATE INDEX CONCURRENTLY` numa migration só com ele
  (o Prisma não roda `CONCURRENTLY` dentro de transação — é a única instrução do arquivo).
- Faça o boot local (`nest build` + `node dist/main`) contra um banco com a migration.

## Se uma migration falhar em produção (P3009)

O `migrate deploy` marca a migration como falha e **todo deploy seguinte morre**
nele, em silêncio — o `/health` continua mostrando o commit antigo.

1. Confira o commit no `/health` contra o último push.
2. Veja o que ficou aplicado (`_prisma_migrations` e o próprio schema).
3. Corrija à mão o que ficou pela metade e marque:
   - `npx prisma migrate resolve --rolled-back <nome>` (desfeita: o próximo deploy reaplica), ou
   - `npx prisma migrate resolve --applied <nome>` (concluída à mão).
4. Escrever no banco de produção é decisão do Rodrigo, nunca de script automático.
