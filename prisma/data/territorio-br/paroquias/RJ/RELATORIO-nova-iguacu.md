# Relatório — Diocese de Nova Iguaçu (RJ)

Pesquisa em 2026-09-11. Arquivo: `nova-iguacu.json`.

## Resumo

| | |
|---|---|
| Paróquias encontradas | **52** (52 `alta`, 0 `media`, 0 `baixa`) |
| Paróquias esperadas | 52 (catholic-hierarchy.org, dados de 2023) |
| Comunidades/capelas | **384** (todas `alta`, fonte oficial) |
| Horários fixos | **67** (todos `baixa`), cobrindo 12 das 52 paróquias |
| Cobertura de paróquias | **100 %** |

## Fontes principais

O site oficial resolveu a diocese inteira, sem precisar de agregador para a lista.

- `https://diocesedenovaiguacu.org.br/paroquias/` — índice "Paróquias por Foranias" (10 foranias em 5 vicariatos).
- `https://diocesedenovaiguacu.org.br/forania1/` … `/forania10/` — **a fonte boa**: cada página traz, por paróquia,
  nome, endereço, CEP, bairro, município, telefone, e-mail, equipe pastoral completa (pároco, vigários, diáconos)
  e a **lista nominal das comunidades**, com a matriz marcada.
- `https://diocesedenovaiguacu.org.br/wp-json/wp/v2/pages?per_page=100` — usada para checar atualidade: as páginas
  de forania têm `modified` entre **2025-03-08 e 2026-03-15**; nenhuma está parada. Por isso `confidence: alta`.
- `https://www.catholic-hierarchy.org/diocese/dnoig.html` — 52 paróquias, 1.388.000 católicos, 79 presbíteros (2023).
- `https://www.horariodemissa.com.br/search.php?uf=RJ&cidade=…` — único caminho para horários (ver abaixo).

Estrutura confirmada: Vicariato Sede (Foranias 1–2), Metropolitano (3–4), Sul (5–6), Leste (7–8), Oeste (9–10).
Municípios cobertos: Nova Iguaçu, Mesquita, Nilópolis, Belford Roxo, Queimados, Japeri e Paracambi.
O campo extra `forania` foi mantido em cada paróquia (o importador ignora chaves desconhecidas).

## Truques que funcionaram / falharam

- O site responde normalmente a `curl` com UA de Chrome; **não** precisou de DoH nem de Arquivo da Internet.
- A API REST do WordPress (`/wp-json/wp/v2/pages`) deu o total (`X-WP-Total: 28`) e o `modified` de cada página —
  é o jeito barato de decidir entre `alta` e `media`.
- **Armadilha encontrada**: o site tem duas páginas individuais de paróquia,
  `/paroquiasantoantoniodejacutinga/` e `/paroquia-fatima-e-jorge/`. **As duas são gabaritos não preenchidos**:
  texto *Lorem Ipsum* em português ("No menu Inserir, as galerias incluem itens…"), o mesmo endereço,
  telefone e e-mail nas duas (os da Catedral), a mesma seção "ATIVIDADES DESENVOLVIDAS" falando de uma ASPIC
  de Jardim Gramacho (que é de outra diocese) e horários de exemplo repetidos — "Domingo: 7h / 9h / 19h" na matriz
  e "Domingo: 09h" em *todas* as comunidades, inclusive comunidades repetidas com endereços trocados.
  **Nada dessas duas páginas foi aproveitado.** Se a diocese um dia preencher esse gabarito para as 52 paróquias,
  vira a melhor fonte de horários do RJ — vale revisitar.

## Horários — por que todos ficaram `baixa`

A diocese não publica grade de missas em lugar nenhum do site (os posts de horário que existem são de datas
especiais: Quarta-feira de Cinzas 2023, Semana Santa 2023 — excluídos por regra).
Os 67 horários gravados vêm **só** de `horariodemissa.com.br`, fonte única não oficial e sem data de atualização
por registro, o que pela escala do README é `baixa`. Não há segunda fonte para corroborar:

- `missas.com.br` **só cobre o Rio Grande do Norte** — não serve para RJ (verificado em 11/09/2026).
- Os domínios próprios das paróquias que aparecem nos e-mails oficiais estão **todos mortos** (NXDOMAIN em
  11/09/2026): `senhoradasgracasmesquita.com.br`, `nsconceicaonil.com.br`, `santoantoniojacutinga.com`,
  `saosimaorio.com`; `igrejafatimaejorge.com.br` resolve mas não completa conexão.

Cobertura dos horários no agregador, por cidade (igrejas listadas / com grade preenchida):
Nova Iguaçu 24/7, Mesquita 12/2, Nilópolis 8/1, Belford Roxo 20/1, Queimados 8/1, Japeri 6/1, Paracambi 4/0.

Paróquias com horário: Santo Antônio de Jacutinga (a única com confissões completas), Sagrado Coração de Jesus,
São Miguel Arcanjo e São Pedro, Santo Antônio da Prata, Cristo Ressuscitado, N. Sra. de Lourdes (todas de Nova
Iguaçu), São José Operário e N. Sra. de Fátima/Edson Passos (Mesquita), São Sebastião/Olinda (Nilópolis),
São Simão (Belford Roxo), N. Sra. de Fátima/Vila do Tinguá (Queimados), N. Sra. da Conceição (Japeri).

**Omitidas de propósito** (recorrência mensal, não cabe em `MassSchedule`): as missas de "1º/2º/3º/4º domingo" e
"1º/2º sábado" das comunidades de N. Sra. de Lourdes e de São Simão, e as de "todo dia 13" (N. Sra. de Fátima,
Edson Passos) e "todo dia 18" (São Sebastião, Nilópolis).

## Pontos para validação humana

1. **Todos os 67 horários** (`confidence: baixa`) — precisam de confirmação por telefone ou rede social da paróquia.
   A Catedral é o caso mais divergente: o gabarito do site diz "Domingo 7h/9h/19h", o agregador diz "8h/10h/18h"
   e uma notícia da própria diocese de 01/02/2023 anunciava nova programação. **Nenhum dos três foi tratado como
   confiável**; ficou o do agregador, como `baixa`.
2. **Igreja N. Sra. do Perpétuo Socorro e São Judas Tadeu (Rodilândia, Nova Iguaçu)** — a página da Forania 4 a
   lista como comunidade da **Paróquia N. Sra. da Conceição (Rosa dos Ventos)**, mas atendida por presbíteros da
   **Administração Apostólica Pessoal São João Maria Vianney** (uso de ordens). Foi gravada como comunidade dessa
   paróquia, com `notes` explicando, e recebeu os 7 horários que o agregador publica para ela. Se o Parish tratar
   a AAP como circunscrição separada (ela está em `dioceses.json` com slug `sao-joao-maria-vianney`), essa
   comunidade deve migrar para lá.
3. **Comunidades homônimas repetidas na fonte** — a página da Forania 4 lista "São José" duas vezes em N. Sra. da
   Conceição (Rosa dos Ventos) e a da Forania 10 lista "Nossa Senhora Aparecida" duas vezes em São Sebastião
   (Lages, Paracambi). Deduplicadas na gravação (384 comunidades, não 386); podem ser duas comunidades distintas
   de mesmo nome — conferir com a paróquia.
4. **Comunidade desativada omitida**: "Nossa Senhora de Guadalupe (Desativada – Tombada pelo IPHAN)", da Paróquia
   N. Sra. da Conceição (Marapicu). Está na fonte, mas não é lugar de missa.
5. **CEP genérico de Paracambi** — as duas paróquias de Paracambi trazem `26600-000` (CEP de município, não de
   logradouro) porque é o que a fonte publica.
6. **Nome da matriz da Paróquia Santo Antônio de Jacutinga** — o cabeçalho oficial é "PARÓQUIA SANTO ANTÔNIO DE
   JACUTINGA" e a lista de comunidades chama a matriz de "Catedral de Santo Antônio de Jacutinga". Mantivemos os
   dois: `name` da paróquia com prefixo "Paróquia", comunidade-matriz com o nome "Catedral…". Se a convenção do
   Parish for usar "Catedral …" como nome da paróquia, este é o registro a mudar.
7. **Paróquia Santo Antônio da Prata** — a página da forania chama de "Santo Antônio da Prata" e o índice
   `/paroquias/` chama de "Santo Antônio (Prata)"; o agregador chama de "Paróquia Santo Antonio" no bairro Prata,
   enquanto o CEP oficial (26.010-421) é de Parque Rosário. Ficou o nome da forania e o bairro do CEP.
8. **Telefone de São Vicente de Paulo (Belford Roxo)** é celular `(21) 96631-2452` — é o que a fonte publica.
