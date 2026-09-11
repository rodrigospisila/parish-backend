# Relatório de pesquisa — Diocese de Cachoeiro de Itapemirim (ES)

Pesquisa: 11/09/2026. Arquivo: `cachoeiro-de-itapemirim.json`.

## Números

| Item | Quantidade |
|---|---|
| Paróquias | **44** (44 `alta`, 0 `media`, 0 `baixa`) |
| Paróquias com telefone + e-mail + pároco | 44 (42 com CEP, 42 com logradouro) |
| Comunidades nomeadas | 9 (6 matrizes/catedral + 3 santuários) |
| Horários fixos | 176 — 120 CONFESSION (60 `alta`, 60 `media`) e 56 MASS (32 `media`, 24 `baixa`) |
| Municípios cobertos | 27 |

Cobertura de paróquias: **100 %** (44 de 44).

## Fontes principais

1. **Site oficial — `https://diocesecachoeiro.org.br`** (WordPress + Elementor/JetEngine).
   O caminho rápido foi a **API REST do WordPress**: o site tem o custom post type `paroquias`
   (`/wp-json/wp/v2/paroquias?per_page=100`) com 52 registros = **44 paróquias + 8 áreas pastorais**
   (as áreas ficam na categoria 158 e foram descartadas). O `content` da API traz o texto histórico
   (cidade, ano de criação, nº de CEBs, pároco).
   Os campos estruturados **não** aparecem na API (`acf: []`): eles são renderizados pelo Elementor,
   então cada uma das 44 páginas foi raspada em HTML e o bloco de metadados extraído pelos rótulos
   `Setor:`, `Telefone:`, `E-mail:`, `Funcionamento na Secretaria Paroquial:`, `Confissões:`,
   `Pároco:`, `Endereço:`. Os e-mails vêm ofuscados pelo Cloudflare e foram decodificados de
   `data-cfemail`.
   As fichas estão vivas: 20 das 44 foram modificadas em 2025 ou 2026 (a mais recente em 28/08/2026).
2. `https://diocesecachoeiro.org.br/horarios-de-missa/` — a **única** grade de missas publicada pela
   diocese, com 3 igrejas (Catedral de São Pedro, Paróquia N. Sra. da Consolação e Igreja Matriz
   Nosso Senhor dos Passos). Página com última modificação registrada no CMS em **26/04/2024**.
3. `horariodemissa.com.br` — varredura das 27 cidades da diocese (37 fichas encontradas).
4. `catholic-hierarchy.org/diocese/dcadi.html` — 43 paróquias no Anuário Pontifício de 2023.

## Como fica a contagem esperada

O Anuário Pontifício de 2023 registrava **43** paróquias. A diocese publica **44**, e a diferença é
documentada: a **Paróquia Santa Bárbara**, de **Ibitirama**, foi erigida em **04/12/2025** pelo
Comunicado 2/2025, e o próprio site a chama de "44ª paróquia da Diocese". Até então Ibitirama era o
único município do Espírito Santo sem paróquia própria. Portanto `parishesExpected: 44`.

## Áreas pastorais (o campo `forania`)

A diocese organiza as paróquias em 8 **Áreas Pastorais**: Litorânea (7), Cachoeiro (9), Serrana (4),
Vales do Café (4), Montanhas do Caparaó (6), Vale do Caparaó (7), ABC (3) e das Rochas (4).

## Horários — o que entra e o que não entra

- **Confissões (120 horários: 60 `alta`, 60 `media`)**: vêm do campo `Confissões:` da ficha oficial de
  cada paróquia; 43 das 44 publicam. A confiança segue a atualidade da ficha — 21 das 44 foram
  modificadas nos últimos 12 meses (`alta`), as outras 23 são oficiais mas sem sinal de atualidade
  (`media`). Como o modelo só aceita `HH:MM`, cada **janela** virou um horário
  com o início (ex.: "08h às 11h – 14h às 16h" → 08:00 e 14:00) e a janela completa foi preservada
  em `notes`. Duas paróquias publicam só "por agendamento" (N. Sra. do Rosário/Ibatiba e São
  Filipe/Cachoeiro) e ficaram sem registro.
- **Missas (`media`, 32 horários)**: as 3 igrejas da página oficial. Classificadas `media` porque a
  página é oficial mas está sem sinal de atualidade (modificada em 26/04/2024, > 12 meses).
  Em Nosso Senhor dos Passos a própria página separa **Celebração da Palavra** (seg/ter/qua/sex, 7h)
  de **Missa** (quinta 7h e domingo 7h e 9h) — só as missas entraram. A página traz "Domingo: 7h, 9h
  e 9h", provável erro de digitação; registrei 07:00 e 09:00.
- **Missas (`baixa`, 33 horários)**: do `horariodemissa.com.br`, fonte única não oficial. A varredura
  mostrou que a base está **parada**: das 37 fichas, **29 foram atualizadas em 04–14/06/2013**, 1 em
  2014, 1 em 2015, 1 em 2017 e só **5 em 2023**. Pela regra do README (texto anterior a 2020 é
  rebaixado), tudo aqui é `baixa`. As cinco fichas de 2023 são de Castelo (N. Sra. da Penha, com
  grade completa; e Santo André Apóstolo/Aracuí), Conceição do Castelo e Alegre (as duas de Alegre
  não têm horário algum cadastrado). Na grade de Castelo, os horários marcados "(Cel.)" são
  Celebração da Palavra e **não** foram registrados como missa.
- **Fora do modelo**: o Santuário Água Santa (Santa Luzia), da Paróquia N. Sra. Mãe dos Homens em
  Iúna, celebra "todo dia 13, missa às 7h" — recorrência mensal, que `MassSchedule` não representa.
  Ficou registrada só em `sources` da comunidade.

**Nenhuma das 41 paróquias restantes publica horário de missa em canal indexável.** Elas divulgam a
grade em Instagram e Facebook (44 perfis oficiais foram coletados e estão em `website`/`notes`), que
não são legíveis por leitor automático. Este é o maior buraco da diocese.

## Comunidades

O site informa o **número** de CEBs de cada paróquia — **1.037 comunidades no total**, de 7
(N. Sra. de Lourdes/Celina) a 50 (São José/Mimoso do Sul) — mas **não publica os nomes**. Por isso
`communities` fica vazio na maioria (o importador cria a igreja-matriz sozinho) e o número foi
guardado em `notes` de cada paróquia. As 9 comunidades nomeadas são as que a própria diocese
descreve em texto: Catedral São Pedro Apóstolo, Matriz Nosso Senhor dos Passos ("Matriz Velha",
1879-1884), Matriz e Santuário de N. Sra. das Neves (Praia das Neves, igreja de 1694 tombada em
2008), Matriz Santo André Apóstolo e Santuário de Aracuí, Matriz N. Sra. Mãe dos Homens e Santuário
Água Santa, e a Comunidade Santa Bárbara (matriz da paróquia nova de Ibitirama). Nas paróquias com
santuário a matriz foi listada explicitamente com `isMatriz: true`, senão o importador mandaria as
missas da matriz para o santuário.

## Pontos para o enxame de validação humana

1. **Paróquia N. Sra. do Rosário (Ibatiba)** — a ficha oficial publica endereço de **Iúna**
   ("Praça Padre José Luis Horn, 17, Centro – Iúna/ES"), que é o da Paróquia N. Sra. Mãe dos Homens;
   o e-mail (`paroquiaiuna@hotmail.com`) e um dos telefones também são os de Iúna. O texto da mesma
   página e o Facebook (`paroquiarosarioibatiba`) confirmam que a paróquia é de **Ibatiba**.
   Gravei `city: "Ibatiba"` e deixei `address`/`zipCode` nulos. **Precisa do endereço real.**
2. **Párocos divergentes dentro da mesma página** (o campo estruturado diz um nome, o texto histórico
   diz outro): Catedral São Pedro (ficha: Pe. Bruno Sá Rangel / texto: Pe. Thiago da Silva Vargas);
   São José, Mimoso do Sul e Santíssima Trindade, Marataízes (**os nomes aparecem trocados entre as
   duas paróquias**); N. Sra. de Lourdes, Celina; Sagrado Coração de Jesus, Divino de São Lourenço.
   Usei sempre o campo estruturado e anotei a divergência em `notes`.
3. **CEP suspeito** — Paróquia N. Sra. da Imaculada Conceição, de **Conceição do Muqui** (distrito de
   Mimoso do Sul): a ficha publica 29.480-000, que é o CEP de **Muqui**. Mantive o CEP como publicado
   e anotei.
4. **Paróquia Sagrados Corações de Jesus e Maria (Cachoeiro)** — a diocese declara que ela **não tem
   igreja matriz**; o endereço gravado é o do escritório paroquial (Nova Brasília) e a casa paroquial
   fica no Zumbi, junto à igreja São José Operário. O importador vai criar uma "Matriz Sagrados
   Corações de Jesus e Maria" que não existe fisicamente.
5. **Paróquia Santa Bárbara (Ibitirama)** — erigida em 04/12/2025; a ficha ainda não publica CEP.
6. **Telefone com DDD de outro estado** — Paróquia Senhora Sant'Ana (Apiacá) publica (22) 99834-2624
   (DDD do norte fluminense; Apiacá fica na divisa com o RJ). Plausível, mas confirmar.
7. **Ano de fundação** — extraído do texto histórico de cada página, presente em 16 das 44. Não há
   sinal de "data de cadastro no CMS" (as datas são de 1856 a 2025 e não se repetem em bloco), então
   não houve o problema visto em Itapetininga/São Carlos. O 1856 da Catedral é a criação da freguesia
   por Lei Provincial, anterior à criação da diocese (1958).
8. **Missas**: prioridade máxima. 41 das 44 paróquias entram em produção **sem nenhum horário de
   missa**. O caminho é ler os perfis de Instagram/Facebook listados em `notes`.
