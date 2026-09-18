# Diocese de Irecê — relatório de pesquisa

- **Slug**: `irece` · **UF**: BA · **Sede**: Irecê · **Província**: Feira de Santana · **Regional**: Nordeste 3
- **Pesquisa**: 18/09/2026
- **Bispo**: Dom Antônio Ederaldo de Santana (desde 23/09/2023) · **Emérito**: Dom Tommaso Cascianelli, C.P.
- **Cúria**: Praça Góes Calmon, s/n, Centro, Cx. Postal 14 · 44900-000 · (74) 3641-3835 / 3833 ·
  diocesedeirecepastoral@gmail.com
- **Site oficial**: **não existe** (ver abaixo)
- **Território**: 22 municípios

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **28** — 28 `alta` |
| Registros no arquivo | 29 (as 28 + o Santuário Diocesano Senhor dos Passos, `nao-paroquial` + `loadAsParish`, `media`) |
| Comunidades | **36** = 29 matrizes + 7 outras (3 `media`, 4 `baixa`) |
| Horários fixos | **42** (34 MASS · 7 ADORATION · 1 CONFESSION) — **todos `baixa`** |
| Paróquias com algum horário | 10 de 29 |
| Horários carregáveis (`alta`/`media`) | **0** |

**Cobertura: 28 de 28.**

## O site da diocese não existe mais

`dioceses.json` já traz `website: null`, e está certo. A **CNBB Regional Nordeste 3 ainda publica**
`www.diocesedeirece.org.br` na ficha da diocese, mas o domínio dá **NXDOMAIN** no registro.br
(consulta DNS-over-HTTPS em 18/09/2026, `Status: 3`): foi **apagado**, não apenas tirado do ar.
Nenhum domínio alternativo resolve (`dioceseirece.com.br`, `dioceseirece.org.br`,
`diocesedeirece.org.br`, `diocesedeirece.com`, `irecediocese.com.br`).

**O Arquivo da Internet estava fora do ar no dia da pesquisa** — tanto a API `wayback/available`
(HTTP 429) quanto o CDX responderam "Internet Archive services are temporarily offline". **Não foi
possível recuperar nenhuma captura.** Isso vale como recomendação para o enxame de validação: *tentar
de novo o Arquivo da Internet quando ele voltar* é a única chance de recuperar a lista de comunidades
e os horários que o site publicava.

O canal oficial vivo é o **Instagram @diocesedeirece_ba** (10,9 mil seguidores, posts até
**16/09/2026**). A bio não tem site, nem lista de paróquias, nem horários — mas o perfil tem um
**destaque "Horários"** em stories, que o leitor automático não abre. É a pista mais promissora.

## A lista de paróquias saiu inteira da Receita Federal

Não havendo site, o método foi o do README: **varrer as filiais do CNPJ da diocese**.

1. **Mapa das OSC / IPEA** — a busca avançada por razão social `DIOCESE DE IRECE` devolveu 32
   inscrições e revelou a raiz **13.223.458**. (O IPEA funcionou nesta diocese; a busca combinada
   razão social + `cd_municipio` devolve zero, então use só a razão social, ou só o município.)
2. **`minhareceita.org`**, varredura de `/0001` a `/0044`: existem exatamente **34 inscrições**,
   nada de `/0035` em diante.

| Tipo | Quantidade |
|---|---|
| Sede | 1 |
| **Paróquias ATIVAS** | **28** |
| Santuário Diocesano Senhor dos Passos (Lençóis) | 1 |
| Centro de Treinamento de Líderes | 1 |
| Seminário Maior Emaús (em Feira de Santana) | 1 |
| BAIXADAS (Seminário São José, Livraria Diocesana Irmã Dulce) | 2 |

**28 paróquias = os 28 do Annuario Pontificio 2024** (catholic-hierarchy, dado de 31/12/2023).
Duas contagens independentes que fecham.

O **gcatholic** (31 igrejas, atualizado em 01/01/2026) é a fonte mais fraca aqui: só 25 têm a marca
"(Parish)", e faltam-lhe **São Pedro Apóstolo** e **N. Sra. do Rosário de Fátima** (ambas em Irecê),
**Irmã Dulce dos Pobres** (São Gabriel) e a paróquia de Lençóis, que ele registra sob outro título.
Em compensação, o gcatholic foi quem esclareceu a catedral e deu 5 igrejas não paroquiais que viraram
comunidades.

## A catedral

O gcatholic registra em Irecê: **"Bom Pastor (Cathedral, Parish) — Paróquia São Domingos —
Cathedral of the Good Shepherd"**. Ou seja: o título da **catedral** é o **Bom Pastor**, o da
**paróquia** é **São Domingos de Gusmão**. A Receita batiza a filial `/0003-13` de "PAROQUIA DE SAO
DOMINGOS", no mesmo endereço da cúria (Praça Góes Calmon). Gravei
`name: "Paróquia Catedral São Domingos de Gusmão"` com a matriz chamada **"Catedral do Bom Pastor"**.

O Instagram oficial **@paroquiasaodomingosirece** (posts até 16/09/2026) dá o pároco —
**Pe. Luiz Martins** — e "86 anos de vida e missão", donde `foundedYear: 1940` (aproximado, marcado
como tal em `notes`).

## Horários — 42, todos `baixa`

Vieram **todos** do `liriocatolico.com.br`, única fonte existente: 14 fichas no território, cujo
`ultima_atualizacao` é `2026-09-02` — a data de recarga da base, igual em 500 das 501 fichas da
Bahia. Fonte única não oficial ⇒ `baixa`. **Nada carrega em produção.**

| Paróquia | Horários |
|---|---|
| N. Sra. da Graça (Morro do Chapéu) | 6 — **duas grades contraditórias**, ver abaixo |
| Catedral São Domingos (Irecê) | 5 |
| São José (João Dourado) | 5 |
| São Sebastião (Seabra) | 5, em 3 igrejas |
| Santa Terezinha (Central) | 4 |
| São João Batista (Lapão) | 4 |
| N. Sra. da Conceição (Lençóis) | 4, em 2 igrejas |
| N. Sra. do Livramento (Iraquara) | 4 |
| Senhor do Bonfim (Ibititá) | 3 |
| Santuário Senhor dos Passos (Lençóis) | 2 |

Tentativas de corroboração que falharam: `buscamissa.com.br` não cobre nenhuma cidade do interior
baiano; o blog oficial da paróquia de Morro do Chapéu parou em **30/11/2012** (pré-pandemia, cai pela
regra do README); o site `senhordospassoslencoisba.com.br` é da **festa** (Sociedade União dos
Mineiros), não da paróquia, e não publica horário.

### Morro do Chapéu — duas fichas com o mesmo nome

O Lírio Católico tem **duas** fichas chamadas "Igreja Matriz Nossa Senhora da Graça" em Morro do
Chapéu, em endereços diferentes (Rua Coronel Dias Coelho, 186 × Avenida Senhor dos Passos), com
grades **diferentes** e o **mesmo telefone**. Gravei as duas na matriz, cada horário com o endereço
da sua ficha em `notes`. O blog oficial (2012) registra um **Santuário Nossa Senhora da Graça** dentro
da paróquia, inaugurado em 2008 — provavelmente é o segundo endereço. Gravei o santuário como
comunidade (`media`), mas **não** associei horários a ele.

### Lençóis — conflito de títulos

| Fonte | O que diz |
|---|---|
| Receita (`/0011-23`) | **Paróquia Nossa Senhora da Conceição**, Praça Afrânio Peixoto, s/n |
| Receita (`/0027-90`) | **Santuário Diocesano Senhor dos Passos**, Av. Senhor dos Passos, 35 (desde 2013) |
| gcatholic | Lençóis: "Nossa Senhora do Rosário" (**sem** marca de paróquia) e "Senhor dos Passos (**Parish**)" |
| Lírio Católico | "Igreja Nossa Senhora do Rosário" na Pça. Afrânio Peixoto; "Santuário Senhor dos Passos" na Av. Gen. Viveiros, 29 |

Gravei a **paróquia** com o título da Receita (N. Sra. da Conceição) e o **santuário** como registro
separado com `status: "nao-paroquial"` + `loadAsParish: true` e `confidence: "media"`, porque o
gcatholic o chama de paróquia e a Receita não. **Precisa de validação humana.**
O Lírio ainda avisa **"Igreja fechada para reforma"** no santuário — os 2 horários podem estar
suspensos, e isso está em `notes`.

## Comunidades: quase nada

Só **7** além das matrizes, e nenhuma de fonte paroquial:
- **Seabra** (4): Bom Jesus, N. Sra. Aparecida, São José e São Pedro — igrejas que o gcatholic lista
  sem marca de paróquia. As duas primeiras têm ficha própria com missa no Lírio ⇒ `media`; as outras
  duas ficaram `baixa`.
- **Souto Soares** (1): São José (gcatholic, `baixa`).
- **Lençóis** (1): Comunidade Santo Antônio de Tanquinho (só no Lírio, `baixa`).
- **Morro do Chapéu** (1): Santuário Nossa Senhora da Graça (blog oficial de 2012, `media`).

Numa diocese de 22 municípios e 24.557 km², o número real de capelas é de várias centenas. **É a
maior lacuna desta diocese.**

## Pontos para o enxame de validação

1. **Tentar o Arquivo da Internet de novo** para `diocesedeirece.org.br` — estava offline no dia da
   pesquisa e é a única chance de recuperar comunidades e horários publicados pela diocese.
2. **Abrir o destaque "Horários" do Instagram @diocesedeirece_ba** (stories) — a única fonte oficial
   viva de horário que se conhece.
3. **Lençóis**: qual é a paróquia e qual é o santuário; e se a igreja da Praça Afrânio Peixoto é
   N. Sra. da Conceição ou N. Sra. do Rosário.
4. **Morro do Chapéu**: separar as duas grades (matriz × santuário).
5. **Salobro (Canarana)**: a Receita chama a paróquia de **Nossa Senhora de Fátima**; o gcatholic, de
   **Nossa Senhora da Graça**, sob a cidade "Paz de Salobro". Gravei a da Receita.
6. **Párocos**: só o da catedral foi encontrado (Pe. Luiz Martins, pela bio do Instagram). **27
   paróquias estão com `priestName: null`** — sem site diocesano não há lista de clero.
7. **Ano de fundação da catedral** — 1940 é dedução da bio do Instagram ("86 anos" em 2026).
8. **Telefones**: gravei só três, todos da Receita e claramente próprios da paróquia (Salobro,
   Jussara e o Santuário de Lençóis). Os números `(74) 3641-3835` que a Receita repete em 9 filiais
   são o da **cúria** e não entraram; os do Lírio Católico também não.
9. **Endereço da sede**: a Receita registra o CNPJ `/0001-51` na **Avenida 2 de Agosto, 2882, Baixão
   de Sinésia, CEP 44867-555**, que não é o da cúria publicado pela CNBB (Praça Góes Calmon, Centro,
   44900-000). Gravei o da CNBB.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `email`: hoje `null` → **`diocesedeirecepastoral@gmail.com`** (CNBB NE3; o segundo e-mail
  publicado é `dioceseirece@holistica.com.br`).
- `address`: hoje `"Praca Goes Calmon s/n, C.P. 14"` → confere com a CNBB; registrar que a Receita
  aponta outro endereço para a sede do CNPJ.
- `website`: **manter `null`** — confirmado NXDOMAIN. Vale avisar a CNBB NE3, que ainda publica o
  domínio morto.
- `phone`: acrescentar o segundo número da cúria, **(74) 3641-3833**.
- `bishopName` e `zipCode` conferem.
