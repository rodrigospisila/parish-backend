# Relatório de pesquisa — Diocese de Barretos (SP)

**Data da pesquisa:** 2026-09-10 · **Arquivo gerado:** `barretos.json`

## Resumo

| Item | Total |
|---|---|
| Paróquias | **27** (25 paróquias + 2 quase-paróquias) — todas `alta` |
| Comunidades | **108** (27 matrizes + 81 capelas/comunidades) |
| Horários fixos | **233** (191 `alta`, 42 `baixa`) |
| Cobertura | **27/27** — 100 % do que a diocese publica |

## Fontes principais

1. **https://diocesedebarretos.com.br/horarios-missas/** — "Paróquias e Horários de Missas".
   É a **fonte de praticamente todo o dataset**: uma ficha por paróquia com **endereço, CEP,
   telefone/WhatsApp, e-mail, ano de fundação, festa do padroeiro, região pastoral, expediente,
   pároco, vigários** e o **horário de missas da matriz e de cada comunidade/capela**.
   O seletor "Selecione a cidade desejada" cobre as **13 cidades** da diocese e todo o conteúdo
   das abas vem no HTML (não é carregado por AJAX) — basta um `curl` com User-Agent de Chrome.
   - **Data da fonte:** a REST API do WordPress
     (`/wp-json/wp/v2/pages?search=horários&_fields=id,slug,modified`) informa
     `"modified":"2026-02-24T17:23:24"` para a página `horarios-missas` — **6 meses e meio**,
     dentro dos 12 meses exigidos pelo README. Por isso os horários entram como `alta`.
     A home (`id 9`) foi modificada em **05/09/2026**: portal ativo.
2. **https://diocesedebarretos.com.br/a-diocese/historia/** — erigida em **14/04/1973** pela bula
   *Adsiduum Studium* de Paulo VI; declara "**24 paróquias e uma Quase Paróquia**, em 13
   municípios divididos em quatro Regiões Pastorais", e lista os municípios.
3. **catholic-hierarchy.org / Wikipédia** — sede, província (São José do Rio Preto, elevada a
   arquidiocese em 22/05/2025) e bispo (Dom Milton Kenan Júnior).
4. **horariodemissa.com.br** — usado só para dois casos de falha do site oficial (ver abaixo).
   Fichas de **2013** (pré-pandemia) → serviram apenas para endereço/telefone, nunca para horário.

## Cobertura

**27 encontradas.** A página "Nossa História" fala em 24 + 1 = 25; a diferença de 2 se explica
por duas circunscrições criadas em **2024**, posteriores àquele texto:
- **Paróquia São Judas Tadeu e Santo Expedito** (Olímpia, fundada em 2024);
- **Quase-paróquia São Bento e Santa Rita** (Barretos, criada em **03/03/2024**, publicada no
  site como "Área Pastoral São Bento e Santa Rita").

A outra quase-paróquia é a **São José e São Judas Tadeu** (Barretos, criada em 13/02/2022).
Ambas foram gravadas com o prefixo `Quase-paróquia …` exigido pelo README.

Distribuição por cidade: Barretos 11 · Olímpia 4 · Guaíra 2 · Cajobi, Colina, Colômbia, Embaúba,
Guaraci, Ipuã, Jaborandi, Miguelópolis, Morro Agudo e Severínia 1 cada — **13 municípios**,
exatamente os que a diocese lista.

Qualidade dos campos: **endereço 26/27, CEP 25/27, telefone 27/27, e-mail 26/27, pároco 27/27,
ano de fundação 26/27**. Só 2 têm site próprio (Santuário de Olímpia e a Quase-paróquia São José
e São Judas Tadeu).

## ⚠ Dois erros de conteúdo no site oficial (o mais importante deste relatório)

O portal publica, **em duas fichas, um bloco copiado de outra paróquia**. Ambas ficaram
**sem horário e sem comunidades** no dataset — preferi não gravar dado errado.

### 1. Paróquia Nossa Senhora Aparecida — **Guaíra**
A ficha é um Frankenstein de duas outras paróquias:
- o **bloco de horários** ("Quinta 9h|19h; Domingo 9h|19h; Capela N. Sra. do Rosário e São
  Benedito; Capela Santo Antônio – Bairro Laranjeiras; Assentamento Formigas; Fazenda
  Continental") é **cópia literal da Paróquia Nossa Senhora do Carmo, de Colômbia** — e os
  lugares citados (Laranjeiras, Assentamento Formigas, Fazenda Continental) ficam em Colômbia;
- o **bloco de endereço, CEP, telefone, e-mail e ano de fundação** ("Pça. Mons. José Maria S.
  Bezerra, 168 – Centro – 15410-000 – **Cajobi**/SP") é **cópia da Paróquia Nossa Senhora da
  Abadia, de Cajobi**.

Só o clero é específico de Guaíra: **Pe. Diego Mendes** (pároco) e Pe. Raphael Lourenço de
Moraes (vigário). O endereço gravado (**Praça Padre Pio Palácio, s/n, bairro Nossa Senhora
Aparecida, CEP 14790-000, tel. (17) 3331-7882**) vem do **horariodemissa.com.br, ficha de
01/06/2013** → **precisa de validação humana**. `foundedYear` ficou `null`.

### 2. Paróquia São João Batista — **Olímpia**
O bloco de horários publicado ("Seg e Sex 15h; Ter e Qui 7h; Sábado 19h30; Domingo 7h|9h|18h30;
Capela N. Sra. Aparecida; Com. N. Sra. de Lourdes; Com. Rural Lagoinha") é **byte-idêntico ao da
Paróquia São Benedito, de Barretos**. Duas evidências de que a cópia está na ficha de Olímpia:
- o portal de turismo da **Prefeitura de Olímpia** publica para a Matriz de São João Batista
  "sábados e segundas às 19h, domingos às 10h e 19h" — incompatível com o bloco do site;
- as comunidades citadas (N. Sra. de Lourdes, **Rural Lagoinha**) pertencem ao bairro Baroni /
  zona rural de Barretos.

Por isso: **São Benedito (Barretos) manteve seus horários como `alta`**; **São João Batista
(Olímpia) ficou sem horários e sem comunidades**. Endereço e telefone de Olímpia estão corretos
(confirmados pelo horariodemissa.com.br: R. Dr. Antônio Olímpio, 239, Centro, 15400-000,
(17) 3281-1576).

## Horários `baixa` (42) — recorrência mensal

Todos com a regra literal em `notes`. Padrões encontrados:
- **"1ª/2ª/3ª/4ª sexta (ou quarta, quinta, terça, segunda, sábado, domingo) do mês"** — 38
  registros, espalhados por Catedral, Bom Jesus, Minibasílica, Santo Antônio de Pádua, São João
  Batista (Barretos), São Luís Gonzaga, Colômbia, Embaúba, Ipuã, Miguelópolis, São José e
  São Judas Tadeu e Santo Expedito (Olímpia) e Severínia.
- **Recorrência por data fixa do mês** (não cabe nem em `dayOfWeek`, o valor gravado é
  convenção — leia `notes`): Capela Santa Filomena, Olímpia, "**todo dia 10 – 19h**"; Igreja
  Nossa Senhora das Graças, Severínia, "**todo dia 27 – 19h30**".
- **Missas itinerantes/rotativas** de Severínia (Bairro Olhos D'Água 1º domingo, Bairro Santo
  Antônio 2º, Distrito de Alvorada 3º, Bairro Córrego do Capim 4º) e de Morro Agudo
  ("Rede de Comunidades") — gravadas com o local como comunidade e `baixa`.

## Ficou **fora** do dataset (por não caber no modelo)

- **"Setores da Paróquia" — Santa Ana e São Joaquim (Barretos), terça e sexta às 20h**: missas
  itinerantes nas casas, sem igreja fixa.
- **"Comunidades Urbanas e Rurais" — N. Sra. da Abadia (Cajobi), sexta 19h30** e
  **"Comunidades" — São José (Colina), terça/quinta/sexta 20h**: a fonte não nomeia a comunidade.
- **"Setores Missionários" — São Gabriel Arcanjo (Jaborandi), terça 19h30**: idem.
- **"Missa nas casas" — N. Sra. Aparecida (Embaúba), sexta 19h30**: idem.
- **"Rede de Comunidades — durante a semana, 20h"** (Morro Agudo): sem dia da semana.
- **"Amor Exigente" — São João Batista (Barretos), quarta e sexta 19h30**: é um movimento, não
  uma comunidade territorial; não gravado.
- **Novena (não missa)**: Com. N. Sra. do Perpétuo Socorro, Santuário de Olímpia, quarta 15h.
  Gravado só o domingo 9h, que a fonte diz ser missa.
- **Terços** entraram como `ROSARY`, não como missa: Casa das Irmãs de Santa Ana (Barretos,
  segunda 19h30) e Terço dos Homens (Cajobi, sexta 19h30).

## Precisa de validação humana

1. **Endereço/telefone da Paróquia N. Sra. Aparecida de Guaíra** — vêm de agregador de 2013
   (ver acima). Também falta e-mail e ano de fundação.
2. **Horários da Paróquia São João Batista de Olímpia** — a diocese publica bloco errado; a
   paróquia-mãe da cidade (1910) está sem horário no dataset.
3. **Nome da paróquia de Jaborandi** — o menu do site diz "Paróquia **São Gabriel** Arcanjo" e o
   título do bloco diz "Paróquia **São Miguel** Arcanjo". O e-mail oficial
   (`arcanjosaogabriel888@gmail.com`) e a festa em 29 de setembro (Ss. Arcanjos) favorecem
   **São Gabriel**, que foi o nome gravado. Confirmar.
4. **Nome da paróquia de Ipuã** — menu: "Paróquia Senhora Sant´Ana"; título do bloco: "Paróquia
   Nossa Senhora Sant'Ana". Gravado "Paróquia Senhora Sant'Ana".
5. **CEP de Colina** — o site publica `14770-00` (7 dígitos). Gravado `14770-000`.
6. **Telefone da Paróquia São Sebastião de Guaíra** — diocese: `(17) 3331-2026`;
   horariodemissa.com.br: `(17) 3313-2026`. Gravado o da diocese.
7. **Ano de fundação 1847 da Paróquia Senhora Sant'Ana (Ipuã)** — é anterior à emancipação do
   município e à própria diocese (1973); plausível como capela/freguesia antiga, mas convém
   conferir.
8. **Comunidade "São Francisco" repetida** na Minibasílica (Barretos): a fonte lista duas linhas
   com o mesmo nome e horários diferentes (2º/4º sábado 19h30 e domingo 8h). Gravada **uma**
   comunidade com os dois horários — pode haver duas capelas homônimas.
9. **"Área Pastoral São Bento e Santa Rita"** não tem igreja-matriz declarada: as duas capelas
   (São Francisco e Santa Cecília) foram gravadas sem `isMatriz`. O importador vai criar a
   matriz automaticamente — confirmar qual é.
10. **E-mail truncado no HTML** de duas fichas (quebra de linha no meio do domínio):
    `paroquiabomjesus@diocesedebarretos` + `.com.br` e
    `paroquiasaojoaobatistaolimpia@` + `gmail.com`. Recompostos manualmente.
