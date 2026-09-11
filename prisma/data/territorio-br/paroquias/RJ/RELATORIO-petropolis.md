# Diocese de Petrópolis (RJ) — relatório de pesquisa

- Data da coleta: **2026-09-11**
- Arquivo: `paroquias/RJ/petropolis.json`
- Resultado: **49 paróquias**, **402 comunidades**, **503 horários fixos**

## Fontes

| Fonte | Uso |
|---|---|
| https://diocesepetropolis.com.br/lista-das-paroquias/ | Lista oficial "PARÓQUIAS NA DIOCESE DE PETRÓPOLIS" — 49 links, um por paróquia |
| https://diocesepetropolis.com.br/`<slug-da-paroquia>`/ | 49 fichas paroquiais: endereço, CEP, telefone/WhatsApp, e-mail, decanato, ano de elevação, pároco e vigários, diáconos, capelas/comunidades com endereço e (em 33 fichas) a grade de missas, confissões e adoração |
| https://www.catholic-hierarchy.org/diocese/dpetr.html | Número esperado de paróquias (48 em 2023) e dados da sé |

O site é WordPress/Elementor, estava no ar e respondia normalmente (sem bloqueio a leitor
automático). Não há API REST de tipo "paróquia" — o conteúdo foi lido das próprias páginas.
Todas as fichas carregam sinal de atualidade (notícias de 2026, Papa Leão XIV, bispo empossado
em 2024), por isso **toda a diocese entrou com `confidence: "alta"`**, exceto os horários de
recorrência mensal.

## Cobertura

| Métrica | Valor |
|---|---|
| Paróquias encontradas | 49 |
| Paróquias esperadas (catholic-hierarchy, 2023) | 48 |
| Paróquias com grade de missas publicada | 33 (67 %) |
| Paróquias sem nenhum horário publicado | 16 |
| Comunidades/capelas | 402 (inclui as 49 matrizes) |
| Horários | 503 — 426 MASS, 56 CONFESSION, 17 ADORATION, 4 ROSARY |
| Horários `alta` / `baixa` | 465 / 38 |

A diferença de 1 paróquia para o dado de 2023 é explicada pela **Paróquia São José de Água
Quente (Teresópolis), elevada em 2024** — a própria ficha informa o ano.

Cidades cobertas: Petrópolis (22), Teresópolis (11), Magé (9), Guapimirim (2), São José do Vale
do Rio Preto (2), Três Rios (1, distrito de Bemposta), Areal (1), Paraíba do Sul (1, distrito de
Inconfidência/Sebollas). Bate com os limites da diocese descritos pelo catholic-hierarchy.

### As 16 paróquias sem horário publicado

O bloco "Horário de Missa:" existe na ficha, mas está **vazio** no site — não é falha de coleta:

Nossa Senhora da Conceição (Bemposta/Três Rios), Nossa Senhora da Conceição e Santo Aleixo
(Magé), Nossa Senhora da Conceição (Nhunguaçu/Teresópolis), Nossa Senhora da Conceição (Raiz da
Serra/Magé), Nossa Senhora da Guia (Pacobaíba/Magé), Nossa Senhora das Dores (Areal), Nossa
Senhora de Fátima (Madame Machado/Petrópolis), Nossa Senhora de Lourdes (Araras/Petrópolis),
Nossa Senhora do Bom Sucesso (Teresópolis), Sagrado Coração de Jesus (Centro/Petrópolis), Santa
Rita de Cássia (Castrioto/Petrópolis), Santa Rita de Cássia (Meudon/Teresópolis), Santa
Terezinha do Menino Jesus (Vila Inhomirim/Magé), São Charbel (Pessegueiros/Teresópolis), São
Sebastião (Contendas/SJVRP), São Sebastião (Piabetá/Magé).

## Decisões tomadas

- **Nomes de comunidade duplicados dentro da mesma paróquia** foram desambiguados com a
  localidade entre parênteses — ex.: `Sant'Anna (Piedade)` e `Sant'Anna (Vila Inca)` em Nossa
  Senhora da Piedade/Magé; `São Sebastião (Meio da Serra)` e `São Sebastião (Fragoso)` em Raiz
  da Serra. Sem isso o importador não conseguiria ligar o horário à capela certa. O nome
  publicado está preservado no início da string.
- **Horários publicados por localidade** ("Capela Cascata do Imbuí", "Canoas", "Barra Mansa",
  "Poço Bento") foram ligados à comunidade correspondente da lista oficial e o rótulo original
  ficou registrado em `notes`.
- **Recorrência mensal/quinzenal** ("1ª e 3ª terça-feira", "todo primeiro sábado do mês",
  "quinzenalmente") → `confidence: "baixa"`, com a regra escrita em `notes`. São 38 registros.
  É o mesmo bloco que o README já sinaliza como pendente de modelagem.
- **Faixas de confissão/adoração** ("15h às 17h30") entraram com o horário de início e a faixa
  completa em `notes`.
- **Matriz**: cada paróquia recebeu uma comunidade `Matriz <dedicação>` com `isMatriz: true`, e
  os horários da "Igreja Matriz"/"Catedral" apontam para ela.
- **São Charbel de Pessegueiros e São Charbel do Caxambu são paróquias LATINAS da Diocese de
  Petrópolis**, não maronitas. Ambas aparecem na lista oficial da diocese, com decanato,
  e-mail `@diocesepetropolis.org.br` e pároco diocesano. **Não** receberam
  `status: "outra-jurisdicao"` — diferente dos casos de São Charbel em Campinas/Guarulhos/Mogi
  citados no README.
- Escolas paroquiais, creches, conventos, casas de formação e "comunidades religiosas"
  (congregações) **não** viraram comunidades — não são locais de celebração pública listados
  como capela.

## Precisa de validação humana

1. **Paróquia São Sebastião – Piabetá/Magé**: a ficha do site repete por engano o subtítulo e o
   ano da Paróquia São Sebastião do Indaiá ("Indaiá - Petrópolis", "elevada a Paróquia em 1912").
   Endereço, telefone, e-mail e clero são de Piabetá. Gravei `city: "Magé"`,
   `neighborhood: "Piabetá"` e `foundedYear: null`, com o aviso em `notes`. **Confirmar o ano.**
2. **Paróquia Santo Antônio – Paquequer/Teresópolis**: a ficha declara "Decanato São Pedro de
   Alcântara", mas a paróquia fica em Teresópolis, cujo decanato é Santa Teresa. Gravei o que o
   site diz, com aviso em `notes`.
3. **Paróquia São José – Água Quente**: a URL ainda é `quase-paroquia-sao-jose-agua-quente`,
   mas o texto diz "Foi elevada a Paróquia em 2024". Tratada como paróquia.
4. **Anos de fundação muito antigos** (1696 Piabetá e Magé, 1755 Guapimirim/Pacobaíba/Suruí,
   1815 SJVRP, 1839 Inconfidência) são anteriores à criação da diocese (1946) — são datas de
   criação da **paróquia**, não da diocese, e conferem com a história da região. Mantidos.
5. **Paróquia Nossa Senhora do Rosário (Centro/Petrópolis)**: a ficha lista
   "5ª feira – Adoração ………. 7h, 12h15 e 18h" nos mesmos horários das missas de quinta.
   Ambíguo (adoração ou missa?) — **não gravei ADORATION nesses três horários**, só as missas.
6. **Paróquia São Pedro – Pedro do Rio**: o bloco "Adoração" traz seis horários semanais, um
   deles sobreposto a missa. Gravei todos como ADORATION conforme publicado; vale conferir.
7. **Paróquia Sagrado Coração de Jesus – Barra do Imbuí/Teresópolis**: a "Capela do Sítio
   Assunção" aparece na grade de missas mas **não** na lista de capelas e comunidades. Criei a
   comunidade a partir do horário. Confirmar dedicação e endereço.
8. **Paróquia São José – Itaipava**: o bloco "Capelas e Comunidades Paroquiais" repete a grade
   de horários em vez de dar endereços. As 6 capelas ficaram com `address: null`.
9. **Santuário de Matosinhos** (igreja jubilar) foi gravado como comunidade da Paróquia
   Sant'Ana de Inconfidência, que é quem o administra e publica seus horários. O site da diocese
   também o lista em "Locais de Devoção". Se o Parish quiser santuário como entidade própria,
   este é um caso a rever (o mesmo vale para o Santuário Nossa Senhora do Amor Divino, cuja
   matriz **é** a paróquia homônima, já gravada como matriz).
10. Telefones gravados: quando a ficha trazia dois números ("(21) 2632-8665 / (21) 98828-0030"),
    ficou o fixo. O WhatsApp da secretaria não foi gravado em campo separado.
