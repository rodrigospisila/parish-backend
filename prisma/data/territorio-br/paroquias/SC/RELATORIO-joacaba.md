# Relatório — Diocese de Joaçaba (SC)

**Agente de pesquisa · 10/09/2026 · arquivo `paroquias/SC/joacaba.json`**

| | |
|---|---|
| Circunscrição | Diocese de Joaçaba (sufragânea da Arquidiocese de Chapecó) |
| Sede | Joaçaba/SC — Rua Frei Edgar, 104-B, Centro — 89600-000 — (49) 3522-0848 |
| Bispo | Dom Frei Mário Marquez, OFMCap (4º bispo diocesano; nomeado em 2010) |
| Site | https://diocesedejoacaba.org.br |
| Paróquias no dataset | **27** (todas com confiança `alta`) |
| Comunidades | **402**, em 21 das 27 paróquias (todas `alta`) |
| Horários fixos | **73** (62 `alta`, 1 `media`, 10 `baixa`) em 20 paróquias |

## Fontes principais

1. **https://diocesedejoacaba.org.br/categorias/paroquias/** (3 páginas) — lista oficial das 27 paróquias,
   com link para a página individual de cada uma.
2. **Páginas individuais das 27 paróquias** (`https://diocesedejoacaba.org.br/<slug-da-paroquia>/`) —
   telefone, e-mail, endereço, município, histórico, **lista de comunidades** e **horário das missas**.
   São a fonte de quase todos os dados do arquivo.
3. **https://diocesedejoacaba.org.br/curia-diocesana/** — endereço, telefone, e-mails setoriais e equipe da Cúria
   (vigário geral Frei Nolvi Dalla Costa OFM; chanceler Pe. Gilvani Capitani Cordeiro;
   ecônomo Pe. Joveci José de Oliveira Filho; coordenação de pastoral Pe. Tiago Willian de Souza).
4. **https://diocesedejoacaba.org.br/bispo-diocesano/** — Dom Frei Mário Marquez, OFMCap.
5. **https://diocesedejoacaba.org.br/horarios-de-missas/** — página diocesana de horários; publica **só a Catedral**.
6. **https://www.catholic-hierarchy.org/diocese/djoac.html** — ereção 12/06/1975, **27 paróquias (2023)**,
   230.336 católicos, sufragânea de Chapecó.

## Cobertura

- **27 encontradas / 27 esperadas** — bate exatamente com o catholic-hierarchy (2023). Cobertura considerada completa.
- Municípios-sede: Abdon Batista, Campos Novos, Capinzal, Catanduvas, **Concórdia (4 paróquias)**,
  Erval Velho, Herval d'Oeste, Ibicaré, Irani, Jaborá, **Joaçaba (2)**, Lacerdópolis, Lindóia do Sul,
  Luzerna, Monte Carlo, Passos Maia, Peritiba, Piratuba, Ponte Serrada, Tangará, Vargem,
  Vargem Bonita e Água Doce.
- Paróquias que atendem mais de um município (informado nas próprias fichas): Imaculada Conceição
  (Monte Carlo, Brunópolis, Campos Novos e Tangará), N. Sra. do Rosário/Concórdia (também Arabutã),
  Cristo Rei/Ibicaré (uma comunidade em Tangará).
- **Contato**: 24 das 27 paróquias com telefone, 21 com e-mail, 25 com endereço.
  Nenhuma paróquia tem `website` gravado — ver item 7 dos pontos de validação.
- **`foundedYear`** só foi preenchido nas duas paróquias cujo histórico traz a data explícita de ereção:
  Catedral Santa Teresinha (02/01/1930) e N. Sra. do Rosário de Concórdia (24/11/1932).

## Comunidades

21 paróquias publicam a lista nominal das comunidades/capelas — 402 no total. As fichas usam três
formatos diferentes, e o **nome foi mantido exatamente como publicado**, para não inventar padroeiro
nem localidade:

- `"<Localidade> – <Padroeiro>"` (maioria: Tangará, Peritiba, Jaborá, Erval Velho…);
- `"Capela <Padroeiro> – <Localidade>"` (Irani, Ponte Serrada, Lindóia do Sul…);
- só o nome da localidade (Herval d'Oeste, Vargem, Monte Carlo).

A Catedral de Joaçaba publica as comunidades **em caixa alta** — foi mantido o texto original.

**Matriz:** 10 paróquias nomeiam a matriz na lista (`isMatriz: true`). Nas outras 11 (das 21 com lista) a
matriz não aparece na lista publicada; nesses casos os horários usam `community: "Matriz"`, conforme o
README, e o importador cria a igreja-matriz.

**Correção aplicada:** na ficha de Jaborá as duas primeiras comunidades vinham emendadas numa única linha
(`"Igreja Matriz – São Roque Águas Belas – Santo Antônio"`); foram separadas em duas.

## Horários

- 20 paróquias com horários oficiais na própria ficha diocesana → `alta`.
- **Catedral Santa Teresinha**: única com duas fontes oficiais (ficha da paróquia + página diocesana de
  horários). As duas concordam em domingo 08h/19h, terça 19h, quarta 15h, quinta 19h, sexta 19h e
  sábado 19h. **Divergem na segunda-feira**: a página diocesana lista missa às 19h, a ficha da paróquia não.
  Gravada como `media`, com nota.
- **10 horários `baixa`**: são missas de **recorrência mensal** (1ª sexta do mês, 1º sábado do mês,
  domingos alternados em Vargem Bonita, adoração na 1ª quinta em Jaborá). O modelo do dataset só
  representa recorrência semanal, então elas ficam marcadas `baixa` com a explicação em `notes` e
  **não devem entrar na carga** sem tratamento de recorrência mensal.
- **Adoração**: 2 registros (`ADORATION`) — Vargem Bonita (quarta 19h, junto com a missa) e
  Jaborá (1ª quinta 19h30, `baixa`).
- **Nenhuma paróquia publica horário de confissão** → 0 registros `CONFESSION`.
- **7 paróquias sem nenhum horário**: Santo Antônio, Sagrada Família de Nazaré e São Cristóvão (Concórdia),
  Santa Catarina de Alexandria (Piratuba), São João Batista (Campos Novos), São Judas Tadeu (Vargem)
  e São Paulo Apóstolo (Capinzal).
- **Rodízio nas capelas**: várias fichas avisam que as missas nas comunidades são mensais ou quinzenais
  (N. Sra. do Rosário/Concórdia: "no interior, uma vez ao mês; nos bairros, duas vezes ao mês").
  Só os horários da matriz foram gravados; os das capelas não são fixos semanais.

## Pontos para validação humana / enxame de validação

1. **Fichas praticamente vazias no site diocesano** — precisam de levantamento direto:
   - `santo-antonio-concordia` (Paróquia Santo Antônio, Concórdia): só o município. Sem endereço,
     telefone, e-mail, comunidades ou horários.
   - `santa-catarina-de-alexandria-piratuba`: idem, só o município.
   - `sagrada-familia-de-nazare-concordia`: só endereço e o padre; sem telefone e sem horários.
2. **`priestName` ambíguo.** O site tem um bloco "Clero" **sem indicar o cargo** (pároco × vigário ×
   ajuda pastoral), e ele está preenchido em apenas 3 das 27 fichas. Além disso,
   **"Pe. Benedito Andrade" aparece tanto na Catedral de Joaçaba quanto em Passos Maia** —
   gravado nas duas, mas é preciso confirmar quem é o pároco de cada uma. Em Passos Maia o bloco lista
   antes um diácono (Diácono Benedito Oliveira), que não foi gravado.
3. **E-mails ofuscados.** O site protege os e-mails com Cloudflare (`[email protected]`); os endereços do
   arquivo foram **decodificados do atributo `data-cfemail`**. Vale conferir por amostragem —
   em especial `contato@catedraljoacaba.com.br` (Catedral), que não aparece em texto puro em lugar nenhum.
4. **CEPs faltando** (a ficha não publica): Catedral Santa Teresinha e São José (Joaçaba),
   São Cristóvão (Concórdia), Senhor Bom Jesus (Herval d'Oeste), Santo Isidoro (Peritiba) e São Roque (Jaborá).
5. **Endereços normalizados.** Várias fichas trazem cidade/UF/CEP grudados no logradouro
   (ex.: `"Rodovia SC 452, s/n, Centro – Monte Carlo/SC. CEP: 89618-000"`). O endereço foi separado em
   `address` / `neighborhood` / `zipCode` sem alterar o logradouro. Dois casos merecem olhada:
   - Ibicaré: o site publica `"Rua Juscelino Kubitschek 1 - Número 1"` (número duplicado) — gravado como
     `"Rua Juscelino Kubitschek, 1"`.
   - Erval Velho: `"R. Cel. Zeferino Bitencourt, 143-253"` — faixa de numeração, mantida como publicada.
6. **Telefone de Monte Carlo**: a ficha publica dois, `(49) 3546-0105 (Monte Carlo)` e
   `(49) 3556-0246 (Brunópolis)`. Gravado o primeiro.
7. **Sites próprios de paróquia — campo `website` deixado `null` de propósito.** Três paróquias têm
   e-mail institucional em domínio próprio, o que sugere site próprio:
   `pascom@psaopauloapostolo.com.br` (São Paulo Apóstolo, Capinzal),
   `secretaria@saoroqueparoquia.org.br` (São Roque, Jaborá) e
   `secretaria@paroquiasaojorge.org.br` (São Jorge, Passos Maia).
   **Nenhum dos três domínios respondeu** durante a pesquisa (falha de conexão nas quatro tentativas).
   Como derivar a URL a partir do domínio do e-mail seria inferência, o campo ficou vazio —
   basta confirmar que o site está no ar para preencher.
8. **Rodapé do site com telefone divergente.** O rodapé das páginas alterna entre `(49) 3522-0848` e
   `(49) 35544567` para a Mitra Diocesana. Foi gravado `(49) 3522-0848`, que é o da página da Cúria.
