# Relatório de pesquisa — Diocese de Apucarana (PR)

Data da pesquisa: 2026-09-09. Arquivo de dados: `apucarana.json`.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://diocesedeapucarana.com.br/paroquias | Listagem oficial por cidade (62 paróquias com página própria) | alta |
| https://diocesedeapucarana.com.br/paroquias/<slug> (62 páginas) | Nome, decanato, cidade, data de criação, endereço/CEP, telefones, e-mail, site, horário da secretaria, "Horário das Missas" (texto livre), funções (pároco, vigário, diáconos), histórico | alta |
| https://diocesedeapucarana.com.br/mapa-diocese | Estrutura por decanato; única fonte oficial da Paróquia São Miguel Arcanjo; "36 cidades e 62 paróquias" | alta |
| https://diocesedeapucarana.com.br/curia-diocesana | Endereço, CEP, telefone, e-mails da Cúria, bispo, vigário geral, chanceler | alta |
| https://www.santaritalunardelli.com.br/ | Horários de missa de Lunardelli (site paroquial ativo, posts de 09/2026) | alta |
| https://santuarioaparecidaastorga.com.br/secretaria/ | Horários de missa/confissão de Astorga (site paroquial; últimos posts 12/2024) | media |
| https://paroquiascjlobato.wixsite.com/pscj/diaconias | 8 diaconias de Lobato (site paroquial, © 2020) | media |
| https://www.catholic-hierarchy.org/diocese/dapuc.html | Nº esperado (64 em 2023), bispo, endereço/CEP/telefone da Cúria | media |
| https://gcatholic.org/dioceses/diocese/apuc0.htm | Nº esperado (64 em 31/12/2022) | media |
| https://pt.wikipedia.org/wiki/Diocese_de_Apucarana | 36 municípios, 64 paróquias, 6 decanatos, histórico | media |
| Jornal Repórter do Vale (03/11/2025), Nova Era News (03/11/2025), Encontra Apucarana (27/02/2026) | Criação/instalação da Paróquia São Miguel Arcanjo, pároco, endereço, paróquia de origem | media |

Descartadas: horariodemissa.com.br (Cristo Sacerdote — dados do período da pandemia; Lobato —
atualizado em 2014); o portal antigo `/portal/paroquia/...` retorna 404; o site de Borrazópolis
(imaculadaborrazopolis.com.br) responde com certificado inválido e página vazia; o site de Cambira
(paroquiasaojosedecambira.com) não resolve DNS; CNBB Regional Sul 2 retorna 403.

O site oficial dá sinal de atualidade: as transferências anunciadas em 01/11/2025 já aparecem nas
páginas (ex.: Colorado — Pe. Rafael Rabelo; Faxinal — Pe. Oscar Rodrigues de Souza; Perpétuo
Socorro — Pe. Junior da Rocha Fagioli; Godoy Moreira — Pe. Lucas Endo Arruda Nitsche; Catedral —
Pe. Mateus Fiuza como vigário). Por isso os horários publicados nele foram classificados como **alta**.

## Cobertura

- **Paróquias encontradas: 63** — **esperadas: 64** (Catholic-Hierarchy 2023 / GCatholic 2022 / Wikipédia).
  O próprio mapa oficial diz "62 paróquias" (não conta a São Miguel Arcanjo). A 64ª unidade não foi
  localizada em nenhuma fonte; candidatas verificadas e descartadas: Rosário do Ivaí (pertence à
  Diocese de Guarapuava) e a igreja Sagrado Coração de Jesus da Colônia Esperança, em Arapongas
  (virou mosteiro em 2023; a Paróquia Santa Rita de Cássia absorveu o antigo curato).
- Distribuição por decanato (campo `deanery`, extra ao esquema): Apucarana 15, Norte 14,
  Centro-Norte 11, Sul 11, Centro 6, Centro-Sul 6. 36 municípios (bate com a Wikipédia).
- Confiança das paróquias: **61 alta**, **2 media** (Paróquia Espírito Santo — Rito Ucraniano;
  Paróquia São Miguel Arcanjo), 0 baixa.
- Comunidades: **122** (62 matrizes + 60 capelas/comunidades/diaconias em 20 paróquias; 111 alta,
  11 media). Só as nomeadas em fonte oficial foram incluídas. 21 comunidades estão sem horário
  (as 11 diaconias de Godoy Moreira e as 8 de Lobato, citadas sem horário; "Igreja Santo Expedito
  (em obras)" e "Capela Santa Filomena (chácara)" da Paróquia N. S. Aparecida de Apucarana).
  As demais 42 paróquias ficaram só com a matriz (`isMatriz: true`).
- Horários: **361 registros** (353 MASS, 4 ADORATION, 4 CONFESSION): **330 alta**, **22 media**
  (Astorga, site paroquial sem sinal de atualidade) e **9 baixa** (novenas semanais em que a fonte
  não diz explicitamente que há Missa — ver item 5 abaixo). 24 registros têm recorrência mensal
  declarada em `notes` ("1ª sexta-feira do mês", "2º e 4º domingos" etc.); o esquema só representa
  recorrência semanal, então ficaram com a nota para validação.
- 10 paróquias sem nenhum horário (campo vazio no site diocesano e nada oficial encontrado):
  Cristo Sacerdote (Apucarana), Imaculada Conceição (Borrazópolis), N. S. Aparecida (Cruzmaltina),
  N. S. de Lourdes (Jacutinga/Ivaiporã), Sagrado Coração de Jesus (Lobato), Santo Antônio
  (Pitangueiras), São José (Arapuã), São José (Cambira), Espírito Santo — Rito Ucraniano
  (Apucarana) e São Miguel Arcanjo (Apucarana).

## Regras aplicadas

- Nome: título da página de detalhe, normalizado ao prefixo padrão. "Catedral Basílica Menor Nossa
  Senhora De Lourdes" → "…de Lourdes"; "Paróquia Nossa Senhora Aparecida - Santuário (Padres
  Palotinos)" → "Paróquia Santuário Nossa Senhora Aparecida" (forma usada no mapa oficial e no site do
  santuário); "Paróquia São Vicente Pallotti (Padres Palotinos)" → sem o parêntese; "Rito Ucraniano /
  Igreja Espírito Santo" → "Paróquia Espírito Santo (Rito Ucraniano)"; "Paróquia São Sebastião -
  Santuário Nossa Senhora Aparecida" → "Paróquia São Sebastião e Santuário Nossa Senhora Aparecida"
  (forma do mapa). A listagem chama a paróquia de Apucarana de "N. S. de Fátima" e o mapa de "N. S. do
  Rosário de Fátima"; ficou o nome da página de detalhe.
- `city` = município. Os três "distritos" da listagem viraram município + `neighborhood`: Aricanduva →
  Arapongas; Jacutinga → Ivaiporã; Pirapó → Apucarana. "Nossa Sra. das Graças" → "Nossa Senhora das
  Graças".
- `address`: primeira linha do campo Endereço (rua/número); bairro após " - " ou linha própria →
  `neighborhood`; "Caixa Postal" descartada; CEP normalizado para NNNNN-NNN. Dois CEPs malformados na
  fonte ficaram `null`: Imaculado Coração de Maria ("86806-12") e Santo Antônio de Pádua/Arapongas
  ("868705-030").
- `phone`: prefixos "Fone:", "Fone/fax:", "celular:" removidos; todos os números e rótulos mantidos
  (ex.: "Secretaria Principal: … | Dízimo: …"). `email`: todos os endereços do campo, separados por " / ".
- `website`: campo Site com esquema https:// (o "Face: https:www.facebook.com/…" de Coração Eucarístico
  foi corrigido); Astorga apontado para o domínio atual (santuarioaparecidaastorga.com.br — o antigo
  redireciona).
- `priestName`: função "Pároco" (na Catedral, "Cura"); quando só há "Administrador Paroquial" o nome vem
  com o sufixo "(administrador paroquial)" — Maria Mãe da Unidade/Faxinal, São Francisco de
  Assis/Godoy Moreira e São Judas Tadeu/Grandes Rios. O site omite o título na maioria dos nomes;
  foi acrescentado "Pe." quando não havia título ("Padre" → "Pe.", "Monsenhor" → "Mons.").
- `foundedYear`: campo "Data de Criação". Em Maria Mãe da Unidade o campo diz 1972 mas o histórico
  diz duas vezes 1979 (instalada em 1980) → 1979. O campo "Data de Instalação = 16/05/2025", igual em
  quase todas as páginas, é a data de migração do site e foi ignorado.
- Horários: transcritos manualmente do texto livre "Horário das Missas" (não há estrutura). Intervalos
  ("Segunda a Sexta") expandidos; "Igrejinha" = matriz da N. S. Aparecida de Apucarana; horário com
  local nomeado vai para a comunidade correspondente. Excluídos: missas por data do mês ("todo dia
  11/12/19/22/04"), Quaresma, batizados/casamentos, "missas nas diaconias"/"uma vez por mês nas
  capelas" (sem nome nem dia), Califórnia domingo 09h ("somente no período de pandemia") e as notas
  sobre transmissão por rádio/redes.
- Comunidades chamadas de "diaconia" pela fonte (termo local para comunidade de base) foram mantidas
  com esse nome: Pirapó (2), Ângulo (1), Santo Inácio (1), Santuário São José (2), Godoy Moreira (11),
  Lobato (8).
- Chaves extras ao esquema do README: `deanery` (paróquia) e `notes` em duas comunidades; o
  `import-territorio.ts` as ignora.

## Registros que precisam de validação humana

1. **Paróquia São Miguel Arcanjo (Apucarana)** — `media`. Consta só no mapa oficial. Criada em
   01/11/2025 (desmembrada da Paróquia Cristo Profeta) e instalada em 01/03/2026 com Pe. Nelson
   Muchenski; endereço da sede provisória (Rua Cristiano Kussmaul esq. Rua Francisco Vitali, Jardim
   Interlagos) vem da imprensa; sem CEP, telefone, e-mail ou horários. As comunidades "São Miguel" e
   "Santa Edwiges", ainda listadas na página de Cristo Profeta, provavelmente passaram à nova paróquia
   — foram mantidas em Cristo Profeta com `media`.
2. **Paróquia Espírito Santo (Rito Ucraniano)** — `media`. Listada pelo site diocesano (Apucarana,
   Decanato de Apucarana, Pe. José Hadada), mas paróquias de rito ucraniano pertencem canonicamente à
   Eparquia São João Batista (Curitiba). Confirmar se deve entrar como paróquia desta diocese.
3. **Paróquia Nossa Senhora do Bom Conselho (Apucarana, criada em 25/03/2023)** — página sem endereço
   (`address`/`zipCode` null); a listagem a agrupa sob Arapongas, mas a página de detalhe e a imprensa
   dizem Apucarana (bairro Vila Reis, segundo o histórico do Santuário São José).
4. **64ª paróquia** — não localizada (ver Cobertura).
5. **Novenas sem Missa explícita** (`baixa`, tipo MASS): Imaculado Coração de Maria qua 20h;
   N. S. das Graças (Nossa Senhora das Graças) qui 20h; N. S. de Fátima/Apucarana qua 20h; N. S. do
   Perpétuo Socorro/Apucarana qua 20h; Santíssima Trindade/Arapongas qui 19h; São Sebastião/Guaraci
   qua 19h30; São Sebastião/Munhoz de Mello qua 15h; Astorga qua 15h e 19h.
6. **Santo Antônio de Pádua (Arapongas)** — "Sábado: 19h30 e Capela São Pedro" é ambíguo; o horário
   da Capela São Pedro foi gravado com `media`.
7. **Astorga** — todos os horários (`media`) vêm do site paroquial, cuja última atividade visível é de
   12/2024; inclui confissões seg/qua/qui/sex 09h30–17h30 e a Comunidade São Luiz e Santa Zélia.
8. **São Benedito (Apucarana)** — "Quinta-feira às 7h (após adoração ao Santíssimo até as 15h)"
   gravado como MASS 07:00 com a nota; não foi criado registro ADORATION por falta de hora de início.
9. **CEPs** — dois malformados na fonte (item acima); N. S. Aparecida/Apucarana e Bom Conselho sem CEP.
10. **Cristo Sacerdote** — o histórico fala em "9 comunidades, 33 diaconias urbanas e 3 rurais", mas
    nenhuma é nomeada; `communities` só com a matriz.
11. **Diaconias de Godoy Moreira e Lobato** — nomes oficiais, sem endereço nem horário; confirmar se
    devem ser cadastradas como comunidades no Parish.
12. **Cúria** — endereço/CEP do site (Rua José Miskowski, 240 - Jardim Malibu, 86812-285); e-mail geral
    contato@…; a chancelaria usa chancelaria@diocesedeapucarana.com.br. Bispo: Dom Carlos José de Oliveira.

## Dúvidas abertas

- O site publica "Horário da Secretaria" e "Assistente da Secretaria" (sem correspondência no esquema;
  descartados). Confissões fixas só aparecem em Astorga; adoração fixa em N. S. Aparecida/Apucarana
  (qui 08h–17h), Colorado (qui 08h–19h), Santa Rita/Arapongas (qui 08h–19h) e Santo Antônio/Arapongas
  (qui 15h–19h) — gravadas como ADORATION com a hora inicial.
- Vários horários noturnos de inverno/verão (São João do Ivaí: dom 19h30 no inverno, 20h no verão)
  foram gravados com o horário de inverno e a nota.
