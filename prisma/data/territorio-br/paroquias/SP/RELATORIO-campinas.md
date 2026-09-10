# Relatório de pesquisa — Arquidiocese de Campinas (SP)

- **Arquivo gerado:** `paroquias/SP/campinas.json`
- **Data da pesquisa:** 2026-09-10
- **Agente:** enxame de pesquisa do território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **109** (109 alta / 0 media / 0 baixa) |
| Comunidades / capelas | **220** (todas alta) |
| Horários fixos | **903** (800 alta / 0 media / 103 baixa) |
| Cobertura | **109 encontradas / 103 esperadas** |
| Párocos identificados | 61 / 109 |

Tipos de horário: 873 `MASS`, 15 `ADORATION`, 13 `ROSARY`, 2 `CONFESSION`.

Cidades: Campinas 66, Sumaré 10, Indaiatuba 9, Hortolândia 7, Valinhos 6, Vinhedo 4,
Paulínia 3, Monte Mor 3, Elias Fausto 1.

## Fontes principais

| Fonte | Uso |
|---|---|
| `https://www.arquidiocesecampinas.com.br/paroquias/` | listagem oficial (carregada por JS — ver nota técnica) |
| `…/locais_category/paroquias/feed/` | **lista canônica** de 98 paróquias (feed RSS da categoria) |
| `…/wp-sitemap-posts-location-1.xml` | 296 locais; cruzado com o feed para achar as 11 paróquias restantes |
| `…/locais_category/<forania>/feed/` | as 14 foranias, usadas para conferir a lista |
| `…/location/<slug>/` | ficha de cada paróquia: nome, criação, endereço, cidade, telefone, e-mail, site, **horários de missas** e o **decreto de criação** (que lista comunidades) |
| `…/clero/<slug>/` (264 fichas) | cargo atual de cada padre → mapeamento de párocos |
| `…/governo-arquidiocesano/` | Dom João Inácio Müller, endereço e telefone da Cúria |
| `https://www.catholic-hierarchy.org/diocese/dcmps.html` | número esperado (103 paróquias, 523 missões) |
| `https://gcatholic.org/dioceses/diocese/camp0.htm` | conferência |

**Nota técnica:** as páginas `/paroquias/`, `/missas/` e `/foronias/` do site montam a lista por
JavaScript com botão "MOSTRAR MAIS", e por isso um leitor automático enxerga só as primeiras 12
entradas. A lista completa foi obtida pelos **feeds RSS das taxonomias** (`locais_category/*/feed/`,
paginados com `?paged=N`) somados ao sitemap do CPT `location`. Vale registrar isso para quem for
reprocessar esta arquidiocese. Os e-mails do site são ofuscados pelo Cloudflare
(`data-cfemail`) e foram decodificados.

## Cobertura

O site oficial lista **109 paróquias**; o catholic-hierarchy.org registra **103**. A diferença é
esperada e não indica erro:

- a lista oficial inclui **duas paróquias não territoriais latinas** — a *Paróquia Pessoal Coreana
  São Jung Hasang* e a *Paróquia São Charbel – Rito Maronita*;
- o restante é compatível com paróquias criadas depois do levantamento estatístico (há registros
  com `foundedYear` até **2024**; o mais antigo é a Catedral, **1774**).

**Excluídas de propósito (6 entradas da mesma listagem que não são paróquias):**

| Entrada | Motivo |
|---|---|
| Capelania Centro Médico de Campinas | capelania hospitalar |
| Capelania do Hospital Dr. Mário Gatti | capelania hospitalar |
| Capelania Santa Casa de Valinhos | capelania hospitalar |
| Capelania Santa Casa de Vinhedo | capelania hospitalar |
| Ordinariado Militar do Brasil – Capelania Militar Santo Tomás de Aquino | outra jurisdição |
| Templo Votivo do Santíssimo Sacramento (Toca de Assis) | oratório, não paróquia |

## Pontos para o enxame de validação

### 1. Jurisdição: Paróquia São Charbel (rito maronita)

Está no JSON porque o site da arquidiocese a lista como paróquia sua, mas pertence à **Eparquia
Nossa Senhora do Líbano de São Paulo** (rito maronita), não à arquidiocese latina. É o mesmo caso
já registrado no README para o Paraná ("paróquias de rito ucraniano listadas por dioceses latinas").
**Decidir se entra na carga.** A *Paróquia Pessoal Coreana São Jung Hasang* é paróquia pessoal da
própria arquidiocese e não tem esse problema.

### 2. Horários de recorrência mensal — 99 registros `baixa`

É o maior bloco fora da carga e reproduz a **decisão de produto pendente** já anotada no README:
`MassSchedule` só tem dia da semana, e o site publica muita coisa como "1ª e 3ª sexta-feira do mês",
"2º e 4º domingo", "todo dia 19", "1ª sexta-feira". Esses horários foram gravados com o dia da
semana correto, `confidence: "baixa"` e `notes` explicando a recorrência. **Se o Parish for exibi-los,
precisa de modelagem; se não, devem ficar fora.**

Outros **4 registros `baixa`** são casos em que o site alterna Missa e **Celebração da Palavra** no
mesmo horário (ex.: "1º e 3º Domingo: Celebração, 2º e 4º Domingo: Missa"). Também sinalizados em
`notes`.

### 3. Seis paróquias sem nenhum horário

| Paróquia | Cidade | O que a fonte diz |
|---|---|---|
| Paróquia Nossa Senhora das Graças | Valinhos | campo vazio |
| Paróquia Nossa Senhora do Amparo | Hortolândia | campo vazio |
| Paróquia São João Paulo II | Indaiatuba | campo vazio |
| Paróquia São João XXIII | Campinas | campo vazio |
| Paróquia São Judas Tadeu (Satélite Íris) | Campinas | campo vazio |
| Paróquia São José Operário | Campinas | **"Paróquia sem Igreja Matriz, missas nas comunidades."** |

O caso de **São José Operário** é o mais interessante: a própria fonte diz que a paróquia não tem
matriz e celebra só nas comunidades, mas não lista quais nem os horários. O importador criará uma
igreja-matriz automática que **não corresponde à realidade** — vale tratamento manual.

### 4. Párocos: 61 de 109, com 4 conflitos

O nome do pároco não está na ficha da paróquia; foi obtido cruzando as **264 fichas de clero**, onde
cada padre tem uma linha de cargo atual ("Pároco da Paróquia X (Cidade)"). Regras aplicadas: só
`Pároco` / `Administrador Paroquial` / `Reitor`; **`Vigário Paroquial` e `Pároco Emérito` foram
descartados**; cada padre foi atribuído a uma única paróquia (a de maior pontuação de casamento).

**Quatro paróquias ficaram com `priestName: null` por conflito** — duas fichas de clero diferentes
reivindicam a mesma paróquia, sinal de dado desatualizado no site:

| Paróquia | Candidatos |
|---|---|
| Paróquia Santa Inês (Campinas) | Padre Adilson José Ribeiro / Padre João Pereira de Abreu |
| Paróquia Sant'Ana (Campinas, Jardim Santana) | Padre Alexandre Souza e Silva de Moura / Padre Moacir de Ávila Lima |
| Paróquia Nossa Senhora Aparecida (Hortolândia) | Padre Fábio Luís Fernandes / Padre Rogério de Andrade Penha |
| Santuário Santa Rita de Cássia (Campinas) | Padre José Antônio Trasferetti / Padre Odair Costa Nogueira |

As 48 paróquias restantes sem pároco simplesmente não têm nenhuma ficha de clero que as declare —
em vários casos são paróquias entregues a ordens religiosas, cujos padres o site descreve de outra
forma. Nada foi inventado.

### 5. Comunidades: 79 paróquias só com a matriz

Das 109, **79 têm apenas a igreja-matriz** e 30 têm comunidades listadas. Isso é uma limitação da
fonte, não da coleta: o site só nomeia comunidades quando elas aparecem no texto livre de "Horários
de missas" ou no decreto de criação transcrito em "Histórico". O catholic-hierarchy fala em **523
missões** na arquidiocese — ou seja, **as 220 comunidades registradas são uma fração do real**. É a
maior lacuna deste dataset e o melhor alvo para uma segunda passada (sites e redes sociais das
paróquias individualmente).

### 6. Nomes de comunidade transcritos com os erros da fonte

Alguns nomes vêm literalmente do site e contêm erros de digitação que **foram mantidos** para não
inventar dado: "Comunidade Nossa Aparecida" e "Comunidade Nossa Mãe da Igreja" (Paróquia Santa
Margarida Maria Alacoque), "Comunidade Nossa Senhora" sem complemento (Paróquia São Sebastião,
Valinhos), "Nossa Senhora Fatima"/"Sagrada Familia" sem acento (Paróquia Santo Afonso Maria de
Ligório). Bons candidatos a normalização manual.

### 7. Horário de quaresma gravado como fixo

Na **Paróquia São Geraldo Magela (Campinas)** o site diz "sexta-feira: 7h e 19h30 (durante a
quaresma a missa da sexta-feira está sendo às 05h30 da manhã)". O **05:30 de sexta entrou como
horário fixo** e não deveria — é sazonal. Único caso identificado desse tipo.

### 8. Divergência de CEP da Cúria

A página `/governo-arquidiocesano/` traz **duas versões** do endereço da Cúria: "Av. Aquidaban, 744 –
Bosque, 13012-510" e "Av. Aquidaban, 744 – Vila Lídia, 13026-510". Foi gravada a segunda, que é a
que consta no rodapé de todas as páginas do site. **Confirmar.**

### 9. Campos em branco por ausência na fonte

Sobre 109 paróquias: 108 com e-mail, 104 com telefone, 104 com ano de criação, 100 com CEP, 86 com
bairro, 35 com site próprio. Ficaram sem CEP 9 paróquias (a Catedral entre elas) e sem telefone 5.
Um CEP no site está truncado ("13070-15", Paróquia Senhor Bom Jesus do Bonfim) e foi deixado `null`.

Dois endereços são, na origem, textos explicativos e não logradouros limpos:

- Paróquia São Judas Tadeu (Satélite Íris): *"Endereço da Secretaria (Comunidade São João Bosco)
  Rua Nivaldo Alves Bonilha, 1208"*
- Paróquia São Pedro Apóstolo (Sumaré): *"Endereço da Matriz: Rua das Crianças, 235. Jd Picerno II"*

### 10. E-mails em domínios pessoais

108 paróquias têm e-mail, mas nem todos institucionais: além de `@arquidiocesecampinas.com`,
aparecem `gmail.com`, `hotmail.com`, `outlook.com`, `uol.com.br`, `terra.com.br`, `yahoo.co.kr`
(paróquia coreana) e `puc-campinas.edu.br` (paróquia universitária). Não é erro, mas convém saber
antes de usar para contato institucional.
