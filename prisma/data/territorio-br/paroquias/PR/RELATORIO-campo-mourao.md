# Relatório de pesquisa — Diocese de Campo Mourão (PR)

Data da pesquisa: 2026-09-09. Arquivo de dados: `campo-mourao.json`.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://www.diocesecampomourao.org.br/paroquias | Listagem oficial das paróquias por decanato (5 decanatos, 43 páginas individuais) | alta |
| https://www.diocesecampomourao.org.br/paroquias/{id}/{slug} | Página de cada paróquia: nome, decanato, fundação, pároco, endereço, bairro, CEP, telefone, WhatsApp, e-mail, clero, "Horários de Missa na Matriz" | alta |
| https://www.diocesecampomourao.org.br/contato | Endereço, telefone e e-mail da Cúria | alta |
| https://www.diocesecampomourao.org.br/ | Bispo diocesano (Dom Evandro Luis Braun, 6º bispo) | alta |
| https://www.catholic-hierarchy.org/diocese/dcmmo.html | Nº esperado de paróquias (41 em 2023, Anuário 2024), datas, bispos | media |
| https://pt.wikipedia.org/wiki/Diocese_de_Campo_Mour%C3%A3o | Contexto histórico, área, arquidiocese metropolitana (Maringá) | media |
| https://viacep.com.br/ | Validação do município a partir do CEP quando o endereço não trazia a cidade | apoio |

O site oficial é gerado pela plataforma "Cúria Online do Brasil" e tem estrutura uniforme, o que permitiu
extração completa e sem ambiguidade dos campos.

## Cobertura

- **Paróquias encontradas: 43** (site oficial) — **esperadas: 41** (Catholic-Hierarchy, dados de 2023).
- Distribuição por decanato (site oficial): Campo Mourão 11, Engenheiro Beltrão 10, Juranda 5, Iretama 7, Goioerê 10.
  A Wikipédia cita "38 paróquias" e o decanato de "Ubiratã" — informação desatualizada; prevaleceu o site oficial.
- A diferença 43 × 41 é explicada pelas **duas paróquias de rito ucraniano** listadas no site diocesano
  (Santíssima Trindade, Campo Mourão; São Nicolau, Roncador), que canonicamente pertencem à eparquia ucraniana
  e não são contadas no Anuário Pontifício. Ficaram no dataset com `confidence: "baixa"` (não entram na carga).
- Confiança das paróquias: **41 alta**, 0 media, **2 baixa**.
- Comunidades/capelas: **0** — o site diocesano não lista comunidades de nenhuma paróquia; `communities: []`
  em todas (o importador cria a matriz). Não foram usados agregadores para comunidades.
- Horários: **268 registros** (todos MASS, todos na "Matriz"), sendo **233 alta** e **35 baixa**.
  Os 35 "baixa" são missas com recorrência mensal declarada na fonte (ex.: "1ª Sexta-feira do mês",
  "1º sábado do mês") — o esquema só representa recorrência semanal, então ficaram fora da carga
  automática, com a observação preservada em `notes`.

## Regras aplicadas

- Nome oficial do site, com prefixo padronizado. Única normalização: "Nossa Sra." → "Nossa Senhora"
  (Paróquia Nossa Senhora do Perpétuo Socorro e São João Paulo II). Grafia "Santo Antonio" (sem acento)
  mantida como no site (4 paróquias).
- `city` extraída do campo Endereço; quando o endereço não trazia a cidade, o município foi confirmado
  pelo CEP no ViaCEP (ver lista abaixo).
- `phone`: telefone fixo; quando a paróquia só informa WhatsApp, o WhatsApp foi usado (Rosário de Fátima,
  Santa Cruz, São João Batista/Moreira Sales).
- `website`: apenas quando a página cita URL (Facebook da Catedral São José e da Paróquia Santo Antonio/Ubiratã).
- `priestName`: campo "Pároco" ou "Administrador Paroquial" (Santa Cruz/Campo Mourão, São Gabriel Arcanjo/
  Ivailândia, Nossa Senhora da Guia/Boa Esperança). Nomes sem "Pe." como na fonte.
- `foundedYear`: ano do campo "Fundação".

## Registros que precisam de validação humana

1. **Paróquia Santíssima Trindade (Rito Ucraniano)**, Campo Mourão, e **Paróquia São Nicolau (Rito Ucraniano)**,
   Roncador — jurisdição (eparquia ucraniana × diocese latina). Marcadas `baixa`. Sem horários no site.
2. Cidade obtida pelo CEP (endereço sem cidade): Paróquia Nossa Senhora Mãe de Deus → Juranda (CEP 87355-000);
   Santíssima Trindade → Campo Mourão (87302-170); São Nicolau → Roncador (87320-000).
3. Paróquia Santa Teresinha do Menino Jesus e da Sagrada Face (Campina da Lagoa): a fonte traz dois e-mails
   (`financeiro.parstateresinha@gmail.com` e `par.teresinha@gmail.com`); gravado o segundo (geral).
4. Horários mensais/devocionais **não importados** (só constam aqui): Santa Rita de Cássia (Campo Mourão) —
   missa todo dia 22, 15h e 19h30; São João Batista (Peabiru) — Mãe Rainha, dia 18, 19h; São Judas Tadeu
   (Terra Boa) — dia 28, 19h30; São Francisco de Assis (Campo Mourão) — terça 07h é "Celebração da Palavra"
   (não é missa; excluída); Paróquia Santuário Nossa Senhora Aparecida — quarta 20h "Comunidades" (local
   não especificado; gravado como `baixa`).
5. O mesmo padre aparece como responsável por duas paróquias (padrão normal de paróquias agrupadas):
   Pedro Speri (N. S. das Graças e Santuário Santa Rita, Barbosa Ferraz); Willian Oliveira Lopes
   (N. S. das Graças, Engenheiro Beltrão, e adm. de São Gabriel Arcanjo/Ivailândia).
6. Confissões, adoração e terço: o site não publica horários fixos desses tipos; nenhum registro
   CONFESSION/ADORATION/ROSARY foi criado.

## Dúvidas abertas

- A diocese descreve o horário de "Atendimento" da secretaria em todas as páginas; não há campo no esquema,
  então foi descartado.
- Endereços de distritos (Ivailândia/Engenheiro Beltrão, Águas de Jurema/Iretama, Paraná d'Oeste/Moreira
  Sales) foram gravados com o distrito em `neighborhood` e o município em `city`.
