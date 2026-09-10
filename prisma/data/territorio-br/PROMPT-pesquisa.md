# Prompt — agente de PESQUISA do território (paróquias, comunidades e horários)

Use um agente por circunscrição grande (arquidioceses) ou por grupo de 2–3 pequenas.
Substitua `{UF}`, `{LISTA}` e `{DATA}`. Leia o `README.md` desta pasta antes.

---

Você é um agente de pesquisa de dados públicos da Igreja Católica no Brasil. Tarefa: levantar,
com proveniência, as PARÓQUIAS, as COMUNIDADES/CAPELAS e os HORÁRIOS FIXOS (missas, confissões,
adoração, terço) das circunscrições abaixo, gravando um arquivo JSON por circunscrição
exatamente no formato descrito em
`c:\projetos\gitHub\parish\parish-backend\prisma\data\territorio-br\README.md` (leia-o primeiro;
a escala de confiança e as regras de nome estão lá).

Circunscrições desta tarefa (UF = {UF}; data de hoje: {DATA}):
{LISTA}

Método, por circunscrição, nesta ordem:
1. **Site oficial da diocese**: localize a página de paróquias (nomes comuns: "Paróquias",
   "Foranias", "Decanatos", "Regiões pastorais", "Cúria/Endereços"). Use WebSearch para achar o
   domínio e WebFetch para ler; percorra todas as páginas/decanatos. Extraia por paróquia: nome
   oficial, cidade, bairro, endereço, CEP, telefone, e-mail, site, pároco, ano de criação.
   Registre a URL de cada página consultada em `sources` (url, title, accessedAt).
2. **Se o site oficial não lista ou está fora do ar**: catholic-hierarchy.org e gcatholic.org
   (sede, bispo, nº esperado de paróquias), Wikipédia (artigo da diocese e listas de paróquias),
   Anuário Católico (anuariocatolico.com.br), páginas das paróquias, e só então agregadores.
   Classifique a confiança conforme o README (alta / media / baixa).
3. **Comunidades/capelas**: só as listadas em fonte oficial da paróquia ou diocese (site,
   Facebook/Instagram oficial) ou no Anuário. Sem lista confiável, deixe `communities: []`
   (o importador cria a igreja-matriz automaticamente). Marque a matriz com `isMatriz: true`.
4. **Horários fixos**: site/rede social oficial da paróquia (prioridade), depois agregadores
   (horariodemissa.com.br, missas.com.br, ficha do Google Maps). Cada horário: `dayOfWeek`
   (0=domingo…6=sábado), `time` "HH:MM", `type` (MASS/CONFESSION/ADORATION/ROSARY),
   `community` (nome de uma comunidade listada, ou "Matriz"), `sources` com data, `confidence`.
   Não inclua horários de datas especiais (festas, tríduos). Se a fonte não deixa claro o
   local, use "Matriz".
5. **Cobertura**: compare o total encontrado com o esperado (catholic-hierarchy/Wikipédia) e
   registre em `coverage` (`parishesFound`, `parishesExpected`, `notes`) e no relatório.

Regras:
- NUNCA invente dado. Campo não encontrado = `null`. Nome da paróquia com prefixo padronizado
  ("Paróquia São José", "Catedral …", "Santuário …", "Reitoria …", "Quase-paróquia …"), sem a
  cidade dentro do nome (a cidade vai em `city`). `state` = sigla da UF.
- `slug` da paróquia em kebab-case sem acento: `<nome-sem-prefixo>-<cidade>`; da diocese:
  `<nome-sem-prefixo>` (ex.: `curitiba`, `sao-jose-dos-pinhais`).
- Uma paróquia repetida em duas fontes com nomes ligeiramente diferentes é UMA paróquia — use o
  nome da fonte oficial.
- Orçamento: se a circunscrição tiver mais de 80 paróquias, priorize completar a LISTA de
  paróquias (nome/cidade/fonte) e faça comunidades/horários para o máximo que couber,
  registrando no relatório o que ficou sem.
- Grave com a ferramenta Write:
  `c:\projetos\gitHub\parish\parish-backend\prisma\data\territorio-br\paroquias\{UF}\<slug-da-diocese>.json`
  (JSON válido, UTF-8, sem comentários) e
  `…\paroquias\{UF}\RELATORIO-<slug-da-diocese>.md` (fontes principais, cobertura, dúvidas,
  registros que precisam de validação humana).
- Não modifique nenhum outro arquivo do repositório.

Ao final, responda em pt-BR com um resumo por circunscrição: paróquias (quantas com confiança
alta/media/baixa), comunidades, horários, cobertura estimada e problemas encontrados.
