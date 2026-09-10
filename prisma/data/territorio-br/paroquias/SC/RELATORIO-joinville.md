# Arquidiocese de Joinville (SC) — relatório de pesquisa

- **Arquivo**: `paroquias/SC/joinville.json`
- **Data da coleta**: 2026-09-10
- **Circunscrição**: Arquidiocese de Joinville — arquidiocese metropolitana desde 05/11/2024
  (bula de elevação do Papa Francisco; posse de Dom Francisco Carlos Bach como arcebispo em
  23/02/2025). Sufragâneas: Blumenau e Rio do Sul. Sé: Catedral São Francisco Xavier, Joinville.

## Resumo

| Item | Total |
|---|---|
| Paróquias | **67** (67 `alta`, 0 `media`, 0 `baixa`) |
| Comunidades | **484** (67 matrizes + 417 comunidades/capelas) |
| Horários fixos | **876** (504 `alta`, 0 `media`, 372 `baixa`) |
| Cobertura | 67 encontradas / 67 esperadas (site oficial) |

Tipos de horário: 850 `MASS`, 16 `ADORATION`, 8 `ROSARY`, 2 `CONFESSION`.

Distribuição por comarca (divisão do próprio site): Joinville Norte 17, Joinville Sul 16,
Jaraguá do Sul 13, São Francisco do Sul 9, São Bento do Sul 7, Mafra 5.
Composição: 1 catedral (São Francisco Xavier/Joinville), 4 santuários (Sagrado Coração de
Jesus/Bucarein-Joinville, Senhor Bom Jesus/Araquari, Nossa Senhora da Graça/São Francisco do Sul e
Nossa Senhora Aparecida/Mafra) e 62 paróquias, distribuídas em 18 municípios.

## Fontes principais

Toda a base veio do **site oficial da arquidiocese** — não foi necessário recorrer a agregadores.

| Fonte | Uso |
|---|---|
| https://www.arquidiocesejoinville.com.br/paroquias | Índice das 67 paróquias, agrupadas em 6 comarcas |
| https://www.arquidiocesejoinville.com.br/paroquia/`<slug>` (67 páginas) | Nome, bairro, cidade, endereço, telefone, e-mail, pároco/vigários/diáconos, lista de comunidades com endereço e telefone, e horários de missa da matriz e de cada comunidade |
| https://www.arquidiocesejoinville.com.br/endereco e /telefones | Endereço e telefone da Cúria |
| https://www.arquidiocesejoinville.com.br/pagina/arcebispo | Biografia e confirmação do arcebispo e da data de elevação |
| https://www.catholic-hierarchy.org/diocese/djoin.html | Corroboração: 65 paróquias (2023), CEP da Cúria (89201-974), elevação em 05/11/2024 |
| https://pt.wikipedia.org/wiki/Arquidiocese_de_Joinville | Corroboração: criação em 17/01/1927, sé, sufragâneas, 18 municípios |

**Sinal de atualidade**: as páginas paroquiais trazem notícias datadas até 2026 (ex.: 19/06/2026,
14/04/2026), e a página da Paróquia Sagrado Coração de Jesus (Bateias de Baixo) registra a criação
da paróquia em 02/02/2025. Por isso os horários semanais foram classificados como `alta`, conforme
o README (publicação oficial com sinal de atualidade).

## Cobertura

- O site lista **67 paróquias**; todas as 67 foram lidas individualmente e estão no dataset.
- catholic-hierarchy.org registra **65** paróquias, mas o dado é de 2023 — anterior à criação da
  **Paróquia Sagrado Coração de Jesus** (Bateias de Baixo, Campo Alegre), desmembrada da Paróquia
  Santíssima Trindade em 02/02/2025. A diferença é compatível com a criação recente.
- Comunidades: o site publica 417 comunidades/capelas com endereço; as 67 matrizes não aparecem
  nessa lista e foram sintetizadas (`Matriz <padroeiro>`, `isMatriz: true`, com o endereço da
  paróquia). Para catedral e santuários a matriz recebeu o nome oficial da igreja
  (ex.: `Catedral São Francisco Xavier`).

## Critérios aplicados

- **`alta`** para todas as paróquias e comunidades (fonte oficial, página ativa).
- **Horários `alta`**: celebração semanal, sem qualificador de recorrência.
- **Horários `baixa`** (372): recorrência mensal ou intermitente — "2º domingo do mês",
  "1ª sexta-feira do mês", "3º sábado", "Missa somente 01 (um) Domingo — nos outros Celebração da
  Palavra". O texto original foi preservado em `notes`. Não entram na carga; ficam para o enxame
  de validação.
- **Nome padronizado**: duas paróquias são grafadas no site com "Paróquia de" e foram normalizadas
  conforme a regra do README — `Paróquia de São José` (Corupá) → **Paróquia São José**;
  `Paróquia de Nossa Senhora das Graças` (Barra do Rio Cerro / Jaraguá do Sul) →
  **Paróquia Nossa Senhora das Graças**.
- **Slug**: `<nome-sem-prefixo>-<cidade>`; quando há homônimas no mesmo município, entra o bairro
  (`sao-francisco-de-assis-espinheiros-joinville`, `sao-francisco-de-assis-saguacu-joinville`,
  `sao-francisco-de-assis-adhemar-garcia-joinville`, etc.).

## Excluído do dataset (14 registros)

Registros que existem no site mas não cabem no modelo de horário semanal, ou não são celebração:

**Devoção em dia fixo do mês** (o campo `dayOfWeek` não representa "todo dia N"):
- Paróquia Cristo Ressuscitado (Joinville) — matriz: "Todo dia 21 de cada mês, durante o Ano
  Jubilar, Missa às 19h30; Confissões a partir das 17h30".
- Paróquia Cristo Ressuscitado — Comunidade Santa Rita de Cássia: "Missa devocional todo dia 22 às 19h30".
- Paróquia Cristo Ressuscitado — Comunidade Santa Rosa de Lima: "Missa devocional todo dia 23 às 18h".
- Paróquia Santa Paulina (São Francisco do Sul) — Comunidade São Judas Tadeu: 19h30 "todo dia 28"
  (o site repete a linha nos 7 dias da semana).
- Paróquia Santa Paulina — Comunidade Nossa Senhora Aparecida: 19h30 "todo dia 12 do mês,
  independente do dia da semana".

**Expediente / atendimento / atividade não litúrgica**:
- Paróquia São Judas Tadeu (Joinville) — "Grupo de oração 19h30".
- Paróquia Santa Paulina — "Grupo de Oração 19h30".
- Paróquia Nossa Senhora Aparecida (Oxford, São Bento do Sul) — "Grupo de Oração 19h30" e
  "Programa Amanhecer com Benção 7h–9h".
- Paróquia São Francisco de Assis (Espinheiros, Joinville) — "Atendimento Padre" (matriz, 2 faixas)
  e nas comunidades Nossa Senhora do Carmo, Santa Isabel e Santa Paulina.

Além disso, todo o bloco "Expediente Paroquial" das páginas (79 linhas de horário de secretaria)
foi descartado por não ser celebração.

## Pontos para validação humana

1. **Pároco repetido** — `Pe. Anderson Paloschi` aparece como pároco de duas paróquias:
   Santíssima Trindade (Centro, Campo Alegre) e Santo Estanislau (Alto Paraguaçú, Itaiópolis).
   Pode ser acúmulo real ou dado desatualizado no site.
2. **Paróquia Sagrado Coração de Jesus** (Bateias de Baixo, Campo Alegre) — única sem telefone e
   sem e-mail; o site só publica Facebook e Instagram. Paróquia criada em 02/02/2025.
3. **Paróquias sem horário da matriz publicado** (8): São Paulo Apóstolo (João Costa/Joinville),
   Nossa Senhora Aparecida (Km 4/Joinville), Nossa Senhora das Graças (Barra do Rio Cerro/Jaraguá
   do Sul), São José (Corupá), São José (Serra Alta/São Bento do Sul), Santuário Senhor Bom Jesus
   (Araquari), Santuário Nossa Senhora Aparecida (Mafra), São José (Centro/Mafra). As três últimas
   **não têm horário nenhum** (nem matriz nem comunidades) apesar de listarem 8, 18 e 17
   comunidades — provavelmente lacuna de preenchimento no site.
4. **Paróquias sem comunidades listadas** (5, ficam só com a matriz): Nossa Senhora de Fátima
   (Glória), Santo Antônio (Bom Retiro), São Francisco de Assis (Saguaçu), Catedral São Francisco
   Xavier e Santuário Sagrado Coração de Jesus — todas em Joinville. Pode ser real (paróquias
   urbanas de comunidade única) ou lacuna do site.
5. **E-mails múltiplos** — 7 paróquias publicam 2 a 4 endereços na mesma linha (secretaria,
   financeiro, pastoral). Guardamos apenas o primeiro. Casos: Nossa Senhora do Perpétuo Socorro
   e Divino Espírito Santo (Costa e Silva), Nossa Senhora Medianeira (Vila Nova), São Francisco de
   Assis (Espinheiros), São Judas Tadeu (Itaum), Senhor Bom Jesus (Itajuba/Barra Velha),
   Nossa Senhora das Graças (Vila Ivete/Mafra).
6. **Telefones múltiplos** — vários registros trazem fixo + WhatsApp na mesma linha; guardamos
   apenas o primeiro número fixo, no formato `(DD) NNNN-NNNN`.
7. **Bairro da Paróquia Nossa Senhora Aparecida (Km 4, Joinville)** — o bloco de contato do site
   grafa a cidade como "Joinville - Santa Catarina", sem bairro; usamos "Km 4" (do título da
   página), mas o histórico da própria página diz "bairro Santa Catarina, Rua Waldomiro José
   Borges, 145". Conferir qual é o bairro correto.
8. **Comunidades homônimas dentro da mesma paróquia** (19 casos) receberam sufixo com a localidade
   — ex.: `Comunidade Nossa Senhora Aparecida (Butiá Alto Rio Preto)` e
   `Comunidade Nossa Senhora Aparecida (Vila Nova)` na Paróquia Santo Antônio de Pádua (Rio
   Negrinho). Vale conferir se os nomes oficiais têm mesmo essa forma.
9. **Confissões da Paróquia São Judas Tadeu (Itaum, Joinville)** — o site publica
   "Confissões ou atendimento com o pároco (agendamento) 9h às 11h I 16h às 17h"; o registro
   guarda 09:00 e o restante da faixa ficou em `notes`. São dois intervalos, não dois horários
   pontuais.
10. **Bairro em `neighborhood` de algumas comunidades** — quando o site repete o endereço na linha
    "Cidade/SC <bairro>", o bairro pode vir igual ao logradouro (ex.: `Comunidade Independência de
    São Bento Abade`, em São Bento do Sul). Nesses casos o campo foi anulado, mas a comunidade
    ficou sem bairro.
11. **CEP e site das paróquias** — o site da arquidiocese não publica nenhum dos dois; todos os
    67 registros têm `zipCode: null` e `website: null`.
12. **`foundedYear`** — o ano de criação aparece só na narrativa histórica em texto corrido de
    parte das páginas; não foi extraído (todos `null`) para não arriscar leitura errada.
