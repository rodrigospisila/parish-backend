# Relatório de pesquisa — Diocese de Paranavaí (PR)

Data da pesquisa: 2026-09-09. Arquivo de dados: `paranavai.json`.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://diocesedeparanavai.org.br/paroquias/ | Listagem oficial (4 decanatos, 36 unidades com página própria) | alta |
| https://diocesedeparanavai.org.br/paroquia/?paroquiaid={1..36} | Página de cada unidade: decanato, endereço/bairro, cidade, padroeiro, telefone, WhatsApp, e-mail, redes, site, atendimento, horários de missa (dia/hora/local/observação), governo paroquial, diáconos, comunidades | alta |
| https://diocesedeparanavai.org.br/horarios-de-missa/ | Página consolidada de horários (usada para conferência) | alta |
| https://diocesedeparanavai.org.br/contato/ | Endereço, telefone e e-mail da Cúria | alta |
| https://www.catholic-hierarchy.org/diocese/dprai.html | Nº esperado de paróquias (34 em 2023), datas | media |
| https://pt.wikipedia.org/wiki/Diocese_de_Paranava%C3%AD | Bispo (Dom Mário Spaki), área, província (Maringá) | media |

O site oficial também é da plataforma "Cúria Online do Brasil"; os horários estão estruturados
(dia da semana → hora → local → observação), o que dá confiança alta aos registros.

## Cobertura

- **Unidades encontradas: 36** — **paróquias esperadas: 34** (Catholic-Hierarchy, 2023).
- Distribuição (site oficial): Decanato de Paranavaí 10, Loanda 10, Paraíso do Norte 8, Terra Rica 8.
- A diferença 36 × 34 corresponde a: **Quase-paróquia São Francisco de Assis** (Paranavaí, criada em 2021)
  e **Capela São Benedito** (Nova Aliança do Ivaí), ambas com página própria no diretório de paróquias.
- Confiança das paróquias: **35 alta**, **1 media** (Capela São Benedito — status de paróquia incerto), 0 baixa.
- Comunidades: **16 comunidades** listadas em 11 paróquias (nomes oficiais do site); nessas 11 a matriz foi
  incluída explicitamente com `isMatriz: true`. As demais 25 ficaram com `communities: []`.
- Horários: **185 registros** (todos MASS), **166 alta** e **19 baixa**. Os "baixa" são missas com
  recorrência mensal declarada ("Somente na 1ª sexta-feira do mês", "último domingo" etc.), mantidas
  com a observação em `notes` para validação; o esquema só representa recorrência semanal.

## Regras aplicadas

- Nome da listagem oficial (as páginas 12 e 36 têm o título quebrado no site). "Quase Paróquia" →
  "Quase-paróquia". "Santuário Nossa Senhora do Carmo e Paróquia São Sebastião" mantido como no site.
- `address` / `neighborhood`: campo Endereço dividido no último " - " (rua e número / bairro ou distrito).
  O site não informa CEP (`zipCode: null` em todas).
- `phone`: Telefone fixo; na falta, "Celular"; na falta, WhatsApp (normalizado para (44) nnnnn-nnnn).
- `website`: campo Site quando existe (Catedral, Santuário do Carmo); senão a página do Facebook quando o
  identificador era limpo. Identificadores malformados foram ignorados.
- `priestName`: primeiro nome do "Governo Paroquial" (pároco/reitor). Diáconos não têm campo no esquema.
- Horário com local "Matriz" → `community` = nome da matriz (quando há comunidades listadas) ou "Matriz".
  Quando a observação cita uma comunidade listada, o horário foi atribuído a ela (ex.: Santuário do Carmo,
  domingo 09:00 na Comunidade São Vicente).

## Registros que precisam de validação humana

1. **Capela São Benedito** (Nova Aliança do Ivaí) — consta no diretório de paróquias com padre
   responsável (Pe. José Eraldo Germano da Silva), fundação 1959 e 6 horários; não é contada nas 34
   paróquias do Anuário. Gravada com `confidence: "media"`. Confirmar se é paróquia, quase-paróquia ou
   capela de outra paróquia.
2. **Quase-paróquia São Francisco de Assis** (Paranavaí) — status canônico de quase-paróquia (2021).
3. **Paróquia São João Batista (São João do Caiuá)** — página sem "Governo Paroquial"; `priestName: null`.
4. Comunidade "Comunicade São Vicente (Jardim São Vicente)" (Santuário do Carmo) — erro de digitação da
   fonte corrigido para "Comunidade São Vicente (Jardim São Vicente)".
5. Observações de horário que podem indicar outro tipo de celebração e foram mantidas como MASS com
   `notes`: Porto Rico, terça 19:30 "Terço dos homens" e quinta 19:30 "Grupo de oração após a missa";
   Catedral, 1ª quinta 19:30 "Adoração ao Santíssimo" (baixa); Santuário do Carmo, missas de semana
   "celebradas na Capela do Santíssimo" (atribuídas à matriz, nota mantida).
6. Padres responsáveis por duas unidades (normal em paróquias agrupadas): Pe. José Mário Fernandes
   (Santa Mônica e N. S. de Fátima/São José do Ivaí); Pe. Amarildo Isidorio da Silva (Paraíso do Norte e
   Mirador); Pe. Elfrem Soares do Nascimento (N. S. do Carmo/Paranavaí e São Pedro do Paraná).
7. Redes sociais com valor estranho no site (ex.: Facebook "http://1711046279111953", Instagram
   "@http://…") foram descartadas.

## Dúvidas abertas

- Nenhum horário de confissão/adoração/terço fixo é publicado de forma estruturada; nenhum registro
  CONFESSION/ADORATION/ROSARY foi criado.
- O campo "Atendimento" (secretaria) não tem correspondência no esquema e foi descartado.
