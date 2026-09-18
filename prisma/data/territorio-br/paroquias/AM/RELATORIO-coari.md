# Relatório — Diocese de Coari (AM)

Pesquisa: 2026-09-18. Arquivo: `paroquias/AM/coari.json`.

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **11** (todas `alta`) |
| Comunidades/capelas | 11 (só as matrizes — nenhuma fonte publica capelas) |
| Horários fixos | 48 — 46 `alta`, 2 `baixa` (34 MASS, 8 ROSARY, 6 ADORATION) |
| Cobertura | **11/11, com prova independente da Receita** |

## Fontes

1. **Site oficial `diocesecoari.org.br`** — o `dioceses.json` registra
   `http://diocesedecoari.blogspot.com`, que ainda está no ar mas é o **blog antigo**. O portal
   atual (PHP artesanal, "Desenvolvido por Cúria Online do Brasil") tem a página
   `/paroquias` com as 11 fichas e uma ficha individual por paróquia
   (`/paroquias/<id>/<slug>`, ids 48 a 58) com **endereço, horário de atendimento da secretaria,
   telefone, e-mail, grade "Horários de Missa" e clero com função**.
   *Sinal de atualidade*: a página `/noticias` traz publicações de **8, 12, 13 e 14 de setembro de
   2026** → as grades entram como `alta`.
2. **Receita Federal via `minhareceita.org`** — CNPJ **05.554.787** (razão social "Diocese de
   Coari", nome fantasia "Mitra Diocesana de Coari"): **12 estabelecimentos ativos, 0001 a 0012**
   (0013 a 0025 são 404). São exatamente 1 sede + as 11 paróquias do site. **Prova de completude.**
3. **Wikipédia** — 7 municípios e tabela de 10 paróquias com ano de criação (usada para
   `foundedYear`); não tem a Paróquia Santo Afonso de Manacapuru.
4. `liriocatolico.com.br/.../AM.json` — só 2 fichas do território (Catedral de Coari, sem horários;
   N. Sra. de Nazaré de Manacapuru). Usada apenas como cotejo.

## Distribuição

| Município | Paróquias |
|---|---|
| Coari | Catedral Sant'Ana e São Sebastião (1867), N. Sra. do Perpétuo Socorro (2010), São Pedro (2010) |
| Manacapuru | N. Sra. de Nazaré (1909), Cristo Libertador (2010), **Santo Afonso** (sem ano) |
| Codajás | N. Sra. das Graças (1870) |
| Anamã | Santuário São Francisco (2008) |
| Anori | Imaculada Conceição (1975) |
| Beruri | N. Sra. de Nazaré (1983) |
| Caapiranga | São Sebastião (1985) |

Observação: **Manacapuru pertence à Diocese de Coari, não à Arquidiocese de Manaus** — conferido
contra `paroquias/AM/manaus.json`, que não tem nenhuma entrada em Manacapuru.

## Horários — decisões

- A grade oficial mistura missa com devoções. Traduzi:
  "Terço dos Homens" / "Terço das Mulheres" / "Terço da Família" → `ROSARY`;
  "Adoração ao Santíssimo" → `ADORATION`;
  "Novena e Missa" / "Adoração e Missa" → `MASS` no mesmo horário, com a frase da fonte em `notes`
  (e o `ADORATION` correspondente quando a fonte diz que há adoração).
- **Novena sozinha não virou horário** (a fonte não diz que há missa): três novenas de terça em
  N. Sra. de Nazaré/Manacapuru (12h, 17h, 19h) e a novena de terça às 19h em Santo Afonso.
  Também ficou de fora o "Apostolado da Oração" da sexta às 17h em Cristo Libertador.
- **2 horários `baixa`, por recorrência mensal**, com a frase literal em `notes`: N. Sra. de
  Nazaré/Manacapuru — "1º quarta feira do mês Santa Missa" (19h) e "1º sexta feira do mês Santa
  Missa" (17h30).
- Paróquia mais pobre em horários: **N. Sra. de Nazaré de Beruri**, com uma única missa dominical
  publicada.

## Precisa de validação humana

1. **Comunidades**: nenhuma das 11 fichas lista capelas ou comunidades ribeirinhas — num
   território de 135.000 km² sobre o Solimões/Purus isso é certamente incompleto. Todas as
   paróquias entram só com a matriz. É o maior buraco do arquivo.
2. **CEPs**: a Receita cadastrou as filiais de **Beruri** e **Caapiranga** com o município
   "Manacapuru" e CEP 69400-030 — erro do cadastro. Usei 69460-000 (Beruri) e **69435-000
   (Caapiranga, o CEP do município, não confirmado pela fonte)**. Os outros CEPs vêm da Receita e
   são confiáveis.
3. **Endereço da Catedral**: a ficha oficial diz "Praça São Sebastião, Centro"; a Receita, "Rua 15
   de Novembro, 325"; o liriocatolico, "Rua Quinze de Novembro, 328". Gravei o da ficha oficial.
4. **Nome do pároco de Anamã**: a fonte grafa "Pe. **Tacísio** Magno Falcão" (provável erro de
   "Tarcísio"). Mantido como publicado.
5. **Nomes divergentes** entre site e Wikipédia: São Pedro (Wikipédia: "São Pedro e São João
   Batista") e Santuário São Francisco (Wikipédia: "São Francisco de Assis"). Adotei o site.
6. **Ano de criação da Paróquia Santo Afonso** — desconhecido; a paróquia é posterior à tabela da
   Wikipédia.
7. **Sábado em Manacapuru**: a diocese publica missa de sábado às 07h; o liriocatolico dá 19h.
   Prevaleceu a diocese.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas) — importante

Registro atual: `website: "http://diocesedecoari.blogspot.com"`, `email: null`,
`address: "Rua Gilberto Mestrinho 277"`, `zipCode: "69460-000"`, `phone: "(97) 3561-2227"`,
`bishopName: "Dom Marek Marian Piatek, C.SS.R."`, `foundedYear: 1963`.

- **`website`** — trocar. O blogspot é o portal antigo; o oficial em uso é
  **https://diocesecoari.org.br** (com `/paroquias`, `/noticias`, `/bispos`, `/curia`).
- **`address`** — o número está errado: é **227**, não 277. Site e Receita concordam:
  "Rua Gilberto Mestrinho, n° 227, Centro".
- **`email`** — hoje `null`. O site publica **informativodiocesedecoari@gmail.com** no cabeçalho e
  no rodapé de todas as páginas.
- **`phone`** — a Receita registra **(92) 3213-7737** para a sede (CNPJ 05.554.787/0001-57). O
  (97) 3561-2227 registrado hoje é o telefone da Paróquia de Anamã segundo a Receita (filial 0008).
- CEP, cidade, UF, bispo e `foundedYear` (1963, prelazia; diocese em 09/10/2013) conferem.
