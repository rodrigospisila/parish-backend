# Relatório — Diocese de Guarulhos (SP)

Data da pesquisa: 2026-09-10. Arquivo de dados: `guarulhos.json`.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://diocesedeguarulhos.org.br/paroquias/ | Lista oficial agrupada em 6 foranias: 55 unidades | alta |
| https://diocesedeguarulhos.org.br/paroquias/`<slug>`/ (54 páginas) + https://diocesedeguarulhos.org.br/area-pastoral-sao-judas-tadeu/ | Nome, bairro, endereço, CEP, telefone/WhatsApp, e-mail, Instagram, ano de fundação/criação, padroeiro, pároco e demais clérigos, **horário de missas**, grupos e movimentos, **capelas e setores com endereço e horários próprios** | alta |
| https://diocesedeguarulhos.org.br/ (rodapé) | Cúria: Av. Gilberto Dini, 519, Jd. Bom Clima, 07122-210; (11) 2408-0403; curia@diocesedeguarulhos.org.br | alta |
| https://www.catholic-hierarchy.org/diocese/dgurl.html | Erigida 30/01/1981; 46 paróquias; Dom Edmilson Amador Caetano, O.Cist. (29/01/2014); 83 padres; 341 km² | media |
| https://en.wikipedia.org/wiki/Roman_Catholic_Diocese_of_Guarulhos | Confirmação de bispo, data de ereção e catedral | media |

Todas as 55 páginas foram lidas integralmente.

## Cobertura

- **Encontradas: 55 unidades** — 47 paróquias, 1 catedral, 3 santuários, 2 capelanias e 2 áreas pastorais.
- **Esperadas: 46 paróquias** (catholic-hierarchy). A lista oficial é mais recente e inclui unidades não paroquiais; adotada integralmente.
- Foranias: Imaculada 14, Rosário 8, Aparecida 6, Bonsucesso 12, Fátima 10, Carmo 5.
- Município: **Guarulhos** (100%) — a diocese cobre apenas esse município.
- Confiança dos registros de paróquia: **55 alta**, 0 media, 0 baixa.
- Preenchimento: endereço e pároco **55/55**; CEP 52/55; telefone 54/55; e-mail 51/55; ano 53/55.
- Comunidades: **171** = 55 matrizes + 109 capelas + 5 setores + 2 capelanias.
- Horários: **566** — 531 `MASS`, 17 `ADORATION`, 14 `ROSARY`, 4 `CONFESSION`. Confiança: **470 alta**, 96 baixa.
- Anos: de **1685** (Catedral N. Sra. da Conceição dos Guarulhos) a **2025** (Paróquia São Geraldo Majella, criada em 20/05/2025).

## O que foi e o que não foi importado dos "Grupos e Movimentos"

As páginas listam grupos com horário fixo (Legião de Maria, Grupo de Oração, Ministério Jovem, Pastoral da Criança…). **Só entraram os que correspondem aos tipos do modelo**: terço/rosário (`ROSARY`, 14), adoração (`ADORATION`, 17) e confissão (`CONFESSION`, 4). Reuniões de pastorais e movimentos foram descartadas — não são horários litúrgicos.

`CONFESSION` só aparece na Catedral porque é a única página com seção própria de confissões; as demais publicam confissão dentro de "ATENDIMENTO DO PADRE", que é atendimento geral de secretaria/aconselhamento e não foi convertido em horário.

## Horários `baixa` (96, todos MASS)

São missas de recorrência mensal publicadas com dia da semana: "1ª Sexta: 20h", "1º Sábado: 08h", "2ª e 4ª Terça às 20h", "1ª e 3ª Quarta às 19h30". Gravadas com o dia correto, `confidence: baixa` e o texto original em `notes` — mesmo bloco de decisão de produto do README (recorrência mensal não cabe em `MassSchedule`).

## Horários não importados (sem dia da semana)

Missas votivas por **dia do mês**, comuns nesta diocese:

- Dia 12 — N. Sra. Aparecida (Paróquia N. Sra. Aparecida, 20h).
- Dia 13 — Santa Luzia (Paróquia Santa Luzia, 15h e 19h30; Paróquia São Pedro Apóstolo, 15h30) e Santo Antônio (Paróquia Santo Antônio de Pádua, 19h30 em dia de semana).
- Dia 22 — Santa Rita (Paróquia Santa Rita de Cássia, 12h).
- Dia 28 — São Judas Tadeu (Paróquia São Judas Tadeu 19h30; Área Pastoral São Judas Tadeu 20h; **Santuário São Judas Tadeu**, que publica grade completa "quando o dia 28 cai durante a semana": 07h, 10h, 12h, 15h, 18h e 20h).
- Dia 29 — São Pedro (Paróquia São Pedro Apóstolo, 19h30).
- Paróquia N. Sra. Aparecida: "Missa Setorial — a cada quinze dias" (quinzenal, sem dia).
- Paróquia Sagrada Família: "1ª sexta: Sagrado Coração" (sem hora publicada).

## Decisões de nomenclatura

- Os títulos das páginas são **caixa alta**; foram convertidos para caixa de título com partículas em minúscula ("Paróquia Santa Cruz e N. Sra. Aparecida"). As abreviações da fonte ("N. Sra.", "Jd.", "Pq.") foram preservadas.
- `slug` = `<nome-sem-prefixo>-guarulhos`; com homônimos (4 "N. Sra. Aparecida", 3 "N. Sra. de Fátima", 3 "Santo Antônio", 3 "São Francisco de Assis", 2 "Santa Luzia", 2 "Sagrada Família", 2 "Sagrado Coração de Jesus", 2 "Santa Rita de Cássia", 2 "São Paulo Apóstolo", 2 "São Judas Tadeu"), **o bairro entra no slug em caso de colisão**. Todos os 55 slugs são únicos.
- Capelas e setores receberam prefixo `Capela …` / `Setor …` quando o nome publicado não o trazia.

## Dúvidas / validação humana

1. **Paróquia São Charbel é de rito maronita** — a página traz o subtítulo "Igreja Católica Apostólica Oriental Siríaco-Aramaica Maronita" e "Bispo Responsável: Dom Edgard Amine Madi" (Eparquia N. Sra. do Líbano). Está listada pela diocese latina, mas **não pertence à jurisdição de Guarulhos**. Mesmo caso das paróquias de rito ucraniano registradas no Paraná. Decidir se entra.
2. **Erro de digitação na fonte**: a página grafa "PARQUIA SANTO ANTÔNIO MARIA CLARET". Corrigido para "Paróquia Santo Antônio Maria Claret"; registrado aqui por transparência.
3. **3 unidades sem CEP publicado**: Paróquia Santa Rosa de Lima (Recreio São Jorge), Paróquia São Paulo Apóstolo (Parque Continental II), Área Pastoral São Judas Tadeu (Vila Rio de Janeiro).
4. **4 sem e-mail**: São Geraldo Majella, São Charbel, São Francisco Xavier, Área Pastoral São Judas Tadeu. São Geraldo Majella também é a única sem telefone — a página diz "Administração Geral: Santuário Bonsucesso".
5. **2 capelanias sem ano**: Capelania Militar N. Sra. Aparecida (Base Aérea de São Paulo — acesso restrito, checar se deve entrar no app) e Capelania N. Sra. Stella Maris.
6. **5 capelas sem endereço na fonte**: Capela Santa Genoveva (Área Pastoral São José), Capela Santa Francisca Xavier Cabrini e São José (Santa Luzia), Setor Santo Expedido — grafia da fonte, provavelmente "Expedito" — (Santo Antônio), Capela Mãe Rainha (São Francisco de Assis), Capelania N. Sra. Loreto (São Roque).
7. **Duas paróquias com nome quase igual**: "Paróquia São Geraldo Majella" (Ponte Alta, criada 2025) e "Paróquia São Geraldo Magela" (Ponte Grande) — grafias diferentes na fonte, unidades distintas. Confirmar.
8. **Catedral com ano 1685** conforme a página (fundação da povoação/igreja de N. Sra. da Conceição), não a ereção da diocese (1981).
9. **Ambiguidade em uma linha de horário da Paróquia N. Sra. de Fátima (Jd. Tranquilidade)**: "Quinta: 15h (Tarde da Misericórdia) – Adoração ao Santíssimo até às 18h – Atendimento de Confissões". Todos os horários de linhas que misturam missa/adoração/confissão foram gravados como `MASS` com `confidence: baixa` e o texto integral em `notes`.
10. **Áreas pastorais** (São José/Jd. Centenário e São Judas Tadeu/Vila Rio de Janeiro) não são paróquias canônicas — mesma decisão pendente das outras dioceses.
