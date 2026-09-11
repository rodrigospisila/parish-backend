# Diocese de Luziânia (GO) — relatório de pesquisa

- Agente de pesquisa, rodada **Goiás**, coleta em **11/09/2026**.
- Arquivo: `paroquias/GO/luziania.json`.

## Números

| Item | Valor |
|---|---|
| Paróquias no arquivo | **36** |
| Confiança das paróquias | 36 `alta` |
| Municípios cobertos | 9 |
| Comunidades/capelas | **291** (36 matrizes + 255 capelas) |
| Horários fixos | **578** (473 `alta` · 105 `baixa`), todos missa |
| Paróquias com pelo menos 1 horário | 36 de 36 |
| Paróquias com capelas listadas | 35 de 36 |
| Com endereço 36 · CEP 30 · telefone 35 · e-mail 35 · pároco **36** · ano de criação 1 |

## Fontes principais

1. **Portal oficial** — `https://diocesedeluziania.com.br`
   - `wp-json/wp/v2/paroquias?per_page=100` → **as 36 paróquias com o conteúdo inteiro em
     `content.rendered`**: pároco, vigários, igreja matriz, horário de missa da matriz, endereço
     com CEP, telefone, e-mail, Instagram, território paroquial (bairros) e a seção
     *"Capelas e Horários das Missas"* com nome da capela, bairro e grade de missa.
     Foi a coleta mais direta desta rodada: **uma requisição resolveu a diocese inteira**.
   - `wp-json/wp/v2/foranias` → as 8 foranias (Águas Lindas 7, Cidade Ocidental 6, Cristalina 4,
     Luziânia 7, Novo Gama 2, Padre Bernardo 2, Santo Antônio do Descoberto 3,
     Valparaíso do Goiás 5). Cada paróquia carrega a sua em `notes`.
   - `wp-json/wp/v2/missas` (33 itens) — duplica a grade de missa das mesmas paróquias; não
     acrescentou nada e não foi usado.
   - `/about/` → cúria, catedral (Nossa Senhora da Evangelização), criação em 29/03/1989 e a
     lista dos 9 municípios.
2. **catholic-hierarchy.org** (`/diocese/dluzi.html`) — 33 paróquias (2023), 608.300 católicos,
   sufragânea de Brasília, bispo Dom Francisco Agamenilton Damascena.

### Truques que fizeram diferença (para o README)

- **Post type dedicado + conteúdo completo no `content.rendered`**: quando o site expõe um CPT
  próprio (`/wp-json/wp/v2/paroquias`), vale checar se o corpo já traz tudo antes de abrir ficha
  por ficha — aqui as 36 fichas vieram numa chamada de 160 KB, sem raspar HTML.
  O `X-WP-Total` confirmou a completude (36).
- **A grade de capela vem como texto corrido em uma linha** ("Nome da capela – Bairro" numa linha,
  "Terça-feira 19h30 / Domingo 08h30" na seguinte). O separador é `/`, mas há blocos sem `:`
  ("Domingo 08h") e blocos com dois dias grudados; o parser precisa quebrar também em nome de dia
  depois de uma hora.

## Cobertura vs. esperado

- **36 encontradas** contra 33 da catholic-hierarchy (2023) e 32 na página "A Diocese" do próprio
  portal (dado de 2015). A diferença é crescimento recente — a diocese foi erigida em 1989 e está
  na região de maior expansão urbana do Entorno do DF. Cobertura da LISTA: **completa**.
- Municípios com paróquia no arquivo: Luziânia (9), Águas Lindas de Goiás (6), Valparaíso de
  Goiás (5), Cidade Ocidental (4), Cristalina (3), Novo Gama (3), Santo Antônio do Descoberto (3),
  Padre Bernardo (2) e Ipameri (1 — ver abaixo).

## Pontos para validação humana

1. **Paróquia Bom Jesus da Lapa — município fora da diocese.** A ficha oficial dá o endereço
   "Av. Parnaíba, 133, Centro, **Distrito Domiciano Ribeiro**, CEP 75.784-000, **Ipameri** –
   Goiás", e a paróquia está na Forania Cristalina. Mas Ipameri **não** está entre os 9 municípios
   que a própria diocese declara em `/about/` (Águas Lindas, Cidade Ocidental, Cristalina,
   Luziânia, **Mimoso de Goiás**, Novo Gama, Padre Bernardo, Santo Antônio do Descoberto,
   Valparaíso). Domiciano Ribeiro é distrito de Ipameri e faz divisa com Cristalina, então pode
   ser um arranjo pastoral real — ou erro de cadastro. `city` ficou como publicado ("Ipameri") e
   `neighborhood` como "Domiciano Ribeiro (distrito)".
2. **Mimoso de Goiás sem paróquia.** É um dos 9 municípios da diocese e não tem paróquia própria
   no arquivo. Aparece apenas como localidade de capela da Paróquia Divino Espírito Santo
   (Padre Bernardo): "São Sebastião — 1º Sábado 09h (Bebedouro) / Domingo 17h (Mimoso)".
   Confirmar se Mimoso de Goiás é atendido por Padre Bernardo.
3. **Bispo**: o arquivo registra **Dom Francisco Agamenilton Damascena** (catholic-hierarchy,
   nomeado em 2025), mas a página `/about/` do próprio portal ainda traz Dom Waldemar Passini
   Dalbello "desde 12/07/2017" — que em 11/11/2025 passou a bispo de Anápolis. A página da diocese
   está desatualizada; vale conferir a data exata da posse de Dom Agamenilton.
4. **105 horários `baixa` = recorrência mensal/quinzenal.** É o padrão na zona rural desta
   diocese: "1º Sábado 16h", "2º Sábado 16h", "3ª Sexta-feira 19h30", "Última Terça-feira 19h30",
   "4º Domingo 11h30". A Paróquia Bom Jesus da Lapa chega ao extremo: as 7 capelas da zona rural
   têm "Missa uma vez ao mês, em cada uma destas localidades com calendário previamente definido
   pelo padre com a comunidade" — texto que foi para `notes` e não virou horário. Mesmo bloqueio
   de modelagem já registrado no README (`MassSchedule` só tem dia da semana).
5. **1 horário descartado** por não ter dia da semana: "Todos os dias 22, 19h30" na comunidade
   São João Paulo II (Jardim América IV) da Paróquia São Francisco de Assis de Águas Lindas —
   recorrência por dia do mês.
6. **Capelas sem endereço**: a diocese publica o bairro junto do nome ("São Pedro e São Paulo –
   Jardim Ingá"), não o logradouro. O bairro foi para `neighborhood` da comunidade; `address`
   ficou `null` nas 255 capelas.
7. **`foundedYear` quase vazio (1 de 36)**: só a Paróquia Nossa Senhora Aparecida do Setor Fumal
   (Luziânia) publica "Data da criação: 07/08/2005".
8. **Telefone malformado na fonte**: Paróquia Nossa Senhora de Guadalupe (Luziânia) publica
   "61 9.9881/5398" — gravado como "61 9.9881 / 5398", precisa de conferência.
   A Paróquia Bom Jesus da Lapa ficou sem telefone porque o campo publicado é
   "64 9.8443-3263 – 07h às 11h e 13h às 17h" e o horário de expediente foi removido.
9. **Nomes**: os títulos do portal são todos em CAIXA ALTA e foram convertidos para Title Case
   com preposições em minúscula. Dois registros publicados como "PARÓQUIA SANTUÁRIO …" viraram
   "Santuário Santa Luzia" e "Santuário Santo Antônio" (o prefixo "Paróquia Santuário" é
   redundante); "PARÓQUIA NOSSA SENHORA DA EVANGELIZAÇÃO" virou **"Catedral Nossa Senhora da
   Evangelização"**, porque o próprio corpo da ficha se apresenta como "Catedral Nossa Senhora da
   Evangelização" e é a catedral da diocese.
10. **Três pares de paróquias homônimas no mesmo município** (Nossa Senhora Aparecida em Luziânia,
    São Maximiliano Maria Kolbe em Águas Lindas × Valparaíso, Sagrado Coração de Jesus em Águas
    Lindas × Valparaíso). Os `slug`s foram desambiguados pelo bairro.
