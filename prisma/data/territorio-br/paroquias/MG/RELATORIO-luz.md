# Relatório — Diocese de Luz (MG)

Pesquisa em 2026-09-10. Arquivo: `luz.json`.

## Fontes principais

| Fonte | Uso |
|---|---|
| `https://diocesedeluz.org.br/wp-json/wp/v2/paroquias?per_page=100` | Lista canônica: `X-WP-Total = 54`, com id, slug, link, título e data de modificação |
| https://diocesedeluz.org.br/paroquias/ | Página de listagem (conferência) |
| `https://diocesedeluz.org.br/paroquias/<slug>/` (54 páginas) | Forania, endereço, CEP, telefone, e-mail, pároco e **tabela estruturada de horários de missa** |
| https://www.catholic-hierarchy.org/diocese/dluzb.html | Nº esperado de paróquias (52, 2023), bispo e endereço da Cúria |

O site é WordPress + Elementor com *custom post type* `paroquias` exposto na REST API. Os horários
estão em `<table class="dce-acf-repeater-table">` com 4 colunas — **tipo | dia | horário | local** —
o que permitiu extração estruturada (sem heurística de texto livre).

## Cobertura

- **54 paróquias** (o total canônico do próprio CMS da diocese). O catholic-hierarchy.org registra
  52 (dados de 2023): a diferença são criações posteriores; as páginas foram modificadas entre
  2023 e **setembro de 2026**, então a fonte diocesana é a mais atual. Cobertura **100%** da lista.
- **210 comunidades/capelas** e **437 horários fixos**:
  - **342** semanais → `confidence: "alta"`;
  - **95** de **recorrência mensal** ("1ª Sexta-feira", "2º e 4º Domingo", "Demais Domingos") →
    `confidence: "baixa"`, com a regra literal em `notes`;
  - **8** Celebrações da Palavra descartadas;
  - **11** linhas descartadas por não terem dia mapeável ou horário (ex.: "Todo dia 22";
    linhas com o campo de hora vazio).
- **Endereço, CEP, telefone, e-mail e pároco em 54/54** — nenhum campo em branco.
- Campo extra `forania` gravado por paróquia (não faz parte do formato do README, mas veio da fonte).
- 29 municípios: Abaeté, Arcos, Bambuí, Biquinhas, Bom Despacho, Campos Altos, Capitólio,
  Córrego Danta, Córrego Fundo, Dores do Indaiá, Doresópolis, Estrela do Indaiá, Formiga,
  Iguatama, Japaraíba, Lagoa da Prata, Luz, Medeiros, Moema, Morada Nova de Minas, Paineiras,
  Pains, Pimenta, Piumhi, Pratinha, Quartel Geral, Santa Rosa da Serra, Santo Antônio do Monte,
  São Roque de Minas.

## Limitação conhecida — cobertura de comunidades

A diocese **não publica lista de comunidades/capelas** por paróquia. As 210 comunidades gravadas
foram derivadas da coluna "local" da tabela de horários — ou seja, **só aparecem as capelas que
têm missa fixa publicada**. Paróquias grandes certamente têm mais capelas do que as listadas.
Duas paróquias ficaram com `communities: []` porque a página não tem tabela de horários
(o importador cria a matriz automaticamente):

- `divino-espirito-santo-quartel-geral` (Paróquia Divino Espírito Santo, Quartel Geral)
- `santa-rosa-de-lima-santa-rosa-da-serra` (Paróquia Santa Rosa de Lima, Santa Rosa da Serra)

## Pontos para o enxame de validação humana

1. **Bispo**: gravado `Dom José Aristeu Vieira` (bispo desde 25/02/2015, catholic-hierarchy.org).
   A página `diocesedeluz.org.br/bispos-diocesanos/` retorna **404** e a de `/santuarios/` está
   vazia — não foi possível confirmar pelo site oficial.
2. **Slugs de origem incoerentes** (o slug da URL diz "Região Pastoral" mas o título diz
   "Paróquia") — gravadas como paróquia, seguindo o título:
   - `.../paroquias/regiao-pastoral-nossa-senhora-aparecida-lagoa-da-prata-mg/`
     → Paróquia Nossa Senhora Aparecida (Lagoa da Prata);
   - `.../paroquias/regiao-pastoral-santa-rita-arcos-mg-2/`
     → Paróquia Santa Rita de Cássia (Arcos).
   Confirmar se já foram elevadas a paróquia.
3. **Campo `forania` com valores inconsistentes na fonte**: umas fichas dizem "Forania de Arcos",
   outras só "Arcos"; a de Lagoa da Prata diz "Lagoa da Prata". Não foi normalizado.
4. **CEPs suspeitos na fonte**:
   - Paróquia Bom Pastor e Nossa Senhora do Patrocínio (**Abaeté**): CEP "36.620-000" — o CEP de
     Abaeté é 38.680-000; 36.620 é de outra região de MG. Provável erro de digitação da diocese.
   - Vários CEPs vêm com espaço no lugar do ponto ("38 625-000", "35 590-108", "38 805-000",
     "38 960-000", "38 990-000", "35 593-012", "35 592-098", "35 595-000") — normalizados para
     `NNNNN-NNN`, mas vale reconferir.
5. **Endereço com duplicação na fonte**: Paróquia São Rafael Arcanjo (Paineiras) —
   "Pça. Farmacêutico Manoel Ferreira, 51 - Centro – Centro".
6. **Coluna "local" usada para texto que não é lugar** — nesses casos o horário foi atribuído à
   "Matriz" e o texto original foi para `notes`:
   - Paróquia Nossa Senhora Aparecida (Lagoa da Prata): "Adoração ao Santíssimo Sacramento e
     encerrando com a Santa Missa às 19h00", "Em todas as Comunidades", "Devoção à Nossa Senhora
     Aparecida nas residências";
   - São Judas Tadeu (Formiga): "Matriz - Exceto na primeira terça-feira do mês".
7. **Duplicata por erro de digitação na fonte**, fundida: Paróquia Nossa Senhora do Livramento
   (Piumhi) listava "Igreja Sagrado Coração **e** Jesus e São Peregrino" e "Igreja Sagrado
   Coração **de** Jesus e São Peregrino" — tratadas como uma só comunidade.
8. **Comunidade genérica "Comunidades Rurais"** aparece como "local" em algumas paróquias —
   foi mantida como comunidade porque é o que a diocese publicou, mas não é uma capela.
9. **Paróquia São Roque** atende dois municípios ("São Roque de Minas e Vargem Bonita" no título).
   `city` recebeu **São Roque de Minas** (onde fica a matriz).
10. **`foundedYear` está `null` em todas** — as fichas trazem histórico em texto corrido, mas sem
    campo estruturado de ano de criação. Extrair do histórico exigiria leitura caso a caso.
11. **Ambiguidade "Nª feira"**: a fonte mistura "5ª feira" (= quinta-feira) com "1ª Sexta-feira"
    (= primeira sexta do mês). O parser trata as duas formas separadamente e classifica a segunda
    como mensal; conferir por amostragem, sobretudo "Primeira 4ª feira", "Terceira 4ª feria" (sic)
    e "Segunda sexta-feira".
