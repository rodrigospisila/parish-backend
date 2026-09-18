# Relatório — Diocese de Borba (AM)

Pesquisa: 2026-09-18. Arquivo: `paroquias/AM/borba.json`.

## Resultado

| Métrica | Valor |
|---|---|
| Entradas de paróquia | **13** (9 paróquias + 4 áreas missionárias) |
| Confiança das entradas | 13 `alta` |
| Comunidades/capelas | 25 (13 matrizes + 12 comunidades nomeadas) |
| Horários fixos | **44** `alta` — 35 MASS, 5 ADORATION, 4 ROSARY |
| Cobertura | 9/9 paróquias (100%), conferido com o gcatholic.org |

## Fonte principal — portal "Cúria Online do Brasil", e ele fecha a contagem sozinho

`https://diocesedeborba.org.br` é WordPress + Elementor, com o conteúdo de paróquias servido por um
shortcode do plugin **Cúria Online do Brasil** (`<div id="curiaonline-diocese">`). As duas listas
são páginas separadas:

- `/nossas-paroquias/` — **9 paróquias**, agrupadas em 4 foranias (São Marcos, São Lucas, São Mateus,
  São João);
- `/areas-missionarias/` — **4 áreas missionárias** (foranias São Lucas e São João).

Cada card aponta para `**/paroquia?paroquiaid=N**`. **Varri os ids de 1 a 16**: existem o 1 e do 3
ao 14; **2, 15 e 16 devolvem "Opps! Registro não encontrado"**. Isso fecha a contagem em 13 com prova
do próprio sistema, sem depender de leitura de lista.

O **gcatholic.org** registra **"9 parishes, 48 missions"**, 100.000 km², 137.000 católicos — as 9
paróquias batem exatamente. As 48 "missões" são as capelas de comunidade, que a diocese não publica.

Cada ficha traz: **Forania, Fundação, Endereço, Bairro, Cidade, Padroeiro(a), Padroeiro(a) Festa,
Contato (celular/WhatsApp/Facebook/Instagram/e-mail/site), Atendimento, Governo Paroquial, histórico
("Sobre a Paróquia")** e um acordeão **"Horários de Missa"** por dia da semana, com colunas
*Horário / Local / Celebrante* e uma linha de *Informações*.

**Sinal de atualidade forte** — por isso os horários entram como `alta`: a última notícia do portal é
de **17/09/2026** (ontem) e as fotos das 13 fichas foram enviadas entre **10/2025 e 01/2026**.

## O acordeão "Horários de Missa" não é só missa

É a armadilha desta diocese. O mesmo acordeão publica terço, novena, círculo bíblico, hora santa,
momento mariano e **Celebração da Palavra**. Classifiquei **linha a linha pelo rótulo do campo
"Informações"**; linha sem rótulo entrou como missa (o acordeão se chama "Horários de Missa").

**Não entraram** (não são missa e não cabem no enum `MASS/CONFESSION/ADORATION/ROSARY`):

| Linha descartada | Onde |
|---|---|
| "Novena de Perpétuo Socorro", "Novena em honra a São José" | Catedral (ter/qua 18:30) |
| "Preparação à Santa Missa" (dom 18:30), "Momento Mariano" (sáb 18:30) | Catedral |
| "Novena Em Honra a N. Sra. do Perpétuo Socorro" | N. Sra. Aparecida (ter 19:00), Cristo Rei (ter 19:00), N. Sra. da Conceição (ter 18:00), Axinim (ter 18:30) |
| "Circulo Biblico" (qua 17:00) | São João Batista – Axinim |
| "Celebração da Palavra nas Comunidades" (dom 07:30) e "Celebração da Palavra" (dom 19:00) | **N. Sra. do Rosário – Canumã** |
| "Oração com a Comunidade" (qui 06:00), "Encontro das Mães que oram pelos filhos" (qui 18:00) | N. Sra. do Rosário – Canumã |

**Consequência importante: a Paróquia Nossa Senhora do Rosário (Canumã) fica SEM NENHUMA MISSA no
arquivo** — não é falha de coleta, é o que a fonte publica. Entram só a adoração de quinta (18:00) e
o terço dos homens de sábado (11:00). É o retrato de um distrito ribeirinho sem padre residente.

Outras decisões:
- **Á. M. Santo Antônio Maria Claret**: 3 linhas trazem no campo *Informações* o nome de uma
  **comunidade** ("Comunidade N. Sra. das Graças", "Comunidade Divino Espírito Santo") embora a
  coluna *Local* diga "Matriz" — apontei esses horários para a comunidade certa, não para a matriz.
- **"Missa e Adoração"** (Claret, quinta 18:00) virou duas entradas, MASS e ADORATION.
- **Cristo Rei**: o sábado aparece **duas vezes com 06:15** (linha repetida no CMS) — gravado uma vez.
- Cada horário guarda em `notes` o rótulo literal da fonte e o celebrante publicado.

## Comunidades — a diocese quase não publica, e uma ficha tem placeholder

**Armadilha do placeholder**: o bloco "Comunidades" da ficha da **Catedral** tem uma única entrada,
**"Comunidade de Teste"**. É placeholder do CMS — descartado. Nenhuma outra ficha tem o bloco
preenchido.

As 12 comunidades nomeadas vieram do **texto histórico** de duas fichas:

| Paróquia | Comunidades nomeadas |
|---|---|
| Cristo Rei (Borba) | 9 urbanas: Matriz Cristo Rei, N. Sra. das Dores, Santa Luzia, São Miguel Arcanjo, N. Sra. de Fátima, N. Sra. da Luz, São Frei Galvão, São Vicente de Paulo e Santo Afonso (a ficha diz "comunidades na área rural e nove comunidades na área urbana" — as rurais não são nomeadas) |
| Á. M. Santo Antônio Maria Claret (Novo Aripuanã) | 5: Santo Antônio Maria Claret (matriz), Divino Espírito Santo, N. Sra. das Graças, N. Sra. do Perpétuo Socorro, N. Sra. de Fátima |

**Declaram mas não nomeiam** — é o maior buraco do arquivo:

- **N. Sra. da Conceição (Novo Aripuanã): 96 comunidades** — 9 urbanas, 5 na estrada e **82
  ribeirinhas**.
- **N. Sra. de Nazaré e São José (Nova Olinda do Norte): "mais de sessenta comunidades assistidas"**,
  urbanas, ribeirinhas, de estrada e **ALDEIAS INDÍGENAS**.

Só essas duas já passam de 150 comunidades não publicadas, contra as 48 "missões" que o gcatholic
contabiliza para a diocese inteira.

## Precisa de validação humana

1. **Á. M. Nossa Senhora do Perpétuo Socorro — MUNICÍPIO INFERIDO.** A ficha publica o campo Cidade
   como `-` e não tem endereço, fundação, contato, clero, comunidades nem horários. Gravei
   `city: "Autazes"` porque está na Forania São João, cuja jurisdição, pelas outras 4 fichas, é
   Autazes e seus distritos. **É o único campo inventado por inferência no arquivo**, e está marcado
   como tal em `notes`.
2. **E-mail inválido em Novo Aripuanã** — a ficha publica `paróquiansc.na@gmail.com`, **com acento**.
   Gravei sem o acento; precisa de conferência (mesmo defeito que apareceu em Japurá, na Tefé).
3. **Telefones divergentes na mesma ficha (Novo Aripuanã)** — Celular `(92) 99335-2803` e WhatsApp
   `+55 97 98452-8595`, com DDDs diferentes. Gravei o celular.
4. **E-mail com dois-pontos na frente (Nova Olinda do Norte)** — publicado como
   `": paroquiansnsjnon@outlook.com"`. Gravado limpo.
5. **Missa de domingo às 19:00 celebrada por "Diácono"** (São João Batista, Axinim) — o rótulo diz
   "Missa" mas o celebrante publicado é diácono, o que é contraditório. Pode ser Celebração da
   Palavra mal rotulada. Mesmo caso, invertido, do que aconteceu em Canumã.
6. **Párocos em minúsculas e sem sobrenome** — Nova Olinda do Norte publica "frei bosco" e "frei
   frança"; Claret publica "pe pedro", "pe junior". Não preenchi `priestName` com esses; em Nova
   Olinda do Norte o campo ficou `null` porque a ficha não preenche "Governo Paroquial".
7. **Fichas praticamente vazias** — São Joaquim e Sant'Ana (Autazes), São José (Novo Céu), Á. M.
   Divino Espírito Santo (Urucurituba) e Á. M. N. Sra. do Perpétuo Socorro não publicam endereço,
   contato, comunidade nem horário. Autazes é a maior cidade da diocese depois de Borba e sua
   paróquia entra sem nenhum horário.
8. **CEP** — **nenhuma das 13 fichas publica CEP**. Todos ficaram `null`.
9. **Ano de fundação da Catedral** — a ficha registra 01/01/1756 (elevação da aldeia a vila de Borba
   Nova), mas o mesmo texto diz que os jesuítas fundaram a missão em **1728**. Gravei 1756, que é o
   que está no campo estruturado.
10. **Comunidades ribeirinhas e aldeias indígenas** — mais de 150 declaradas e nenhuma nomeada. Só a
    Cúria (92) 99604-4636 fecha.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

Registro atual: `address: "Av. Getulio Vargas 198, C.P. 11"`, `zipCode: "69200-000"`,
`phone: "(92) 98439-8462"`, `email: "contato@diocesedeborba.org.br"`,
`website: "https://diocesedeborba.org.br"`, `bishopName: "Dom Zenildo Luiz Pereira da Silva, C.SS.R."`,
`foundedYear: 1963`.

- **`address`**: o rodapé do site publica hoje **"R. Floriano Peixoto, S/N – Centro"** como endereço
  da Cúria, não a Av. Getúlio Vargas 198. (A Av. Getúlio Vargas, 71 é o endereço que o
  `liriocatolico` dá para a Basílica de Santo Antônio; a ficha oficial da catedral diz
  **Praça João Sampaio, S/N**.) Vale confirmar qual é a Cúria.
- **`phone`**: o rodapé publica **(92) 99604-4636** (também como WhatsApp `wa.me/5592996044636`),
  não o (92) 98439-8462 registrado.
- **`foundedYear`**: 1963 é a ereção como **Prelazia** (13/07/1963). A **elevação a Diocese foi em
  18/11/2022** — se o campo quiser dizer "diocese", precisa mudar; se quiser dizer "origem da
  circunscrição", está certo. Registro a data para o Rodrigo decidir.
- E-mail, CEP, website, cidade, UF e bispo conferem.
