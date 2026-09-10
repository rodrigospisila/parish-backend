# Relatório — Arquidiocese de Passo Fundo (RS)

**Agente de pesquisa · 10/09/2026 · arquivo `paroquias/RS/passo-fundo.json`**

| | |
|---|---|
| Circunscrição | Arquidiocese de Passo Fundo (arquidiocese metropolitana) |
| Sede | Passo Fundo/RS — Rua Coronel Chicuta, 436, 4º andar, sala 401, Ed. Nossa Senhora Aparecida, Centro — CEP 99010-051 — (54) 3045-9240 |
| Arcebispo | Dom Rodolfo Luís Weber (arcebispo metropolitano desde 2016) |
| Site | https://arquidiocesedepassofundo.com.br |
| Sufragâneas | Erexim, Frederico Westphalen e Vacaria |
| Registros no dataset | **54** (53 paróquias + 1 santuário), todos com confiança `alta` |
| Municípios cobertos | 37 |
| Comunidades nomeadas | **0** (o site publica só a contagem — soma ≈ 744) |
| Horários fixos | **164** (146 `alta`, 18 `baixa`) — 161 `MASS` + 3 `ADORATION` |

## Fontes principais

1. **https://arquidiocesedepassofundo.com.br/paroquias/** — lista oficial, paginada em 6 páginas de 9
   cards. Foi a fonte da enumeração completa.
2. **https://arquidiocesedepassofundo.com.br/paroquia/&lt;slug&gt;** — ficha oficial de cada uma das 54
   paróquias. Cada ficha traz: nome, **data de fundação**, telefone, endereço com CEP, e-mail,
   histórico, **clero com função** (pároco, vigários, diáconos permanentes), setores/secretaria com o
   **número de comunidades** e a **grade de horários de missa em JSON estruturado**
   (tipo, recorrência, dias da semana e horas). É a fonte de praticamente todos os campos.
3. **https://arquidiocesedepassofundo.com.br/arcebispo/** — Dom Rodolfo Luís Weber; sucessão de bispos.
4. **https://www.catholic-hierarchy.org/diocese/dpafu.html** — ereção 10/03/1951 (desmembrada de Santa
   Maria), elevação a arquidiocese 13/04/2011, **53 paróquias** e 488.000 católicos em 2023
   (Annuario Pontificio 2024), 11.235 km².
5. **https://cnbbsul3.org.br/local/arquidiocese-de-passo-fundo/** — corroboração da província eclesiástica.

> **Nota técnica.** O site é WordPress/Elementor com o plugin `wp-parresia-register`. A listagem não
> aparece no `wp-json` nem no sitemap, e o `?page=N` que o front-end usa é engolido pelo *canonical
> redirect* do WordPress — a paginação só funciona por **`/paroquias/page/N/`**. Os e-mails vêm
> ofuscados pelo Cloudflare (`data-cfemail`) e precisam ser decodificados. Os horários estão nos
> atributos `data-item` dos cards da tabela "Horários de Missas". Quem for revalidar precisa repetir
> esse caminho.

## Cobertura

- **54 fichas encontradas / 53 paróquias esperadas** (catholic-hierarchy, dado de 2023).
- A 54ª entrada é o **Santuário Nossa Senhora Aparecida** (RST 153 Km 3, junto ao Seminário
  Arquidiocesano). A Arquidiocese o publica junto das paróquias, mas o clero listado é
  "Reitor do Seminário", "Animador vocacional" e "Em Formação" — **não há pároco**, e o próprio
  histórico o descreve como santuário/capela do seminário. **Provavelmente não é paróquia canônica.**
  Excluindo-o, 53 = exatamente o número esperado. Foi gravado como `Santuário Nossa Senhora Aparecida`.
- Todas as 54 têm nome, cidade, e-mail, CEP e **ano de fundação**. **53 de 54 têm telefone**,
  **50 têm logradouro** e **49 têm pároco**.
- Ano de criação: veio sempre da frase oficial "Fundada em &lt;dia&gt; de &lt;mês&gt; de &lt;ano&gt;" da ficha; só
  o ano foi gravado. As mais antigas: N. Sra. da Conceição/Passo Fundo (1847) e Santo Antônio/Guaporé (1897).

## Comunidades — o débito desta arquidiocese

O site publica, em cada ficha, a frase **"Número de comunidades: N"**, mas **nunca os nomes**. A soma
declarada é de **≈ 744 comunidades** em 50 fichas (4 não informam: Charrua, Nicolau Vergueiro,
Guaporé e o Santuário). Por isso `communities: []` nas 54 e todo horário aponta para `"Matriz"`.

Contagens declaradas mais altas, úteis para conferência: **Cristo Rei/Marau 55**, N. Sra. da
Saúde/Tapejara 38, N. Sra. de Lourdes/Sarandi 36, São José/Sertão 28, N. Sra. da Saúde/Vila Maria 23,
São Vicente de Paulo/Passo Fundo 23, Cristo Rei/Não-Me-Toque 22, Santo Antônio/Água Santa 22,
São José/Passo Fundo 22, São Cristóvão/Passo Fundo 21, São Luiz Gonzaga/Casca 20.

Uma ficha nomeia uma comunidade dentro da descrição de um horário: **"Comunidade Nossa Senhora da
Glória (Matriz)"**, em Carazinho — foi preservada no campo `notes` do horário.

## Horários

- **49 das 54** fichas trazem horários; **5 não têm nenhum**: N. Sra. do Rosário/Charrua,
  Sagrada Família/David Canabarro, Santo Antão/Pontão, Santo Antônio/Santo Antônio do Palma e
  São Valentim/São Valentim do Sul.
- Os 146 horários `alta` são todos de recorrência **semanal** declarada pela própria Arquidiocese.
- Os **18 `baixa`** são de recorrência **mensal** (1ª sexta-feira do mês, 2ª quarta, 1º e 3º sábados,
  4º final de semana etc.) — o modelo do dataset só representa recorrência semanal, então eles ficaram
  com o dia da semana correto, a descrição no `notes` e confiança rebaixada. Lista completa no JSON.
- **Descartados**: 1 registro chamado **"Teste"** (São José de Montauri, segunda e quarta 19h30 — dado
  de teste do próprio site), 1 "visitação" do Santuário (das 7h às 22h, todos os dias — não é
  celebração), e 4 registros sem dia da semana ou sem hora, entre eles a "Missa da Saúde" das 16h da
  Catedral (o campo `weekDays` veio vazio) e duas missas "todo dia 13 do mês" / "todo dia 03 do mês"
  (N. Sra. de Fátima/Passo Fundo e São Domingos), que não têm dia fixo de semana.
- 3 registros de "Adoração e Bênção do Santíssimo" foram gravados como `ADORATION`
  (N. Sra. de Fátima/Carazinho, N. Sra. de Fátima/Passo Fundo, Sagrado Coração de Jesus/Passo Fundo);
  todos são mensais, portanto `baixa`.

## Pontos para validação humana / enxame de validação

1. **O Santuário Nossa Senhora Aparecida é paróquia?** Confirmar com a Cúria (54 3045-9240). Se não
   for, o registro `santuario-nossa-senhora-aparecida-passo-fundo` deve ficar fora da carga.

2. **Telefones — normalização obrigatória (38 de 54 registros).** O campo principal da ficha
   (`institution-phone-field`) aplica uma máscara de 8 dígitos sobre números de 9, e o resultado sai
   **truncado e com um "9" espúrio na frente**. Exemplo verificado: Guaporé exibe `(54) 9344-3151` no
   campo principal e `(54) 9 3443-1510` no campo da secretaria; o telefone real, confirmado em fonte
   externa (scalabrinianos.com, Facebook da paróquia), é **(54) 3443-1510**. Regra aplicada:
   - campo principal no formato `(DD) [2-5]XXX-XXXX` → gravado como está (16 casos);
   - senão, usa-se o telefone da secretaria: `(DD) 9 ABCD-EFGH` com `ABCD` começando em 6–9 → celular
     `(DD) 9ABCD-EFGH` (19 casos); com `ABCD` começando em 2–5 → o "9" é espúrio e vale o fixo
     `(DD) ABCD-EFGH` (18 casos).
   O campo `phone` do JSON já traz o número normalizado. **Todos os 38 normalizados merecem conferência
   por amostragem.**
3. **Telefone ausente:** `nossa-senhora-do-rosario-charrua` — o campo principal traz `(54) 9619-9321`
   (truncado) e a ficha não tem setor/secretaria com telefone completo. Ficou `null`.
4. **Dois pares de paróquias com o MESMO telefone** — conferir:
   - `cristo-rei-marau` e `cristo-rei-nao-me-toque` → ambas com **(54) 3332-1361**. O prefixo 3332 é de
     Não-Me-Toque; o de Marau deveria ser 334x. Provável erro de digitação na ficha de Marau.
   - `santo-antonio-camargo` e `santo-antonio-uniao-da-serra` → ambas com **(54) 3476-1108** (prefixo de
     União da Serra). Pode ser real (mesmos frades atendendo as duas) ou erro.
5. **E-mail com erro de digitação no domínio:** São Cristóvão/Passo Fundo publica
   `saocristovaopf@arquidiocesedepasspfundo.com.br` (note `depasspfundo`). Gravado como publicado.
   N. Sra. da Conceição/Passo Fundo publica dois endereços — `matrizconceiceicao@…` e
   `matrizconceicao@…`; foi gravado o primeiro (o que aparece no cabeçalho da ficha).
6. **Slug fora da regra:** a regra do dataset (`<nome-sem-prefixo>-<cidade>`) faz a **Catedral Nossa
   Senhora Aparecida** e o **Santuário Nossa Senhora Aparecida** colidirem (mesmo padroeiro, mesma
   cidade). O santuário ficou com `santuario-nossa-senhora-aparecida-passo-fundo`.
7. **Nomes normalizados** (o site embute a cidade no rótulo; a regra do dataset proíbe):
   - "Cristo Rei / Marau" → **Paróquia Cristo Rei**, `city: Marau`;
   - "Nossa Senhora da Glória | Carazinho" → **Paróquia Nossa Senhora da Glória**;
   - "Santo Antônio, de Santo Antônio do Palma" → **Paróquia Santo Antônio**;
   - "Nossa Senhora do Rosário (Pulador) União da Serra" → **Paróquia Nossa Senhora do Rosário**,
     `city: União da Serra`, `neighborhood: Pulador`;
   - "Santo Antônio - Vila Oeste" → **Paróquia Santo Antônio**, `city: União da Serra`,
     `neighborhood: Vila Oeste` (o histórico oficial confirma que Pulador e Vila Oeste são as duas
     localidades de União da Serra, ambas desmembradas de Guaporé);
   - "Santo Antônio | Santa Cecília do Sul e Água Santa" → **Paróquia Santo Antônio**, `city: Água
     Santa` (endereço oficial), mas a paróquia atende **dois municípios**;
   - "São José | Ernestina e Tio Hugo" → **Paróquia São José**, `city: Ernestina`, também atendendo
     dois municípios;
   - "Imaculado Coração de Maria - Victor Greff" → o rótulo escreve "Greff" e o endereço "Victor
     Graeff" (grafia correta do município); ficou `city: Victor Graeff`;
   - "Santo Antônio de Evangelista" → mantido o nome completo (**Paróquia Santo Antônio de
     Evangelista**), `city: Casca` — Evangelista é distrito de Casca, conforme o histórico oficial.
     Casca tem duas paróquias no dataset (esta e São Luiz Gonzaga).
   - "São João Batista de Boa Esperança - Colorado" → **Paróquia São João Batista de Boa Esperança**,
     `city: Colorado` ("Boa Esperança" parece fazer parte do título e não ser o município).
8. **CEP suspeito:** `nossa-senhora-do-rosario-uniao-da-serra` tem CEP **99200-000**, que é de Guaporé;
   a outra paróquia de União da Serra tem 99210-000. Conferir.
9. **Endereço sem logradouro (4):** `nossa-senhora-do-rosario-charrua`, `sao-jose-montauri`,
   `nossa-senhora-do-rosario-uniao-da-serra` e `santo-antonio-uniao-da-serra` — a ficha oficial traz
   apenas o município (e, nas duas de União da Serra, a localidade, que foi para `neighborhood`).
   `address` ficou `null`; o CEP, publicado, foi preservado.
10. **Paróquias sem pároco listado** (5): N. Sra. dos Navegantes/Barra Funda, Santo Antônio de
    Evangelista/Casca, Santo Antônio/Gentil, Santo Antônio/União da Serra e o Santuário. O bloco
    "Clero" dessas fichas está vazio ou só traz vigários.
11. **Nomes de clero envelhecem rápido** — `priestName` reflete a ficha oficial em 10/09/2026, mas as
    transferências no RS costumam ocorrer em janeiro.
