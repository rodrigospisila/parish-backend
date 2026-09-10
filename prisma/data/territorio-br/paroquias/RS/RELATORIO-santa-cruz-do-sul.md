# RELATÓRIO — Diocese de Santa Cruz do Sul (RS)

- **Arquivo**: `paroquias/RS/santa-cruz-do-sul.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 51 (todas paróquias) |
| Paróquias com confiança **alta** | 0 |
| Paróquias com confiança **media** | 51 |
| Paróquias com confiança **baixa** | 0 |
| Comunidades/capelas | 68 (51 matrizes + 17 comunidades) |
| Horários fixos | 79 (67 `media`, 12 `baixa`) |
| Cobertura | 51 / 51 (100 %) |

Endereço, CEP, telefone, e-mail, pároco e **ano de fundação** de **50 das 51 paróquias**. A única
lacuna é a Paróquia São Sebastião Mártir (Venâncio Aires) — ver abaixo.

## O problema: o site oficial saiu do ar entre março e setembro de 2026

`www.mitrascs.com.br` **redireciona com HTTP 301 para `facebook.com/mitrascs`** em 10/09/2026 —
tanto a raiz quanto qualquer caminho interno (`/paroquias/lista_de_paroquias`,
`/paroquias/detalhe/<id>`). O site em si não existe mais.

A recuperação foi feita pelo **Arquivo da Internet (Wayback Machine)**, na cópia de
**16/01/2026** (`20260116015004`) — a última cópia com conteúdo real; a de 02/03/2026 já falha.
Essa cópia preserva:

1. `…/paroquias/lista_de_paroquias` — índice completo, com **52 fichas** e o link de cada uma;
2. `…/paroquias/detalhe/<id>` para cada paróquia — bloco estruturado com **Comarca Eclesiástica,
   Município, Padroeiro(a), Fundação, Pároco, Vigário Paroquial, População** e rodapé com
   **endereço, CEP, telefone e e-mail**, além do quadro **"HORÁRIO DAS MISSAS"**.

Foram baixadas e processadas as 53 URLs de ficha (ids 1–53; o id 3 não existe e o id 30 devolve
página vazia em todas as cópias).

Por isso **todas as 51 paróquias ficaram com confiança `media`**: fonte oficial, porém sem sinal
de atualidade (site fora do ar, cópia de 8 meses atrás, conteúdo interno mais antigo).

## Fontes principais

1. `http://web.archive.org/web/20260116015004/http://www.mitrascs.com.br/paroquias/lista_de_paroquias`
   — **lista oficial de paróquias** (52 fichas, com comarca e município de cada uma)
2. `http://web.archive.org/web/20260116015004/http://www.mitrascs.com.br/paroquias/detalhe/<1..53>`
   — ficha de cada paróquia (a base de praticamente todo o arquivo)
3. https://portalarauto.com.br/01-12-2025/diocese-de-santa-cruz-anuncia-lista-de-transferencias-de-padres-para-2026-confira/
   — **transferências e nomeações para 2026** (01/12/2025), usada para corrigir 8 párocos
4. http://cnbbsul3.org.br/diocese-de-santa-cruz-do-sul_/ — endereço, CEP, telefones, e-mail e
   bispo da Cúria (fonte viva)
5. https://www.catholic-hierarchy.org/diocese/dscsu.html — ereção em 20/06/1959; cúria na Rua
   Ramiro Barcellos 717, 96810-054
6. https://gcatholic.org/dioceses/diocese/zcru1.htm — **52 paróquias** (dado de 2022); Dom Itacir
   Brassiani, M.S.F., bispo desde 19/06/2024
7. https://pt.wikipedia.org/wiki/Diocese_de_Santa_Cruz_do_Sul — **51 paróquias**, 11 comarcas
   eclesiásticas, 40 municípios

## Cobertura

**51 paróquias / 51 esperadas.** A lista arquivada tem 52 fichas; a 52ª é a
**Rede de Comunidades Jesus Mestre da Palavra** (Rua Abraão Tatsch, 550 – Bairro Santa Vitória,
Santa Cruz do Sul; Pe. Leão Gomes da Silva; (51) 3711-1260;
`redejesusmestre_cebs@hotmail.com`), cujo próprio campo "Fundação" diz **"Não é Paróquia ainda"**.
Ficou **fora** do arquivo, como as capelanias de Bagé. É o que explica a divergência entre o
gcatholic (52) e a Wikipédia (51).

Distribuição pelas **11 comarcas eclesiásticas**:

| Comarca | Paróquias |
|---|---|
| Santa Cruz do Sul | 6 — Catedral São João Batista, Ressurreição, N. Sra. da Imaculada Conceição, Santo Antônio, Espírito Santo *(+ a Rede Jesus Mestre da Palavra, fora do arquivo)* |
| Arvorezinha | 5 — São João Batista (Arvorezinha), São Paulo Apóstolo (Ilópolis), N. Sra. da Purificação (Putinga), São José do Patrocínio (Itapuca/Anta Gorda), São Carlos (Anta Gorda) |
| Encantado | 6 — São Caetano (Doutor Ricardo), São Pedro (Encantado), São João Batista (Nova Bréscia), Santo Antônio (Relvado), N. Sra. da Purificação (Muçum), São João Batista (Vespasiano Corrêa) |
| Boqueirão do Leão | 6 — Santo Antônio (Pouso Novo), São José (Sério), N. Sra. de Lourdes (Marques de Souza), N. Sra. Auxiliadora (Progresso), Cristo Rei (Gramado Xavier), São João Batista (Boqueirão do Leão) |
| Arroio do Meio | 3 — N. Sra. do Perpétuo Socorro, N. Sra. da Purificação (Travesseiro), N. Sra. do Rosário (Capitão) |
| Lajeado | 5 — Santo Inácio de Loyola, São Gabriel Arcanjo (Cruzeiro do Sul), São Cristóvão, N. Sra. da Imaculada Conceição (Moinhos), São Francisco Xavier (Santa Clara do Sul) |
| Venâncio Aires | 6 — São Sebastião Mártir, São Martinho (Palanque), Santa Inês (Mato Leitão), Santa Catarina (Linha Brasil), N. Sra. de Lourdes (V. Estância Nova), N. Sra. da Natividade (V. Arlindo) |
| Linha Santa Cruz | 5 — N. Sra. de Lourdes (Monte Alverne), N. Sra. da Glória (Sinimbu), Santos Mártires das Missões, Santa Terezinha (Herveiras), N. Sra. do Rosário (Passo do Sobrado) |
| Candelária | 3 — N. Sra. da Candelária, Santa Teresa (Vera Cruz), São José (Vale do Sol) |
| Rio Pardo | 4 — N. Sra. do Rosário, Sagrado Coração de Jesus (Rincão Del Rey), São Nicolau, N. Sra. de Fátima (Pantano Grande) |
| Encruzilhada do Sul | 3 — Santa Bárbara, São José do Patrocínio (Amaral Ferrador), N. Sra. de Czestochowa (Dom Feliciano) |

## Párocos: corrigidos com a lista de transferências de 2026

A ficha arquivada é de 16/01/2026 mas o conteúdo é anterior ao anúncio de **01/12/2025**, que
mudou 8 designações. Onde as duas fontes divergem, prevaleceu o anúncio de 2026:

| Paróquia | Ficha arquivada | Nomeação 2026 | Gravado |
|---|---|---|---|
| Catedral São João Batista (S. Cruz) | Pe. Roni Osvaldo Fengler | foi para Vera Cruz | **`null`** (novo pároco não anunciado) |
| Santa Teresa (Vera Cruz) | Pe. Dionísio Roque Kist | **Pe. Roni Osvaldo Fengler** | Pe. Roni Osvaldo Fengler |
| Espírito Santo (S. Cruz) | Pe. Hilário Gonçalves | **Pe. Dionísio Roque Kist** | Pe. Dionísio Roque Kist |
| N. Sra. do Rosário (Passo do Sobrado) | Pe. José Inácio Straatmann | **Pe. Hilário Gonçalves** | Pe. Hilário Gonçalves |
| Sagrado Coração (Rincão Del Rey) | Pe. Loreno Antônio Konzen | **Pe. Francisco Altenhofen** | Pe. Francisco Altenhofen |
| São José (Sério) | Pe. Francisco Altenhofen | foi para Rincão Del Rey | **`null`** |
| Santo Inácio de Loyola (Lajeado) | Pe. Valdir José Biasibetti | **Pe. Gesildo Torres Monteiro** | Pe. Gesildo Torres Monteiro |
| São Sebastião Mártir (Venâncio Aires) | — (ficha vazia) | Pe. Vanderson da S. Barbosa (**vigário**) | `null` (só o vigário foi anunciado) |

Pe. José Inácio Straatmann passou a **capelão e vigário paroquial da Catedral** e Pe. Loreno
Antônio Konzen a **vigário da Ressurreição e da Santa Teresa** — registrados no campo de fontes,
não em `priestName` (que guarda só o pároco).

## Comunidades

A aba "Comunidades" das fichas está **vazia em 50 das 51 paróquias** — o site tinha o recurso,
mas a diocese não o preencheu. As 17 comunidades gravadas vieram do corpo das páginas:

| Paróquia | Comunidades gravadas | Confiança |
|---|---|---|
| Ressurreição (S. Cruz) | Comunidade Santo Inácio | media |
| Santo Inácio de Loyola (Lajeado) | Capela Sagrado Coração de Jesus (B. Florestal) | media |
| Santos Mártires das Missões | Casa Amparo Fraterno | media |
| N. Sra. da Imaculada Conceição (S. Cruz) | São José Operário (R. Cleber Natalino, 100 – Pedreira); N. Sra. do Rosário (R. Pedreira, 915 – Pedreira); N. Sra. Aparecida (R. Adolfo Pritsch, 479 – Bom Jesus) | media |
| Espírito Santo (S. Cruz) | Mãe dos Pobres, Santa Rita, Sant'Ana, São Francisco | media |
| N. Sra. da Purificação (Muçum) | São Romédio, N. Sra. do Caravaggio (Barra das Contas), N. Sra. Aparecida, São Faustino e Santa Juvita, Santa Lúcia, São Judas Tadeu, Oratório N. Sra. da Saúde | **baixa** |

As de **Muçum** foram extraídas de avisos paroquiais **datados de 2021**, publicados no site
oficial mas nunca em forma de lista — e Muçum foi devastada pelas enchentes de 2023 e 2024.
Confiança `baixa` de propósito.

## ⚠️ Pontos para o enxame de validação

1. **O site oficial não existe mais.** Verificar se a diocese migrou de domínio ou passou a usar
   só Facebook/Instagram (`@diocese.scs`). **Toda a base de contatos deste arquivo precisa ser
   reconfirmada** — é de janeiro de 2026 no melhor caso, e de 2015–2016 em várias páginas.
2. **Paróquia São Sebastião Mártir (Venâncio Aires)** — id 30. A ficha devolve página vazia em
   **todas** as cópias do Arquivo da Internet (2016 a 2026). Só temos nome, município e comarca.
   Faltam endereço, CEP, telefone, e-mail, pároco e ano de fundação. É a maior lacuna do arquivo.
3. **Horários: `media` por regra, mas velhos na prática.** Pelo README, fonte oficial sem sinal
   de atualidade = `media` — foi o critério aplicado. Só que as páginas de notícias em volta dos
   quadros de horário são de **2015 e 2016** na maioria dos casos. **Recomenda-se tratar todos os
   79 horários como suspeitos** até reconfirmação. 12 já estão em `baixa` (recorrência mensal ou
   quinzenal). 31 paróquias ficaram com `schedules: []` — o quadro trazia só "Atendimento do
   Padre" ou estava vazio.
4. **Quadros de horário descartados por serem datados** (avisos de programação, não horário fixo):
   - **N. Sra. da Purificação (Muçum)** — programação de junho/2021, com missas em 8 capelas;
   - **N. Sra. de Lourdes (V. Estância Nova, Venâncio Aires)** — calendário de formação de 2023,
     citando **12 comunidades** da paróquia (São José/Estância São José, São José de Cerro dos
     Bois, Chafariz, N. Sra. Aparecida de Rincão de Souza, São Judas Tadeu, Navegantes/Vila
     Mariante…). Boa pista para levantar as comunidades dessa paróquia.
5. **E-mail quebrado**: Paróquia N. Sra. Auxiliadora (Progresso). O rodapé traz o endereço
   partido em duas linhas (`auxiliadora3788` + `1111@gmail.com`); foi gravado
   `auxiliadora37881111@gmail.com`. **Confirmar** — pode ser `auxiliadora3788@gmail.com`.
6. **CEP malformado**: Paróquia São Cristóvão (Lajeado) — o rodapé escreve `Cep: 9.-913-160`.
   Gravado `zipCode: null`. Provavelmente **95913-160**, mas não foi assumido.
7. **CEPs de caixa postal**: Ressurreição e N. Sra. da Imaculada Conceição (ambas em Santa Cruz
   do Sul) têm **96800-970**, que é o CEP da agência dos Correios (Cx. Postal), não do imóvel.
8. **Telefones com múltiplos números** — foi gravado o primeiro do rodapé. Alternativos úteis:
   Catedral (51) 98023-4836 / sacristia 3731-3739 / casa paroquial 3715-3347; São Pedro de
   Encantado 3751-3233 (residência) e 98912-8345; N. Sra. da Natividade 3741-2306 r. 213.
9. **Nomes que podem exigir outro prefixo**:
   - **São Paulo Apóstolo (Ilópolis)** — o e-mail é `santuariosaopaulo@yahoo.com.br`. Pode ser
     **Santuário**; a lista diocesana diz "Paróquia".
   - **N. Sra. de Czestochowa (Dom Feliciano)** — o próprio quadro de horários diz
     *"Horário das Missas no **Santuário** de Nossa Senhora de Czestochowa"*. Idem.
   - **Santo Inácio de Loyola (Lajeado)** — a lista diz "Santo Inácio de Loyola", o rodapé diz
     "Paróquia Santo Inácio" e a nomeação de 2026 diz "Paróquia Santo Inácio".
10. **Paróquias em distrito** — `city` recebeu o município e `neighborhood` o distrito:
    São José do Patrocínio → Anta Gorda/Itapuca; N. Sra. de Lourdes → Marques de Souza/Bela Vista
    do Fão; N. Sra. de Lourdes → Santa Cruz do Sul/Monte Alverne; Santos Mártires → Santa Cruz do
    Sul/Linha Santa Cruz; São Martinho, Santa Catarina, N. Sra. de Lourdes e N. Sra. da
    Natividade → Venâncio Aires; Sagrado Coração → Rio Pardo/Rincão Del Rey.
    Três paróquias abrangem mais de um município e só o primeiro entrou em `city`:
    **São José (Sério)** atende Sério, Canudos do Vale e Forquetinha; **N. Sra. do Rosário
    (Passo do Sobrado)** atende Passo do Sobrado e Vale Verde.
11. **Divergência de nome do padroeiro**: a nomeação de 2026 chama a paróquia do bairro Ana Nery
    de "Paróquia **Divino** Espírito Santo"; o site oficial diz "Espírito Santo". Foi gravado o
    do site.
12. **Rede de Comunidades Jesus Mestre da Palavra** — decidir se entra como quase-paróquia
    quando for erigida. Dados completos no item "Cobertura".
