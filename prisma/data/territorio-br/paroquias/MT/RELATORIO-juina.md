# Relatório — Diocese de Juína (MT)

Pesquisa: 2026-09-11 · Arquivo: `juina.json`

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **15** (14 `alta`, 1 `media`) |
| Comunidades/capelas | **26** |
| Horários fixos | **11** (10 `media`, 1 `baixa`) |
| Cobertura | 15 encontradas / 15 esperadas — **fechada** |

## Fontes principais

1. **`https://www.diocesejuina.com.br/paroquias`** e as 14 fichas em
   `/paroquia/<slug>` — cada ficha traz o histórico de criação (data e bispo), a lista de todos os
   párocos e vigários que já serviram, e — em 3 casos — um bloco "Horários de Missa".
2. **Receita Federal via `minhareceita.org`** — a varredura das filiais do CNPJ **02.452.683**
   (Diocese de Juína), gerando os dígitos verificadores de 0001 a 0040, devolveu **17 filiais
   ativas**: 15 paróquias, a cúria e o Seminário Sagrado Coração de Jesus (Várzea Grande/MT). Isso
   (a) deu endereço e CEP de todas as 15, (b) **revelou a paróquia que faltava**, e (c) serve de
   **prova de completude** — nada entre 0018 e 0040 existe.
3. gcatholic.org (`juin0.htm`, "15 parishes, 3 missions") e catholic-hierarchy.org (`djuin.html`,
   15 paróquias em 2019–2023) para o número esperado.

## O achado principal

**A Paróquia Nossa Senhora Auxiliadora, de Rondolândia/MT** (Rua Dom Bosco, s/n, Centro, CEP
78338-000, filial `02452683000909`, ativa desde **02/04/1998**) **não aparece em lugar nenhum do
site da diocese** — nem na lista de paróquias, nem no menu. Só apareceu no cadastro da Receita.
Com ela o total vai de 14 para 15 e fecha exatamente com gcatholic e catholic-hierarchy. É o único
registro `media` do arquivo (uma fonte não eclesiástica, sem corroboração no site oficial) e entra
sem comunidade e sem horário. **Confirmar com a cúria.**

## Cobertura por item

- **Endereço e CEP: 15/15** (todos da Receita, cruzados com o site quando este publicava).
- **Telefone: 1/15.** Catorze filiais repetem o mesmo número administrativo ((66) 3566-1322 ou
  (66) 3566-2928, que é o da cúria), então gravei `phone: null` nelas em vez de espalhar um telefone
  errado. Só N. Sra. da Paz tem número próprio na Receita: (66) 3566-2379.
- **Ano de fundação: 13/15**, das fichas históricas do site (não do CMS — são datas de decreto
  narradas no texto, então não caem na armadilha do "fundada em = data de cadastro").
- **Pároco atual: 2/15.** As fichas listam *todos* os párocos históricos em sequência, sem dizer qual
  é o atual — não dá para inferir pelo último da lista. Gravei só onde a fonte é explícita:
  N. Sra. da Paz ("atual Pároco", Pe. Ernesto Backes Junior) e a Catedral (notícia da própria
  diocese nomeando Pe. Ítalo Virgílio Francallanti). Nos outros 13, `priestName: null`.
- **Horários: 3/15 paróquias.** Só N. Sra. da Paz (Juína), São Francisco de Assis (Aripuanã) e
  Sagrada Família (Colniza) publicam grade. **12 paróquias entram sem nenhum horário.**
- **Comunidades nominadas: 1/15.** Só a Paróquia Santa Catarina de Alexandria (criada em
  15/10/2024) publica a lista — 12 comunidades com a distância até a sede (até 64 km, no Distrito de
  Filadélfia). Nas demais gravei apenas a matriz.

## Precisa de validação humana

1. **Paróquia Nossa Senhora Auxiliadora (Rondolândia)** — existência confirmada só pela Receita.
   Prioridade 1.
2. **Nome da paróquia de Aripuanã/Centro**: a lista do site diz "Paróquia São Francisco"; o texto
   histórico da própria ficha e o cadastro da Receita dizem **"Paróquia São Francisco de Assis"**.
   Adotei o nome completo.
3. **Paróquia São Pedro Apóstolo (Juruena)** — a ficha avisa que *"no seu decreto de criação não se
   dá a esta circunscrição o privilégio de Igreja Matriz, tanto é que onde está a sede da Paróquia
   hoje em dia é na Comunidade São Sebastião"*. Marquei "Comunidade São Sebastião" como
   `isMatriz: true` por ser a sede de fato. Conferir se hoje já há matriz própria.
4. **Endereço da Paróquia Santíssima Trindade (Nova União/Cotriguaçu)**: a ficha diz "Rua Principal,
   s/nº, centro"; a Receita diz "Rua 7 de Setembro, s/n". Usei o da Receita.
5. **Endereço da Paróquia Santa Catarina de Alexandria**: a ficha diz "Módulo 06"; a Receita diz
   "Setor J". Usei "Módulo 06" (da ficha) em `neighborhood`.
6. **Número da Paróquia N. Sra. da Paz**: ficha = "Rua dos Ipês, 382 S"; Receita = "IPE S/N".
   Usei o da ficha.
7. **Duas paróquias sem nenhuma ficha de conteúdo no site** — São Rafael (Aripuanã, Jardim Planalto)
   e São Sebastião (Conselvan, Aripuanã): a página existe mas só tem o título. Ambas são novas
   (2022, pela Receita). Todo o dado delas vem da Receita.
8. **Comunidade Santa Luzia (Paróquia Santo Agostinho, Juína)** — citada no texto de criação da
   paróquia e numa notícia de missão jovem de 2024, mas não há lista publicada. Gravei como `media`.
   O texto também cita "Nossa Senhora da Paz" como comunidade de Santo Agostinho, mas essa virou
   paróquia própria em 2015 — **não** a repeti como comunidade.
9. **Grade da Paróquia Sagrada Família (Colniza)**: a quinta-feira às 19h30 está rotulada
   "Adoração ao Santíssimo Sacramento" e a quarta "Missa em honra a São José". Gravei a quinta como
   `ADORATION` (pode haver missa em seguida, a fonte não diz).
10. **Seminário Sagrado Coração de Jesus** (Várzea Grande/MT, filial `02452683001115`) aparece no
    CNPJ da diocese mas **não entra** como paróquia — fica fora do território da diocese e não é
    paroquial.
11. As fichas históricas citam **três "paróquias desmembradas"** (N. Sra. Aparecida de Cotriguaçu ←
    São Pedro de Juruena; Santíssima Trindade ← Cotriguaçu; N. Sra. da Paz ← Santo Agostinho) —
    todas já estão na lista, nenhuma duplicata.
