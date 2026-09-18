# Diocese de Carolina (MA) — relatório de pesquisa

Data da coleta: **2026-09-18**. Agente de pesquisa (rodada MA — fechamento do Maranhão).

## Resumo

| Item | Valor |
|---|---|
| Entradas de paróquia no JSON | **15** (13 paróquias + 2 áreas/regiões pastorais) |
| Confiança das paróquias | 15 `alta` |
| Comunidades | **161** |
| Horários fixos | **174** — 80 `alta` (semanais) e 94 `baixa` (recorrência mensal) |
| Cobertura | 15 encontradas × 14 esperadas (catholic-hierarchy 2023) |

## Fonte principal

**`https://www.diocesedecarolina.com.br/paroquias2/` — site Webnode oficial, ATIVO.** É a melhor
fonte desta rodada: cada uma das 15 fichas (publicadas em **24/04/2025**, a de Cabeceira Grande em
08/05/2025) traz pároco, diácono, secretário(a), endereço com CEP, e-mails, e a **lista completa
das comunidades separada em "com capela", "sem capela" e "pontos de missa", com a quilometragem
até a sede e a grade de missas de cada uma**, além da data do festejo.

As fichas estão em URLs numéricas (`/l/5/` a `/l/15/`, `/l/pp/`,
`/l/area-pastoral-cabeceira-grande/`) e **duas ficaram escondidas atrás dos slugs de demonstração
do Webnode**: `/l/este-e-um-blog-com-imagens/` é a **Paróquia Sant'Ana de Montes Altos** e
`/l/este-e-um-blog-simples/` é a **Área Pastoral do Vão do Marco**. Quem só seguir os links
"bonitos" perde as duas.

Outras fontes: `/clero/` (lista de todos os presbíteros com a paróquia, usada para desempatar
párocos), `catholic-hierarchy.org/diocese/dcrln.html`, `gcatholic.org/churches/local/caro0`,
Mapa das OSC/IPEA e `minhareceita.org` (CNPJ da mitra **05.641.899**).

## Cobertura e conferência cruzada

A varredura das filiais do CNPJ da mitra (13 inscrições, todas ATIVAS) confirma 11 paróquias e o
Seminário N. Sra. da Santíssima Trindade (em São Luís, do CNPJ da diocese de Carolina). **Não
aparecem na Receita**: a Paróquia São Pedro Apóstolo de São Pedro dos Crentes e as duas áreas
pastorais — devem ter CNPJ próprio ou ainda não ter inscrição. O endereço, o CEP e os telefones da
Receita batem com os das fichas do site.

Entradas do gcatholic **sem correspondência na lista oficial** e por isso fora do JSON:

| gcatholic | Por que ficou de fora |
|---|---|
| Carolina — Nossa Senhora das Graças (Parish) | não consta da página Paróquias nem da página Clero da diocese; nenhum pároco aparece atribuído a ela. **Precisa de validação humana** |
| Carolina — Santuário Menino Jesus (Shrine) | igreja não paroquial, sem horário publicado em fonte oficial (regra do README: não entra) |
| Carolina — São Francisco de Assis / São José Operário | são **comunidades** da Catedral (Brejinho e Centro), já no JSON como `communities` |
| Estreito — São João Batista | é a paróquia do Alto Bonito, já no JSON |
| São João das Cachoeiras — São João | é **comunidade rural** da Paróquia Santo Antônio de Pádua de Carolina (30 km), já no JSON |

## Decisões tomadas

- **Párocos: a página Clero venceu a ficha da paróquia em dois casos**, e os próprios e-mails
  publicados na ficha confirmam:
  - Lajeado Novo — a ficha diz "Pe. José Eduardo de Lima Sá", o Clero diz **Pe. Almir Marques dos
    Santos**, e o e-mail da ficha é `marques-aa@hotmail.com`. Ficou Almir Marques.
  - São Pedro dos Crentes — a ficha diz "Pe. Ozano de Jesus Cirqueira", o Clero diz **Pe. Eronaldo
    Correia Lopes**, e o e-mail da ficha é `p.eronaldo@hotmail.com`. Ficou Eronaldo.
- **Porto Franco / Imaculada Conceição**: a ficha diz "Pároco: Frei Paulo de Araújo Sousa", mas o
  Clero só lista, nessa paróquia, Frei Antônio Leonardo Trotta, Frei Wilton de Souza Silva Júnior
  e Frei Antônio Jaime de Jesus (o e-mail da ficha é `freiwilton@gmail.com`). Mantive o nome da
  ficha e **marquei para validação humana**.
- **As 5 comunidades urbanas de Estreito** (Bairro Areia, São Pedro–Beira Rio, N. Sra. Aparecida–
  Passagem da Volta, São José Operário–Bandeirantes e Divino Pai Eterno–Cibrazem) estão listadas
  na ficha da **Paróquia São Sebastião**, mas a própria observação da diocese diz: *"Essas
  comunidades pertencem a Paróquia São João Batista. Estão sendo assistidas pela Paróquia São
  Sebastião. Vindo outro pároco … voltam a ser atendidas por sua paróquia de origem."* Foram
  gravadas sob a **Paróquia São João Batista de Estreito** (paróquia de origem).
- **"Celebração" ≠ missa.** Na ficha de Santo Antônio de Pádua (Carolina), as capelas Menino Jesus
  (Sucupira, quarta 19h) e Divino Espírito Santo (Cibrazem, quinta 19h) têm "Celebração", não
  missa — entraram como comunidade, sem horário. O mesmo para as "Celebrações da Palavra com
  Diácono" das comunidades urbanas de Estreito.
- **Recorrência mensal é a norma no interior desta diocese**: 94 dos 174 horários são "1º sábado",
  "2ª sexta-feira do mês", "2º e 4º domingo" etc. Ficaram `baixa`, com a regra literal em `notes`.
  Casos particulares registrados só em `notes` porque não cabem no modelo:
  - **São José – Vereda Seca** (N. Sra. de Fátima, Porto Franco): *"Missa todo dia 19 do mês às
    19h"* — data fixa do mês, `dayOfWeek: null` não é representável na lista, então **não entrou**
    como horário e fica aqui.
  - Comunidades **sem local de culto** da Catedral (São José dos Louros, Buritirana, Canto do
    Porto, Riacho Fundo, Brejão, N. Sra. de Fátima): *"aos sábados 10h"*, em rodízio — entraram
    como comunidade, sem horário, porque a fonte não diz qual sábado é de qual.
  - **Pontos de missa** sem horário (São Francisco de Assis/Estreito: Monte Pio e Brejão;
    Santo Antônio/Carolina: Cana Brava, Taboquinha, Morrinhos, Santa Maria dos Ferreiras,
    Santa Rita dos Italianos, Marrecos; Sant'Ana/Montes Altos: Cercadinho, Rancharia, Sobral,
    Canaveral, com o projeto "Maria de casa em casa") entraram como comunidade, sem horário.
  - Comunidades com *"missa por agendamento"* ou *"só tem missa quando é marcado"* (São João
    Batista de Estreito: N. Sra. das Graças/Valec, Santa Rita/Boa Esperança, São José/Fazenda Vão;
    São Pedro Apóstolo: Vargem do Porto e Assentamento Paulo Freire) — comunidade sem horário.
  - São Bento (comunidade rural de Santo Antônio de Pádua, 81 km) não tem horário publicado.
- `foundedYear` das paróquias: o site **não publica** ano de criação — ficou `null` em todas.

## Para o enxame de validação humana

1. **Paróquia Nossa Senhora das Graças de Carolina** — existe no gcatholic e não na diocese.
   Confirmar se foi extinta, renomeada ou apenas esquecida no site.
2. **Pároco de Porto Franco / Imaculada Conceição** (Frei Paulo de Araújo Sousa × os três frades
   listados na página Clero).
3. **E-mail da Área Pastoral Cabeceira Grande**: o site publica `adãomelo412@gmail.com`, com "ã"
   — endereço inválido. Gravado como `null`; conferir o correto.
4. **Telefone da cúria**: o `dioceses.json` traz (99) 3531-3820; a Receita traz (99) 3531-2116 para
   a Mitra (05.641.899/0001-45) e a página Clero não publica telefone. Conferir.
5. Duas comunidades homônimas dentro da mesma paróquia foram desambiguadas no nome para não colidir
   na carga: "Comunidade São Raimundo Nonato do Sol Nascente" (P.A. Sol Nascente) e "Comunidade
   Nossa Senhora Aparecida da Água Amarela" (P.A. Água Amarela), ambas em São Sebastião de Estreito;
   e "Comunidade Nossa Senhora Aparecida da Passagem da Volta" em São João Batista de Estreito.
   Conferir se os nomes oficiais são esses.
6. **Nomes das duas áreas pastorais**: gravei "Área Pastoral São Francisco de Assis de Cabeceira
   Grande" e "Área Pastoral Nossa Senhora da Conceição Aparecida do Vão do Marco"; o site as chama
   "ÁREA PASTORAL CABECEIRA GRANDE" e "COMUNIDADE NOSSA SENHORA DA CONCEIÇÃO APARECIDA – POVOADO
   VÃO DO MARCO", e a página Clero as chama "Região Pastoral …". Padronizar.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

| Campo | Valor atual | Observação |
|---|---|---|
| `website` | `https://www.diocesedecarolina.com.br` | confere, ativo (HTTP 200, conteúdo católico) |
| `phone` | `(99) 3531-3820` | a Receita registra `(99) 3531-2116` para a Mitra — conferir qual é o da cúria hoje |
| `address` / `zipCode` | "Curia Diocesana, C.P. 15, Av. Getulio Vargas 23" / 65980-000 | confere com a Receita e com a ficha da Catedral |
| `bishopName` | Dom Francisco Lima Soares | confere (gcatholic: bispo desde 19/09/2018) |

`foundedYear` 1958 é o ano de **ereção da Prelazia de Carolina** (14/01/1958) — está certo pela
convenção do dataset; a diocese só foi criada em 16/10/1979 (data que a própria página Clero
publica). **Não alterar.**
