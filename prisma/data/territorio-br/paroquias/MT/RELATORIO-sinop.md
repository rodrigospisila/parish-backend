# Relatório — Diocese de Sinop (MT)

Pesquisa em 2026-09-11. Arquivo: `sinop.json`.

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias no arquivo | 33 (todas `alta`) |
| Paróquias esperadas | 33 (CNBB Regional Oeste 2) / 34 (catholic-hierarchy, 2023) |
| Comunidades | 91 (74 `alta`, 17 `baixa`) |
| Horários fixos | 205 (36 `alta`, 26 `media`, 143 `baixa`) |
| Paróquias sem nenhum horário | 13 |
| Paróquias sem comunidade listada | 23 |

Tipos de horário: 166 MASS, 26 CONFESSION, 12 ADORATION, 1 ROSARY.
Foranias (registradas em `notes` de cada paróquia): Alta Floresta 7, Colíder 4, Juara 4,
Peixoto de Azevedo 7, Sinop 6, Vera 5.

## Fontes principais

- **Site oficial** — <https://diocesedesinop.com.br>. A REST API **não expõe** o custom post type
  `paroquia` (`/wp-json/wp/v2/types` só lista posts/páginas). O caminho que funcionou foi o
  **`paroquia-sitemap.xml` do Yoast**, que devolve as 33 URLs de `/paroquia/<slug>/`. Essas fichas
  são bem mais completas que as páginas de forania (`/foranias/...`, de 06/2020): trazem endereço
  com bairro, CEP, caixa postal, telefone, e-mail **@diocesedesinop.com.br**, pároco e vigários.
- <https://cnbbo2.org.br/diocese-de-sinop/> — ficha da CNBB RO2: **33 paróquias, ~1.200 comunidades,
  3 aldeias indígenas, 6 foranias**, endereço e telefone atuais da cúria. Foi a corroboração
  independente da contagem e a fonte dos dados da cúria.
- <https://www.catholic-hierarchy.org/diocese/dsino.html> — 34 paróquias (2023), 570.000 católicos,
  59 presbíteros, 191.039 km²; bispo **Dom Canísio Klaus** (desde 20/01/2016).
- **Sites oficiais de paróquia** (a única origem `alta` de horário):
  - <https://www.santoantoniosinop.org.br> — Paróquia Santo Antônio (Sinop): grade por comunidade,
    6 comunidades, notícias até 09/2024 e galerias até 05/2025.
  - <https://www.pspedrosorriso.com.br> — Paróquia São Pedro Apóstolo (Sorriso): grade por
    comunidade com **16 comunidades**.
  - <https://www.alodizimista.net> — Paróquia Santa Cruz (Alta Floresta): **51 comunidades**
    (18 urbanas + 33 rurais). A escala de missas é **mensal e publicada como imagem**
    ("ESCALA DE MISSAS MÊS DE MARÇO 2026"), ou seja, rodízio — não há grade semanal fixa.
- **Agregadores** (tudo o mais): <https://www.liriocatolico.com.br> (o melhor da rodada: traz
  comunidades/capelas separadas da matriz, Instagram, adoração e observações) e
  <https://www.horariodemissa.com.br>. <https://missahora.com.br> só tem 2 paróquias de Sinop e
  <https://missas.com.br> não tem nenhuma da diocese.

## Regra de confiança aplicada aos horários

Como a diocese **não publica horário nenhum**, foi usada esta regra, registrada aqui para o enxame
de validação:

- `alta` — grade do site oficial da própria paróquia (Santo Antônio/Sinop e São Pedro/Sorriso).
- `media` — o mesmo (tipo, dia, hora) aparece em **dois agregadores independentes**
  (Lírio Católico + Horário de Missa, ou + MissaHora).
- `baixa` — aparece em **um só** agregador, ou é recorrência mensal.

Resultado: só 62 dos 205 horários (30%) entram em produção. **Esta é a diocese mais frágil das
quatro desta rodada em matéria de horário.**

## Decisões tomadas

- **Recorrências mensais → `baixa`**, com a regra literal em `notes`: "1ª sexta-feira do mês",
  "1º sábado", "2ª quarta-feira", "3ª quarta-feira", "segunda segunda-feira", "penúltima quinta do
  mês", "2º e último domingo", "último domingo". São 59 registros. Região de fronteira agrícola:
  em Nova Canaã do Norte as três comunidades têm **só** missa mensal, e em Alta Floresta a
  paróquia inteira roda por escala mensal.
- **Missa por dia do mês descartada** (não cabe em `dayOfWeek`): Comunidade Nossa Senhora de
  Lourdes (Sinop) "dia 11 de cada mês, 19h30"; Santuário Nossa Senhora do Sorriso "dia 13 de cada
  mês, 19h"; Paróquia São Camilo "todo dia 14, 15h".
- **Sufixo de cidade removido do nome.** O site usa "Paróquia Santo Antônio – Paranaíta",
  "Paróquia Nossa Senhora Aparecida – Terra Nova do Norte" etc. para desambiguar homônimos;
  o sufixo saiu do `name` e foi para `city`/`slug`. Há 5 "Paróquia Santo Antônio", 3 "Paróquia São
  Pedro", 3 "Paróquia Nossa Senhora Aparecida", 2 "Paróquia São José" e 2 "Paróquia São Pedro
  Apóstolo" na diocese.
- **Paróquia São José / União do Norte** foi registrada com `city: "Peixoto de Azevedo"` e
  `neighborhood: "União do Norte"` — a sede fica no distrito.
- **Capela Todos os Santos (Sinop)** não virou paróquia: o site oficial da Paróquia Santo Antônio a
  publica como comunidade (`/comunidade/todos-os-santos/`), embora os agregadores a listem solta.

## Precisa de validação humana (prioridade alta nesta diocese)

1. **Todo o bloco de horários.** Só Santo Antônio (Sinop) e São Pedro Apóstolo (Sorriso) têm fonte
   oficial. **13 paróquias entram sem nenhum horário**: Santa Cecília (Apiacás), Santo Antônio
   (Paranaíta), São Paulo Apóstolo (Carlinda), São Pedro (Itaúba), Nossa Senhora dos Navegantes
   (Porto dos Gaúchos), Nossa Senhora Aparecida (Terra Nova do Norte), Nossa Senhora Aparecida
   (Peixoto de Azevedo), Nossa Senhora das Dores (Novo Mundo), Santo Antônio (Nova Guarita),
   São José (União do Norte), Nossa Senhora do Rosário (Guarantã do Norte), São Judas Tadeu (Vera)
   e São Pedro Apóstolo (Feliz Natal).
2. **Divergência frontal entre os dois agregadores** — tudo ficou `baixa` nestes casos:
   - **Nossa Senhora da Glória (Cláudia)**: Lírio Católico diz domingo 07h/19h, quarta 19h, sábado
     19h; Horário de Missa diz domingo 08h/19h30 e sábado 19h30. Nenhum horário coincide.
   - **Nossa Senhora Aparecida (Nova Ubiratã)**: 07h/19h/19h × 08h/19h30/19h30.
   - **São Camilo (Sinop)**: terça 06h15 × 06h30.
   - **Santa Cruz (Alta Floresta)** e **Imaculada Conceição (Marcelândia)**: quinta 19h × 19h30.
   - **Sagrado Coração de Jesus (Nova Canaã)**: quinta 19h30 × 19h.
   - **São Cristóvão (Sinop)**: quinta 19h (LC) × quarta 19h e sexta 16h (HM).
3. **Site diocesano parado.** O último post do portal é de **14/11/2022** e as fichas de paróquia
   têm `lastmod` de 22/02/2022; as páginas de forania, de 02/06/2020. Endereço, telefone, e-mail e
   pároco podem estar desatualizados em todas as 33 paróquias.
4. **Pároco falecido no diretório**: a ficha da Paróquia São Pedro (Nova Bandeirantes) ainda traz
   **Frei Gastone Pozzobon**, cuja nota de falecimento a própria diocese publicou em 19/06/2022.
   `priestName` ficou `null`.
5. **Mesmo pároco em duas paróquias**: Pe. José Roberto Domingos consta como pároco de Santa
   Cecília (Apiacás) **e** de Nossa Senhora Aparecida (Peixoto de Azevedo).
6. **Cobertura 33 × 34**: o catholic-hierarchy registra 34 paróquias em 2023. Falta identificar qual
   é a 34ª — provavelmente criada depois da última atualização do site.
7. **Endereço divergente da Paróquia São Pedro Apóstolo (Sorriso)**: o site próprio diz
   "Rua Cândido Rondon, 2845-B, Centro"; o diretório diocesano diz "Av. Natalino João Brescansim,
   1592". Ficou o do diretório diocesano.
8. **Comunidades de Sinop sem paróquia identificada.** O Lírio Católico lista, na cidade de Sinop,
   capelas com missa que não foi possível atribuir a uma paróquia (não há telefone ou site que as
   ligue): Capela São José Operário (Av. dos Pinheiros, 719 – Jardim Primavera, dom 09h30),
   Comunidade Santa Terezinha (Rua Espanha, 102, sáb 19h30), Comunidade Santo Inácio de Loyola
   (Jardim das Azaleias, sáb 19h30), Igreja Menino Deus (Av. das Itaúbas, 6124 – Jardim das
   Violetas, dom 07h30 e seg 19h), Igreja Mãe de Deus (Av. dos Ingás, 2234 – Jardim Maringá,
   dom 18h30) e Igreja Nossa Senhora de Fátima (Jardim das Nações II, sáb 19h30).
   **Ficaram de fora do arquivo** — são missas reais que o app perde.
9. **~1.200 comunidades × 91 registradas.** A CNBB informa cerca de 1.200 comunidades na diocese;
   só 91 estão aqui, e 74 delas vêm de três sites paroquiais. As outras 30 paróquias não publicam
   lista. É a maior lacuna do arquivo.
10. **CEP da Paróquia Santo Antônio (Sinop)**: o diretório diocesano traz 78550-320 e o site da
    paróquia 78550-230. Ficou o do site da paróquia (mais recente).
