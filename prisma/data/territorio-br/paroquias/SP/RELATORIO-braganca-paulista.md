# Relatório — Diocese de Bragança Paulista (SP)

Pesquisa: 2026-09-10 · Arquivo: `braganca-paulista.json`

## Fontes principais

| Fonte | Uso |
|---|---|
| https://diocesedebraganca.com.br/paroquias/ | Lista canônica das 71 entradas, agrupadas por 7 regiões pastorais |
| https://diocesedebraganca.com.br/paroquia?paroquiaid=N (N = 2…73) | Ficha de cada paróquia: endereço, bairro, CEP, fundação, padroeiro, **horários de missa por dia da semana**, e-mail/telefone/WhatsApp, secretaria, governo paroquial e lista de comunidades/capelas |
| https://www.catholic-hierarchy.org/diocese/dbrap.html | Nº esperado de paróquias (63, Anuário Pontifício 2023), bispo, endereço da cúria, municípios |

O site roda no CMS "Cúria Online do Brasil" e é **muito completo**: cada paróquia tem página
estruturada própria. Sinais de atualidade: imagens em `wp-content/uploads/2026/06`, rodapé
"© 2026", paróquia com fundação em 01/05/2026 já cadastrada. Não foi necessário recorrer a
agregadores — **nenhum horário veio de fonte secundária**.

O WebFetch foi dispensado em favor de `curl` com User-Agent de navegador (o servidor devolve a
página completa). Sete páginas vieram truncadas no download paralelo (buffers de 96/128 KB) e
foram rebaixadas sequencialmente.

## Números

- **71 entradas** gravadas (a diocese as publica todas na página "Paróquias"):
  - 67 paróquias
  - 3 santuários (Atibaia, Caieiras, Bom Jesus dos Perdões) — todos com missas fixas publicadas
  - 1 Área Pastoral (Santa Clara, Bragança Paulista) — gravada com `loadAsParish: true`
  - 1 Seminário Propedêutico São João Paulo II — gravado com `status: "nao-paroquial"`
- **Confiança**: 71 `alta`, 0 `media`, 0 `baixa` (todas de fonte oficial diocesana).
- **Comunidades**: 178 (71 matrizes + 107 capelas/comunidades listadas em 24 fichas).
- **Horários**: 285 (todos `MASS`) — 282 `alta`, 3 `baixa`.
- **Cobertura**: 71 encontradas × 63 esperadas (Anuário Pontifício 2023). A diferença se explica
  pelos santuários, pela área pastoral, pelo seminário e por paróquias criadas depois de 2022.
  Cobertura da lista: **100 % do que a diocese publica**.
- 19 municípios cobertos, batendo exatamente com a lista de catholic-hierarchy (Bragança Paulista,
  Vargem, Atibaia, Morungaba, Jarinu, Itatiba, Socorro, Pedra Bela, Tuiuti, Pinhalzinho, Mairiporã,
  Caieiras, Francisco Morato, Franco da Rocha, Nazaré Paulista, Piracaia, Joanópolis e Bom Jesus
  dos Perdões) — mais Nova Trieste, distrito de Jarinu que a própria diocese registra como cidade.

## Normalizações aplicadas (registrar para validação)

1. `Paróquia Nossa Senhora da Conceição / Sé Catedral` → **`Catedral Nossa Senhora da Conceição`**
   (prefixo padronizado; a fonte usa a barra para indicar que é a Sé).
2. `Paróquia Paróquia Bom Jesus da Paradinha` (Franco da Rocha) → **`Paróquia Bom Jesus da
   Paradinha`** — o site repete o prefixo.
3. `Santo Afonso Maria de Ligório e N. Sra. Aparecida` (Pinhalzinho) → **`Paróquia Santo Afonso
   Maria de Ligório e Nossa Senhora Aparecida`** — a fonte publica sem prefixo e com abreviação.
4. `Santuário "A Senhora de Todos os Povos"` → aspas removidas do nome.
5. Comunidades vinham como texto corrido (`Bairro Guaraíuva – Capela São João Batista`,
   `Comunidade Santa Lúcia - Jd. Santa Lúcia`); foram quebradas em `name` + `neighborhood`.
   **Um humano deve conferir os casos com três partes**, p. ex.
   `Comunidade Biriça do Valado - Capela Nossa Senhora Aparecida – 12 de outubro`, em que a
   terceira parte é a data da festa (descartada) — o `name` ficou `Capela Nossa Senhora Aparecida`
   e o bairro `Comunidade Biriça do Valado`.

## Pontos que precisam de validação humana

- **3 horários de recorrência mensal** (marcados `baixa`, regra literal copiada em `notes`):
  Coração Imaculado de Maria (Bragança) — "Somente na 1ª sexta-feira do mês" e "Somente no 1º
  sábado do mês — Missa em desagravo ao Imaculado Coração de Maria"; São Bento e N. Sra. da Rosa
  Mística (Itatiba) — "Somente na 1ª sexta-feira do mês".
- **Nota de celebrante em vez de local**: na Paróquia Santa Rita de Cássia e Santa Terezinha
  (Nazaré Paulista) o campo extra dos horários de domingo traz o nome "Alexandre Nascimento"
  (ícone de pessoa no site). Ficou em `notes`.
- **"Missa nas Capelas"** — Paróquia São Lázaro de Betânia (Bragança Paulista), domingo 09h00:
  a fonte não diz em qual capela. Ficou no `notes` com `community` = matriz.
- **6 entradas sem nenhum horário publicado**: Área Pastoral Santa Clara e Seminário Propedêutico
  (esperado), Paróquia Nossa Senhora Aparecida e São João Paulo II (Atibaia), Paróquia São José
  Operário (Socorro), Paróquia Santa Rita de Cássia (Caieiras) e Paróquia São João Batista
  (Joanópolis). Não foram buscados agregadores para elas (prioridade de orçamento).
- **3 paróquias sem pároco publicado**: N. Sra. Aparecida (Atibaia), Cristo Ressuscitado e
  N. Sra. de Fátima (ambas em Franco da Rocha).
- **2 entradas sem endereço**: Área Pastoral Santa Clara (só o bairro Águas Claras) e o Seminário
  Propedêutico.
- **`foundedYear`**: a ficha traz data completa ("Fundação"). As datas parecem genuínas (de 1614 a
  2026, variadas). Duas coincidências merecem conferência: **30/05/2004 aparece em 4 paróquias** e
  **08/12/1977 / 07/05/1993 em 3 cada** — pode ser decreto único de criação (comum) ou data de
  cadastro no CMS. Guardado só o ano.
- **12 paróquias sem e-mail** e 45 sem telefone (o site publica WhatsApp em vários casos, que foi
  convertido para o formato `(DD) NNNNN-NNNN`).
- O telefone da cúria no site — `(11) 91164-2584` — é um WhatsApp; o catholic-hierarchy registra
  `(011) 4033-0858` (fixo, provavelmente desatualizado). Foi gravado o do site oficial.

## O que ficou sem cobertura

- Confissões, adorações e terços: **o site não publica** nenhum horário além das missas (existe
  apenas o acordeão `horariosAccordionMissa`). Nada foi inventado.
- Comunidades das 47 paróquias que não publicam a seção "Comunidades"/"Capelas" — `communities`
  contém só a matriz. Não foram buscadas fontes paroquiais individuais.
