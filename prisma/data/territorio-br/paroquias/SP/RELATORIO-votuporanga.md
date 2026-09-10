# Diocese de Votuporanga (SP) — relatório de pesquisa

- **Arquivo**: `paroquias/SP/votuporanga.json`
- **Data da coleta**: 2026-09-10
- **Resultado**: 33 registros de paróquia (33 `alta`), 63 comunidades (63 `alta`), 195 horários
  fixos (158 `alta`, 37 `baixa`) em 24 municípios.
- `validate.cjs` roda limpo para este arquivo.

## Fontes principais

| Fonte | Uso |
|---|---|
| https://diocesevotuporanga.org.br/a-diocese/ | Criação em 20/07/2016 pelo Papa Francisco; 25 municípios, 31 paróquias |
| https://diocesevotuporanga.org.br/forania-sao-joao/ (e São Marcos, São Lucas, São Mateus) | Listagem das paróquias por forania |
| Página de cada paróquia (36 posts da categoria "cidades") | História, horários, secretaria, endereço, pároco |
| https://diocesevotuporanga.org.br/dom-moacir-aparecido-de-freitas/ | Bispo diocesano |
| https://www.catholic-hierarchy.org/diocese/dvotu.html | 31 paróquias; endereço e CEP da cúria |
| https://diocesevotuporanga.org.br/comunidade-de-uniao-paulista-tem-novo-administrador/ | Vínculo da comunidade de União Paulista |

O portal usa o mesmo tema da Arquidiocese de São José do Rio Preto (abas `História`,
`Horários de Missa`, `Secretaria Paroquial`, `Endereço`, `Padre/Vigário`), com um *post* por
paróquia nas categorias `cidades` + forania.

## Cobertura

- **33 encontradas** × **31 esperadas** (catholic-hierarchy 2023 e a própria página "A Diocese").
  Os 33 registros são: **Catedral Nossa Senhora Aparecida**, 31 paróquias e a
  **Quase-paróquia Santo Antônio** (Votuporanga, post de 10/2025). A diferença para 31
  corresponde a criações posteriores ao dado de 2023.
- **Excluída** a "Região Pastoral Diocesana São Padre Pio de Pietrelcina" (Votuporanga): o site a
  lista junto das paróquias, mas é uma região pastoral e sua página está inteiramente vazia
  (sem história, endereço, horário ou secretaria).
- Preenchimento: telefone 32/33, pároco 29/33, endereço 29/33, bairro 19/33, CEP 2/33,
  e-mail 2/33, ano de fundação 2/33.
- **16 paróquias ficaram só com a matriz**; nenhuma ficou sem horário.

## Decisões de normalização

- **O site não tem página por capela.** As 30 comunidades não-matriz foram extraídas dos
  cabeçalhos do bloco de horários — seções "CAPELAS E COMUNIDADES", linhas do tipo
  "Sábado: 19h - Capela São João Batista" e blocos "Comunidade X - Bairro Y". A cobertura de
  comunidades é, portanto, **parcial**: só aparece a comunidade que tem missa publicada.
- **Ordinais por extenso**: "Segunda quinta-feira do mês" significa *2ª quinta-feira*, não
  "segunda-feira e quinta-feira". O parser remove o ordinal antes de ler o dia da semana e marca
  o horário como mensal. O mesmo vale para "Terceira quarta-feira", "Quarta sexta-feira" etc.
- **Missas de recorrência mensal** ficaram `confidence: "baixa"` com a linha original em `notes`
  (37 horários) — pendência de modelagem já registrada no README.
- Linhas com dois tipos ("Quinta-feira: 15h - Adoração ao Santíssimo | 19h30") foram separadas:
  15h como `ADORATION` e 19h30 como `MASS`.

## Pontos para o enxame de validação

1. **"Região Pastoral Diocesana São Padre Pio de Pietrelcina" (Votuporanga)** ficou **fora** do
   JSON (ver Cobertura). Se ela existir como unidade pastoral com celebrações próprias, precisa
   ser reinserida com dados obtidos fora do site — a página oficial está vazia.
2. **Comunidade Nossa Senhora Aparecida (União Paulista)**: o post não tem conteúdo e não estava
   sob nenhuma paróquia. O vínculo com a **Paróquia Divino Espírito Santo (Planalto)** veio da
   notícia "Comunidade de União Paulista tem novo administrador", registrada nas `sources` da
   comunidade. Confirmar.
3. **Paróquia Nossa Senhora Aparecida (Parisi)** publica duas capelas com sufixo "- Votuporanga"
   (Santo Expedito e Santo Antônio), o que sugere capelas em outro município ou erro de digitação
   no site. Gravadas com o sufixo em `neighborhood`.
4. **"Paróquia São Francisco e Santa Clara" (Votuporanga)** tem o slug da URL como
   `comunidade-sao-francisco-e-santa-clara-votuporanga` — foi promovida a paróquia recentemente;
   o nome usado é o do título ("Paróquia").
5. **Só 2 paróquias com CEP, e-mail e ano de fundação** — o site coloca a fundação no meio do
   texto histórico, sem rótulo padronizado; completar manualmente.
6. **16 paróquias sem nenhuma comunidade listada** — o site só nomeia capelas quando publica o
   horário delas.
7. A cúria diocesana (Rua São Paulo, 3577, Patrimônio Novo, 15500-010) veio do catholic-hierarchy;
   a página `/administracao/` não publica o endereço. Confirmar telefone e e-mail.
