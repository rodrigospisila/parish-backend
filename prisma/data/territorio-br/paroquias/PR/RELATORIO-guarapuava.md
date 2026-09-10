# Relatório — Diocese de Guarapuava (PR)

Data da pesquisa: 2026-09-09 (29 paróquias, agente anterior, interrompido) e 2026-09-10 (19 paróquias
restantes, cobertura e este relatório). Arquivo de dados: `guarapuava.json` (marcador `__CONTINUA__`
removido; arquivo reescrito completo).

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://diopuava.org/paroquias/ | Lista oficial: 53 unidades em 4 decanatos (Centro 15, Pinhão 13, Pitanga 15, Laranjeiras 10), com decanos | alta |
| https://diopuava.org/decanato-<decanato>/<slug-da-paróquia>/ (48 páginas) | Nome, endereço, CEP, telefone, e-mail, padres, data de criação, nº e (às vezes) lista de comunidades, horários | alta |
| https://diopuava.org/horarios-de-missas/ | Horários de missa de todas as 48 paróquias latinas (35 blocos por cidade; Guarapuava e Pitanga com blocos por paróquia) | alta |
| https://diopuava.org/ (rodapé), /bispo-diocesano/, /a-diocese/historico/ | Endereço/telefone/e-mail da Cúria; Dom Amilton Manoel da Silva, CP; criação 16/12/1965; "47 paróquias, 1.021 comunidades, 4 decanatos, 31 municípios" | alta |
| https://www.catholic-hierarchy.org/diocese/dgurp.html | 47 paróquias (2023) | media |
| https://pt.wikipedia.org/wiki/Diocese_de_Guarapuava | Corroboração de datas | media |

Não consultados/indisponíveis: `paroquiaquedas.com.br` (certificado TLS expirado); site
`paroquia-imaculada-conceicao-catholic-church.negocio.site` (Rio Branco do Ivaí; plataforma Google
descontinuada — mantido em `website` porque é o que a diocese publica); Anuário Católico; agregadores
de horários (não foram necessários — a diocese publica os horários de todas as paróquias).

## Cobertura

- **Encontradas: 48** paróquias latinas. **Esperadas: 47** (catholic-hierarchy 2023 e histórico
  diocesano). A diferença é a Paróquia N. Sra. do Perpétuo Socorro de Guarapuava, elevada em
  26/09/2023 (posterior à estatística).
- Por decanato (só rito latino): Centro 14 (Guarapuava, incl. Palmeirinha), Pinhão 11 (Prudentópolis,
  Pinhão, Entre Rios, Foz do Jordão, Candói, Inácio Martins, Turvo, Reserva do Iguaçu, Campina do
  Simão, Goioxim, Guará), Pitanga 14 (Pitanga 2, Manoel Ribas 2, Palmital, Cândido de Abreu, Rosário do
  Ivaí, Nova Tebas, Altamira do Paraná, Mato Rico, Santa Maria do Oeste, Laranjal, Boa Ventura de São
  Roque, Rio Branco do Ivaí), Laranjeiras 9 (Laranjeiras do Sul, Virmond, Marquinho, Quedas do Iguaçu,
  Porto Barreiro, Nova Laranjeiras, Cantagalo, Rio Bonito do Iguaçu, Espigão Alto do Iguaçu).
- **Excluídas (5)** — a lista oficial inclui paróquias de rito ucraniano, que pertencem às Eparquias
  ucranianas e não à Diocese de Guarapuava; ficaram fora do JSON para não serem importadas na
  circunscrição errada. Para o agente das Eparquias:
  - Paróquia Assunção de Nossa Senhora – Guarapuava — https://diopuava.org/decanato-centro/paroquia-assuncao-de-nossa-senhora-guarapuava-pr-rito-ucraniano/
  - Paróquia São Josafat – Prudentópolis — https://diopuava.org/decanato-pinhao/paroquia-sao-josafat-prudentopolis-pr/
  - Catedral Imaculada Conceição – Prudentópolis — https://diopuava.org/decanato-pinhao/catedral-imaculada-conceicao-prudentopolis-pr/
  - Paróquia Nossa Senhora da Glória – Pitanga — https://diopuava.org/decanato-pitanga/paroquia-nossa-senhora-da-gloria-pitanga-pr-rito-ucraniano/
  - Paróquia São José – Cantagalo — https://diopuava.org/decanato-laranjeiras/paroquia-sao-jose-cantagalo-pr-rito-ucraniano/
- Confiança das paróquias: **48 alta**, 0 media, 0 baixa (todas com página oficial ativa, endereço,
  telefone, e-mail, padres e data de criação).
- Comunidades: **215** (16 matrizes nomeadas; 213 alta, 2 media), em 16 paróquias. **32 paróquias**
  ficaram com `communities: []` porque a página oficial só informa a quantidade (ex.: Cândido de Abreu
  42 capelas, Quedas do Iguaçu 51, Santa Maria do Oeste 39, Nova Laranjeiras 38/39, Nova Tebas 24,
  Boa Ventura 22/24, Mato Rico 21, Espigão Alto 21, Marquinho 18, Porto Barreiro 18, Cantagalo 16/24,
  Altamira 11, Virmond 8/10, Rio Branco do Ivaí 7). A diocese declara 1.021 comunidades — a lista
  nominal só existe para uma fração.
- Horários: **260** (253 MASS, 5 ROSARY, 2 ADORATION): 243 alta, 7 media, 10 baixa; 14 com regra
  mensal em `notes`. Nenhuma paróquia ficou sem horário. A diocese não publica horário de confissão.

## Decisões de nomenclatura e território

- `Catedral e Santuário Diocesano Nossa Senhora de Belém` — nome como na lista oficial.
- `Paróquia Sant'Ana` (Guarapuava e Laranjeiras do Sul) e `Paróquia Sant'Ana e São Joaquim` (Pitanga) —
  o site grafa "Sant'ana"/"Sant´Ana"; normalizado para "Sant'Ana".
- `Paróquia e Santuário Nossa Senhora Aparecida` (Guarapuava) e `Paróquia e Santuário Nossa Senhora da
  Salete` (Barra Santa Salete) — nomes da lista oficial.
- Distritos gravados em `city` do município + `neighborhood`: Entre Rios, Palmeirinha e Guará →
  Guarapuava; Barra Santa Salete → Manoel Ribas.
- Santuário N. Sra. das Graças (Prudentópolis) e Santuário N. Sra. Aparecida do Passo da Reserva
  (Reserva do Iguaçu) gravados como comunidades das paróquias respectivas (mesmo endereço/telefone).
- Comunidades de Laranjeiras do Sul: abreviaturas do site expandidas ("N.Sra." → "Nossa Senhora",
  "Sto" → "Santo", "Ass." → "Assentamento", "Esp." → "Espírito").
- `priestName` traz pároco e vigários separados por ";", sem cargos (a página não os distingue).

## Horários — regras aplicadas

- Fonte primária: página diocesana de horários; quando a página da paróquia também traz horários e
  coincide, ambas foram citadas (alta). Divergências entre as duas fontes foram gravadas em dobro com
  confiança **baixa** e nota (Fátima 8h/8h30; Santos Anjos 17h/19h; Perpétuo Socorro Guarapuava 8h/7h30;
  Santa Terezinha segunda 19h; Sant'Ana Guarapuava 15h seg/qua/sex — bloco duplicado com Manoel Ribas).
- **Media**: Catedral sábado 10h30 (página diocesana repete os horários de domingo no sábado) e quarta
  15h (Novena Perpétua listada entre as missas); São João Bosco terça 19h30 (só na página diocesana);
  Reserva do Iguaçu domingo 15h (local não especificado — pode ser o Santuário do Passo da Reserva);
  Laranjeiras do Sul quarta/quinta/sexta 19h (página da paróquia diz "terça a sábado"; a diocesana
  lista só terça e sábado).
- **Gravados com nota de regra mensal** (14): Cândido de Abreu 1ª sexta 10h; Rosário do Ivaí 1ª sexta
  19h; Altamira 1ª sexta 15h; Santa Maria do Oeste 1ª sexta 19h; Boa Ventura sábado 19h (2º e 4º) e
  1ª sexta 15h; Rio Branco do Ivaí 1ª sexta 19h; Laranjeiras do Sul 1ª segunda 16h; Quedas do Iguaçu
  1ª sexta 18h e 3º domingo 9h30; Porto Barreiro 1ª sexta 18h30; Espigão Alto 1º domingo 19h; Inácio
  Martins sábado (2º–4º; 1º às 16h); Goioxim quinta 16h (última quinta às 19h).
- **Não gravados** (não têm dia da semana fixo): Pitanga Sant'Ana e Palmital "dia 22 de cada mês 19h";
  Pitanga Perpétuo Socorro "dias 22 e 27 às 19h30"; Barra Santa Salete "dia 19 às 9h"; Altamira "dia 12
  às 19h"; Rosário do Ivaí "quintas e sextas missa nas casas" (sem local fixo).

## Dúvidas / validação humana

1. Rosário do Ivaí: o cabeçalho da página traz Padre Paulo Fernando Francini (gravado), mas o histórico
   ainda cita Frei Margon Maykon Milleo e Frei Itacir Fontana, FMM; data de criação 15/04 vs 15/05/1974.
2. Rio Bonito do Iguaçu: "São Sebastião (Irmã Dulce)" e "Santa Dulce/São Sebastião" podem ser a mesma
   comunidade — a segunda ficou com confiança media.
3. Laranjal nomeia 15 de 18 comunidades; Pitanga – Perpétuo Socorro nomeia 26 de 28 (incl. matriz).
4. Porto Barreiro: paróquia renomeada em 2022 (era N. Sra. Auxiliadora); e-mail ainda
   `imaculadaauxiliadora@gmail.com`. Padre Mário Zavirski aparece também em Rio Bonito do Iguaçu.
5. Boa Ventura de São Roque publica dois e-mails (ambos gravados em `email`, separados por "/").
6. Quedas do Iguaçu: site próprio inacessível (certificado expirado); Rio Branco do Ivaí: site em
   plataforma descontinuada.
7. Sant'Ana (Guarapuava): o bloco de celebrações da página está duplicado com o de Manoel Ribas (nota do
   agente anterior) — horários de 15h ficaram baixa.
8. Nenhuma página informa horário de confissão; terços/adoração só em N. Sra. Aparecida (Guarapuava) e
   São Miguel Arcanjo (Entre Rios).
9. Padres refletem as páginas em 09–10/09/2026; conferir transferências do clero em 2026.
