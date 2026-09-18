# Relatório — Diocese de Marabá (PA)

Pesquisa: 18/09/2026. Arquivo: `maraba.json`.

## Resultado

| | |
|---|---|
| Entradas | **35** — 33 paróquias + 1 capelania militar + 1 igreja conventual (as duas últimas `nao-paroquial` com `loadAsParish`) |
| Confiança das entradas | 32 `alta`, 2 `media`, 1 `baixa` |
| Comunidades | **540** (536 `alta`, 2 `media`, 2 `baixa`) |
| Horários fixos | 76, **todos `baixa`** — a diocese não publica horário de missa |
| Cobertura | 35/35 |

## Fonte principal: o Catálogo Diocesano 2025-2026

`https://diocesedemaraba.com.br/catalogo-diocesano/` — **página HTML de 238 KB, atualizada em 08/09/2026**
(`dateModified` do JSON-LD do Yoast), com organização assinada pelo Pe. Cícero Edvam Magalhães e revisão de
Dom Vital Corbellini. É o melhor material desta rodada e traz, paróquia por paróquia:

- data de fundação e festa do padroeiro;
- endereço da matriz e cidade;
- pároco e vigário com data de nascimento, data de ordenação, telefone e e-mail;
- casa paroquial e secretaria paroquial (endereço, telefone, e-mail, horário de funcionamento);
- **a lista numerada de todas as comunidades com endereço** — foi daí que saíram as 540 comunidades.

As campeãs: Santo Antônio (Itupiranga) com 53 comunidades, São João Batista (Jacundá) com 47, São Domingos
de Gusmão e Jesus Misericordioso com 42 cada.

Outras fontes: a página `/paroquias/` (WordPress, 30 fichas em 6 áreas pastorais, com fichas individuais em
`/paroquia/<slug>/`), `/curia-diocesana/`, `catholic-hierarchy.org`, o **Mapa das OSC/IPEA** (que localizou o
CNPJ raiz) e a **Receita Federal**.

## A Receita fechou a lista — e revelou 3 paróquias que o site não tem

CNPJ raiz **04.882.130**. Varri as ordens 0001–0042: existem **35**, sendo a Cúria (0001), **33 filiais
ATIVAS** e **1 SUSPENSA**. Todas as ativas são "PAROQUIA …". Isso deu:

- **Paróquia Santa Rita de Cássia, Jacundá** (filial 0032, ativa desde 09/02/2024) — **não está no catálogo
  nem no site**, que continuam registrando uma só paróquia em Jacundá. Entrou como `media`.
- **Paróquia Santo Antônio, Vila Santa Fé / Estrada do Rio Preto, Marabá** (filial 0035, ativa desde
  03/01/2025) — **não está no catálogo nem no site**. Entrou como `media`.
- **Paróquia Santo Antônio, Vila Sororó, Marabá** (filial 0033, ativa desde 17/05/2024) — o site publica
  ficha ("Santo Antônio – Vila Sororó", pároco Frei Vando Oliveira Lima, OFMCap) mas o catálogo a trata como
  "**Área Pastoral** Santo Antônio". A Receita diz PARÓQUIA, então entrou como paróquia.

**Filial-fóssil confirmada** — exatamente o caso que o README descreve: a filial **0018, "PAROQUIA DE SAO
JOAO BATISTA", Av. Tiradentes, Centro, Água Azul do Norte**, está **SUSPENSA**. O município passou para a
**Prelazia do Alto Xingu-Tucumã** em 06/11/2019 e a paróquia está no arquivo `alto-xingu-tucuma.json`,
não aqui.

O Anuário Pontifício 2024 registra 29 paróquias em 2023 — coerente com 33 hoje, já que quatro nasceram entre
2021 e 2025 (Perpétuo Socorro/Parauapebas em 2021, Santa Rita/Jacundá e as duas Santo Antônio de Marabá em
2024–2025, Rainha da Paz/Parauapebas em 2024).

## Horários: a diocese não publica nenhum

Nem o catálogo, nem as fichas de paróquia, nem qualquer outra página do site trazem horário de missa. Os
**76 horários do arquivo vêm todos do agregador Lírio Católico** (base de 02/09/2026, sem data de conferência
por igreja) e são **todos `baixa`**. Cobrem 11 igrejas:

- **Marabá**: Catedral N. Sra. do Perpétuo Socorro, matriz São Félix de Valois, N. Sra. da Conceição,
  Sagrado Coração de Jesus, Santuário N. Sra. de Nazaré, São Francisco de Assis, Capelania Militar e o
  Convento N. Sra. dos Anjos;
- **Parauapebas**: N. Sra. de Nazaré (Núcleo de Carajás) e São Sebastião;
- **Canaã dos Carajás**: matriz São Pedro e São Paulo; **Itupiranga**: matriz Santo Antônio.

**Vinte e quatro das 33 paróquias entram sem nenhum horário.**

## Armadilhas e divergências encontradas

- **Paróquia com dois nomes.** O catálogo chama a paróquia de Canaã dos Carajás de **São Pedro e São Paulo**
  (igual à Receita e ao e-mail `paroquiasaopedroesaopaulo12@gmail.com`); a página `/paroquias/` e a ficha do
  site a chamam de **Nossa Senhora Imaculada Conceição**, com o mesmo endereço e telefone. Adotei o nome do
  catálogo. Os párocos também divergem: catálogo = Pe. Domingos Monteiro da Cruz; ficha = Pe. Aelson Nunes
  Vieira (que o catálogo dá como pároco de São João do Araguaia).
- **A Catedral não é a matriz da paróquia que a abriga.** O catálogo lista a **Catedral Nossa Senhora do
  Perpétuo Socorro** (Travessa Santa Terezinha, Marabá Pioneira — padroeira da diocese) como a *primeira
  comunidade* da **Paróquia São Félix de Valois**, cujo "Endereço da Matriz" é outro (Travessa São Félix,
  143). Registrei as duas igrejas separadamente, com os horários do agregador em cada uma, para não repetir o
  defeito de importador já corrigido ("missa de santuário ia para a matriz").
- **Três paróquias Santo Antônio em Marabá/Itupiranga** (Itupiranga 0005, Vila Sororó 0033, Vila Santa Fé
  0035) e duas paróquias Bom Jesus (Bom Jesus do Tocantins 0009 e Brejo Grande do Araguaia 0022, esta
  registrada pelo catálogo como "Senhor Bom Jesus"). Os slugs incluem a cidade/distrito para separá-las.
- **Páginas de teste no WordPress**: `/paroquia/teste/`, `/paroquia/teste-novo/` e `/paroquia/outro-teste/`
  duplicam três paróquias da área Araguaia. Ignoradas.
- **Texto do catálogo com espaços dentro das palavras** ("Sã o Félix", "Pró ximo", "Lú cia", "AraguaiaPA") e
  em **NFD** — normalizei para NFC e corrigi os casos conhecidos.
- **Bloco do catálogo com campos embaralhados**: na Paróquia Sagrado Coração de Jesus (Nova Marabá) os dados
  do pároco e do vigário se misturam na mesma linha.
- **Endereço só na comunidade**: quatro paróquias (Senhor Bom Jesus/Brejo Grande, N. Sra. das
  Graças/Curionópolis, Cristo Rei/Parauapebas e Jesus Misericordioso/Itupiranga) não têm "Endereço da
  Matriz" no catálogo; usei o endereço da primeira comunidade listada.

## Precisa de validação humana

1. **Todos os 76 horários são `baixa`** e vêm de um único agregador. Em Marabá, a Paróquia São Francisco de
   Assis e a Paróquia Santo Antônio (Itupiranga) aparecem no agregador com endereço **diferente** do que o
   catálogo dá para a matriz — conferir se é a mesma igreja.
2. **Paróquia Santa Rita de Cássia (Jacundá)** e **Paróquia Santo Antônio (Vila Santa Fé, Marabá)**: existem
   só na Receita. Confirmar nome oficial, pároco, endereço e comunidades.
3. **Paróquia × Área Pastoral Santo Antônio (Vila Sororó)**: a Receita diz paróquia, o catálogo diz área
   pastoral. E os responsáveis divergem: Frei Vando Oliveira Lima (ficha do site) × Frei Railson Viana dos
   Santos (catálogo).
4. **Catedral × matriz da Paróquia São Félix de Valois** (item acima).
5. **Nome da paróquia de Canaã dos Carajás** (São Pedro e São Paulo × N. Sra. Imaculada Conceição).
6. **Convento Nossa Senhora dos Anjos** (Marabá, Av. Minas Gerais 1158, bairro Belo Horizonte): existe só no
   agregador, com missa diária. Entrou `baixa`, `nao-paroquial` + `loadAsParish`. O bairro fica no território
   da Paróquia N. Sra. da Conceição, que é dos Capuchinhos — **mas o vínculo não está confirmado**.
7. **Capelania Militar Santo Inácio de Loyola**: a diocese a publica entre suas paróquias e o próprio site
   tem link para o **Ordinariado Militar do Brasil**, a jurisdição a que ela pertence. Não tem filial no CNPJ
   da diocese. Marquei `nao-paroquial` + `loadAsParish` (há missa publicada). Se a preferência for excluir
   jurisdição alheia, o marcador certo seria `outra-jurisdicao`.
8. **E-mail com erro de digitação na fonte**: `paroquiasaofrancisco.ipixuna@gmai.com` (Nova Ipixuna) —
   "gmai.com". Gravei como publicado.
9. **Telefones estranhos publicados pelo catálogo**: Bom Pastor "(94) 93146-8952", N. Sra. das Dores
   "(41) 8750-2117" (DDD do Paraná), São Francisco de Assis/Parauapebas "(99) 98102-5778" (DDD do Maranhão),
   São Francisco de Assis/Marabá "(98) 98249-4585", São João Batista/Jacundá "(67) 9978-5426". São celulares
   pessoais de padres vindos de outros estados; onde havia telefone de secretaria, usei o da secretaria.
10. **Duas paróquias sem e-mail**: N. Sra. da Conceição (Marabá) e Bom Pastor — o catálogo só publica
    e-mails pessoais dos padres, que não vão para os campos de produção.
11. **Municípios da diocese**: 15 segundo o catholic-hierarchy (Marabá, Abel Figueiredo, Bom Jesus do
    Tocantins, Brejo Grande do Araguaia, Canaã dos Carajás, Curionópolis, Eldorado dos Carajás, Goianésia do
    Pará, Itupiranga, Jacundá, Nova Ipixuna, Palestina do Pará, Parauapebas, São Domingos do Araguaia e São
    João do Araguaia) — e as 33 paróquias caem todas neles. **Rondon do Pará não é de Marabá**: o agregador
    tem uma Paróquia N. Sra. Aparecida lá, mas o município não aparece em nenhuma fonte da diocese; deve ser
    de outra circunscrição.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `email`: está `null`; a página da Cúria publica **`diocese.maraba@gmail.com`**.
- `phone`: "(94) 3321-1339" está correto; a Cúria publica também os celulares **(94) 98110-8071** (Tim) e
  **(94) 99253-2044** (Vivo).
- `address`: "Curia Diocesana, Trav. 13 de Maio 208" e `zipCode` 68500-420 conferem com a Cúria e com a
  Receita (bairro Centro / Marabá Pioneira).
- `website` `https://diocesedemaraba.com.br` e `bishopName` "Dom Vital Corbellini" estão corretos.
  (Atenção: o **catholic-hierarchy.org registra como site oficial de Marabá o endereço
  `http://diocesedemarilia.net.br/`** — erro deles, é o da Diocese de Marília/SP.)
- `foundedYear`: está **1969** (ano em que a sede da Prelazia da Santíssima Conceição do Araguaia foi
  transferida para Marabá, pelo decreto *Cum Urbs* de 20/12/1969). A elevação a **Diocese** é de
  **16/10/1979**. Vale decidir qual das duas datas o campo representa.
