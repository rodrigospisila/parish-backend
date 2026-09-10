# Relatório — Diocese de Campo Limpo (SP)

Data da pesquisa: 2026-09-10. Arquivo de dados: `campo-limpo.json`.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://dcl.org.br/paroquias (13 páginas, `?start=0…108`) | Lista oficial paginada: 112 paróquias + 1 unidade pastoral, com filtro por forania e cidade | alta |
| https://dcl.org.br/paroquias/`<slug>` (113 páginas) | Forania, igreja matriz, endereço, CEP, atendimento, telefones, e-mail, WhatsApp, data de criação, festa, pároco e vigários, **horário de missa da matriz, confissões, adoração** e lista de comunidades | alta |
| https://dcl.org.br/comunidades/`<slug>` (314 páginas) | Endereço e horário de missa de cada comunidade/capela | alta |
| https://dcl.org.br/ (rodapé) | Cúria: Rua Campina Grande, 400, Jd. Bom Refúgio, 05788-250, (11) 3584-9000 | alta |
| https://www.catholic-hierarchy.org/diocese/dcmli.html | Erigida 15/03/1989; 110 paróquias (ref. 2023); Dom Valdir José de Castro, S.S.P. (14/09/2022); 193 padres | media |
| https://en.wikipedia.org/wiki/Roman_Catholic_Diocese_of_Campo_Limpo | 110 paróquias e 1 missão | media |

**Todas as 113 páginas paroquiais e as 314 páginas de comunidade foram lidas integralmente.** Este é, de longe, o site diocesano mais completo dos três pesquisados nesta rodada.

## Cobertura

- **Encontradas: 113 entradas** = 112 paróquias + 1 Unidade Pastoral Nossa Senhora Aparecida (Forania Itapecerica).
- **Esperadas: 112** (declaração oficial "Somos 112 paróquias presentes nos 7 municípios") / 110 paróquias + 1 missão (catholic-hierarchy 2023). A listagem paginada devolve exatamente 112 paróquias — **cobertura integral**.
- Municípios (os 7 do território): São Paulo 71, Embu das Artes 13, Taboão da Serra 11, Itapecerica da Serra 10, Embu-Guaçu 4, Juquitiba 3, São Lourenço da Serra 1.
- Foranias: M'Boi Mirim 16, Morumbi 16, Campo Limpo 15, Embu das Artes 13, Itapecerica 13, Taboão da Serra 11, São José - CR 10, Mirim-Guaçu 10, São Luiz - CR 9.
- Confiança dos registros de paróquia: **113 alta**, 0 media, 0 baixa.
- Preenchimento: endereço, CEP, telefone, e-mail e ano de criação **113/113**; pároco **112/113**.
- Comunidades: **427** (113 matrizes + 314 comunidades/capelas com página própria). 12 paróquias têm só a matriz.
- Horários: **1.334** — 1.112 `MASS`, 137 `CONFESSION`, 85 `ADORATION`. Confiança: **1.193 alta**, 141 baixa.
- Anos de criação vão de **1795** (N. Sra. do Rosário, Embu das Artes) a **2023** (São Pedro e São Paulo).

## E-mails

O site ofusca os e-mails com o plugin `joomla-hidden-mail` (base64 no atributo `text=`). Os **113 e-mails foram decodificados** desse atributo — são os endereços que o próprio site entrega ao navegador, não inferência. Vale uma verificação por amostragem no enxame de validação.

## Horários `baixa` (124 MASS + 16 ADORATION + 1 CONFESSION)

São as entradas publicadas como **"Missas Ocasionais"** ou com recorrência mensal, que não cabem em `MassSchedule` (só dia da semana): "1ª Sexta-feira do mês às 20h", "3ª quinta-feira do mês às 19h30", "1º Sábado … às 11h". Foram gravadas com o dia da semana correto, `confidence: baixa` e o texto original em `notes`. É o mesmo bloco de decisão de produto já registrado no README (recorrência mensal).

Regra de desambiguação aplicada: um ordinal **seguido de nome de dia** ("1ª Sexta-feira") é ordinal de semana, não dia da semana; "5ª às 18h" isolado é quinta-feira. Sem essa regra, "1ª Sexta" viraria domingo.

## Horários não importados (sem dia da semana identificável)

- Recorrência por dia do mês: São Judas Tadeu ("todo dia 28 às 9h, 15h e 20h"), Santo Expedito ("todo dia 19 às 20h"), São José/Comunidade São João Batista ("todo dia 24 às 17h"), N. Sra. Aparecida e São Lourenço/Comunidade São Judas Tadeu ("todo dia 28 às 15h").
- Comunidades sem celebração no momento: Capela de São Lázaro (em reforma, N. Sra. do Rosário), Comunidade Santa Mônica e São Jorge (em construção, Santa Clara de Assis), Comunidade Santa Luzia (em construção, São Bento), Comunidade N. Sra. das Graças e Santa Terezinha ("sem missa no momento", São José), Comunidade Imaculado Coração de Maria ("confirmar na secretaria").
- **Paróquia Nossa Senhora do Rosário (Embu das Artes)**: as capelas operam em **rodízio** — "Quintas, 1ª Sextas e datas específicas … confirmar pelas redes sociais mês a mês (@rosario_de_embu)". Capela Santa Cruz e Centro Pastoral do Rosário ficaram sem horário.
- Adoração sem hora publicada: N. Sra. Aparecida Peri Peri ("1ª Quinta-feira do mês"), N. Sra. Rainha da Paz ("5ª, dia inteiro"), Santa Maria Goretti ("1ª Sexta-feira do mês"), Santa Terezinha ("todos os dias").

## Confissões sem horário fixo (42 paróquias)

42 páginas publicam confissão sem dia/hora: "Agendar na secretaria paroquial", "Antes das Santas Missas", "Após as Santas Missas", "Agendar por telefone ou WhatsApp". Não foram gravadas como horário — não há dia da semana. As 137 confissões do arquivo vêm das páginas que publicam dia e hora.

## Decisões de nomenclatura

- Nome exatamente como a diocese publica ("Paróquia Catedral Sagrada Família", "Paróquia da Divina Misericórdia", "Unidade Pastoral Nossa Senhora Aparecida").
- `slug` = `<nome-sem-prefixo>-<cidade>`; com 15 nomes repetidos na diocese (São José, São Sebastião, Santo Antônio, São Bento, São Pedro e São Paulo etc.), **o bairro entra no slug em caso de colisão**. Todos os 113 slugs são únicos.
- Matriz gravada como `Matriz <valor do campo "Igreja Matriz" da página>` — que às vezes difere do nome da paróquia (ex.: Paróquia Catedral Sagrada Família → "Catedral Santuário Sagrada Família").

## Dúvidas / validação humana

1. **Paróquia Santo Antônio de Pádua (Barnabés)** — a página traz "Centro - Barnabés - SP" sem município e CEP 06950-000. Barnabés é distrito de **Juquitiba** (faixa de CEP 06950), e foi assim gravado, mas a paróquia está na **Forania Itapecerica**. Confirmar o município. É também a única paróquia sem pároco publicado.
2. **Datas de criação malformadas na fonte**: "0812.2000" (N. Sra. Rainha da Paz) — lido como ano 2000. Foram aceitos anos a partir de 1500 porque há paróquias coloniais legítimas (1795 Embu das Artes, 1841 Itapecerica da Serra).
3. **Duas comunidades homônimas na mesma paróquia**: Paróquia N. Sra. dos Prazeres e Divina Misericórdia tem duas "Comunidade Nossa Senhora Aparecida" (páginas `…-19` e `…-20`, bairros Jd. Nissalves e Potuverá). A segunda foi renomeada para `Comunidade Nossa Senhora Aparecida (Potuverá)` para não colidir.
4. **Comunidade Nossa Senhora da Penha** (Paróquia N. Sra. dos Prazeres) está em **Cotia**, município fora dos 7 declarados pela diocese. Endereço mantido como publicado.
5. **Endereços da Cúria divergentes**: o site diz Rua Campina Grande, 400 – 05788-250; o catholic-hierarchy diz Rua Lira Paulista, 30 – 05788-320. Adotado o do site oficial (mais recente).
6. **Wikipédia em inglês localiza a diocese em "Campo Limpo Paulista"** — está errado: a sede é o distrito de Campo Limpo, zona sul da cidade de São Paulo. O `city` da diocese foi gravado como São Paulo.
7. **314 comunidades com página própria, mas só 281 aparecem no mapa** das páginas paroquiais (as demais não têm geocodificação). A lista textual foi adotada como autoritativa por ser superconjunto.
8. Telefones: gravado apenas o **primeiro** quando a página lista dois.
