# Prompt — enxame de VALIDAÇÃO do território

> **Só executar sob ordem explícita do Rodrigo.** Este prompt NÃO cria nem altera nada no banco:
> cada agente revalida um arquivo do dataset contra as fontes e produz um relatório de
> diferenças + um JSON revisado. A aplicação no sistema é um passo separado
> (`npx ts-node prisma/import-territorio.ts --uf=<UF> --diocese=<slug>`), decidido depois de ler os relatórios.

Como usar: um agente por arquivo `paroquias/<UF>/<slug>.json` (ou por grupo de 2–3 dioceses
pequenas). Substitua `{ARQUIVO}` e `{DATA}`.

---

Você é um agente de VALIDAÇÃO de dados públicos da Igreja Católica no Brasil. Vai revisar o
arquivo `{ARQUIVO}` (formato e escala de confiança em
`c:\projetos\gitHub\parish\parish-backend\prisma\data\territorio-br\README.md` — leia primeiro).
Data de hoje: {DATA}.

Para CADA paróquia do arquivo:
1. Confirme que ela existe e continua ativa na fonte oficial da diocese (site atual). Paróquia
   extinta, fundida ou renomeada: registre em `status` (`"ativa"`, `"extinta"`, `"renomeada"`,
   `"fundida"`) com a fonte; não apague do arquivo.
2. Confira nome oficial, cidade, endereço, telefone, e-mail, site e pároco. Corrija o que estiver
   errado, preenchendo `null` onde a fonte não traz o dado. Cada campo corrigido ganha uma
   entrada em `changes` (`{ field, from, to, source }`).
3. Reavalie `confidence` pela escala do README. Suba para `alta` só com fonte oficial; desça se
   a única fonte for secundária ou se houver contradição.
4. Comunidades/capelas: confirme na fonte oficial; acrescente as que faltam (com fonte) e marque
   as que não constam mais como `"status": "nao-confirmada"` (não apague).
5. Horários fixos: revalide um a um contra o canal oficial da paróquia (site, Facebook,
   Instagram) com sinal de atualidade ≤ 12 meses; agregadores servem só como corroboração.
   Horário que não se confirma vira `confidence: "baixa"` com `"status": "nao-confirmado"`.
   Acrescente horários novos encontrados em fonte oficial.
6. Registre `verifiedAt: "{DATA}"` na diocese, em cada paróquia e em cada horário revisado.

Regras:
- NUNCA invente. Não altere `slug`. Não remova registros — marque o status.
- Não toque no banco de dados nem em outros arquivos do repositório.
- Grave com Write: o JSON revisado em `<mesma pasta>/validado/<slug>.json` e o relatório em
  `<mesma pasta>/validado/VALIDACAO-<slug>.md` com: fontes consultadas, nº de registros
  confirmados / corrigidos / rebaixados / não confirmados, lista das mudanças relevantes
  (extintas, renomeadas, horários que mudaram) e o que precisa de decisão humana.

Ao final, responda em pt-BR com o resumo (confirmados, corrigidos, rebaixados, não confirmados)
e as 5 mudanças mais importantes.

---

## Depois dos relatórios (passo humano)

1. Ler os `VALIDACAO-*.md`; decidir o que aplicar.
2. `DRY_RUN=1 npx ts-node prisma/import-territorio.ts --uf=<UF> --diocese=<slug> --source=validado`
   mostra o que mudaria; sem `DRY_RUN` aplica (só cria o que falta; nunca apaga — extintas ficam
   para arquivamento manual).
