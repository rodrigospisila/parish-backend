# Relatório — Diocese de Ponta de Pedras (PA)

Pesquisa: 18/09/2026. Arquivo: `ponta-de-pedras.json`.

## Resultado

| | |
|---|---|
| Entradas | **10** paróquias (uma delas a Catedral) |
| Confiança das entradas | 10 `alta` |
| Comunidades | **13** (10 `alta`, 2 `media`, 1 `baixa`) — a diocese declara **259** e não publica nenhuma lista |
| Horários fixos | 15, **todos `baixa`** (12 missas e 3 terços) — a diocese não publica horário de missa |
| Cobertura | 10/10 |

## Fonte principal: a página "Paróquias" do blog oficial

`http://diocesepontadepedras.blogspot.com/p/paroquias.html` — é um **Blogger**, e o feed
`/feeds/pages/default?alt=json` dá a data de cada página: **Paróquias atualizada em 18/08/2025**, Clero em
17/08/2026 e Artigos em 16/08/2026. O blog está vivo (notícia de junho de 2026 sobre o Administrador
Diocesano), e a página traz por paróquia:

- nome, endereço e CEP;
- **data de criação da paróquia e data de dedicação da matriz**;
- **número de comunidades**;
- congregações religiosas presentes;
- párocos e vigários.

No fim da mesma página está o **Santuário Diocesano de Nossa Senhora de Nazaré** (dedicado em 08/09/2007,
Reitor Pe. Raimundo Aguiar), como entrada separada das paróquias.

As páginas "Clero" e "Histórico da Diocese" do blog **estão vazias** — só renderizam o título.

## A varredura da Receita NÃO se aplica a esta diocese

É o caso que o README prevê (como Xingu-Altamira e Jequié): **as paróquias não são filiais do CNPJ da mitra**.

- CNPJ **04.696.357** (DIOCESE DE PONTA DE PEDRAS): varri as ordens 0001–0026 e existem **só dois
  estabelecimentos**, ambos na Rua Dr. Assis 834, Cidade Velha, **Belém** — o **0001 ATIVO** (início
  27/12/1982) e o **0002 BAIXADO em 22/11/1994**. Nenhuma paróquia.
- A busca avançada do **Mapa das OSC/IPEA** por razão social "PAROQUIA" nos seis municípios da diocese
  (Ponta de Pedras 1505700, Cachoeira do Arari 1502004, Curralinho 1502806, Muaná 1504901, Santa Cruz do
  Arari 1506401 e São Sebastião da Boa Vista 1507706) **não devolveu nenhum resultado**.

**Atenção para quem repetir isto**: os códigos IBGE do Marajó são muito parecidos e é fácil errar —
Ponta de Pedras é 1505700 e **Portel** é 1505809; Soure é 1507904 e **São Sebastião da Boa Vista** é 1507706.
Na primeira tentativa o filtro devolveu resultados de Portel e Breves.

## Cobertura: 10 paróquias, não 8

O catholic-hierarchy registra **8 paróquias em 2022** e o gcatholic marca 8 igrejas como paróquia. A diferença
são três unidades recentes que o blog publica e as fontes internacionais ainda não têm:

| Paróquia | Município | Criada em |
|---|---|---|
| Nossa Senhora dos Navegantes | Vila de Ponta Negra, Muaná | 06/02/2022 |
| Nossa Senhora do Rosário do Perpétuo Socorro | Curralinho | 19/08/2023 |
| Nossa Senhora de Nazaré | Vila de Retiro Grande, Cachoeira do Arari | 08/09/2023 |

(O gcatholic já tem a de Curralinho, listada como "Perpétuo Socorro".) **Muaná tem três paróquias** — a da
sede, a do Distrito de São Miguel do Pracuúba e a da Vila de Ponta Negra.

## Comunidades: 259 declaradas, zero listadas

A ficha de cada paróquia publica o **número** de comunidades, nunca os nomes. Somando: 259.

| Paróquia | Município | Comunidades declaradas |
|---|---|---|
| São Francisco de Paula | Muaná | 40 |
| Catedral Nossa Senhora da Conceição | Ponta de Pedras | 37 |
| São Sebastião | São Sebastião da Boa Vista | 37 |
| São João Batista | Curralinho | 33 |
| Nossa Senhora do Rosário do Perpétuo Socorro | Curralinho | 32 |
| São Miguel Arcanjo | São Miguel do Pracuúba, Muaná | 28 |
| Nossa Senhora da Conceição | Cachoeira do Arari | 17 |
| Nossa Senhora de Nazaré | Retiro Grande, Cachoeira do Arari | 17 |
| Nossa Senhora dos Navegantes | Ponta Negra, Muaná | 13 |
| Nossa Senhora de Nazaré | Santa Cruz do Arari | 5 |

O arquivo traz **13 comunidades**: as 10 matrizes, o **Santuário Diocesano de Nossa Senhora de Nazaré**
(`media` — o blog o publica sem dizer a paróquia, mas o Reitor é um dos padres de São Francisco de Paula, a
única paróquia da sede de Muaná) e mais duas igrejas de agregador em municípios de paróquia única:
**Igreja Nossa Senhora Rainha da Paz** (Praia Grande, Ponta de Pedras, `baixa`) e **Igreja São Benedito**
(Muaná, `media`, corroborada pelo gcatholic).

**É o maior buraco desta circunscrição**: 246 comunidades declaradas e não publicadas.

## Horários: a diocese não publica nenhum

Os 15 horários vêm todos do agregador **Lírio Católico** (base de 02/09/2026, sem data de conferência por
igreja) e são **todos `baixa`**. Cobrem 3 igrejas:

- **Matriz São Sebastião** (São Sebastião da Boa Vista), a grade mais completa: domingo 7h, 9h e 19h; terça,
  quinta e sábado 19h; sexta 7h — mais Terço da Misericórdia (quarta 15h), Terço dos Homens (quarta 18h15) e
  Terço das Mulheres (sexta 18h), gravados como `ROSARY`;
- **Igreja Nossa Senhora Rainha da Paz** (Praia Grande, Ponta de Pedras): domingo 8h, terça e quinta 19h;
- **Igreja São Benedito** (Muaná): quinta e sábado 19h.

A ficha da própria **Catedral** no agregador **não tem nenhum horário**. **Oito das 10 paróquias entram sem
nenhum horário.**

## Armadilhas e divergências encontradas

- **Pároco desatualizado na fonte oficial.** A página de paróquias (18/08/2025) registra como pároco da
  Catedral o próprio bispo, **Dom Teodoro Mendes Tavares, C.S.Sp.**, que foi transferido para **Santiago de
  Cabo Verde em 16/02/2026**. A diocese está em **SEDE VACANTE**, com **Pe. Antonio Cardoso** como
  Administrador Diocesano (notícia de junho de 2026 no próprio blog). Gravei `priestName: null` na Catedral,
  com a explicação em `notes`, e mantive o Cura da Sé (Pe. Edileno Félix) e os vigários no texto.
- **CEP de outro estado do mesmo estado**: São Francisco de Paula (Muaná) sai com **66825-000**, que no ViaCEP
  é a Rodovia Artur Bernardes, no Tapanã, em **Belém**. Muaná é a faixa **68825-xxx**; gravei 68825-000.
- **Duas paróquias Nossa Senhora de Nazaré** (Santa Cruz do Arari e Vila de Retiro Grande) e **duas Nossa
  Senhora da Conceição** (Catedral de Ponta de Pedras e Cachoeira do Arari). Os slugs incluem cidade/distrito.
- **Três paróquias sem endereço completo**: Nossa Senhora dos Navegantes (Ponta Negra) não publica endereço
  nem CEP; Nossa Senhora de Nazaré (Retiro Grande) e São Miguel Arcanjo (Pracuúba) publicam logradouro sem CEP.
- **A matriz de São Sebastião da Boa Vista é chamada de "Santuário Glorioso São Sebastião"** pelo agregador,
  no mesmo endereço que a diocese publica para a paróquia. A diocese não usa esse título; mantive
  "Matriz São Sebastião" e registrei a divergência.
- **Comentários no blog viram texto**: a página de paróquias tem comentários de leitores (pedidos de certidão
  de batismo, telefones pessoais) logo abaixo da lista — não confundir com dado da diocese.

## Precisa de validação humana

1. **Os 259 nomes de comunidade**: a diocese publica só a contagem. É o dado mais importante a pedir à Cúria.
2. **Todos os 15 horários são `baixa`**, de um único agregador sem data de conferência por igreja. Oito
   paróquias entram sem nenhum.
3. **Pároco da Catedral**: quem assumiu depois da saída de Dom Teodoro (16/02/2026). O Cura da Sé publicado é
   Pe. Edileno Félix.
4. **Novo bispo**: a diocese está em sede vacante desde 16/02/2026, com Pe. Antonio Cardoso (pároco de Nossa
   Senhora do Rosário do Perpétuo Socorro, Curralinho) como Administrador Diocesano.
5. **CEP de três paróquias** (Ponta Negra, Retiro Grande e São Miguel do Pracuúba) e **endereço** de Ponta
   Negra: não publicados.
6. **Santuário Diocesano de Nossa Senhora de Nazaré** (Muaná): confirmar a que paróquia pertence e se tem
   missa fixa. Entrou como comunidade de São Francisco de Paula, `media`, sem horário.
7. **Igreja Nossa Senhora Rainha da Paz** (Praia Grande, Ponta de Pedras): o agregador lhe dá secretaria
   comunitária própria e telefone (91) 98605-2430; confirmar o vínculo com a Catedral.
8. **Nome oficial da matriz de São Sebastião da Boa Vista** (Paróquia × "Santuário Glorioso").
9. **Data de criação de São Francisco de Paula (14/04/1757) e da Catedral (1757)**: as duas paróquias mais
   antigas da diocese, criadas no mesmo ano — vale conferir.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `bishopName`: já está `null`, e está **certo**: a diocese está em **SEDE VACANTE desde 16/02/2026**, quando
  Dom Teodoro Mendes Tavares, C.S.Sp. foi transferido para Santiago de Cabo Verde (gcatholic, atualizado em
  17/02/2026). O Administrador Diocesano é **Pe. Antonio Cardoso**. Se o campo puder receber administrador,
  é esse o nome.
- `address` `"Bispado, Rua Dr. Assis 834, Bairro Cidade Velha"` e `zipCode` **66020-290** estão corretos e
  conferem no ViaCEP (Rua Doutor Assis, Cidade Velha, Belém) — **note que o endereço administrativo do
  Bispado fica em BELÉM**, enquanto a sé e a Catedral estão em Ponta de Pedras. A Receita publica 66020-010
  para o mesmo logradouro, CEP que o ViaCEP **não reconhece**; não trocar.
- `website`: está `http://diocesepontadepedras.blogspot.com` e continua sendo o único site oficial, **ativo**
  (páginas atualizadas em agosto de 2026). Manter.
- `email`: está `null` e continua sem e-mail publicado.
- `phone` "(91) 3225-1625" não foi confirmado em nenhuma fonte de 2025–2026; o blog não publica telefone.
- `foundedYear` 1963 está de acordo com a convenção (Prelazia erigida em 25/06/1963; Diocese só em
  16/10/1979). **Não mexer.**
