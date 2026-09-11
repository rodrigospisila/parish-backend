# Relatório de pesquisa — Diocese de Valença (RJ)

- **Data da coleta:** 2026-09-11
- **Arquivo:** `paroquias/RJ/valenca.json`
- **Sede:** Valença/RJ — Praça Visconde do Rio Preto, 375, Centro, CEP 27600-000, (24) 2452-0207
- **Bispo:** Dom Nelson Francelino Ferreira
- **Site oficial:** https://diocesedevalenca.org (a lista de paróquias fica no site da Cúria)

## Resultado

| Item | Quantidade |
|---|---|
| Paróquias | **27** (26 `alta`, 1 `baixa`) |
| Comunidades/capelas | **283** (todas `alta`) |
| Horários fixos | **43** (todos `baixa`) |
| Cobertura esperada (Anuário Pontifício 2024) | 28 |

## Fontes principais

1. **https://www.curiadevalenca.com.br/nossas-paroquias/** — a fonte decisiva. O portal da
   Diocese (`diocesedevalenca.org/paroquia/`) é só uma página-ponte com o texto "acesse o link
   abaixo"; a lista real está no site da **Cúria**, num domínio diferente. Traz, para cada
   paróquia: título, pároco, vigário, regional (I, II ou III), endereço com CEP, telefone,
   e-mail, data de criação, expediente da secretaria e a **lista nominal de comunidades**
   ("Bairro – Padroeiro"). Foi daqui que saíram as 283 comunidades.
2. **https://www.catholic-hierarchy.org/diocese/dvalb.html** — sede, bispo, municípios e o
   número esperado de paróquias (28 em `ap2024`).
3. **https://www.horariodemissa.com.br** — único lugar com horário de missa desta diocese.

## Método e decisões

- O bloco de cada paróquia foi extraído do HTML da Cúria e parseado por rótulo
  (`Pároco:`, `Endereço:`, `Comunidades:`…). Endereço e CEP foram separados; `Data de criação`
  virou `foundedYear` (só o ano) — as datas são antigas e variadas (1726, 1813, 1852…), sem o
  padrão de "data de cadastro no CMS" que contaminou outros estados.
- Comunidades: o padrão publicado é `Bairro – Padroeiro`. Gravei `name` = padroeiro e
  `neighborhood` = bairro. As linhas `Matriz – X` viraram `Matriz X` com `isMatriz: true` —
  **todas as 26 paróquias com lista têm matriz marcada**.
- A paróquia de **Avelar** usa o rótulo `Comunidades e Capelas:` com outro formato
  ("Comunidade de…", "Capela de…"); foi tratada à parte, e o nome completo da linha virou o
  nome da comunidade.
- Três paróquias da Cúria têm vigário paroquial registrado; guardei apenas o pároco/administrador
  em `priestName` (o esquema não tem campo de vigário).

### Duas igrejas EXCLUÍDAS de propósito

O agregador lista, dentro dos municípios da diocese, duas paróquias que **não são de Valença**:

| Igreja | Município | Jurisdição real |
|---|---|---|
| Paróquia Nossa Senhora da Conceição de Bemposta | Três Rios | **Diocese de Petrópolis** |
| Paróquia Sant'Ana de Inconfidência (Sebollas) | Paraíba do Sul | **Diocese de Petrópolis** |

Confirmado em `diocesepetropolis.com.br`, que publica as duas nas suas próprias fichas de
paróquia. Não entraram no JSON (nem como `status: outra-jurisdicao`, porque não são da
circunscrição — são de outra diocese latina vizinha, não rito oriental).

## Pontos para o enxame de validação

1. **Gap de 27 para 28 paróquias.** O Anuário conta 28; a Cúria publica 26. A 27ª entrada,
   **Paróquia São Sebastião de Ferreiros (Vassouras)**, `confidence: baixa`, existe só no
   agregador, com ficha de **31/01/2013**, sem telefone e com endereço "RJ-115". Pode ser
   paróquia real omitida do site ou uma capela da Paróquia Nossa Senhora da Conceição de
   Vassouras. **Precisa de confirmação humana** — e ainda falta uma 28ª.
2. **Todos os 43 horários são `baixa`**, e é uma decisão consciente: a diocese não publica
   horário de missa em lugar nenhum (nem o site da Diocese nem o da Cúria têm essa página),
   e as fichas do agregador foram atualizadas pela última vez entre **2013 e 2016** — muito
   antes da pandemia. Pela regra do README ("horário anterior à pandemia não entra"), nenhum
   deles deve ir para produção sem reconferência. As 10 igrejas com grade são:
   Catedral N. Sra. da Glória (15), São Pedro e São Paulo/Paraíba do Sul (9),
   N. Sra. da Conceição/Vassouras (5), N. Sra. Aparecida/Valença (3),
   N. Sra. do Patrocínio (2), Santo Antônio/Conservatória (2), São José Operário/Três Rios (2),
   e três capelas da Catedral (Rosário dos Homens de Cor 2, Colégio Sagrado Coração 2,
   Santa Casa de Misericórdia 1).
3. **Nome de comunidade com sujeira de digitação:** a Cúria publica
   `Santa Casa de Misericórdia – Santa Isabel Prima de Maria8`. Gravei como
   *Santa Isabel Prima de Maria* e deixei `notes` registrando o "8" original.
4. **CEP claramente errado:** Paróquia São José Operário (Três Rios) está publicada com
   `CEP: 22820-1504` — 9 dígitos, e o prefixo 22820 é do Rio de Janeiro capital. O telefone da
   mesma ficha é (24) 2252-1504, então o CEP parece ter sido digitado junto com o telefone.
   Gravei `zipCode` como `22820-150` pela regra de extração; **não confiar**.
5. **Expediente de secretaria implausível:** Paróquia Santa Teresinha do Menino Jesus
   (Parapeúna) publica "2ª à 6ª – 2h às 17h" (provavelmente 8h). Não foi gravado no JSON
   (o esquema não tem campo de expediente), mas indica revisão desatualizada do site.
6. **Duas paróquias do mesmo pároco:** Pe. Jefferson Francisco dos Santos (IMCIM) figura como
   pároco de N. Sra. Aparecida **e** de N. Sra. de Monte Serrat, ambas em Comendador Levy
   Gasparian, e a segunda está "em processo de reorganização" segundo a própria Cúria — pode
   virar uma fusão.
7. **E-mail com acento:** a ficha de São José Operário traz `paróquia@saojoseoperariotresrios.com`;
   normalizei para `paroquia@…`.
8. A **Quase-paróquia Santa Rita de Cássia (Vassouras)** é a única entrada sem nenhuma
   comunidade listada — a Cúria não publica a lista dela. O importador criará a matriz sozinho.
