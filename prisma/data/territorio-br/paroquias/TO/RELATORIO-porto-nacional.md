# Relatório — Diocese de Porto Nacional (TO)

**Pesquisa:** 2026-09-11 · **Arquivo:** `paroquias/TO/porto-nacional.json`

## Resultado

| Métrica | Valor |
|---|---|
| Entradas | **48** (48 alta) — 47 paróquias + 1 santuário diocesano |
| Comunidades/capelas | **28** |
| Horários fixos | **80** (0 alta, 50 media, 30 baixa) |
| Cobertura | 48/48 (100% da lista oficial) |

## Fontes principais

1. **Diretório oficial** — <https://dioceseportonacional.org.br/foranias-e-paroquias/>.
   Página única, organizada por forania, com **nome, cidade, endereço, CEP, telefone, e-mail e
   pároco** de todas as paróquias. É a fonte de identidade de todos os 48 registros (`alta`).
   Os e-mails vinham ofuscados pelo Cloudflare (`data-cfemail`) e foram decodificados — 35 dos 48.
2. **Fichas antigas de paróquia** (categoria `paroquias`, id 9, `X-WP-Total: 49`, via
   `/wp-json/wp/v2/posts?categories=9`). São posts de notícia usados como ficha. **É a única
   fonte de horário da diocese** e só 6 delas trazem grade de missa.

## Foranias (7)

| Forania | Paróquias |
|---|---|
| Alvorada | 4 |
| Campos Belos | 5 (2 em Goiás) |
| Gurupi | 8 |
| Natividade | 7 + santuário |
| Palmeirópolis | 5 |
| Porto Nacional | 12 |
| Taguatinga | 6 |

A forania consta em `notes` de cada paróquia (não há campo no schema).
**Duas paróquias ficam em Goiás** e receberam `state: "GO"`: Campos Belos (N. Sra. da Conceição)
e Monte Alegre de Goiás (Santo Antônio). Estão no território da diocese — não são duplicatas.

## Por que nenhum horário é `alta`

A diocese **não publica horários no diretório**. As únicas grades estão em posts cuja última
alteração é **2022-05-10** (migração em bloco) ou anterior — fonte oficial sem sinal de
atualidade → `media` pela escala do README. Cobertura de horários: **6 das 47 paróquias (13%)**.

| Paróquia | Horários | Confiança |
|---|---|---|
| Catedral N. Sra. das Mercês (Porto Nacional) | 14 | media (2 baixa mensais) |
| N. Sra. Aparecida (Gurupi) | 12 | media |
| Santo Antônio (Gurupi) | 17 | 9 media, 8 baixa |
| N. Sra. da Abadia (Gurupi) | 21 | **todas baixa** |
| Santana (Silvanópolis) | 8 | media |
| N. Sra. da Conceição (Conceição do TO) | 7 | media |

**N. Sra. da Abadia (Gurupi)** ficou inteira `baixa`: a ficha é de **2017-10-13**, anterior à
pandemia — a regra do README rebaixa texto pré-2020 mesmo em fonte oficial. São 21 horários
prontos para reaproveitamento se a paróquia confirmar.

**Santo Antônio (Gurupi)** publica a programação das capelas numa **tabela HTML de 7 colunas
(Seg–Dom)** que o leitor achata. Alguns itens ficaram desalinhados **na origem** (um bloco
rotulado "1ª sexta-feira" aparece na coluna de quinta). Só entrou como `media` o que a grade da
matriz corrobora; o resto virou `baixa` com a nota explicando a inferência. **É o principal item
para validação humana desta diocese.**

## Os 30 horários `baixa`

- 21 — N. Sra. da Abadia (Gurupi), por idade da fonte (2017).
- 8 — Santo Antônio (Gurupi): 5 por recorrência mensal ("1ª terça", "última terça", "2ª terça",
  "todo dia 13", "1º sábado") e 3 por dia inferido da tabela achatada.
- 2 — Catedral: "primeiras sextas-feiras do mês, 15h" e "4º sábado, 20h".

Cada um traz a **regra literal publicada** em `notes`.

## Pontos para o enxame de validação

1. **Divergência de pároco entre as duas fontes oficiais.** O diretório (atual) e as fichas de
   2022 discordam em pelo menos 12 paróquias. Exemplos: Peixe — diretório *Pe. Divino Rodrigues
   Maciel*, ficha *Pe. José Fernando da Silva* (e o e-mail publicado ainda é
   `parocojose@gmail.com`); Catedral — *Pe. Eldinei da Silva Carneiro Neto* vs *Pe. Jucimar Sousa
   Ribeiro* (que o diretório agora põe em Santa Cruz/Luzimangues). **Gravei sempre o diretório**,
   que é a página mantida.
2. **Paróquia São José (Dianópolis)**: o diretório publica o campo "Pároco" **vazio**.
3. **Telefone malformado — Santa Cruz (Luzimangues)**: publicado `(63) 991212-7929` (10 dígitos
   no número); gravei `(63) 99121-7929`.
4. **E-mail com domínio truncado — N. Sra. dos Remédios (Arraias)**:
   `nossasenhoradosremediosarraias@gmai.com` (falta o "l"). Gravado como publicado.
5. **E-mail com cedilha — N. Sra. das Graças (Palmeirópolis)**: publicado
   `pnagraças@yahoo.com.br`; gravei `pnagracas@yahoo.com.br`.
6. **CEP repetido 77580-000** em Silvanópolis e Monte do Carmo — um dos dois está errado.
7. **Rótulo errado no diretório**: o bloco de Ponte Alta do Tocantins está intitulado
   "**Ponta** Alta do Tocantins"; o endereço e o CEP (77590-000) são de Ponte Alta do Tocantins.
   Atenção: existe também **Ponte Alta do Bom Jesus** (77315-000), outra paróquia.
8. **Sem endereço**: São Francisco de Assis (Novo Alegre) e Santa Luzia (Porto Nacional) — o
   diretório traz só o nome e o pároco.
9. **Sem e-mail** (13): Talismã, Novo Alegre, N. Sra. de Fátima e São Judas Tadeu (Gurupi),
   Santuário do Bonfim, Rio da Conceição e as 6 de Porto Nacional sem ficha.
10. **N. Sra. de Fátima (Luzimangues)**: o site anota "igreja em construção".
11. **"São Valério da Natividade"**: o diretório usa o nome antigo do município; hoje é
    **São Valério**. Gravei `city: "São Valério"`.
12. **Missas institucionais mensais da Catedral** (abrigo, 1º sábado 16h; hospital, 2º sábado
    16h) não geraram registro — os locais não constam como comunidade.
13. **Discrepância de contagem**: o buscador do Google resume o site como "41 paróquias"; o
    diretório atual lista **47** + o santuário. Usei o diretório.
14. **Não "corrigir" nome que repete a cidade**: Paróquia Nossa Senhora da Natividade
    (**Natividade**), Paróquia Nossa Senhora de Fátima (**Fátima**) e Paróquia São Miguel e
    Almas (**Almas**) parecem violar a regra de não pôr a cidade no nome, mas **não violam** —
    são municípios batizados com o nome do próprio padroeiro. Um validador automático acusa
    falso positivo aqui.
