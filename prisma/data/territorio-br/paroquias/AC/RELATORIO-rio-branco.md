# Relatório — Diocese de Rio Branco (AC)

Pesquisa: 2026-09-18. Agente de pesquisa do território (enxame Parish).

## Resumo

| Item | Valor |
|---|---|
| Unidades gravadas | **44** (36 paróquias + catedral, 5 áreas missionárias, 3 quase-paróquias) |
| Confiança das unidades | 44 `alta` |
| Comunidades nomeadas | **153** |
| Horários fixos | **227** (169 `alta`, 4 `media`, 54 `baixa`) — 158 missas, 33 confissões, 23 adorações, 13 terços |
| Cobertura | **44/44** da lista oficial (gcatholic esperava 43) |
| Estados | **AC 40, RO 2, AM 2** |
| Bispo | **Dom Antônio Fontinele de Melo — nomeado HOJE, 18/09/2026** |

## O bispo: a notícia do dia

O Papa Leão XIV nomeou **hoje, 18 de setembro de 2026**, **Dom Antônio Fontinele de Melo** bispo
da Diocese de Rio Branco, **transferindo-o da sé de Humaitá (AM)**. A cronologia, confirmada em
três fontes independentes:

- **01/07/2026** — o Papa aceita a renúncia de **Dom Joaquín Pertíñez Fernández**, 27 anos à frente
  de Rio Branco. No mesmo dia a **Arquidiocese de Porto Velho** publica a "Nota de felicitação pela
  nomeação de Dom Antônio Fontinele de Melo como Administrador Apostólico da Diocese de Rio Branco".
- **12/07/2026** — Dom Antônio assume como **administrador apostólico**.
- **18/09/2026** — nomeado **bispo diocesano**. O `gcatholic` já registra
  "Bishop Antônio Fontinele de Melo (appointed September 18, 2026)"; a CNBB publicou a notícia
  no mesmo dia.

**Gravei `bishopName: "Dom Antônio Fontinele de Melo"`.** O site da diocese ainda não reflete a
mudança na página `/diocese/bispo-diocesano`. Ele **ainda não tomou posse** — vale registrar isso
se o app exibir a informação.

## Fontes principais

1. **Site oficial — <http://www.diocesederiobranco.org.br>** (portal próprio, ativo: liturgia e
   santo do dia gerados para 18/09/2026).
2. **`/nossas-paroquias`** — a lista completa, agrupada em **10 Regiões Pastorais**, com 44 links
   para fichas `/paroquias/<slug>`.
3. **As 44 fichas individuais.** Cada uma traz clero, endereço, CEP, e-mail, um bloco de texto
   **"Horários de Missas"** (frequentemente com adoração, confissões e expediente da secretaria),
   o **PIX/CNPJ da paróquia** e, em 12 delas, a lista nominal das comunidades.
4. **`/horarios-de-missa`** — página-resumo; cobre só 14 unidades e é menos confiável (ver abaixo).
5. **CNBB** e **gcatholic.org** — a nomeação do bispo.
6. **Receita Federal via Mapa das OSC/IPEA** — CNPJ raiz **14.346.589**, 47 estabelecimentos.
7. **ViaCEP** — conferência e correção de CEPs.

## Cobertura

- Site: **44** (Regiões 1 a 10). gcatholic: **43 centros pastorais**. A diferença de uma unidade
  é normal para áreas missionárias recentes; **a lista da diocese é a autoridade**.
- **Receita**: cada ficha publica o **CNPJ da própria paróquia** no campo PIX, o que tornou o
  cruzamento direto. Cerca de 40 dos 47 estabelecimentos casam com as fichas; os demais são a sede
  (Travessa Catedral, 04) e obras. **Nenhum estabelecimento revela paróquia ausente do site.** As
  três áreas missionárias São Camilo, Souza Araújo e João Paulo II não têm estabelecimento próprio.

## Uma diocese em três estados

| Unidade | Cidade | UF | Prova |
|---|---|---|---|
| Paróquia Cristo Rei | Porto Velho (distrito de Nova Califórnia) | **RO** | ViaCEP 76848-000 = Nova Califórnia, Porto Velho/RO; Receita registra o estabelecimento 0035-38 lá |
| Paróquia São José | Porto Velho (distrito de Extrema) | **RO** | ViaCEP 76847-000 = Extrema, Porto Velho/RO; Receita: "VILA EXTREMA, Porto Velho" |
| Paróquia São Francisco de Assis | Boca do Acre | **AM** | Receita: Av. Jacinto Alé, 119, Platô do Piquiá, Boca do Acre |
| Paróquia São Pedro | Boca do Acre | **AM** | ficha com CEP 69850-000 e DDD **97** |

As duas de Boca do Acre formam a **Região Pastoral 10** e **não** pertencem à Prelazia de Lábrea
(conferi contra `AM/labrea.json`, que só tem Lábrea, Tapauá, Pauini e Canutama).

## Responsáveis que não são padres

- **Área Missionária João Paulo II** — Diácono João Bosco Rodrigues da Silva.
- **Quase-paróquia Bom Pastor** (Vila Nova Aldeia) — Diácono Jorge Maia da Silva, e a ficha o chama
  de **"Coordenador"**.
- **Quase-paróquia Nossa Senhora de Fátima** (Transacreana) — **"Responsável: Ir. Helena Luiza"**,
  uma religiosa; não há padre nem diácono publicado. Nenhuma das três publica missa.

## Armadilhas encontradas na fonte

1. **Erro de cópia grave**: a ficha da **Paróquia São Sebastião de EPITACIOLÂNDIA** repete, palavra
   por palavra, a lista de comunidades da **Paróquia São Sebastião de RIO BRANCO** (Rua Santa Inês
   270 – Aviário, N. Sra. da Glória, Baixa da Colina, Estrada do Quixadá km 3/8/18, Ramal Colibri,
   Ramal Boa Água) — duas cidades a ~230 km. **Descartei o bloco inteiro**; Epitaciolândia ficou sem
   comunidades nomeadas e Rio Branco ficou com as suas.
2. **Placeholders do CMS**: o bloco "Comunidades" da **Á. M. Cidade do Povo** tem uma única entrada,
   **"Teste"**; o da **Á. M. Divina Misericórdia** tem **"teste", "teste"** e **"testes tset set se"**.
   Descartados.
3. **Ficha que se contradiz**: na **Á. M. Divina Misericórdia**, o texto diz "de segunda à sexta às
   07h" e "Domingo: às 11h e às 18h", enquanto o bloco "Horários" da **mesma página** diz
   "DOMINGO: 10h00 | 19h00" e "TERÇA-FEIRA A SEXTA 07h00". Gravei o texto descritivo, **todos os
   horários com `baixa`**, e registrei a contradição em cada um.
4. **"às" no lugar de "e"**: a página-resumo e alguns blocos "Horários" escrevem
   "DOMINGO - 07h00 às 19h00", "DOMINGO - 08h00 às 19h00", "DOMINGO - 07h30 às 18h00". Não é um
   intervalo — quase certamente são duas missas (a ficha de Epitaciolândia grafa "07h00 **e** 19h00").
   Onde o texto descritivo da ficha existe, usei-o; onde **não** existe (**Santa Inês**), gravei os
   dois horários com **`baixa`** e a ressalva.
5. **Rótulo genérico "Celebração"**: a **Paróquia Cristo Libertador** é a única que publica horário
   para cada uma das 10 comunidades, mas escreve **"Celebração aos Domingos às 17h"**, não "Missa".
   Pode ser **Celebração da Palavra**. Gravei as 10 como `MASS` com **`baixa`** e a ressalva explícita.
6. **"Liturgia" não é missa**: São Judas Tadeu publica "Terça: às 19h - Liturgia" — não gravado.
7. **Paróquias sem missa de domingo**, e isso é o que a fonte diz:
   - **Nossa Senhora da Conceição (Sena Madureira)** — só terça a sexta 18h na **Capela Betânia** e
     segunda 17h na **Capela do Cemitério**.
   - **São Mateus (Rio Branco)** — só quinta 19h.
8. **E-mails inválidos como publicados** (não gravados):
   - `paróquia.xapuri@hotmail.com` (acento na parte local) — São Sebastião de Xapuri.
   - `paroquiasãomiguel.ac@gmail.com` (acento) — São Miguel Arcanjo.
   - `paroquiasenhorarainhadapaz@gmail.com.br` (gmail.com seguido de .br) — Acrelândia.
9. **Endereço da matriz não publicado**: **Cristo Libertador** e **São Francisco de Assis (Boca do
   Acre)** — só a Receita tem (Rua Ary Rodrigues, Aeroporto Velho; Av. Jacinto Alé, 119).
10. **CEP inexistente no ViaCEP**: **69921-000** (usado pelas duas paróquias de Porto Acre e também
    pela Receita) — gravado como publicado, mas precisa de conferência.
11. **CEP corrigido**: Cristo Rei de Nova Califórnia publica "76.877-000", que não existe;
    a Receita e o ViaCEP dão **76848-000**.
12. **Divergências de número entre ficha e Receita** (gravei o da ficha): N. Sra. das Dores
    (360 × 420), Santa Cruz (Rua Raimundo Irineu Serra × Rua Antônio da Rocha Viana), São Judas
    Tadeu (246 × 267), Divino Espírito Santo (1112 × 1122), Santa Rita de Cássia (288 × 242),
    Bujari (CEP 69926-000 × 69923-000), São Miguel Arcanjo (CEP 69905-229 × 69900-115),
    Bom Pastor (BR-364 km 32 × Ramal Nova Aldeia km 15). **Santa Inês** é o caso mais estranho:
    a ficha diz Rua Alvorada, 228, e a Receita tem dois estabelecimentos na Rua Alvorada (806 e 824).
13. **Campos de pároco vazios**: São Sebastião de Epitaciolândia, São Jorge e a Quase-paróquia de
    Vila Caquetá publicam só "Pároco: Pe." / "Pe.:" — `priestName: null`.
14. **Grupos ribeirinhos sem capela**: a ficha de **Manoel Urbano** descreve, sem nomear, os grupos
    do **Rio Purus** ("existem 7 grupos, 5 que se reúnem em escolas e 2 em residências") e cita os
    seringais **Sumaúma, Itatinga (2), Terra Alta e Oiapoque** (alto Purus) e **Bela Vista e Santa
    Penha** (baixo Purus). Como são grupos sem capela, ficaram fora da lista de comunidades e
    registrados no `notes` da paróquia.
15. **Matriz com outro orago**: a **Paróquia Santa Clara** tem como igreja matriz o **Santuário São
    Francisco** — a própria lista de comunidades o marca "MATRIZ". Gravei assim.
16. **Comunidade chamada "Comunidade Área Missionária"** (Paróquia Santa Clara, Conj. Res. Eldorado)
    — é esse o nome publicado, não um rótulo de seção.
17. **Missas mensais são a norma nesta diocese**: 54 dos 227 horários ficaram `baixa` por
    recorrência mensal. O caso extremo é **São José de Extrema**, cujas 7 comunidades têm dia fixo
    do mês (1º domingo, 2º sábado, 2º domingo, 3º domingo, 4º domingo, última sexta), e **São
    Sebastião de Rio Branco**, com as quatro missas de sábado rodiziando entre quatro comunidades.
18. **Linha autocontraditória**: N. Sra. de Nazaré (Porto Acre) publica
    "**Terça**: Toda 3ª **quarta** de cada mês - às 17h". Gravada na quarta, com `baixa`.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

| Campo | Valor atual | Valor encontrado | Fonte |
|---|---|---|---|
| `bishopName` | `null` | **`Dom Antônio Fontinele de Melo`** (nomeado 18/09/2026, transferido de Humaitá/AM; ainda não empossado) | CNBB + gcatholic |
| `zipCode` | `69908-000` | **`69900-094`** — o 69908-000 é da BR-364, bairro Belo Jardim II; o da Travessa da Catedral, Centro, é 69900-094 | rodapé do site + ViaCEP + Receita (estabelecimento 0001-99) |
| `address` | `Travessa da Catedral 4` | **`Travessa Catedral, 04 – Centro`** (só padronização) | rodapé do site |

Conferem: nome, `type`, cidade, telefone ((68) 3223-2201), e-mail
(contato@diocesederiobranco.org.br) e site.

`foundedYear: 1919` é o ano da **erecção da Prelazia de Rio Branco** (04/10/1919; diocese só em
15/02/1986) — está certo pela convenção do dataset, **não corrigir**.
