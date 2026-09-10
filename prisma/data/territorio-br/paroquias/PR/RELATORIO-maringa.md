# Relatório de pesquisa — Arquidiocese de Maringá (PR)

Data da pesquisa: 2026-09-09. Arquivo de dados: `maringa.json`.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://arquidiocesedemaringa.org.br/paroquias | Listagem oficial: 58 paróquias em 8 regiões pastorais | alta |
| https://arquidiocesedemaringa.org.br/paroquias/{id}/{slug} (58 páginas, ids 1–59 sem o 57) | Cidade, região pastoral, atendimento, fundação, pároco, endereço, bairro, CEP, telefones, e-mail, site, tabela "Horários de Missa na Matriz" e uma tabela por capela, clero | alta |
| https://arquidiocesedemaringa.org.br/horariosdemissa | Página consolidada por dia da semana (paróquia → capelas); usada para conferir as capelas e obter o endereço de cada capela (botão do mapa) | alta |
| https://arquidiocesedemaringa.org.br/curia e /contatos | Endereço, CEP, telefone, fax, e-mails e horário da Cúria | alta |
| https://catedraldemaringa.com.br/ e https://smariagoretti.com.br/ | Sites paroquiais usados para corroborar os horários publicados pela arquidiocese (100 % de coincidência nas duas) | alta |
| https://gcatholic.org/dioceses/diocese/mari1.htm | Nº esperado (58 "pastoral centres" em 31/12/2022), arcebispo | media |
| https://www.catholic-hierarchy.org/diocese/dmarg.html | Estatísticas (informa 105 paróquias em 2023 — incompatível com as demais fontes), endereço da Cúria com CEP 87013-260 | media |
| https://pt.wikipedia.org/wiki/Arquidiocese_de_Maring%C3%A1 | Histórico, sufragâneas (Campo Mourão, Paranavaí, Umuarama), catedral | media |

O site oficial (plataforma "Cúria Online do Brasil") está ativo — notícias datadas de 08 e 09/09/2026 —
e os horários são estruturados (tabela dia → horários, com observações), o que dá confiança alta;
a coincidência integral com os sites da Catedral e da Santa Maria Goretti confirma a atualidade.
CNBB Regional Sul 2 retornou HTTP 403 e não foi usada.

## Cobertura

- **Paróquias encontradas: 58** — **esperadas: 58** (GCatholic, 2022). O valor de 105 do Catholic-Hierarchy
  foi tratado como erro/estatística de outra natureza. Não há notícia de paróquia criada em 2025–2026.
- Distribuição por região pastoral (campo `pastoralRegion`, extra ao esquema): Jandaia do Sul 10,
  Nossa Senhora Aparecida 8, Santa Cruz 8, São José Operário 8, Catedral 7, Sarandi Nossa Senhora das
  Graças 7, Mãe de Deus 5, Paranacity 5. 26 municípios (o de maior número, Maringá, tem 27 paróquias).
- Confiança das paróquias: **58 alta**, 0 media, 0 baixa. Todas com endereço, telefone, e-mail,
  pároco e ano de fundação; 57 com CEP; 51 com bairro; 2 com site.
- Comunidades: **221** (58 matrizes com `isMatriz: true` + 163 capelas/comunidades em 46 paróquias),
  todas `alta` — só entraram as que a própria arquidiocese lista. 47 capelas têm endereço (botão do
  mapa da página de horários ou texto da página da paróquia); 4 capelas estão sem horário (item 5).
- Horários: **592 registros** (588 MASS, 4 ADORATION), todos `alta`, em todas as 58 paróquias.
  138 registros têm recorrência mensal declarada em `notes` ("1° domingo do mês", "1ª sexta-feira do
  mês", "2° e 4° sábados" etc.), mantida como nota porque o esquema só representa recorrência semanal.

## Regras aplicadas

- Nome: título da página, sem a cidade entre parênteses. "Catedral Metr. Basílica Menor Nossa Senhora
  da Glória" → "Catedral Metropolitana Basílica Menor Nossa Senhora da Glória". "Paróquia e Santuário
  Santa Rita de Cássia" mantido. Apóstrofo tipográfico de "Santo Cura d'Ars" normalizado.
- `city`: campo Cidade; "Aquidaban (Marialva)" → Marialva com `neighborhood` "Distrito de Aquidaban -
  Centro"; "Pres. Castelo Branco" → Presidente Castelo Branco.
- `phone` e `email`: texto oficial completo (a arquidiocese publica vários números com rótulos —
  fixo, WhatsApp, financeiro, catequese…). `website`: link "Visite o site" quando existe.
- `priestName`: campo "Pároco"; em duas paróquias o site traz "Administrador paroquial" (N. S. do
  Rosário/Floresta — Pe. Eneme Previl, SSST; N. S. do Rocio/Ivatuba — Pe. Michel Soares Severo dos
  Santos), gravado no mesmo campo sem anotação.
- Matriz: nome "Matriz <padroeiro>", "Catedral Basílica Menor Nossa Senhora da Glória" ou "Santuário
  Santa Rita de Cássia", sempre a primeira comunidade (o importador identifica a matriz pelo nome).
- Capelas: o título "Horários de Missa Capela X - Bairro" foi dividido em `name` ("Capela X") e
  `neighborhood` ("Bairro"). Quando a mesma paróquia tem duas capelas com o mesmo nome (ex.: Jandaia do
  Sul, "Capela Nossa Senhora Aparecida - Vila Paião/Maracanã/Barro Preto"), o nome completo foi mantido
  para o `community` do horário ser único. Sigla após o hífen virou parêntese: "Capela Sagrada Família
  (AMPAC)", "Comunidades Eclesiais de Base (CEBs)".
- Horários: "07h00" → "07:00"; itens separados por " | "; a observação após o horário foi preservada em
  `notes`. Tipo: ADORATION quando a nota é só adoração/Hora Santa ou traz a hora final da adoração
  (Floresta qui 15h e 19h30; Kaloré sex 17h–18h; Goretti 1ª sexta 08h30–18h30 na Capela Tenda do
  Perdão); notas que citam adoração em outra hora ("1ª sexta-feira do mês (19h - Adoração…)") ficaram
  MASS. Excluídos: 3 "Celebração da Palavra" (Goretti ter 19h; Divino Espírito Santo ter 19h; São José
  Operário ter 18h30 — não são Missa), missas por data do mês ("todo dia 12/22…"), missas da Quaresma e
  festas.
- Chave extra ao esquema do README: `pastoralRegion` (paróquia); o `import-territorio.ts` a ignora.

## Registros que precisam de validação humana

1. **Divergência de contagem** — 58 (site oficial e GCatholic) × 105 (Catholic-Hierarchy 2023).
2. **Paróquia Santa Paulina (Maringá)** — única sem CEP e sem bairro no site (Av. Mandacaru, 4213).
3. **"Comunidades" que não são capelas**, mantidas porque têm Missa fixa: Floresta — "Jardim Monte
   Verde", "Conjunto Imperial II", "Salão da Terceira Idade" (Conjunto Sol Nascente); Menino Jesus de
   Praga — "Cemitério Municipal de Maringá"; São Bonifácio — "Recanto Maria e José", "Salão Comunitário"
   (Parque Tarumã), "Comunidades Eclesiais de Base (CEBs)" e "Santuário da Mãe, Rainha e Vencedora Três
   Vezes Admirável de Schoenstatt de Maringá"; Santa Clara — "Comunidades Eclesiais de Base (CEBs)"
   (missas nas residências).
4. **Santuário de Schoenstatt (São Bonifácio)** — pelo nome, o `import-territorio.ts` (`isMatrizName`
   casa "santuário") vai atribuir o horário de sábado 17h dessa capela à matriz. Ajustar no importador
   ou renomear na validação.
5. **Capelas sem horário** (constam na página da paróquia, não na página de horários): Atalaia — Capela
   Santa Rita de Cássia; Kaloré — Capela Bom Jesus; Paranacity — Capela Sagrado Coração de Jesus;
   Sarandi/São Paulo Apóstolo — Capela Santo André.
6. **Endereços de capelas** — vêm do botão de mapa; quando o campo era só um nome de localidade foi
   descartado. Um endereço tem erro de digitação na fonte ("ua Jose Dias Gonçalves s/n", Capela N. S.
   Aparecida - Nova Bilac, Floraí) e foi mantido como está.
7. **Missas mensais** — 138 registros com nota de recorrência mensal (ver Cobertura); no Parish serão
   exibidos como semanais até que o esquema suporte recorrência.
8. **Cúria** — o site informa CEP 87001-970 (caixa postal); CNBB Sul 2 e Catholic-Hierarchy dão
   87013-260 para a Av. Tiradentes, 740. Fax (44) 3226-1667 e segundo e-mail curiamga@gmail.com
   não têm campo. Arcebispo: Dom Frei Severino Clasen, OFM.
9. **Confissões** — só a Catedral publica horário (campo "Atendimento": seg e sex 7h30–11h30 /
   14h–19h30; qua e qui 7h30–11h30 / 14h–18h, por ordem de chegada); por não ser estruturado, não foi
   gerado registro CONFESSION. Nenhum horário fixo de terço foi publicado.

## Dúvidas abertas

- A página /paroquias fala em regiões pastorais, mas a página /organizacao não lista foranias ou
  decanatos; o campo `pastoralRegion` reproduz o que a página de cada paróquia informa.
- Notas de horário com nome de devoção ("Santa Missa e Novena de N. S. do Perpétuo Socorro", "Santa
  Missa votiva de Santa Rita de Cássia", "Santa Missa da Catequese", "Santa Missa e Sacramento do
  Batismo") foram mantidas como MASS com a nota.
