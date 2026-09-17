# Relatório — Diocese de Guarabira (`guarabira`, PB)

Pesquisa em 11/09/2026. **É a circunscrição mais frágil desta rodada: o site oficial estava fora do
ar e não houve como usar fonte oficial direta.**

## O que aconteceu com o site oficial

`https://www.diocesedeguarabira.com.br/` (e `diocesedeguarabira.com.br`, IP **67.225.205.96**)
**recusa conexão** — `ECONNREFUSED`, HTTP 000 — nas portas 80 e 443, com e sem TLS, por nome e por
IP direto com cabeçalho `Host`. Não é bloqueio de User-Agent nem filtro de rede local: o DNS resolve
normalmente (`dns.google` devolve 67.225.205.96) e o próprio IP não responde. A busca do Google
ainda indexa `/paroquias/regiao-de-guarabira/`, o que indica queda recente.

O **Arquivo da Internet também estava indisponível** no dia (`web.archive.org` devolvendo
"Temporarily Offline" e a API de disponibilidade devolvendo 429), então não deu para recuperar as
capturas.

## Fontes efetivamente usadas

| Fonte | Papel |
|---|---|
| **https://pt.wikipedia.org/wiki/Diocese_de_Guarabira** | Lista completa por forania: 8 foranias, **39 paróquias e 2 áreas pastorais em 32 municípios**, com referência à própria diocese. Bate com o número que o site da diocese publica. |
| https://www.horariodemissa.com.br | **Corroborou 14 paróquias** e trouxe endereço e telefone delas. |
| catholic-hierarchy.org / gcatholic.org | Cúria e bispo. O gcatholic ainda registra "24 parishes" — número antigo, não serve. |

## Cobertura

| Métrica | Valor |
|---|---|
| Entradas | **41** — 39 paróquias e 2 áreas pastorais |
| Municípios | 32 |
| Confiança | **14 `media`** (Wikipédia + agregador concordando) e **27 `baixa`** (só Wikipédia) |
| Com endereço e telefone | 14 |
| Com CEP / e-mail / pároco / ano | **0** |
| Comunidades | 0 |
| Horários fixos | **24**, em 6 paróquias — todos `baixa` |

Bispo: **Dom Edilson Soares Nobre** (desde 2026). Cúria: Rua Dr. Sales, 42 – Centro, 58200-000
Guarabira/PB, (83) 3271-4242, diocgba@hotmail.com.

## Precisa de validação humana — prioridade máxima

1. **Refazer o arquivo inteiro quando `diocesedeguarabira.com.br` voltar**, ou pelo Arquivo da
   Internet quando ele voltar (a URL conhecida da listagem é
   `https://www.diocesedeguarabira.com.br/paroquias/regiao-de-guarabira/`, com uma página por
   forania). **27 das 41 entradas estão como `baixa` e não entram em produção** do jeito que estão.
2. **`Alagoa Nova` provavelmente é erro da Wikipédia.** O artigo inclui Alagoa Nova na lista de
   municípios da Diocese de Guarabira, mas **não lista nenhuma paróquia lá** — e a
   `Paróquia de Santa Ana (Alagoa Nova-PB)` consta da **Forania Brejo da Diocese de Campina Grande**
   (ver `PB/campina-grande.json`). A ficha do horariodemissa.com.br para Alagoa Nova foi
   **descartada** aqui. Confirmar a qual diocese pertence Alagoa Nova.
3. **`Logradouro` aparece duas vezes na Wikipédia** e de formas diferentes:
   - "Paróquia São Francisco de Assis – **Logradouro – Cacimba de Dentro**" (Forania de Araruna) —
     gravada com `city: "Cacimba de Dentro"` e `neighborhood: "Logradouro"` (distrito);
   - "**Área Pastoral São Sebastião – Logradouro**" (Forania de Pirpirituba) — gravada com
     `city: "Logradouro"` (o município homônimo, que está na lista de municípios da diocese).
   Conferir se são mesmo dois lugares distintos.
4. **Distritos de Bananeiras**: "Paróquia Santa Luzia – **Tabuleiro**" e "Paróquia Nossa Senhora da
   Boa Viagem – **Roma**" foram gravadas com `city: "Bananeiras"` e o distrito em `neighborhood`.
5. **"Belém"** — o artigo da Wikipédia linka para *Belém do Pará* por erro de wikilink; o município
   correto é **Belém/PB**, que foi o gravado.
6. **Nomes divergentes entre a Wikipédia e o agregador** (mantive o da Wikipédia, casei o contato):
   - Serra da Raiz: "Paróquia Santuário Nosso Senhor do Bom Fim" x "Paróquia Nosso Senhor do Bomfim";
   - Duas Estradas: "Paróquia Sagrado Coração de Jesus" x "Igreja do Sagrado Coração de Jesus".
7. **Sem nenhum dado de contato para 27 paróquias** e sem CEP, e-mail, pároco ou ano de criação para
   nenhuma das 41.
