# Relatório — Diocese de Óbidos (`obidos`)

Pesquisa em 2026-09-17. Arquivo: `obidos.json`.

## Resultado

| Item | Valor |
|---|---|
| Unidades | **14** — 11 paróquias (contando a Catedral) + 3 áreas missionárias |
| Confiança das unidades | 12 `alta` · 2 `media` (as duas áreas missionárias novas) · 0 `baixa` |
| Comunidades | 34 — 14 sedes (12 `alta`, 2 `media`), 10 comunidades da Área N. Sra. das Graças (`media`) e 10 igrejas de Alenquer vindas de agregador (`baixa`, não carregam) |
| Horários | 8, **todos `baixa`** (agregador Lírio Católico): 5 da Catedral e 3 de igrejas de Alenquer |
| Cobertura | **14/14** — Receita: 14 filiais ativas; página oficial: 12 (anterior a 2022); Wikipédia: 11 + 1; Anuário Pontifício 2024: 13 (dado de 2023) |
| Municípios | Óbidos 3 · Juruti 4 · Oriximiná 3 · Alenquer 1 · Curuá 1 · Faro 1 · Terra Santa 1 |

## A diocese está sem site

`diocesedeobidos.com.br` (WordPress) devolve a página de **conta suspensa** da hospedagem — o Arquivo da Internet já
a registra assim em 24/06/2026; as últimas capturas vivas são de ago/2025. Não achei domínio alternativo
(`.org.br` e `.org` não resolvem). A lista saiu de três fontes cruzadas:

1. **Receita Federal**, CNPJ-base **04.944.179** (DIOCESE DE OBIDOS): 15 ordens, **todas ativas** — a Cúria e 14
   filiais, que são a lista completa, com endereço e data de abertura. Nenhuma filial-fóssil.
2. **Página oficial "Paróquias"** na captura de 07/08/2025: 12 unidades com **data de fundação**, endereço, CEP,
   e-mail, telefone e "responsável". O conteúdo é anterior a 2022 (rodapé "© 2019"; faltam as duas unidades
   criadas depois; o responsável de Alenquer aparece hoje como vigário em Santarém).
3. **Portal antigo** (capturas de 2019): fichas com fundação, festa do padroeiro e pároco; o molde "Horários de
   Missa na Matriz" e o de "Comunidades urbanas / rurais-ribeirinhas" estão **em branco em todas**. As páginas
   por cidade do site novo (capturas de 2023) ainda trazem o texto-modelo do tema ("Change the color to match
   your brand…"). Ou seja: **a diocese nunca publicou horários nem comunidades**.

### As duas unidades que só a Receita mostrava

- **Área Missionária Nossa Senhora das Graças (Oriximiná)** — filial 0014, aberta em 10/06/2022 como "Paróquia
  N. Sra. das Graças" (Rua Acioli Ramos, 1705). O portal Obidos.Net.Br noticiou a missa de instalação da "nova
  Área Missionária" em **11/09/2022**, presidida por Dom Bernardo, com a lista das comunidades que a formaram
  (gravadas como `media`). Títulos do site diocesano indexados pelo buscador continuam a chamá-la de Área
  Missionária.
- **Área Missionária Nossa Senhora do Perpétuo Socorro (Juruti)** — filial 0015, aberta em **29/04/2025** (Rua
  Cel. Joaquim Gomes do Amaral, 674). O site diocesano publicou em 2025 "'Dividir para Multiplicar' … Nova Área
  Missionária é Instalada em Juruti"; a página está fora do ar e **não tem captura** — só vi o título e o resumo
  indexados (40 comunidades; padres Flávio Alves e Lislay Maia, SCJ). Por isso a unidade é `media`, e o
  responsável ficou só em `notes`.

Com elas a conta fecha: 11 paróquias + Porto Trombetas = 12 (Wikipédia e página oficial); + N. Sra. das Graças
= 13 (Anuário Pontifício 2024, dado de 2023); + Perpétuo Socorro = **14** (Receita, 2025).

## Contatos: por que os campos de produção estão vazios

Telefone, e-mail e responsável da página oficial são de conteúdo com pelo menos quatro anos, e vários e-mails são
pessoais de padres que já saíram. Seguindo a regra da rodada, ficaram no campo extra **`archived`** de cada
unidade (com as variantes de 2019), e `phone`/`email`/`priestName` estão `null`. `foundedYear` veio da página
oficial (datas históricas não vencem). Endereço: o da página oficial, que bate com o da Receita em 11 das 12
(a exceção é a Catedral: Praça Barão do Rio Branco na página × Travessa Bom Jesus, 177 na Receita).
Única rede social gravada em `website`: o Facebook da Paróquia Santo Antônio de Oriximiná, que o buscador devolve hoje.

## Horários

Nenhuma fonte oficial. O `horariodemissa.com.br` tem 6 fichas da diocese, todas de **19/05/2013** e sem nenhum
horário. O Lírio Católico (base regenerada em 02/09/2026, sem data por igreja) traz:

- Catedral de Sant'Ana: domingo 07h, 09h30 e 19h; segunda e sexta 18h → 5 registros `baixa`;
- Alenquer: 10 igrejas com endereço (dados de mapa), três com missa (N. Sra. do Perpétuo Socorro domingo 19h; São
  Benedito e São Cristóvão sábado 19h) → comunidades e horários `baixa` (Alenquer tem uma só paróquia, então a
  atribuição é segura; a fonte não é oficial);
- para a matriz de Alenquer, "09:00 e 18:00" idênticos nos sete dias — padrão de horário de funcionamento, **não
  gravado**;
- quatro igrejas da cidade de Óbidos e a Comunidade São Marcos (Juruti) com horário: **não gravadas**, porque há
  três paróquias em Óbidos e duas unidades urbanas em Juruti e o agregador não diz a qual pertencem.

## Pontos para validação humana

1. **Tudo que é contato e clero**: telefone, e-mail e pároco das 14 unidades (os valores antigos estão em `archived`).
2. **Horários**: nenhum confirmado. Caminho provável: as páginas de Facebook das paróquias (Sant'Ana, São
   Martinho, Santo Antônio de Oriximiná, N. Sra. da Saúde de Juruti), que não abrem sem login.
3. **Tipo das duas unidades novas**: a Receita diz "Paróquia"; as notícias, "Área Missionária". Conferir se alguma
   já foi elevada, a data exata da instalação em Juruti e o responsável.
4. **São Francisco e Santa Clara (Óbidos)**: três grafias do nome (página oficial, Receita "São Francisco de Assis",
   página da cidade "São Francisco e Santa Clara de Assis").
5. **Datas de fundação × Receita**: Tabatinga (fundação 20/01/2015 × filial de 2012), Juruti Velho (04/02/2017 ×
   2015), Curuá (2000 × 2002) — adotei a página oficial. Faro: "1758" aparece solto na página de 2025 e em branco em 2019.
6. **Porto Trombetas**: o e-mail antigo cita "santabarbara" — conferir o orago da igreja-sede.
7. **Comunidades**: Alenquer declara "mais de 100 comunidades"; Juruti/Perpétuo Socorro, 40. Nenhuma lista publicada.
8. **`dioceses.json` (não alterei)**: o campo `website` aponta para `…/cgi-sys/suspendedpage.cgi` — é a página de
   conta suspensa; trocar por `null` (ou pelo domínio, se voltar). E-mail em uso segundo a CNBB Norte 2:
   `centropobidos@gmail.com` (o institucional `diocesedeobidos@diocesedeobidos.com.br` depende do domínio suspenso).
   Endereço: Praça Frei Rogério, 239 – Centro, CEP 68250-000; telefone (93) 3547-1296 — conferem.

## Fontes

- http://web.archive.org/web/20250807193749/https://diocesedeobidos.com.br/paroquias/ · capturas de 2019 do portal antigo (`/paroquias`, `/paroquia/18`–`25`) · capturas de 2023 das páginas por cidade
- https://minhareceita.org/04944179000196 e filiais 0002–0015
- https://www.obidos.net.br/index.php/noticias/5359-oriximina-instalacao-de-nova-area-missionaria-da-diocese-de-obidos-nossa-senhora-das-gracas
- https://cnbbn2.com.br/diocese-de-obidos/ · https://pt.wikipedia.org/wiki/Diocese_de_Óbidos · https://www.catholic-hierarchy.org/diocese/dobid.html
- https://liriocatolico.com.br/horario_missa/dados/uf/PA.json · https://www.horariodemissa.com.br (fichas de 2013)
