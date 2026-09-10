# Relatório de pesquisa — Arquidiocese de Porto Alegre (RS)

- **Arquivo gerado:** `paroquias/RS/porto-alegre.json`
- **Data da pesquisa:** 2026-09-10
- **Cobertura:** 159 paróquias encontradas / 159 esperadas (**100%**)
- **Totais:** 169 entradas (159 paróquias + 1 reitoria + 9 unidades não paroquiais) ·
  69 comunidades · 922 horários fixos

---

## 1. Fontes principais

| # | Fonte | Uso | Confiança |
|---|---|---|---|
| 1 | https://www.arquipoa.com/paroquias | **Fonte primária.** Listagem oficial com nome, endereço, bairro, CEP, telefone, e-mail, pároco/vigários e horários de missa de todas as paróquias | alta |
| 2 | https://www.arquipoa.com/guia26 (Guia Pastoral, PDF de 129 p. hospedado no Drive da Arquidiocese) | **Corroboração entrada a entrada.** Diretório oficial com CNPJ, data de ereção, vicariato, área pastoral, pároco e endereço | alta |
| 3 | https://www.arquipoa.com/curia | Endereço, CEP e telefone da Cúria Metropolitana | alta |
| 4 | https://www.arquipoa.com/vicariatos | Estrutura de 8 vicariatos (criada em julho/2024) | alta |
| 5 | https://catholic-hierarchy.org/diocese/dpoal.html | Arcebispo e nº esperado de paróquias (160, dados de 2023) | media |
| 6 | https://pt.wikipedia.org/wiki/Paróquias_da_arquidiocese_de_Porto_Alegre | Só conferência cruzada — **não** usada como fonte de nenhum registro | baixa |

### Como a listagem oficial foi percorrida

A página `/paroquias` filtra por cidade via `POST https://www.arquipoa.com/pages/filterCity`
(`value=<id da cidade>`). Os **29 filtros de cidade** foram percorridos um a um, o que garante a
**atribuição de cidade feita pela própria Arquidiocese** (e não inferida do endereço). O filtro de
Cristal (id 16) devolve vazio: no Guia essa cidade aparece como área conjunta
"CAMAQUÃ – CRISTAL", atendida pela Paróquia São João Batista de Camaquã.

---

## 2. Método e decisões

1. **Lista de paróquias** — extraída da listagem oficial (169 cartões) e cruzada com o Guia
   Pastoral (159 entradas). **157 casaram por e-mail**; as 2 restantes foram casadas manualmente
   por nome + endereço + CEP e conferidas no texto do PDF:
   - `Nª. SRA. DE FÁTIMA (014)` — o e-mail quebrou na linha do PDF (`E-\nmafatima@…`); confirmada
     pelo endereço "Rua Doutor Napoleão Laureano, s/Nº" e CEP 90520-370, idênticos ao site.
   - `Nª. SRA. DESATADORA DOS NÓS (352)` — e-mail diferente entre as fontes
     (`desatadoradosnos@` no Guia, `desatadora@` no site); mesmo endereço, CEP e pároco.

   **Nenhuma paróquia do Guia ficou fora e nenhuma do site ficou sem par.**

2. **Preenchimento de campos** — o site é a fonte preferencial (dados mais específicos e em caixa
   mista); o Guia preenche as lacunas e é a **única** origem de `foundedYear` (data de ereção) e de
   CEP/endereço quando o site não traz.

3. **Horários** — parseados do texto publicado em cada cartão da listagem oficial. Regras:
   - intervalos ("Terça a sexta: 7h e 18h30") expandidos dia a dia;
   - horário entre parênteses vira comunidade ("Sábado: 8h, **16h (capela São Rafael)** e 18h");
   - intervalo de horas de adoração ("Segunda a sábado: 9h às 16h30") vira **um** registro no
     horário inicial, com o intervalo em `notes`;
   - recorrências mensais entram com `confidence: "baixa"` e o texto original em `notes`.

4. **Comunidades** — apenas as explicitamente listadas na fonte oficial (seção "Comunidades" do
   cartão ou capela citada em um horário). Quando há lista, a igreja-matriz é registrada
   explicitamente (`Matriz <padroeiro>`, `isMatriz: true`); quando não há, `communities: []` e os
   horários apontam para `"Matriz"`.

---

## 3. Números

### Paróquias por cidade (28 cidades com paróquia; 29ª = Cristal, atendida por Camaquã)

Porto Alegre 91 · Canoas 17 · Gravataí 10 · Viamão 8 · Alvorada 6 · Sapucaia do Sul 5 ·
Cachoeirinha 4 · Esteio 4 · Guaíba 4 · General Câmara 2 · e 1 cada em Arambaré, Arroio dos Ratos,
Barão do Triunfo, Barra do Ribeiro, Butiá, Camaquã, Cerro Grande do Sul, Charqueadas, Chuvisca,
Eldorado do Sul, Glorinha, Mariana Pimentel, Minas do Leão, Nova Santa Rita, São Jerônimo,
Sentinela do Sul, Sertão Santana e Tapes.

*(os números por cidade incluem as unidades não paroquiais listadas pela Arquidiocese)*

### Por vicariato (Guia Pastoral)

| Vicariato | Paróquias |
|---|---|
| Centro (Porto Alegre) | 15 |
| Leste (Porto Alegre) | 16 |
| Norte (Porto Alegre) | 17 |
| Oeste (Porto Alegre) | 17 |
| Sul (Porto Alegre) | 18 |
| Canoas | 25 |
| Gravataí | 28 |
| Guaíba | 22 |
| **Total** | **158** |

> O somatório dos cabeçalhos por município no mesmo Guia dá **159**; a nota institucional da
> Arquidiocese fala em **158**; o catholic-hierarchy.org registra **160** (2023). Adotou-se 159
> como `parishesExpected`.

### Confiança

- **Paróquias:** 169 de 169 com `confidence: "alta"` (todas em fonte oficial, 160 delas
  corroboradas por duas fontes oficiais independentes).
- **Comunidades:** 69, todas `alta`.
- **Horários:** 922 — **886 `alta`** e **36 `baixa`** (recorrências mensais).
- **Completude:** 169/169 com endereço, bairro e CEP; 167 com telefone; 160 com e-mail;
  165 com pároco; 157 com ano de fundação.

---

## 4. Pontos para o enxame de validação

### 4.1 Nomes normalizados (o original está entre aspas)

O site repete o tipo no nome de algumas unidades e usa abreviações. Foram padronizados:

| Original na fonte | Gravado |
|---|---|
| "Igreja Igreja da Ressurreição (Colégio Anchieta)" | Igreja da Ressurreição (Colégio Anchieta) |
| "Santuário Santuário Arquidiocesano Mãe de Deus" | Santuário Arquidiocesano Mãe de Deus |
| "Paróquia Basílica Menor Nossa Senhora das Dores" | Basílica Menor Nossa Senhora das Dores |
| "Paróquia Santuário Nossa Senhora Aparecida" / "… do Rosário" / "… do Trabalho e São Luís Guanella" | Santuário … (prefixo único) |
| "Santuário - Paróquia Estudantil Nossa Senhora do Rosário de Fátima" | Santuário Nossa Senhora do Rosário de Fátima |
| "Paróquia Nº. Sra das Graças" (Viamão) | Paróquia Nossa Senhora das Graças |
| "Paróquia São José - Rede de Comunidades" (Gravataí), "Paróquia Santa Cruz - Rede de Comunidades" (Viamão), "Reitoria … Boa Viagem (Rede de Comunidades)" | sufixo "- Rede de Comunidades" removido |
| "Ordinariado Militar Nossa Senhora Aparecida - Base Aérea de Canoas" | Capelania Militar Nossa Senhora Aparecida (Base Aérea de Canoas) |
| "Ordinariado Militar Nossa Senhora do Loreto - 5º Comando Aéreo Regional (V COMAR)" | Capelania Militar Nossa Senhora do Loreto (V COMAR) |
| "Prelazia Santa Cruz e Opus Dei (Centro Cultural Mirador)" | Capelania Santa Cruz do Opus Dei (Centro Cultural Mirador) |

> **Confirmar:** o site de Viamão dá o nome "Nª. Sra. das Graças" mas o e-mail
> `divinaprovidencia@arquipoa.org.br`; o Guia confirma "Nª. SRA. DAS GRAÇAS (210)". A Wikipédia
> ainda usa o nome antigo "Paróquia Divina Providência".

### 4.2 Unidades que **não** entram no sistema (9)

Listadas pela Arquidiocese mas não paroquiais — o importador as ignora pelo prefixo:

Igreja Divino Espírito Santo · Igreja da Ressurreição (Colégio Anchieta) ·
Igreja Nossa Senhora de Monte Claro (Capelania dos Poloneses) · Igreja São José ·
Igreja Senhor dos Passos (Santa Casa) · Igreja Senhor Jesus do Bom Fim ·
Capelania Santa Cruz do Opus Dei (Centro Cultural Mirador) — todas em Porto Alegre — e as duas
capelanias militares de Canoas, que **pertencem ao Ordinariado Militar do Brasil**, não à
Arquidiocese.

A **Reitoria Nossa Senhora da Boa Viagem** (Arquipélago, Porto Alegre) tem prefixo aceito pelo
importador, mas **não consta do diretório de paróquias do Guia** — validar se deve entrar.

### 4.3 CEP divergente entre site e Guia (17)

Prevaleceu o CEP do **site** (mais específico). O Guia usa CEPs genéricos de município em vários
casos (92500-000 para toda Guaíba, 92001-970 para Canoas).

| Paróquia (cidade) | Site | Guia |
|---|---|---|
| Catedral Madre de Deus (POA) | 90010-280 | 90010-283 |
| Santuário Nossa Senhora Aparecida (POA) | 91760-520 | 91760-051 |
| Paróquia Nossa Senhora de Caravaggio (POA) | 91060-320 | 91060-000 |
| **Paróquia Santa Cecília (POA)** | 90420-041 | 90630-190 |
| Paróquia São João Bosco (POA) | 90520-280 | 90520-100 |
| **Paróquia São Martinho (POA)** | 91910-670 | 91310-670 |
| **Paróquia Cristo Rei (Gravataí)** | 94010-550 | 94190-300 |
| Paróquia Nossa Senhora da Saúde (Alvorada) | 94852-370 | 94800-000 |
| Paróquia Nossa Senhora Aparecida (Canoas) | 92440-246 | 92001-970 |
| Paróquia Nossa Senhora do Rosário (Canoas) | 92020-040 | 92001-970 |
| Paróquia Santa Luzia (Canoas) | 92030-138 | 92030-000 |
| Paróquia São Paulo Apóstolo (Canoas) | 92120-090 | 32120-090 *(erro de digitação no Guia)* |
| Paróquia Santa Cruz (Viamão) | 94510-200 | 94510-100 |
| Paróquia Nossa Senhora da Paz / de Fátima / do Livramento (Guaíba) | específicos | 92500-000 (genérico) |
| Paróquia Santa Rita (Nova Santa Rita) | 92708-240 | 92480-000 |

Em **negrito**, as divergências grandes (bairro diferente), que merecem checagem manual.

### 4.4 Bairro divergente entre site e Guia (casos substantivos)

Prevaleceu o bairro do **site**. Grafias equivalentes (Ruben/Rubem Berta, Vila Elza/Elsa,
Bom Fim/Bonfim, Vila Farrapos/Farrapos, Vila Primor/Primor, Vila Central/Central,
Vila Santo Ângelo/Santo Ângelo, Parque Santo Inácio/Santo Inácio, Jardim Santa Rita/Santa Rita)
não foram listadas. Restam, para conferência:

| Paróquia (cidade) | Site | Guia |
|---|---|---|
| Paróquia Cristo Bom Pastor (POA) | Jardim Ipiranga | Passo d'Areia |
| Paróquia Nossa Senhora da Salette (POA) | Jardim Barão do Cahy | Sarandi |
| Paróquia Santa Cruz (POA) | Cidade de Deus | Cavalhada |
| Paróquia Nossa Senhora da Paz (POA) | Alto Petrópolis | Petrópolis |
| Paróquia Nossa Senhora Aparecida da Restinga (POA) | Restinga Velha | Restinga |
| Paróquia São José (Gravataí) | Morada do Vale III | Morada do Vale I |
| Paróquia Santo Antônio (Alvorada) | Primavera | Formoza |
| Paróquia São João Vianney (Viamão) | Vila Orieta | Santo Onofre |
| Paróquia Nossa Senhora de Fátima (Guaíba) | Colina | Ramada |
| Paróquia Nossa Senhora Desatadora dos Nós (Alvorada) | Umbu | Jardim Algarve |
| Paróquia Nossa Senhora de Fátima (POA) | Vila do IAPI | Passo d'Areia |

O site grafa "Passo dAreia" (sem apóstrofo) para a Paróquia São Vicente Pallotti; foi normalizado
para **Passo d'Areia**.

### 4.5 Ano de fundação ausente (2 paróquias)

O texto do Guia está truncado nesses dois casos e nenhuma outra fonte oficial foi encontrada;
`foundedYear` ficou `null` (a Wikipédia, sem fonte, sugere os valores entre parênteses):

- **Santuário Arquidiocesano Mãe de Deus** (Porto Alegre) — a entrada `(075)` não traz marcador de
  ereção (Wikipédia: 2000).
- **Paróquia Senhor Bom Jesus** (Porto Alegre) — o Guia registra "(Paróquia 19/04" sem o ano
  (Wikipédia: 1952).

### 4.6 Horários com `confidence: "baixa"` (36)

Todos são **recorrências mensais** ("primeira sexta-feira do mês", "quarto domingo do mês",
"segundo e quarto sábado do mês"), que o modelo `dayOfWeek` + `time` não representa. Ficaram
gravados com o texto original em `notes` para o enxame de validação decidir. Concentram-se na
Paróquia Nossa Senhora Aparecida (Sapucaia do Sul), cujas 8 comunidades celebram em semanas
alternadas.

> **Cuidado já tratado:** nessas linhas, "segunda/terça/quarta" são **ordinais**, não dias da
> semana ("segunda e quarta **quinta-feira** do mês" = 2ª e 4ª quinta-feira). O parser usa apenas
> o último dia da semana citado na frase.

### 4.7 Horários descartados por não caberem no modelo (8)

Devoções em **data fixa do mês**, que não têm dia da semana:

| Paróquia (cidade) | Texto na fonte |
|---|---|
| Paróquia Nossa Senhora de Fátima (POA) | "Dia 13: 16h" |
| Santuário Santa Rita de Cássia (POA) | "Dia 22 - 15h" |
| Paróquia São Judas Tadeu (POA) | "Todos os dias 28 de cada mês missa às 15h30min" |
| Paróquia Santa Ana (Gravataí) | "Todo dia 26 missa às 19h – caindo em dia de missa permanece o horário do dia" |
| Paróquia Nossa Senhora Aparecida (Canoas) | "No dia 12 missa às 20h" |
| Paróquia Nossa Senhora Aparecida (Minas do Leão) | "Todo dia 12 (Missa de N. Sra. Aparecida com Bênção da Saúde…): 19h" |
| Paróquia Santa Catarina (POA) | "Primeira **Seta**-feira do mês: 18h" — erro de digitação na fonte (sexta-feira); dia da semana não confiável |
| Paróquia Nossa Senhora da Conceição (POA) | "A partir do dia 12 de outubro as missas das 16h passam para as 17h" — aviso de mudança, não horário fixo |

### 4.8 O que ficou sem horário (16)

Estas unidades **não publicam horário na fonte oficial**. Foram consultados os agregadores
`horariodemissa.com.br` (fichas de São Carlos e Senhor Bom Jesus: **sem nenhum horário
cadastrado, última atualização em 29/12/2012**), o que os torna inúteis aqui — nada foi importado
de agregador.

Paróquias (12): Jesus de Nazaré (POA) · Mãe do Perpétuo Socorro (POA) ·
Nossa Senhora da Assunção (POA) · Santa Ana (POA) · São Carlos (POA) · São Luís Orione (POA) ·
Senhor Bom Jesus (POA) · São José (Gravataí) · Santo Antônio (Alvorada) · Santa Cruz (Viamão) ·
Nossa Senhora do Rosário (Barão do Triunfo) · São José (Sapucaia do Sul).
Não paroquiais (4): Igreja Senhor Jesus do Bom Fim · Capelania Santa Cruz do Opus Dei ·
as duas capelanias militares de Canoas.

### 4.9 O que ficou sem comunidades (140 paróquias)

Só **19 paróquias** publicam a lista de capelas/comunidades na fonte oficial (69 comunidades no
total, incluindo as matrizes). Para as demais, `communities: []` — o importador cria a
igreja-matriz automaticamente. **Não há, na Arquidiocese de Porto Alegre, um diretório oficial de
comunidades**: nem a listagem do site nem o Guia Pastoral (que só cita 8 capelas em todo o
documento) trazem essa informação. Levantá-las exigiria percorrer as redes sociais paróquia a
paróquia — trabalho deixado para uma rodada dedicada.

Paróquias com comunidades listadas: Basílica Menor N. Sra. das Dores, Divino Espírito Santo,
Menino Jesus de Praga, Santuário N. Sra. do Trabalho e São Luís Guanella e Santa Rosa de Lima
(Porto Alegre); Santa Ana (Gravataí); Santa Hedviges e São José Operário (Alvorada);
Imaculada Conceição, N. Sra. da Conceição, Santa Luzia, Santo Antônio e São Paulo Apóstolo
(Canoas); N. Sra. dos Navegantes (Charqueadas); Santa Bárbara (Arroio dos Ratos);
Divino Espírito Santo e São Vicente de Paulo (Cachoeirinha); N. Sra. da Paz (Guaíba);
N. Sra. Aparecida (Sapucaia do Sul).

### 4.10 Outros

- **Telefones:** normalizados para `(51) XXXX-XXXX`. Onde a fonte trazia dois números
  (Catedral Madre de Deus: "3517-4679 e 3517-4680"), ficou o primeiro.
- **Site próprio:** só 1 das 169 unidades divulga link permanente (Instagram da Basílica das
  Dores). Os demais links da listagem são vídeos institucionais do YouTube, não gravados.
- **Paróquias homônimas na mesma cidade:** não há. Há 6 "Paróquia Nossa Senhora de Fátima" e
  várias "Santa Luzia"/"Santa Rita", sempre em cidades diferentes — os `slug` incluem a cidade.
- **Endereços:** o sufixo "- Bairro X" foi removido do logradouro, já que o bairro tem campo
  próprio.
- A Wikipédia (artigo sem fontes, dados de ~2010) lista paróquias hoje inexistentes ou renomeadas
  e **não foi usada** para gravar nenhum registro.
