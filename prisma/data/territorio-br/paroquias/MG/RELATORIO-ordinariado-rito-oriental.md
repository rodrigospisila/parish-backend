# Relatório — Ordinariado para os Fiéis de Rito Oriental no Brasil

Pesquisa em 2026-09-10. Arquivo: `paroquias/MG/ordinariado-rito-oriental.json`.

## Natureza da circunscrição

Circunscrição **pessoal, de âmbito nacional**, criada em **14/11/1951** pelo decreto *Cum fidelium*
da Congregação para as Igrejas Orientais, sob Pio XII, para os fiéis católicos orientais **sem
hierarquia própria** no Brasil. É igreja isenta, sujeita diretamente à Santa Sé e à Congregação
para as Igrejas Orientais, sem província eclesiástica.

Não tem cúria, endereço, telefone nem site próprios: o **Ordinário é sempre um bispo latino que
acumula a função**. Desde **28/07/2010** é **Dom Walmor Oliveira de Azevedo**, Arcebispo
Metropolitano de Belo Horizonte — daí o arquivo estar em `MG`, como já está em `dioceses.json`.

**Divergência de sede:** a Wikipédia registra "Rio de Janeiro" (sede histórica — os primeiros
ordinários foram arcebispos do Rio, entre eles o Cardeal Dom Jaime de Barros Câmara); a CNBB o
classifica no Regional Leste 2 (MG). Mantido MG, como no `dioceses.json`. Por isso a confiança do
bloco `diocese` ficou `media`.

## O achado principal: o Ordinariado se esvaziou

Ele nasceu em 1951 abrangendo maronitas, greco-melquitas, ucranianos, russos, romenos, sírios,
coptas e armênios. Entre 1958 e 1981, quase todos ganharam estrutura própria e saíram de sua
jurisdição:

| Igreja *sui iuris* | Saiu para |
|---|---|
| Ucranianos | Eparquia de São João Batista em Curitiba (1958/1971) |
| Maronitas | Eparquia de Nossa Senhora do Líbano em São Paulo (1971) |
| Greco-melquitas | Eparquia de Nossa Senhora do Paraíso em São Paulo (1971/1972) |
| Armênios | Exarcado Apostólico da América Latina e México (1981) |

**Sobraram os siríacos e, nominalmente, os russos.** A Wikipédia resume: *"a atividade do
ordinariato limita-se a uma pequena comunidade católica síria (com um único sacerdote em Belo
Horizonte, após o falecimento de Monsenhor Luiz Awad, com o Padre George Rateb Massis) e à
comunidade católica russa"*, e registra as estatísticas **1 paróquia, 1 sacerdote, 10.603 fiéis**.

## O que gcatholic lista — e por que só 1 das 3 entrou

`gcatholic.org/churches/local/braz1-n` (atualizado em **01/01/2026**) lista **3 igrejas** sob o
Ordinariado. Ao abrir a ficha de cada uma, **duas são "Former Church"**:

| Igreja | Cidade/UF | Rito | Ficha do gcatholic | Entrou? |
|---|---|---|---|---|
| Sagrado Coração de Jesus | Belo Horizonte/MG | Syriac | igreja ativa | **sim** |
| Nossa Senhora Aparecida | Rio de Janeiro/RJ | Italo-Albanese | *"(now not in use)"*, Type: **Former Church** | não (`status: extinta`) |
| Anunciação da Virgem | São Paulo/SP | Russian | *"(now Orthodox church)"*, Type: **Former Church**, History: *"now Moscow Orthodox Patriarchate"* | não (`status: extinta`) |

Isso bate exatamente com a estatística de **1 paróquia** da Wikipédia. As duas igrejas extintas
ficaram no arquivo com `"status": "extinta"` — o importador (`alive()`) as ignora — para preservar
a pesquisa e a proveniência para o enxame de validação.

- **Rio de Janeiro (ítalo-albanesa)** — Rua Marechal Bittencourt, 112, Riachuelo, 20950-001,
  (21) 2261-9716. Comunidade de *arbëreshë* ligada à Eparquia de Lungro (Itália). Sem horários
  publicados. Atenção: fontes secundárias grafam o logradouro como "Rua Marechal Pitangur", que
  não existe; a ficha do gcatholic diz **Marechal Bittencourt**, que confere com o CEP 20950-001
  do Riachuelo.
- **São Paulo (capelania russa)** — Igreja da Anunciação da Mãe de Deus, Rua dos Sorocabanos, 150,
  Ipiranga (Parque da Independência), 04203-000, (11) 5666-8997. Construída em 1892, abrigou a
  Missão Católica Russa a partir de 1949 (Pe. João Stoisser), com liturgia bizantino-eslava em
  russo. **Retornou à Igreja Ortodoxa Russa (Eparquia da Argentina e América do Sul) em 2013** —
  não é mais uma igreja católica.

## Fontes principais e sua atualidade

| Fonte | Data da fonte | Uso |
|---|---|---|
| `gcatholic.org/churches/local/braz1-n` e fichas `/brazil/24409`, `/24410`, `/24411` | atualizado em **01/01/2026** | lista das 3 igrejas, jurisdição, ritos, endereços, marcação "Former Church" |
| Wikipédia pt — *Ordinariato do Brasil para os católicos de rito oriental* | consultada em 10/09/2026 | governo, estatísticas (1 paróquia, 1 sacerdote, 10.603 fiéis), história do esvaziamento |
| Wikipédia pt — *Igreja da Anunciação da Mãe de Deus (São Paulo)* | consultada em 10/09/2026 | passagem para a Igreja Ortodoxa Russa em 2013 |
| Arquidiocese de BH — **Catálogo 2026** (PDF, jan/2026) | **jan/2026** | ficha da paróquia siríaca: código 197, Av. Carandaí 1010, fundada em 1925, pároco |
| `missadiariabh.com` (lista de missas e confissões) | site atualizado em **27/08/2026** | horários atuais, endereço, telefone |
| `horariodemissa.com.br/igreja.php?k=wKUE2` | dados de **18/09/2015** | horários antigos, secretaria, "Rito Siríaco Católico" |
| *Estado de Minas* — "Conheça a Igreja católica de BH que recebe sírios refugiados" | **29/08/2024** | pároco, localização, acolhimento de refugiados sírios |
| catholic-hierarchy.org, CNBB | — | governo e regional |

## Cobertura

- **1 paróquia em atividade**, confiança `alta`, em **MG**. Cobertura **1/1**.
- 2 igrejas extintas registradas (RJ e SP), fora da carga.
- **1 comunidade** (a matriz). **10 horários fixos**: 2 `media` e 8 `baixa`.

### Paróquia Sagrado Coração de Jesus (Siríacos Católicos)

Av. Carandaí, 1010 — Funcionários, Belo Horizonte/MG, 30130-060. (31) 3222-1817.
Pároco: **Pe. George Rateb Massis** (chegou no início dos anos 2000; sucedeu Mons. Luiz Awad).
Fundada em 1925. Rito sírio-antioqueno, com missa em aramaico.

Igreja centenária na "região hospitalar", com entrada voltada para a Avenida Prof. Alfredo Balena;
acolhe refugiados sírios desde 2014. Listada por cortesia no Catálogo 2026 da Arquidiocese de BH
(item 7.13 B — Paróquias Pessoais, código 197, Região Episcopal RENSB), **sem pertencer à
jurisdição latina de BH**.

O site `coracaojesus.com`, ainda citado por fontes antigas, **saiu do ar** (NXDOMAIN em
10/09/2026); por isso `website` ficou `null`.

## Horários — por que quase todos são `baixa`

As duas fontes de horário **divergem de forma sistemática**:

| | missadiariabh.com (27/08/2026) | horariodemissa.com.br (18/09/2015) |
|---|---|---|
| Domingo | 09h e **11h** (rito siríaco) | 09h e **10h30** (rito siríaco) |
| Dias de semana | **terça a sábado, 12h15** | **segunda a sexta, 18h**; sábado 12h15 |
| 1ª sexta do mês | 18h (missa e adoração) | — |
| Confissões | **quinta e sexta, 11h** | **terça a sexta, 15h às 18h** |

Só **dois horários coincidem** e por isso ficaram `media`: **domingo 09:00** e **sábado 12:15**.
Todo o resto ficou `baixa`, adotando sempre o quadro **mais recente** (missadiariabh, 27/08/2026) e
registrando a divergência em `notes`. Entre os `baixa` há **1 recorrência mensal**, que não cabe no
`MassSchedule` (só dia da semana): *"Missas Primeira Sexta-Feira do Mês — Paróquia Sagrado Coração
de Jesus (região hospitalar): 18h (missa e adoração)"*.

**Correção de um dado já no repositório:** `paroquias/MG/belo-horizonte.json` registra essa missa
de primeira sexta-feira às **19:30**. A leitura da fonte mostra que o valor correto é **18h** — o
19h30 pertence à Paróquia Nossa Senhora do Perpétuo Socorro e São Damião de Molokai, na linha
seguinte da mesma lista. Neste arquivo o horário está como 18:00. Vale corrigir o arquivo de BH.

## Precisa de validação humana

1. **Todos os horários da paróquia siríaca.** As duas fontes conflitam em dia, hora e tipo. Ligar
   para (31) 3222-1817 resolveria de uma vez — inclusive a hora da missa em aramaico (10h30 ou 11h)
   e a das confissões (11h ou 15h-18h).
2. **Rio de Janeiro — a igreja ítalo-albanesa ainda existe?** gcatholic diz "not in use". Confirmar
   se foi fechada, demolida, entregue à Arquidiocese latina ou reaberta, e se a comunidade
   arbëreshë ainda se reúne em algum lugar do Rio.
3. **São Paulo — ainda há capelania russa católica?** O templo do Ipiranga é ortodoxo desde 2013,
   mas a Wikipédia ainda descreve "a comunidade católica russa" como parte da atividade do
   Ordinariado. Descobrir onde ela celebra hoje, se celebra.
4. **Sede do Ordinariado** — MG (CNBB/`dioceses.json`) × Rio de Janeiro (Wikipédia). O bloco
   `diocese` ficou com confiança `media` por causa disso.
5. **Duplicidade com a Arquidiocese de BH.** A mesma paróquia já consta, marcada
   `"status": "outra-jurisdicao"`, em `paroquias/MG/belo-horizonte.json`. Na carga, a versão
   canônica é a deste arquivo.
6. **Duplicidade com a Eparquia Greco-Melquita.** gcatholic lista a Igreja do Sagrado Coração de
   Jesus **também** sob a Eparquia Greco-Melquita, porque os melquitas celebram a Divina Liturgia
   bizantina no mesmo templo. Ela foi registrada **uma única vez**, aqui, que é sua jurisdição
   própria; o arquivo
   `paroquias/SP/melquita-nossa-senhora-do-paraiso-sao-paulo.json` explica a decisão em `coverage`.
7. **CEP de Belo Horizonte** — 30130-060 (missadiariabh 2026 e horariodemissa) confirmado; sem
   divergência aqui, ao contrário do que acontece com a paróquia maronita da mesma cidade.
