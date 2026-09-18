# Diocese de São Raimundo Nonato (PI) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-18
- **Arquivo**: `paroquias/PI/sao-raimundo-nonato.json`
- **Cobertura**: **29 / 29 paróquias (100%)**, todas `alta`, nos **25 municípios** da diocese
  (3 paróquias em São Raimundo Nonato; 2 em São João do Piauí e 2 em Canto do Buriti)
- **Comunidades**: 29 (só as igrejas-sede) — **nenhuma capela publicada**
- **Horários fixos**: 18, **todos `baixa`** e de apenas **2 das 29 paróquias**. As outras 27 entram
  sem nenhum horário.

## A diocese não tem site no ar

O endereço que as fontes secundárias citam — `www.diocesedesaoraimundo.com.br` — **não resolve**. O
Arquivo da Internet mostra um WordPress ativo entre **2007 e 2012** e nada depois. Não há domínio
alternativo. O único canal institucional vivo é a **página no Facebook**
(`facebook.com/diocesedesaoraimundononato`), que não publica lista de paróquias nem grade de missas
legível por leitor automático.

## Fontes principais

| Fonte | URL | O que deu |
|---|---|---|
| **Receita Federal** | `https://minhareceita.org/068221420000XX` | **toda a lista**, com orago, endereço, bairro, CEP, telefone (4 delas) e data de abertura |
| Mapa das OSC / IPEA | `/detalhar/422652` | **achou a raiz do CNPJ** (06.822.142) a partir da única filial indexada |
| catholic-hierarchy.org | `/diocese/dsarn.html` | 30 paróquias (2020) e 29 (2022) |
| Wikipédia | `/wiki/Diocese_de_São_Raimundo_Nonato` | 28 paróquias e a **lista dos 25 municípios**, que bate exatamente com a da Receita |
| liriocatolico.com.br | `/horario_missa/dados/uf/PI.json` | 2 grades (Catedral e N. Sra. das Mercês) — a **única** fonte de horário |
| horariodemissa.com.br | `igreja.php?k=kBLPG` | 1 ficha, **atualizada em 10/05/2013** e **sem nenhum horário** |

### Prova de completude (CNPJ) — 32 ordens, 29 paróquias

Raiz **06.822.142** (a cúria, ordem 0001, está ATIVA desde 19/04/1971). Testadas as ordens 0001 a
0060: existem **32**. Descontando:

- **0001** cúria (Praça Comendador Piauilino, 185, Centro);
- **0009** PAROQUIA DE SAO JOSE, **Paes Landim — BAIXADA** (o município hoje é da Diocese de
  Oeiras; confirmado no Mapa das OSC, onde a única OSC "DIOCESE" de Paes Landim é a Diocese de
  Oeiras, CNPJ 06.577.100/0010-52);
- **0032** "CONVÍVIO VOCACIONAL SÃO JOSÉ", aberto em **20/06/2025** no mesmo endereço da paróquia de
  Canto do Buriti — casa de formação, não paróquia, fora do dataset;

sobram **29 paróquias ativas**, que cobrem exatamente os 25 municípios listados pela Wikipédia.

Sobre `parishesExpected`: o catholic-hierarchy traz 30 (2020) e 29 (2022), e a Wikipédia 28. A
linha de **2023 do catholic-hierarchy traz "39"** — um salto de 10 paróquias em um ano, implausível
e quase certamente erro de digitação do anuário. Foi adotado **29**, o número da Receita Federal,
que é o único verificável item a item.

A paróquia mais nova é **Santo Expedito (Canto do Buriti)**, inscrição de 12/12/2014; nada foi
criado depois disso.

## Horários — 18 registros, todos `baixa`, em 2 paróquias

Só o `liriocatolico.com.br` tem grade, e só das duas igrejas da sede:

- **Catedral São Raimundo Nonato** — dom 7h, 9h e 19h30; seg a sex 18h15; sáb 19h30; adoração qui
  16h30-18h.
- **Paróquia Nossa Senhora das Mercês** — dom 8h e 18h; seg a sáb 19h30.

Fonte única, não oficial e sem data de conferência → `baixa`. A ficha do `horariodemissa.com.br` da
catedral é de **10/05/2013** (e vazia), o `buscamissa.com.br` não cobre a diocese, e a tentativa de
corroborar por Instagram não foi possível (o Instagram passou a exigir login depois de ~40 leituras
nesta rodada).

## Divergências e observações de nome

1. **Endereço da Catedral** — três fontes, três endereços: Receita "Rua Prof. José Leandro, 100";
   liriocatolico "Largo Cap. Tomazinho, 201"; horariodemissa "Praça Fr. Francisco Freiria, 1415" —
   este último é, na verdade, o endereço da **Paróquia Nossa Senhora das Mercês**. Gravado o da
   Receita.
2. **Paróquia Nossa Senhora das Mercês (São Raimundo Nonato)** — a Receita a registra como
   *paróquia*; o liriocatolico a chama de *Santuário*. Mantido "Paróquia".
3. **"Paróquia de São João de Anísio de Abreu"** (filial 0007) — o "de Anísio de Abreu" é o
   município. Gravado **"Paróquia São João"**; falta confirmar se o padroeiro é João Batista ou
   João Evangelista.
4. **"Igreja Matriz do Divino Espírito Santo"** (Ribeira do Piauí, 0020) — padronizado para
   "Paróquia Divino Espírito Santo".
5. **"Paróquia São Braz"** (São Braz do Piauí, 0027) — gravado "Paróquia São Brás" (grafia do
   santo); o município mantém o "z".

## Precisa de validação humana

1. **Horários de 27 das 29 paróquias** — zero registros. E os 18 que existem são `baixa`, portanto
   a diocese entra em produção **sem nenhum horário**.
2. **Endereço da Catedral** (item 1 acima).
3. **Pároco, e-mail e ano de criação**: nenhum encontrado, em nenhuma das 29. Telefone, só em 4
   (Catedral, N. Sra. das Mercês, Tamboril do Piauí e João Costa).
4. **Nenhuma comunidade rural** — numa diocese de 25 municípios do sudeste piauiense, é certo que
   existam muitas capelas; nenhuma fonte as publica.
5. **Discrepância de contagem** entre Receita (29), catholic-hierarchy (29 em 2022, "39" em 2023) e
   Wikipédia (28).
6. **Orago de "Paróquia São João"** (Anísio de Abreu).

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `address`: está "Curia Diocesana, Praca Comendador Piauilino 15"; a Receita Federal registra a
  cúria (CNPJ 06.822.142/0001-09) na **Praça Comendador Piauilino, 185 – Centro**. O número 15
  parece errado.
- `phone`: está "(89) 3582-3632". A Receita registra **(89) 3582-1476** na matriz; o 3582-3632
  aparece como telefone de várias filiais (Ribeira do Piauí, Guaribas, São Braz, Capitão Gervásio
  Oliveira), ou seja, também é um número da cúria. Os dois parecem válidos.
- `website`: está `null` — **correto**. Registrar que `diocesedesaoraimundo.com.br` está morto
  desde ~2012, para que ninguém o reinsira.
- `bishopName` ("Dom Ronilton Souza de Araújo, S.C.I.") e `foundedYear` (1960) — o bispo confere; a
  Wikipédia e o catholic-hierarchy datam a criação da diocese em **03/10/1981**, não 1960. *(1960 é
  a data da Prelazia de São Raimundo Nonato, elevada a diocese em 1981 — conferir qual o dataset
  quer registrar.)*
