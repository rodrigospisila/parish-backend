# Relatório — Diocese de Araguaína (TO)

**Pesquisa:** 2026-09-11 · **Arquivo:** `paroquias/TO/araguaina.json`

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **23** (23 alta) |
| Capelas sem paróquia-mãe identificável, entradas próprias | **23** (`nao-paroquial` + `loadAsParish`) |
| Total de entradas no arquivo | **46** |
| Comunidades/capelas | **102** |
| Horários fixos | **175** (110 alta, 62 media, 3 baixa) |
| Cobertura | 23 paróquias (esperado publicado: 22 — ver abaixo) |

Diocese nova: criada em **31/01/2023** por desmembramento da **Diocese de Tocantinópolis**,
instalada em **15/04/2023**, 19 municípios, Província Eclesiástica de Palmas, Regional Norte 3.
Bispo: **Dom Giovane Pereira de Melo**.

## Fontes principais

1. **Menu "Paróquias"** — <https://diocesedearaguaina.org/paroquias/> (20 entradas). As páginas
   de paróquia individuais **estão vazias**: só um `<h1>` com o nome.
2. **Horários de Missa** — <https://diocesedearaguaina.org/?page_id=2392>. Página diocesana
   completa por dia e horário, listando cada igreja de Araguaína com o bairro (105 missas).
3. **Horários de Confissões** — <https://diocesedearaguaina.org/horarios-de-confissoes/>
   (25 registros **e os telefones de secretaria de 6 paróquias**).
4. **O achado desta pesquisa — as fichas de 2023 da Diocese de Tocantinópolis no Arquivo da
   Internet.** Antes do desmembramento, estas paróquias eram de Tocantinópolis e o site de lá
   publicava ficha completa de cada uma. O domínio caiu, mas as capturas de janeiro de 2023
   sobreviveram e trouxeram **endereço, CEP, telefone, e-mail, pároco, ano de ereção,
   comunidades e horários** de **9 paróquias** que hoje são de Araguaína: São Judas Tadeu,
   São Paulo Apóstolo, São José Operário, N. Sra. da Natividade (as quatro em Araguaína),
   N. Sra. da Conceição (Wanderlândia), N. Sra. do Perpétuo Socorro (Aragominas),
   N. Sra. do Perpétuo Socorro (Filadélfia), N. Sra. do Rosário de Fátima (Babaçulândia) e
   São Miguel Arcanjo (Xambioá). Essa fonte responde por **todas as 102 comunidades** do arquivo.
5. **GCatholic** (43 igrejas, atualizado 2026-01-01) — checagem de cobertura.

## Por que 23 paróquias e não 22

O menu oficial lista **20**. Somei três que ele omite, cada uma com fonte própria:

| Paróquia | Por que entrou |
|---|---|
| **São José Operário** (Bairro JK, Araguaína) | Chamada de "Paróquia" nas páginas oficiais de Missa e de Confissões, com WhatsApp próprio; ficha completa de 2023 |
| **N. Sra. do Perpétuo Socorro** (Bairro Santa Terezinha, Araguaína) | Idem. **Não existia em 2023** (ausente da lista de foranias), é paróquia nova |
| **N. Sra. do Perpétuo Socorro** (Aragominas, Muricilândia e Santa Fé) | Consta da lista oficial de foranias de 2023 (Forania Zilda Arns, Região Sul → Araguaína) e o GCatholic registra igreja em Aragominas nesta diocese em 2026 |

20 + as duas primeiras = 22, exatamente o número publicado pela CNBB e pela Wikipédia. A de
Aragominas é a **23ª**, e é o principal ponto de divergência a confirmar com a cúria: ou o
número oficial de 22 está desatualizado, ou a paróquia de Aragominas foi suprimida/anexada.

## As capelas de Araguaína: 14 reatribuídas, 23 ainda órfãs

A página de missas lista 37 capelas de Araguaína com missa fixa, sempre como
`Capela X (Bairro Y)`, **sem dizer a que paróquia pertencem**. Cruzando com as listas de
comunidades das fichas de 2023, **14 foram reatribuídas** (nome *e* bairro batendo):

| Paróquia | Capelas devolvidas |
|---|---|
| São José Operário | São Miguel Arcanjo (São Miguel), Santa Maria da SSma. Trindade (Aeroviário), Divina Misericórdia (Vila Azul), São Padre Pio (Monte Sinai), Santa Luzia (Pontes) |
| São Judas Tadeu | São Raimundo Nonato (Raizal), Mãe da Divina Providência (Coimbra), São Luís Orione (Ana Maria), São João Paulo II (Jardim Paraíso) |
| São Paulo Apóstolo | Santa Clara de Assis (Urbanístico), São Marcos Evangelista |
| N. Sra. da Natividade | N. Sra. de Fátima (Bairro de Fátima), Santo Expedito (Lago Azul 1), N. Sra. de Nazaré |

Esses horários ficaram `media` e trazem em `notes` a frase que explica a inferência.

As **23 restantes** continuam como entradas próprias com `status: "nao-paroquial"` +
`loadAsParish: true`, aplicando a regra documentada no README ("igreja não paroquial **com
horário publicado** entra"). São lugares de missa reais e a alternativa era perder ~45 horários.
**Item nº 1 para o enxame de validação: reatribuí-las.** Até lá, a lista de paróquias de
Araguaína no app fica com 46 entradas em vez de 23.

Órfãs restantes: Dom Orione (Centro), São Luís Gonzaga (Seminário Pe. Patarello), São João
Batista (Bairro São João **e** Brejão — duas), Santo Expedito (Araguaína Sul II), São Francisco
de Assis (Setor Urbano **e** Tecnorte — duas), Santa Maria da SSma. Trindade (Martins Jorge),
N. Sra. Rainha da Paz (Villa Ribeiro), Santa Teresa D'Ávila (Tereza Hilário), São Pedro Apóstolo
(Jardim Pedra Alta), N. Sra. Aparecida (Jardim Paulista **e** ITPAC — duas), Santa Clara
(Céu Azul), Santo Antônio de Pádua (Setor Brasil), Casa Tranói (Centro), Imaculada Conceição
(Araguaína Sul), Divino Espírito Santo (Tiúba), Jesus Misericordioso (Vila Azul), São José
(Jardins Siena), São Maximiliano Maria Kolbe (Vila Cearense), São Pedro de Alcântara (Eldorado),
N. Sra. dos Milagres (Itaipu).

## Pontos para o enxame de validação

1. **Reatribuir as 23 capelas restantes** às paróquias de Araguaína.
2. **Confirmar a existência da Paróquia de Aragominas** (ver acima).
3. **8 paróquias do interior sem nenhum horário**: Barra do Ouro, Carmolândia, Araguanã,
   Arapoema, Pau D'Arco, Goiatins, Nova Olinda e Campos Lindos. A página diocesana de horários
   cobre **só Araguaína** e essas oito não tinham ficha em 2023.
4. **Divergências de bairro entre as duas fontes** (gravadas em `notes` do horário):
   - *São Marcos Evangelista*: a página atual diz "St Planalto"; a ficha de 2023 põe a
     comunidade São Marcos no **Setor Itapuã** e uma **Comunidade São Pedro** no Planalto.
   - *N. Sra. de Nazaré*: página atual "St Xixebal"; ficha de 2023 põe a comunidade no
     **Lago Azul 3** e uma Comunidade Santo Antônio Galvão no Xixebal.
   - *Santa Maria da Santíssima Trindade*: existem **duas** (Martins Jorge e Aeroviário); só a
     do Aeroviário é comunidade de São José Operário.
5. **Divergência interna da página de missas — São José Operário**: aparece como "(JK)" em
   quatro entradas e como "(St Patrocínio)" na missa de quinta às 19h30 (Patrocínio é o bairro
   de São Judas Tadeu). Gravada como `media`.
6. **Párocos que trocaram de paróquia entre 2023 e hoje** — os dois nomes convivem no arquivo e
   precisam de conferência: *Pe. Ualisson* era de Babaçulândia em 2023 e hoje está em
   São Sebastião; *Pe. Vitor* era de Wanderlândia e hoje está em N. Sra. do Perpétuo Socorro
   (Santa Terezinha); São Paulo Apóstolo tinha *Pe. Edson Neves* e hoje tem *Pe. Leandro*.
   Onde a fonte atual traz o nome, ele prevaleceu.
7. **Nomes de pároco só com o primeiro nome** na página de confissões: Pe. Ualisson e
   Pe. Gerson (São Sebastião), Pe. Vitor, Pe. Hélio, Pe. Edvaldo, Pe. Leandro.
8. **Darcinópolis**: em 2023 era atendida pela Paróquia N. Sra. da Conceição (Wanderlândia),
   mas ficou na **Diocese de Tocantinópolis** (o GCatholic registra Darcinópolis lá em 2026).
   As **7 comunidades de Darcinópolis** continuam listadas sob Wanderlândia neste arquivo, com
   aviso em `notes` — precisam ser movidas para a paróquia certa de Tocantinópolis.
9. **Catedral**: a igreja de **São Sebastião** é a **Catedral Provisória**, com
   **N. Sra. do Perpétuo Socorro** como padroeira da diocese; existe **outra** paróquia
   dedicada a N. Sra. do Perpétuo Socorro, no Bairro Santa Terezinha. Gravadas separadas.
10. **Seis municípios com igreja no GCatholic mas sem paróquia própria na lista diocesana**:
    Aragominas (resolvido, ver acima), Bandeirantes do Tocantins (é abrangida pela paróquia de
    Nova Olinda, segundo a lista de foranias de 2023), Muricilândia e Santa Fé do Araguaia
    (abrangidas pela de Aragominas), Palmeirante e Piraquê (Piraquê é abrangida por
    Wanderlândia). **Palmeirante** fica sem explicação — o GCatholic registra "Church of
    St. Joseph" lá e nenhuma fonte a atribui a uma paróquia.
11. **Duas missas condicionadas ao calendário letivo**: Capela Dom Orione, segunda 18h15 na
    Faculdade Católica; Capela N. Sra. Aparecida, sexta 18h30 no ITPAC. Condição em `notes`.
12. **3 horários `baixa`** (recorrência mensal, regra literal em `notes`): Babaçulândia —
    Capela Imaculada Conceição, 2º sábado 9h; Xambioá — 1ª sexta 6h30; São Paulo Apóstolo —
    1º sábado 6h30.
13. **Sem endereço/CEP/e-mail** nas 14 paróquias que não tinham ficha em 2023; o site atual não
    publica nenhum desses campos.
