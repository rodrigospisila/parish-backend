# Relatório — Diocese de Barra do Garças (MT)

Pesquisa: 2026-09-11 · Arquivo: `barra-do-garcas.json`

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **20** (18 `alta`, 2 `media`, 0 `baixa`) |
| Comunidades/capelas | **113** |
| Horários fixos | **184** (12 `alta`, 127 `media`, 45 `baixa`) |
| Cobertura | 20 encontradas / 20 esperadas (gcatholic, 31/12/2022) |

## Fontes principais

1. **`https://diocesebarradogarcas.org.br/paroquias/`** — lista oficial das paróquias (página do CMS
   atualizada em 27/08/2025). Exibe 21 cartões, mas "Paróquia Nossa Senhora Auxiliadora — Barra do
   Garças" está duplicada: **20 paróquias distintas**.
2. **Fichas individuais de paróquia** (`/paroquia-<slug>/`) — 15 páginas com endereço, telefone,
   e-mail, pároco e **grade completa de missas por capela/comunidade**. Foi a fonte de quase todo o
   dataset. Ressalva: todas foram modificadas em **20/03/2023** (Cocalinho em 17/11/2023). Fonte
   oficial sem sinal de atualidade → horários entram como `media` (texto pós-pandemia, então não
   caem para `baixa` pela regra do README).
3. **API WordPress do tipo `horarios-das-missas`**
   (`/wp-json/wp/v2/horarios-das-missas?per_page=100`, `X-WP-Total: 85`) — 85 registros de
   comunidade ligados à taxonomia `paroquias` (17 termos), **modificados entre jul/2026 e
   ago/2026**. Serviu para confirmar/atualizar a lista de comunidades. **Os horários em si estão em
   meta do JetEngine e não são expostos nem pela REST nem pelo HTML** — a página
   `/horarios-de-missa/` é só um filtro que carrega por AJAX. Por isso os horários novos (2026) não
   puderam ser lidos e ficaram os de 2023.
4. **`https://paroquiaaguaboa.com.br/`** — site próprio da Paróquia N. Sra. Aparecida de Água Boa,
   ativo, com grade por comunidade. Única paróquia com horários `alta`.
5. gcatholic.org (`barr2.htm`) e catholic-hierarchy.org (`dbrdg.html`) para a contagem esperada.

## Cobertura e divergências

- **gcatholic: 20 paróquias** (31/12/2022) — bate exatamente com a lista oficial.
- **catholic-hierarchy: 30 paróquias** (2022). Divergência não resolvida; provavelmente conta
  quase-paróquias/áreas pastorais, ou é erro de digitação do Annuario. Mantido `parishesExpected: 20`.
- 18 das 20 paróquias têm endereço, contato e horários. **Ficaram sem nenhum dado além de
  nome/cidade** (confiança `media`, `communities: []`, `schedules: []`):
  - **Paróquia São José** — Sangradouro, General Carneiro (paróquia na Terra Indígena Sangradouro).
  - **Paróquia São Domingos Sávio** — Nova Xavantina, descrita na lista oficial como
    *"Paróquia Pessoal do Povo Xavante"*. Não tem ficha no site nem termo na taxonomia.

## Precisa de validação humana

1. **Nova Xavantina foi dividida depois de 2023 e o site não acompanhou.** A ficha de 2023 da
   Paróquia São Sebastião publica, na mesma página, a grade do "Santuário Nossa Senhora das Graças"
   e ~20 capelas. Em 2025/2026 a lista oficial e a taxonomia passaram a tratar
   **Paróquia Nossa Senhora das Graças / Santuário Diocesano** como circunscrição separada, com 7
   comunidades próprias. Fiz a divisão cruzando os dois: as capelas cujo nome aparece na taxonomia
   de 2026 do Santuário (Auxiliadora/Xavantina Velha, Bom Jesus/Centro Oeste, São José/Deus é Amor,
   São Cristóvão/Vale da Serra, São Pedro/Indianópolis) foram para o Santuário; **as demais capelas
   rurais ficaram na Paróquia São Sebastião por falta de critério melhor**. Essa repartição é a
   maior incerteza do arquivo.
2. **Nome do registro `nossa-senhora-das-gracas-nova-xavantina`.** A lista `/paroquias/` chama de
   "Paróquia Nossa Senhora das Graças"; a taxonomia de 2026 chama de "Santuário Diocesano Nossa
   Senhora das Graças". Adotei o nome da lista de paróquias. Se o Parish preferir o título de
   santuário, é trocar `name`.
3. **Horários de 2023 vs. 2026.** O site publicou em jul/ago 2026 uma estrutura nova de horários
   (85 registros) que **não consegui ler**. As 127 grades `media` deste arquivo vêm das fichas de
   2023 e podem estar defasadas. Caminho para a validação: pedir à PASCOM da diocese o export do
   JetEngine, ou tentar o endpoint AJAX `jet-engine` da página `/horarios-de-missa/`.
4. **Reorganização em "Áreas Pastorais" na Paróquia São Francisco de Assis (Barra do Garças).** A
   taxonomia de 2026 renomeou as comunidades para "Área Pastoral 3 – Santa Luzia – Comunidade X" e
   "Área Pastoral Nossa Senhora Aparecida – Capela Y". Mantive os nomes de 2023 (que trazem bairro)
   e acrescentei só "Comunidade Nossa Senhora das Graças da Medalha Milagrosa". **Não carreguei**
   três entradas da taxonomia por serem ambíguas: `Cemitério Nova Barra Sul`, `Bairro Nova Jerusalém`
   e `Bairro Cidade Jardim` — parecem pontos de missa, não capelas nomeadas.
5. **Entradas da taxonomia de 2026 que carreguei como comunidade mas podem ser rótulo**, em Canarana:
   `Auto Posto Marajó`, `Assentamento Pequi`, `Comunidades Rurais`. Em Nova Xavantina e no Santuário:
   `Comunidades rurais` / `Comunidades Rurais`. São reais como local de missa, mas genéricas.
6. **Paróquia N. Sra. da Piedade**: a lista oficial escreve a cidade como "Araguaina"; o endereço da
   ficha e o município real são **Araguaiana/MT** (não confundir com Araguaína/TO). Usei Araguaiana.
7. **Um registro de horário sem paróquia** na API (`Comunidade São Pedro`, sem termo de taxonomia) —
   provavelmente da Paróquia Santo Antônio, que já tem uma "Comunidade São Pedro". Não dupliquei.
8. **45 horários `baixa` por recorrência mensal** ("1º domingo", "2ª e 4ª sexta", "última sexta do
   mês"). É a norma na zona rural desta diocese. A regra literal está em `notes` de cada um.
9. Entradas descartadas por não serem horário fixo: "Sítios e Fazendas – 10h" (Cocalinho),
   "Fazendas Agendadas" (São Francisco de Assis), "Celebra-se nas Fazendas mediante agendamento"
   (Ponte Branca e Araguainha), "Fazendas quando solicitado" (Meruri), "3º e 5ª Sexta: 19h" em
   Canarana (sem local), "1º Domingo" da Capela Divino Pai Eterno de Canarana (sem hora).
10. **Aldeias indígenas da Paróquia Sagrado Coração de Jesus (Meruri)** — "Aldeia Nabure eiao",
    "Aldeia Koge Ekureu", "Aldeia Meri ore eda" estão grafadas como no site; a ortografia bororo
    provavelmente precisa de correção.
