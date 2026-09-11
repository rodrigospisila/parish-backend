# Diocese de Palmares (PE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-11
- **Arquivo**: `paroquias/PE/palmares.json`
- **Cobertura**: **25 / 25 paróquias (100%)**. As 2 quase-paróquias e as 2 áreas pastorais que a
  diocese declara **não estão publicadas em lugar nenhum** e ficaram de fora.
- **Comunidades**: 25 (só as matrizes) · **Horários fixos**: 2, ambos `baixa`

## ⚠️ O domínio antigo caiu e virou site de apostas

`dioceses.json` registra o site da Diocese de Palmares como **`http://diocesepalmares.com.br`**.
Esse domínio **não é mais da diocese**: hoje devolve um WordPress em inglês intitulado
*"OnaBet Cassino 2026 Experiência Digital Segura"*, com páginas `/responsible-gambling/`,
`/terms-of-use/` e `/go/`. É o mesmo padrão de Botucatu (SP) descrito no README.

O **site oficial vivo é `https://diocesedepalmares.com.br`** (com o "de"), encontrado por busca.
Está no ar, atualizado (rodapé "Copyright © 2026", data do dia no cabeçalho) e completo.
O `notes` do bloco `diocese` deste JSON registra a troca. **`dioceses.json` precisa ser corrigido —
não foi alterado aqui porque a tarefa proibia mexer em outros arquivos.**

Curiosidade: o e-mail que a própria diocese publica no rodapé ainda é
`contato@diocesepalmares.com.br`, no domínio perdido — provavelmente **também já não funciona**.

## Fontes principais

| Fonte | URL | O que deu |
|---|---|---|
| Paróquias (lista por forania) | `https://diocesedepalmares.com.br/paroquias/` | as 25 paróquias em 5 foranias, com cidade |
| 25 páginas de paróquia | `https://diocesedepalmares.com.br/paroquia/<slug>/` | pároco (com data de posse), vigário, diácono, endereço da matriz, telefone, e-mail, **data de fundação** e festa do padroeiro |
| Cúria Diocesana | `https://diocesedepalmares.com.br/curia-diocesana/` | endereço, CEP, telefone e caixa postal da cúria |
| Wikipédia | `pt.wikipedia.org/wiki/Diocese_de_Palmares` | "25 paróquias, 2 quase-paróquias e 2 áreas pastorais" em 18 municípios |

Distribuição por forania (bate com os 25): Nossa Senhora Aparecida 5, Beato Eliseu Maneus 4,
Santo Amaro 6, São João Evangelista 6, São João XXIII 4.

## Decisões de modelagem

- **Nome**: a fonte escreve "PARÓQUIA de Nossa Senhora Aparecida"; o "de" foi removido →
  `Paróquia Nossa Senhora Aparecida`.
- **Catedral**: a diocese lista "Paróquia de Nossa Senhora da Conceição dos Montes", mas a própria
  página diz *"Fundação: 28.05.1868 – Catedral Diocesana: 1962"*. Gravada como
  `Catedral Nossa Senhora da Conceição dos Montes`, com nota registrando o nome usado pela diocese.
- **Cidade**: "Barra do Sirinhaém" (endereço da Paróquia São Francisco de Assis) é distrito de
  **Sirinhaém** — virou `neighborhood`, com `city = "Sirinhaém"`.
- **Telefone**: a fonte publica no formato antigo "(0xx81) 3689.1171" → normalizado para
  "(81) 3689-1171". Onde há dois blocos TELEFONE, o segundo foi para `notes`.
- **`foundedYear`**: vem do campo "Fundação" de cada página e é **confiável** (varia de 1621 a 2019,
  sem o padrão de datas repetidas em massa que denuncia data de cadastro no CMS).
- **`zipCode`**: `null` em todas as 25 — a fonte não publica CEP de paróquia.
- **Vigários, diáconos, festa do padroeiro e secretários** foram para `notes` (o schema só tem
  `priestName`).

## Pontos que precisam de validação humana

1. **Corrigir `dioceses.json`**: `website` da Diocese de Palmares deve passar de
   `http://diocesepalmares.com.br` (site de apostas) para `https://diocesedepalmares.com.br`.
2. **Faltam 2 quase-paróquias e 2 áreas pastorais.** A diocese as declara (via Wikipédia) mas não
   as publica. Sem elas, 4 lugares de culto ficam fora do app.
3. **A diocese não publica horário de missa nenhum.** Os agregadores também quase não têm: a
   varredura dos 18 municípios no `horariodemissa.com.br` achou **2 registros com um horário cada**
   (Sant'Ana/Catende, sábado 19h; Nossa Senhora das Dores/Belém de Maria, quinta 19h) e
   `missas.com.br/pernambuco/palmares` responde "Nenhum horário cadastrado". Ambos entraram como
   `baixa`. **Palmares entra em produção sem horário** — é a diocese mais pobre em grade das quatro
   desta rodada.
4. **Sem CEP em nenhuma paróquia** (25/25). Como todas são filiais do CNPJ da mitra, o truque do
   `minhareceita.org` (README) deve fechar CEP e endereço de todas de uma vez.
5. **E-mails com problema**: `paróquia_cortes@hotmail.com` (São Francisco de Assis, Cortês) tem
   acento e é inválido; São José da Coroa Grande publica dois endereços separados por barra
   (`parokiadsaojose@bol.com.br/ parokiadsaojose@hotmail.com.br`) — só o primeiro foi gravado.
6. **Datas de posse antigas** sugerem que a lista de párocos pode estar defasada: várias posses são
   de 2012–2015 e só uma é de 2025 (São José/Joaquim Nabuco). Vale conferir num anúncio recente de
   nomeações.
7. **Nenhuma comunidade/capela publicada** — o arquivo tem só as 25 matrizes.
