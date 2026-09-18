# Relatório — Arquieparquia de São João Batista em Curitiba dos Ucranianos

Pesquisa de 18/09/2026. Arquivo: `paroquias/PR/ucraniana-sao-joao-batista-curitiba.json`.

> **Leia antes de usar**: esta circunscrição é **pessoal e nacional**, não territorial. O arquivo está na
> pasta `PR` porque a sede é em Curitiba, mas as paróquias ficam em **três UFs** (PR, SC e SP) e o campo
> `state` de cada paróquia traz a UF real. Isso é esperado e correto.

## Resumo

| | |
|---|---|
| Paróquias encontradas | **17** (16 `alta`, 1 `media`) |
| Distribuição por UF | **PR 13**, **SC 3** (Canoinhas, Itaiópolis, Mafra), **SP 1** (São Paulo) |
| Comunidades/capelas | **103** (16 matrizes + 87 capelas) — todas `alta` |
| Horários fixos | **20** (todos `MASS` / Divina Liturgia): 3 `alta`, 4 `media`, 13 `baixa` |
| Cobertura | 17/17 — bate com a estatística do gcatholic.org (31/12/2021) |
| Bispo | Dom Volodemer Koubetch, OSBM (Arcebispo Metropolita desde 12/05/2014) |

## Fontes principais

1. **`metropolia.org.br`** — site oficial da Metropolia, WordPress. A REST API (`/wp-json/wp/v2/pages`,
   139 páginas) entrega todas as fichas de paróquia de uma vez, com histórico, clero, endereço, telefone
   e a **lista nominal de comunidades** (em `<h2>` ou em `<strong>` dentro da seção "COMUNIDADES", com
   padroeiro, nº de famílias e distância da sede). O campo `modified` diz a idade de cada ficha: as
   páginas de Curitiba–Catedral, Curitiba–Pinheirinho e Colônia Marcelino foram atualizadas em
   **10/08/2026**; as demais são de 2015–2023.
   - Armadilha: **Reserva** está fora da árvore `/metropolia/` (URL `metropolia.org.br/reserva/`) e
     **Colônia Marcelino** está sob `/arcebispado-maior/metropolias-e-eparquias/`. Quem raspar só
     `parent=154` perde as duas. O menu do topo da home é a lista canônica.
   - O texto institucional de `/metropolia/` (de 2015) ainda lista 15 paróquias com "Cruz Machado" e sem
     "Rio das Antas", "Colônia Marcelino" e "Reserva" — está defasado; vale o menu.
2. **Receita Federal via `minhareceita.org`** — **prova de completude**. As paróquias são filiais do CNPJ
   **75.038.554** (*METROPOLIA CATOLICA UCRANIANA SAO JOAO BATISTA*). Varrendo 0001–0040 saem **33
   estabelecimentos**: 22 ATIVOS (17 paroquiais + cúria, Seminário Maior São Josafat, Seminário Menor São
   Josafat, Instituto Cultural Clube Poltava e Tribunal Eclesiástico Intereparquial) e **11 BAIXADOS —
   exatamente as 11 paróquias transferidas para a nova Eparquia de Prudentópolis em 2014/2015**, que
   reabriram sob o CNPJ 21.543.643. Foi a Receita que devolveu endereço e CEP de rua para as paróquias que
   o site só publica como Caixa Postal.
3. **`gcatholic.org`** — `/churches/local/zjoa0` lista 15 igrejas por cidade (atualizado em 01/01/2026) e
   a ficha da diocese dá a estatística de 31/12/2021: **17 paróquias**, 91.000 fiéis, 40 padres.
4. **ViaCEP** — conferência de todos os CEPs (ver divergências abaixo).
5. **`liriocatolico.com.br`** — `/horario_missa/dados/uf/<UF>.json` traz o estado inteiro num JSON; foi de
   onde saíram 14 dos 20 horários. **Agregador sem data de conferência por ficha → `baixa`.**
6. Diocese latina de Ponta Grossa (ficha da paróquia ucraniana), Diocese de São José dos Pinhais
   (notícia da criação da paróquia de Colônia Marcelino), Facebook oficial da paróquia de São Paulo.

## Paróquias (17)

| # | Paróquia | Cidade | UF | Conf. |
|---|---|---|---|---|
| 1 | Paróquia Imaculada Conceição | Antônio Olinto | PR | alta |
| 2 | Paróquia Menino Jesus | Canoinhas | SC | alta |
| 3 | Paróquia Santíssima Trindade (Colônia Marcelino) | São José dos Pinhais | PR | alta |
| 4 | **Catedral São João Batista** | Curitiba | PR | alta |
| 5 | Paróquia Nossa Senhora Auxiliadora (Martim Afonso/Mercês) | Curitiba | PR | alta |
| 6 | Paróquia Santa Ana (Pinheirinho) | Curitiba | PR | alta |
| 7 | Paróquia São José (Dorizon) | Mallet | PR | alta |
| 8 | Paróquia Sagrada Família (Iracema) | Itaiópolis | SC | alta |
| 9 | Paróquia Nossa Senhora do Perpétuo Socorro | Mafra | SC | alta |
| 10 | Paróquia Sagrado Coração de Jesus | Mallet | PR | alta |
| 11 | Paróquia Natividade de Nossa Senhora (Vera Guarani) | Paulo Frontin | PR | alta |
| 12 | Paróquia Transfiguração de Nosso Senhor | Ponta Grossa | PR | alta |
| 13 | Paróquia Nossa Senhora do Perpétuo Socorro | Reserva | PR | alta |
| 14 | Paróquia Exaltação da Santa Cruz (Rio das Antas) | Cruz Machado | PR | alta |
| 15 | Paróquia Nossa Senhora Imaculada Conceição (Vila Bela) | São Paulo | SP | alta |
| 16 | Paróquia São Basílio Magno | União da Vitória | PR | alta |
| 17 | Paróquia Santíssima Trindade (N. Sra. da Salete) | União da Vitória | PR | **media** |

### Duas descobertas fora do site oficial

- **Paróquia Santíssima Trindade — Colônia Marcelino, São José dos Pinhais/PR.** Criada em **23/05/2021**
  (Pentecostes), desmembrada da Paróquia Nossa Senhora Auxiliadora (Martim Afonso), onde Colônia Marcelino
  era comunidade. Primeiro pároco: Pe. Neomir Doopiat Gasperin. **Não está no gcatholic.org** (lista de
  01/01/2026). Templo de ~740 m², um dos maiores do rito no Brasil.
- **Paróquia Santíssima Trindade — União da Vitória/PR (Rua Hermínio Millis, 238).** Só existe na Receita
  Federal (CNPJ 75.038.554/0031-00, **ATIVA desde 27/06/2016**) e numa ficha sem horários do
  `liriocatolico.com.br`. Não está no `metropolia.org.br` nem no gcatholic.org; e a Diocese **latina** de
  União da Vitória não tem nenhuma paróquia com esse nome (`paroquias/PR/uniao-da-vitoria.json`, 25
  paróquias). **É o registro que fecha a conta de 17** da estatística do gcatholic. Gravada com
  `confidence: "media"` e **pede validação humana** (ligar para a Cúria em Curitiba, (41) 3057-0670).

## Horários (20)

A Metropolia **não publica grade de Divina Liturgia** em lugar nenhum do site — nem por paróquia, nem por
comunidade. Todo o pouco que existe veio de terceiros.

| Paróquia | Grade | Conf. | Fonte |
|---|---|---|---|
| Transfiguração de Nosso Senhor (Ponta Grossa) | dom 09:00, sex 09:00, sáb 19:00 | media | ficha da Diocese latina de Ponta Grossa (coleta de 23/07/2026) |
| N. Sra. Imaculada Conceição (São Paulo) | dom 10:00 | media | Facebook oficial + horariodemissa + liriocatolico |
| Catedral São João Batista (Curitiba) | dom 09:00 | baixa | liriocatolico |
| N. Sra. Auxiliadora (Curitiba) | dom 09:00 e 11:00, sáb 19:00 | baixa | liriocatolico |
| Santa Ana (Curitiba) | dom 08:00, seg–sáb 19:00 | baixa | liriocatolico |
| Imaculada Conceição (Antônio Olinto) | dom 08:00 em Campina de Cima | baixa | site oficial — **"três Divinas Liturgias por mês"**, recorrência mensal |
| Santíssima Trindade (Colônia Marcelino/SJP) | dom 10:00, qua 19:00, sex 19:00 | **alta** | Facebook oficial: "Programação anual das celebrações: DIVINA LITURGIA: Domingo: 10h; Quartas e sextas: 19h; 3º sábado: 19h" |
| Santíssima Trindade (Colônia Marcelino/SJP) | 3º sábado 19:00 | baixa | mesma fonte — **recorrência mensal**, não cabe no modelo semanal |

As outras 10 paróquias entram **sem nenhum horário**. O Facebook com Googlebot no User-Agent foi o que
rendeu a única grade `alta` da arquieparquia (Colônia Marcelino); as páginas de Campo Mourão,
Guarapuava e São Josafat respondem, mas não publicam grade semanal.

> **Armadilha registrada**: um resumo de buscador atribuiu à Catedral de Curitiba "sábado 18:00 em
> português e domingo 09:00 em ucraniano" citando o `horariodemissa.com.br`. A ficha real
> (`igreja.php?k=5NEzR`, atualizada em **25/06/2014**) **não tem nenhum horário**. Não entrou.

## Vocabulário do rito (para quem for validar)

A missa chama-se **Divina Liturgia** (de São João Crisóstomo) — é a celebração eucarística e foi gravada
como `type: "MASS"`. **Não são missa** e não foram gravadas como tal: **Moleben**, **Panakhyda/Panahyda**,
**Acatisto (Akathistos)**, **Vésperas**, a **Liturgia dos Dons Pré-Santificados** (Quaresma) e a **Maivka**
(novena de maio). Elas aparecem nas `notes` quando a fonte as cita. A igreja é chamada de "templo"; os
padres são basilianos (**OSBM**) e as irmãs, **Servas de Maria Imaculada**, **Catequistas de Santa Ana** ou
**Catequistas do Sagrado Coração de Jesus**.

## Divergências e pontos para a validação humana

1. **Paróquia Santíssima Trindade de União da Vitória** — confirmar existência, padroeiro, pároco e
   endereço (ver acima). É o único registro `media` do arquivo.
2. **Catedral de Curitiba — dois endereços.** Templo na Av. Presidente Kennedy, 3275 (CEP 80610-010,
   conferido no ViaCEP); a Receita registra o estabelecimento na Rua Maranhão, 1094 (secretaria, ao lado
   da cúria, no 1200). Gravei o do templo.
3. **São Paulo — o mesmo prédio em duas jurisdições.** A Paróquia ucraniana Nossa Senhora Imaculada
   Conceição celebra **no templo da Paróquia latina Nossa Senhora da Glória** (Arquidiocese de São Paulo),
   Rua das Valerianas, Vila Bela, e as duas têm o mesmo pároco basiliano (Pe. Josafat Vozivoda, OSBM).
   Por isso o local já consta como `nossa-senhora-da-gloria-sao-paulo` em `paroquias/SP/sao-paulo.json`
   (sem `status`, `alta`). **Não é duplicata de nome, mas é o mesmo endereço** — decidir se a entrada de
   São Paulo recebe `status: "outra-jurisdicao"` ou fica como paróquia latina distinta (é o que parece
   correto: são duas paróquias, uma latina e uma ucraniana, no mesmo templo). Número da casa divergente:
   Receita **186**, site oficial e gcatholic **168**. Telefone da página oficial ("11 36341-9681") é
   malformado; usei (11) 2341-9681, da Arquidiocese de São Paulo e do horariodemissa.
4. **CEPs corrigidos pelo ViaCEP** (a fonte oficial trazia o CEP genérico da cidade ou um CEP de outra rua):
   Ponta Grossa 84053-320 → **84053-000**; Mafra 89300-000/89300-001 → **89300-108**; União da Vitória
   (São Basílio Magno) 84600-000/84600-010 → **84601-015**; Mallet (Sagrado Coração) → **84571-175**;
   Curitiba/Catedral 80610-000 → **80610-010**.
5. **CEPs que o ViaCEP não reconhece**: 83980-000 (Antônio Olinto), 84570-000 (Mallet/Dorizon),
   84500-000 (Irati — parte do arquivo da Eparquia de Prudentópolis). Ficaram gravados como estão.
6. **Curitiba/Pinheirinho** — o ViaCEP devolve bairro "Capão Raso" para o CEP 81150-060; a paróquia e a
   Receita usam "Pinheirinho". Mantido "Pinheirinho".
7. **Clero de captura antiga.** As fichas de Mafra, Paulo Frontin, Dorizon, Rio das Antas e União da
   Vitória são de 2015–2020. O pároco de Mafra (Pe. Jaime Fernando Valus, OSBM) aparece em 2026 no site da
   Diocese de Guarapuava como padre da Paróquia São Josafat de Prudentópolis — pelo menos um dos dois está
   defasado.
8. **Sites de paróquia fora do ar**: `www.radiorozmova.com.br` (União da Vitória) e
   `www.comunidadeucraniana.com.br` (Irati, Eparquia de Prudentópolis) não resolvem DNS;
   `www.pstrindade.com` (Campo Mourão) virou domínio estacionado. Todos ficaram com `website: null`.
9. **Comunidades: 103 nominadas vs. 96 declaradas** pelo site oficial. A diferença vem de contar as 16
   matrizes e de a contagem oficial ser de 2014/2015 (antes de Colônia Marcelino virar paróquia).

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `bishopName`: está `"Dom Volodemer Koubetch"`; o site oficial e o gcatholic grafam
  **"Dom Volodemer Koubetch, OSBM"** (basiliano) — acrescentar a sigla, como já se faz em Prudentópolis
  ("Dom Meron Mazur, O.S.B.M.").
- `address`: está `"Curia Eparquial, Rua Maranhao 1200, Bairro Agua Verde"` (sem acentos). Forma oficial
  da página de contato: **"Rua Maranhão, 1200 – Água Verde"**.
- `email`: está `null`. Não achei e-mail institucional publicado — sem sugestão.
- `foundedYear` (1962) **está certo** e não deve ser mexido: é o ano de ERECÇÃO (Eparquia de São João
  Batista, 1962); a elevação a Arquieparquia/Metropolia é de 12/05/2014.
- O `name` em `dioceses.json` é **"Arquieparquia de São João Batista em Curitiba dos Ucranianos"** com
  `type: "Eparquia"` — mantido igual no JSON, ainda que o enunciado da tarefa dissesse "Eparquia de…".

## Paróquias ucranianas que estão em arquivos de dioceses latinas (a mover)

Estão listadas no relatório da Eparquia de Prudentópolis
(`RELATORIO-ucraniana-imaculada-conceicao-prudentopolis.md`), com a tabela completa das duas eparquias.
Desta arquieparquia são **duas**: Transfiguração de Nosso Senhor (Ponta Grossa) e Nossa Senhora do
Perpétuo Socorro (Reserva), ambas em `paroquias/PR/ponta-grossa.json` já com
`status: "outra-jurisdicao"`.
