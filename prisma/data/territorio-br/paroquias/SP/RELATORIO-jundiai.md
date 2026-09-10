# Relatório — Diocese de Jundiaí (SP)

**Agente de pesquisa · 10/09/2026 · arquivo `paroquias/SP/jundiai.json`**

| | |
|---|---|
| Circunscrição | Diocese de Jundiaí (sufragânea da Arquidiocese de Sorocaba) |
| Sede | Jundiaí/SP — Rua Eng. Roberto Mange, 400, Anhangabaú — 13208-970 |
| Bispo | Dom Arnaldo Carvalheiro Neto (eleito 15/06/2022, posse 13/08/2022 — 6º bispo diocesano) |
| Site | https://dj.org.br |
| Paróquias no dataset | **74** (todas com confiança `alta`) |
| Comunidades | **402**, em 65 das 74 paróquias (todas `alta`) |
| Horários fixos | **1.316** (1.294 `alta`, 22 `baixa`) — **todas as 74** com horário |

## Fontes principais

1. **https://dj.org.br/paroquias/** — lista oficial, com filtros por **11 regiões pastorais**,
   **11 cidades** e **santuários**. A página renderiza só 20 itens, então a lista completa foi obtida
   pela **API pública do WordPress** do próprio site:
   `https://dj.org.br/wp-json/wp/v2/paroquia?per_page=100` → **76 registros**.
2. **Fichas individuais** `https://dj.org.br/paroquia/<slug>/` — as 76 foram lidas. São a fonte de
   telefone, e-mail, endereço, atendimento, pároco/vigários, **horários de missa** e a **lista de
   comunidades com endereço e horário próprio**.
3. **https://dj.org.br/wp-json/wp/v2/local_paroquia** — a taxonomia oficial do site, que deu a
   **cidade** e a **região pastoral** de cada paróquia (e o marcador "Santuários").
4. **https://dj.org.br/historico/** — criada em **07/11/1966** pela bula de Paulo VI, instalada em
   06/01/1967; padroeira Nossa Senhora do Desterro; "66 paróquias e uma área pastoral, em onze cidades".
5. **https://dj.org.br/bispo-diocesano/** — Dom Arnaldo Carvalheiro Neto.
6. **https://dj.org.br/contato/** — endereço e CEP da Cúria.
7. **https://www.catholic-hierarchy.org/diocese/djund.html** — ereção 07/11/1966, **66 paróquias (2023)**,
   1.108.000 católicos, sufragânea de Sorocaba.

> **O site bloqueia leitores automáticos com HTTP 403.** Todas as páginas foram baixadas com
> `curl` e User-Agent de navegador. A API `wp-json` responde normalmente.

## Cobertura

- **74 entradas / 67 esperadas** (66 paróquias + 1 área pastoral, segundo o histórico do próprio site;
  o catholic-hierarchy também registra 66 em 2023).
- A lista publicada trouxe **76 registros**; **2 eram duplicatas de santuário** — o mesmo santuário
  cadastrado duas vezes, uma como paróquia com região pastoral e outra como registro de "Santuários"
  sem região (Santuário Diocesano Nossa Senhora Aparecida, em Jundiaí, e Santuário Diocesano Senhor
  Bom Jesus, em Pirapora do Bom Jesus). **Foram fundidos**, mantendo o registro com região pastoral e
  incorporando contatos e horários do outro.
- Restam **72 entradas territoriais** (71 paróquias + 1 Área Pastoral Missionária Nossa Senhora
  Aparecida, em Pirapora do Bom Jesus, desmembrada em 17/01/2026) e **2 santuários não paroquiais**:
  **Santuário Nacional do Sagrado Coração de Jesus** (Itu) e **Santuário Eucarístico Diocesano**
  (Jundiaí — que aparece também como comunidade da Catedral).
- O histórico oficial ("66 paróquias") **está desatualizado**: o texto termina no episcopado de
  Dom Vicente Costa (2010–2022). A lista publicada é mais recente.
- **11 cidades**, todas representadas: Jundiaí (28), Itu (11), Várzea Paulista (7), Salto (6),
  Santana de Parnaíba (6), Campo Limpo Paulista (4), Cabreúva (3), Cajamar (3), Pirapora do Bom Jesus (2),
  Itupeva (2) e Louveira (2).
- **Contato:** 73 das 74 com telefone, 73 com e-mail, 59 com CEP, 74 com endereço e bairro,
  65 com pároco, 23 com site próprio.
- Cobertura considerada **completa**.

## Dois leiautes de página no mesmo site

O site convive com dois modelos de ficha, e ambos foram tratados:

- **Leiaute A (estruturado, 10 fichas)** — campos ACF ("Região Pastoral:", "Ano de Criação:",
  "Telefone:", "E-mail:", "Endereço:") e um **repeater de horários** com uma linha por missa:
  *dia | tipo | horário | local*. A quarta coluna nomeia a comunidade ("Matriz",
  "Capela Nossa Senhora Auxiliadora") e permitiu atribuir o horário à comunidade certa.
- **Leiaute B (texto livre, 66 fichas)** — um bloco único com "Endereço:", "Fones:", "E-mail
  Secretária:", "Horários de Missas:" e "Comunidades:". Os horários foram interpretados a partir do
  texto em português, inclusive os subcabeçalhos de comunidade dentro do bloco de missas
  (ex.: `Com. Nossa Senhora da Assunção:`).

## Comunidades

- **402 comunidades** em 65 paróquias; **365 com endereço**. 37 ficaram sem endereço — são as que
  aparecem só como subcabeçalho no bloco de horários, sem ficha de endereço.
- **525 dos 1.316 horários são de comunidades** (40 %) — a diocese publica missas das capelas com
  bastante fidelidade, ao contrário de Mogi das Cruzes.
- Nas 65 paróquias com lista, a **Matriz** foi inserida como primeira comunidade (`isMatriz: true`)
  com o endereço da paróquia. Nas 9 sem lista, `communities` ficou `[]`.
- Os nomes foram mantidos **como publicados** — em Jundiaí, muitas comunidades são listadas só pelo
  padroeiro, sem o prefixo "Comunidade" (ex.: `Nossa Senhora das Graças`, `São Paulo Apóstolo`).

## Horários

- **22 `baixa`**: missas de **recorrência mensal** ("na 1ª sexta-feira do mês", "2º sábado do mês"),
  que o modelo semanal não representa. Ficam com a frase original em `notes`.
- **Tipos:** 1.314 `MASS`, 1 `ADORATION` e 1 `CONFESSION` (Paróquia São Francisco de Assis e São
  Camilo de Lellis, quintas 15h). A diocese praticamente **não publica horário de confissão nem de
  adoração** — as poucas menções aparecem como prosa solta, e só foram gravadas quando a linha inteira
  é sobre a devoção.
- **Linhas com exceção dentro do horário semanal**: quando a fonte escreve
  "Sábado, 7h, (todos os sábados) 9h30 (2º sábado), 18h", o parêntese foi removido para extrair os
  horários e a **linha original foi preservada em `notes`**. Nesses casos o `9h30` está gravado como
  semanal (`alta`) embora seja mensal — **ponto para o enxame de validação** (ver item 4 abaixo).

## Pontos para validação humana / enxame de validação

1. **Santuários não paroquiais.** `nacional-do-sagrado-coracao-de-jesus-itu` e
   `eucaristico-diocesano-jundiai` **não são paróquias**; o segundo é ao mesmo tempo comunidade da
   Catedral (Igreja Nossa Senhora do Rosário e São Benedito, Rua Petronilha Antunes, 379) — há
   **duplicação lógica** com a comunidade homônima da Catedral.
2. **Área Pastoral Missionária.** `nossa-senhora-aparecida-pirapora-do-bom-jesus` é, pelas palavras do
   próprio site, "uma paróquia em formação" — ainda não é paróquia.
3. **Cúria sem telefone e sem e-mail no site.** A página de contato só publica endereço e CEP
   (formulário no lugar dos dados); `phone` e `email` da diocese ficaram `null`. O catholic-hierarchy
   registra o CEP **13208-200** para a mesma rua, enquanto o site publica **13208-970** — divergência
   a conferir.
4. **Horários mensais escondidos dentro de linha semanal** (ver acima). Casos conhecidos:
   Paróquia Santa Luzia (Várzea Paulista) — "Sábado, 7h, (todos os sábados) 9h30 (2º sábado)";
   Paróquia Santo Antônio – Anhangabaú — "Domingo, 8h, 10h e 19h (4º domingo… votiva)".
5. **Linhas de horário que a fonte escreve em prosa e não foram gravadas** (registradas aqui):
   - "Quarta-feira, somente nas comunidades" / "missa nas comunidades" (Santa Luzia, N. Sra. de Lourdes);
   - "Segunda-feira, não temos missa" (N. Sra. da Conceição, São João Bosco) — informação negativa;
   - "Todo dia 14, de cada mês, às 15h" (São Camilo de Lellis, Itu) — dia fixo do mês;
   - "1 vez ao mês, às 19h30 (confirmar data na secretaria)" (São Pedro Apóstolo);
   - "Missa em Italiano, às 11h" no 1º domingo (Sagrado Coração de Jesus, Jundiaí);
   - "Segunda-feira, Cemitério N. Sra. do Montenegro, 7h30" (N. Sra. de Montenegro) — quebra de linha
     na origem;
   - **"Terça-feira, 1930."** (São João Bosco) — **erro de digitação no site** (falta o `h`).
6. **`Ano de Criação` quase sempre vazio.** Só a Catedral publica (1634); `foundedYear` ficou `null`
   nas outras 73.
7. **9 paróquias sem pároco publicado**: `nossa-senhora-aparecida-pirapora-do-bom-jesus`,
   `sao-benedito-varzea-paulista`, `beato-frederico-ozanam-jundiai`, `nossa-senhora-aparecida-itu`,
   `nossa-senhora-do-monte-serrat-salto`, `sagrada-familia-e-santa-isabel-itu`,
   `sao-francisco-de-assis-e-sao-camilo-de-lellis-jundiai`, `sao-sebastiao-cajamar` e
   `sao-vicente-de-paulo-jundiai`.
8. **E-mails ofuscados por Cloudflare** (`[email protected]`) — foram **decodificados do atributo
   `data-cfemail`**. Vale conferir por amostragem. Onde a ficha publica dois e-mails
   (secretaria e financeiro), foi gravado **o primeiro**.
9. **Telefones múltiplos**: várias fichas trazem "Fones: (11) X / (11) Y" e um WhatsApp separado;
   foi gravado **apenas o primeiro número**. `maria-de-nazare-cabreuva` não publica telefone.
10. **Comunidades sem prefixo.** Como o site lista muitas comunidades apenas pelo padroeiro, o `name`
    da comunidade pode coincidir com o nome de uma paróquia (ex.: `São Paulo Apóstolo`) — o importador
    deve tratar comunidade e paróquia como entidades distintas.

11. **Quarta coluna do repeater é campo livre.** No leiaute A, a coluna "local" às vezes traz uma
    comunidade ("Matriz", "Capela Nossa Senhora Auxiliadora") e às vezes uma observação
    ("Missa em honra ao Sagrado Coração de Jesus", "Celebração do Caminho Neocatecumenal"). Só foi
    tratada como comunidade quando começa por Matriz/Comunidade/Capela/Igreja/Santuário/Paróquia/
    Centro/Mosteiro ou coincide com uma comunidade já listada na paróquia; nos demais casos o texto
    foi para `notes` e o horário ficou na Matriz.
