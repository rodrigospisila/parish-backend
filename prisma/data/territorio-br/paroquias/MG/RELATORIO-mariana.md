# Relatório — Arquidiocese de Mariana (MG)

Pesquisa em 10/09/2026. Arquivo gerado: `paroquias/MG/mariana.json`.

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias/unidades no arquivo | **137** (todas com `confidence: alta`) |
| Cobertura | 137 / 137 esperadas (a fonte oficial é a própria lista) |
| Municípios/localidades distintos | 97 |
| Comunidades | 242 — 12 paróquias com comunidades reais listadas; nas demais só a matriz |
| Horários fixos | 250 (154 alta, 44 media, 52 baixa) em **12** paróquias — 229 missas, 11 confissões, 8 adorações, 2 terços |
| Campos preenchidos | endereço 135, CEP 122, bairro 97, telefone 135, e-mail 122, pároco 135, ano de fundação 133, forania 137, site 18 |

Composição das 137 unidades: **134 paróquias**, 1 quase-paróquia (São Sebastião, Grota),
1 curato (Nossa Senhora das Graças, Santa Bárbara) e 1 reitoria/basílica (Senhor Bom Jesus,
Congonhas).

## Fontes principais

1. **`https://arqmariana.com.br/paroquias/`** — página oficial com a lista completa das 137
   unidades agrupadas nas 5 regiões pastorais (Norte 25, Oeste 29, Leste 42, Centro 9, Sul 32).
   Essa é a fonte primária de nome + cidade.
2. **`https://arqmariana.com.br/paroquia/<slug>/`** — as 137 páginas de detalhe foram lidas uma a
   uma (endereço, CEP, telefone, WhatsApp, e-mail, pároco/administrador, festa do padroeiro, data
   de fundação, site, redes sociais). Cada paróquia tem essa URL em `sources`.
3. **`https://arqmariana.com.br/site_2019/guia-geral.html`** — Guia Geral do portal antigo
   (dados de ~2016). Usado **apenas** para atribuir a forania/setor de cada paróquia
   (117 das 137 casaram por nome + localidade; as outras 20 ficaram só com a região pastoral).
   Também é a fonte do panorama: 130 paróquias e 2 quase-paróquias, 5 regiões, 11 foranias/setores,
   79 municípios, 22.680 km², 919 comunidades urbanas e 571 rurais.
4. **`https://arqmariana.com.br/curia-metropolitana/`** — endereço, CEP, telefones e e-mail da
   Cúria; **`/dom-airton-jose-dos-santos/`** confirma Dom Airton José dos Santos como arcebispo.
5. Sites paroquiais oficiais para horários: `paroquiaconceicaoop.com.br`, `santaefigeniaop.com.br`,
   `pilarouropreto.com.br`, `coracaodejesusmariana.com.br`, `igrejamatrizcl.com.br`,
   `santaritavicosa.com.br`, `saojoaobatistavicosa.com.br`, `parfatima.com.br`,
   `piedadebarbacena.com.br`.
6. `missasembarbacena.com.br` — site local independente de Barbacena; usado com `media` para
   São José Operário (atualização declarada 21/06/2026) e Nossa Senhora das Dores (20/11/2025), e
   para as listas de comunidades de Bom Pastor, Nossa Senhora de Fátima e São Pio X.
7. Matéria oficial `arqmariana.com.br/noticia/confira-os-horarios-de-missas-e-de-visitacao-turistica-na-catedral-basilica-de-nossa-senhora-de-assuncao/`
   para a Catedral da Sé — **publicada em 29/12/2022**, por isso `media`.

### Fontes descartadas

- `horariodemissa.com.br` — a ficha de Barbacena diz "dados atualizados pela última vez em
  27/05/2013" e quase todas as igrejas aparecem com "Nenhum horário de Missa informado".
  Dado velho demais para entrar até como `baixa`.
- `missahora.com.br` (ex-`horariosmissa.com.br`) — só tem 1 igreja cadastrada em Mariana.
- `arqmariana.com.br/noticia/horarios-das-celebracoes-nas-paroquias-da-arquidiocese/` — parece
  promissor pelo título, mas é de **26/05/2020** e lista as transmissões on-line da pandemia.
- `santuariodematosinhos.com.br` — é o Santuário de São João del-Rei, outra diocese.
- 7 sites paroquiais não resolveram DNS a partir deste ambiente e ficaram sem horário:
  `paroquiadepassagem.com.br`, `paroquiansnazare.com.br`, `paroquiadobompastorcl.com`,
  `paroquiadejeceaba.com.br`, `saojudaslafaiete.com.br`, `paroquiadesaosilvestre.com.br`,
  `paroquiasantanacarandai.com.br`. Estão gravados em `website` e são o primeiro alvo de uma
  próxima rodada (o Arquivo da Internet estava devolvendo HTTP 429 durante esta rodada).

## Observação sobre o número de paróquias

O pedido da tarefa falava em "casa das 250 paróquias". **Não confere**: a própria arquidiocese
publica 137 unidades, e o Guia Geral oficial declarava 130 paróquias + 2 quase-paróquias.
O número grande de Mariana é o de **comunidades** (919 urbanas + 571 rurais = 1.490 no Guia),
não o de paróquias. O crescimento de 132 para 137 desde o Guia é coerente com criações recentes
verificadas nas páginas de detalhe (p. ex. Paróquia Nossa Senhora Aparecida, Mariana, fundada em
25/06/2017; Paróquia São Vicente de Paulo, Santa Bárbara, 27/09/2023, que no Guia ainda era
"Reitoria de São Vicente"; Paróquia São José, Barão de Cocais, 14/07/2014).

## Decisões de modelagem

- **`city` = a localidade que a arquidiocese informa**, inclusive quando é distrito. São 18 casos:
  Furquim, Cachoeira do Brumado, Passagem de Mariana, Monsenhor Horta, Santa Rita Durão e
  Cláudio Manoel (Mariana); Cachoeira do Campo, Santa Rita de Ouro Preto, Amarantina e
  Miguel Burnier (Ouro Preto); São Gonçalo do Bação; Monsenhor Isidro (Itaverava); Joselândia
  (Santana dos Montes); Granada (Abre Campo); Grota; Ribeirão de São Domingos (**Santa Margarida**,
  não Raul Soares — o endereço oficial diz isso); Jurumirim (Rio Casca); Correia de Almeida
  (Barbacena). O município aparece no `address` quando a fonte o escreve. **Ponto para validação
  humana**: decidir se o Parish deve normalizar esses `city` para o município do IBGE.
- **`deanery`** guarda "Região Pastoral X — Forania/Setor Y" (117 registros) ou só a região (20).
- **Nomes**: mantidos como a arquidiocese escreve, com dois ajustes de prefixo previstos no README:
  `Paróquia de São José`/`de São Brás` → `Paróquia São José`/`São Brás`, e
  `Basílica do Senhor Bom Jesus (Reitoria)` → `Reitoria Basílica do Senhor Bom Jesus`.
- **Comunidades**: onde não há lista pública, `communities` traz só a matriz
  (`Matriz <padroeiro>`, `isMatriz: true`), que é o que o importador criaria de qualquer forma.
- **Missas de recorrência mensal** ("1º e 3º domingo", "última quinta-feira do mês", "2º domingo",
  "de 15 em 15 dias") ficaram `baixa` com a regra literal copiada em `notes`, porque
  `MassSchedule` só tem dia da semana. São 52 dos 250 horários — a maior parte vem das agendas
  paroquiais mensais de Santa Efigênia (Ouro Preto), São João Batista (Viçosa) e
  Nossa Senhora das Dores (Barbacena).

## Precisa de validação humana

1. **Catedral sem prefixo.** A arquidiocese lista a Sé como `Paróquia Nossa Senhora da Assunção`
   (Mariana). É a **Catedral Basílica de Nossa Senhora da Assunção** (e-mail
   `catedralmariana@yahoo.com.br`, Instagram `@catedraldemariana`, e a comunidade-matriz no
   arquivo já se chama "Catedral Basílica Nossa Senhora da Assunção (Sé)"). Mantive o nome
   oficial da fonte no campo `name`; se o Parish quiser destacar a catedral, renomear para
   `Catedral Basílica Nossa Senhora da Assunção`.
2. **Unidades que não são paróquia.** `Curato Nossa Senhora das Graças` (Santa Bárbara) e
   `Reitoria Basílica do Senhor Bom Jesus` (Congonhas) **passam** pelo filtro `isNonParishUnit`
   do importador (ele só barra Capela/Igreja/Capelania/Missão/Oratório/Comunidade/Mosteiro/
   Convento/Monjas/Monges/Abadia/Carmelo) e entrariam como paróquias. Decidir se devem entrar.
3. **Telefones malformados** copiados da fonte oficial:
   - Cachoeira do Brumado — `(31) 9830-21379` (11 dígitos quebrados no lugar errado);
   - Monsenhor Horta — `(31) 8363-8277` (celular antigo de 8 dígitos);
   - Cláudio Manoel — `(31) 8217-2540 (Secretária - Marluci)`.
   Vários outros trazem o WhatsApp só com dígitos; foi normalizado para `(DD) NNNNNNNNN`.
4. **Registros incompletos na fonte**: `Paróquia São Gonçalo` (São Gonçalo do Bação) não tem
   endereço nem telefone; `Paróquia São Sebastião` (Jurumirim) não tem endereço;
   `Paróquia Bom Jesus do Monte` (Furquim) não tem telefone.
5. **Homônimos na mesma cidade** (o importador desambigua pelo bairro): 3 "Paróquia São Sebastião"
   e outras repetições em Barbacena, Conselheiro Lafaiete e Ouro Preto. Conferir se o `neighborhood`
   está preenchido em todos (97 de 137 têm bairro).
6. **Horários com fonte oficial mas sem sinal de atualidade** (`media`): Matriz N. S. da Conceição
   de Conselheiro Lafaiete (página com última atualização declarada em **setembro de 2022**) e a
   Catedral da Sé de Mariana (matéria de **29/12/2022**). São 44 dos 250 horários (contando os de
   Barbacena vindos do site local).
   Em Ouro Preto (Pilar) há duas confissões cujo horário exato a fonte não publica — gravei
   `sexta 07:00` com a frase literal "depois da Missa das 7h" em `notes` e `confidence: baixa`.
7. **Sagrado Coração de Jesus (Mariana)**: a fonte publica "17h30: Igreja de São Sebastião **ou**
   Igreja de Santa Teresa D'Ávila **ou** Capela de Nossa Senhora Aparecida (Bandeirantes)" —
   revezamento sem regra explícita; gravado uma vez, `baixa`, com a frase literal em `notes`.
   As "Celebrações da Palavra" dessa e de outras paróquias **não** foram gravadas: não são missa e
   não cabem em `MassSchedule` (`MASS`/`CONFESSION`/`ADORATION`/`ROSARY`).

## O que ficou sem cobertura

- **125 das 137 paróquias estão sem horário** e **125 sem lista de comunidades**. A arquidiocese
  não publica horários centralizados e a maioria das paróquias só tem Facebook/Instagram
  (77 das 137 têm rede social registrada na página oficial, mas não são raspáveis).
  Caminhos para a próxima rodada, em ordem de retorno: (a) os 7 sites paroquiais que falharam por
  DNS; (b) as 77 contas de Instagram/Facebook; (c) fichas do Google Maps das matrizes.
