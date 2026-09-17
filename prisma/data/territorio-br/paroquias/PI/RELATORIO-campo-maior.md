# Diocese de Campo Maior (PI) — relatório de pesquisa

- **Arquivo**: `paroquias/PI/campo-maior.json`
- **Data da coleta**: 2026-09-17
- **Cobertura**: **39 / 33 — todas `alta`**: 33 paróquias (a Catedral incluída; é exatamente o número do
  Anuário Pontifício 2024) + 5 quase-paróquias + o Santuário Eucarístico N. Sra. do Rosário
- **Comunidades**: 40 (39 matrizes + a Igreja de São Francisco, citada na grade do Livramento) — a
  diocese não publica capelas
- **Horários fixos**: **158 — 10 `alta`, 139 `media`, 9 `baixa`**. As **39 fichas têm tabela de
  horários**; é a melhor fonte de horário das quatro dioceses desta rodada
- 26 municípios com sede de paróquia

## Fontes principais

| Fonte | Uso |
|---|---|
| `https://diocesedecampomaior.org.br/wp-json/wp/v2/paroquia?per_page=100` | Lista canônica: 39 posts do tipo `paroquia`, com `modified` e o vicariato (taxonomia `local_paroquia`, 5 vicariatos) |
| Ficha HTML de cada paróquia (`/paroquia/<slug>/`) | Ano de criação, telefone, e-mail, endereço com bairro e CEP, clero e a **tabela "Horários de Missas"** (Tipo · Dia · Horário · Observações) |
| `…/wp-json/wp/v2/clero` + 53 fichas HTML do clero | Campos "Paróquia" e "Função" de cada padre — usados onde a ficha da paróquia mostra "Nenhum resultado encontrado" |
| `…/curia-diocesana/` e `…/bispo/` (27/04/2026) | Dados da cúria; bispo Dom Benedito Araújo (posse em 01/2026) |
| `https://www.catholic-hierarchy.org/diocese/dcmma.html` | 33 paróquias (AP 2024, dados de 2023) |

Plataforma Parresia (WordPress + Elementor). **O JSON da REST não traz os dados** — `content` só tem a
foto e `acf` vem vazio; endereço, clero e horários são campos personalizados renderizados no HTML.
Por isso as 39 fichas (e as 53 do clero) foram baixadas e lidas uma a uma. E-mails vêm ofuscados pelo
Cloudflare (`data-cfemail`) e foram decodificados.

## Armadilha encontrada: a página "Horários de Missas" está quebrada

`/horarios-de-missas/` lista todas as paróquias com suas tabelas, mas **repete as linhas da primeira
paróquia nas seguintes** (Campo Largo e Porto aparecem com "Domingo 7h30 / 10h – Missa com as
crianças", que é a grade de Nossa Senhora dos Remédios). É defeito do laço do modelo. **Nada foi
tirado dessa página** — toda grade veio da ficha individual, onde só existe uma paróquia e o defeito
não ocorre. Quem revalidar deve fazer o mesmo.

## Regra de confiança dos horários

- `alta` — ficha oficial **atualizada há menos de 12 meses**: Campo Largo do Piauí (22/11/2025) e
  Beneditinos (03/02/2026).
- `media` — ficha oficial sem sinal de atualidade: as outras 37 (9 de 03–04/2024, 12 de 08/2024, 7 de
  12/2024, 9 de 03/2025). Todas pós-pandemia, portanto carregam.
- `baixa` — recorrência mensal ("1ª sexta-feira do mês" em Cabeceiras, Beneditinos, São Raimundo
  Nonato/Altos e N. Sra. das Mercês/Altos) e data fixa do mês (`dayOfWeek: null`: "cada dia 5" em
  Beneditinos; "dia 13", "dia 18" e "dia 22" em N. Sra. das Mercês/Altos); e o "17h" solto de Castelo.

Convenções: "Terça a sábado 7h" (Boqueirão) virou 5 registros; "17h - Adoração", "Adoração - 18h",
"Adoração às 18h00" e "Adoração ao Santíssimo e Confissões a partir das 17h30" viraram `ADORATION`
(e `CONFESSION` em Beneditinos); observações sem hora ("Com Adoração", "Adoração seguida de missa")
ficaram só em `notes`. Na Catedral, a sexta-feira 18h é semanal (a nota fala da votiva da 1ª sexta) —
a Catedral tem missa às 18h todos os dias.

## Decisões tomadas

- **Nomes**: a diocese escreve "Paróquia de São José – Campo Largo"; ficou `Paróquia São José`, com a
  cidade em `city` (nome oficial do município: Campo Largo **do Piauí**, Cabeceiras **do Piauí**,
  Castelo **do Piauí**, Jatobá **do Piauí**, Novo Santo Ant**ô**nio). "Paróquia Catedral de Santo
  Antônio" → `Catedral Santo Antônio`.
- **Santuário Eucarístico Nossa Senhora do Rosário** (Campo Maior): a diocese o lista entre as
  paróquias, com reitor próprio (Pe. Luís Francisco Fonseca Moura) e grade própria (domingo 11h, terça
  a sábado 6h30). Entrou como unidade normal — é lugar de missa e a fonte publica horário.
- **`priestName`**: 18 vieram da ficha da paróquia; 14 foram resolvidos pelas fichas do clero; **7
  ficaram `null`** (ver abaixo). Em Assunção do Piauí a ficha mostra pároco (Pe. Paulo Sérgio Lima do
  Nascimento, que também é o de São Miguel do Tapuio) e um "Administrador Pastoral" residente (Pe. Gean
  Carlos Medeiros da Silva, ordenado em 07/2025) — ficou o pároco.
- **Campos anulados**: CEP malformado de Beneditinos (`6438-000`) e de Altos/São José (`64290-00`);
  telefone de Alto Longá com dígito a menos (`(86) 98172-356`); e-mails com acento/cedilha (Campo Largo
  `paróquiadesaojose09@…`, Sigefredo Pacheco `paroquiansconceiçao5@…`).
- **Não usei agregadores**: com grade oficial nas 39 fichas, um agregador só acrescentaria `baixa`.

## Precisa de validação humana

1. **7 unidades sem responsável identificado.** Nas fichas do clero o campo "Paróquia" não traz a
   cidade, e há homônimas:
   - **N. Sra. de Fátima** — Campo Maior × Boqueirão do Piauí: os párocos são Pe. Leandro Rodrigues de
     Melo e Pe. Gilcimar de Lima Machado, mas não dá para saber qual é de qual;
   - **N. Sra. das Mercês** — Campo Maior × Altos: pároco Pe. Raimundo Nonato Cruz Duarte em uma delas;
     em Altos atuam os redentoristas Pe. Valmir Costa Silva e Pe. Francisco Natanael Neres Franco;
   - **N. Sra. da Conceição (Porto)**: a ficha do clero do Pe. Adão Ribeiro ainda diz "N. Sra. da
     Conceição", mas a ficha de Campo Largo (11/2025) já o traz como pároco de lá;
   - **N. Sra. das Graças (Castelo do Piauí)** e **Quase-paróquia N. Sra. de Fátima (Pau D'Arco)**:
     nenhum padre associado.
2. **São João da Serra**: Pe. Juscelino Pascoal de Castro foi atribuído **por eliminação** (o outro
   "pároco de São João Batista" é o de Barras, confirmado na ficha de lá).
3. **Castelo do Piauí / N. Sra. das Graças**: a linha de domingo diz "9h" e traz "17h" na coluna de
   observações. Gravei 9h (`media`) e 17h (`baixa`).
4. **Catedral, domingo 8h30**: a fonte anota "*Dom Francisco de Assis" — não fica claro se é o local
   ou o celebrante (Dom Francisco de Assis Gabriel dos Santos, bispo anterior). Está em `notes`.
5. **Novo Santo Antônio**: "Celebração da Palavra, quinta 18h30, com Adoração" — não é missa, ficou fora.
6. **CEP de N. Sra. de Nazaré**: a ficha dá 64280-000, que é o de Campo Maior (o do município é outro).
   Mantido como está na fonte.
7. **Telefone repetido**: (86) 98167-7821 aparece em São João Batista e em Santa Luzia e São José
   Operário, ambas em Barras.
8. **E-mail da Quase-paróquia Santo Antônio (José de Freitas)** é `jeronimo2019@gmail.com` — parece
   pessoal (Pe. Jerônimo é o pároco da quase-paróquia homônima de Novo Santo Antônio); pode ser bloco
   copiado.
9. **Ano "1 de janeiro de 2007"** na Quase-paróquia de Novo Santo Antônio tem cara de data-padrão.
10. **CNPJ da mitra não localizado** (as buscas só devolvem a RCC local). Não fez falta: a lista fechou
    em 33/33 contra o Anuário e todas as fichas têm endereço. Fica como caminho para o enxame.
11. "Anuário Diocesano" existe no menu, mas é produto à venda na livraria — não há PDF público.
