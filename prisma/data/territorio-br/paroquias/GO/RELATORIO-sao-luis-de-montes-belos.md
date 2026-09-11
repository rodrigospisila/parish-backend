# Relatório — Diocese de São Luís de Montes Belos (GO)

Pesquisa em 2026-09-11. Arquivo: `sao-luis-de-montes-belos.json`.

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **43** — todas `alta` |
| Municípios cobertos | **37** (bate com o número que a diocese divulga) |
| Comunidades/capelas | **328** (43 matrizes + 285 capelas/comunidades), todas `alta` |
| Horários fixos | **14**, **todos `baixa`** |
| Esperado | 43 na listagem oficial; 42 no texto institucional; 63 no Annuario Pontificio 2021 |
| Cobertura da lista | **100%** |

## Fontes principais

Praticamente tudo veio do site oficial **`https://www.diocesesaoluis.org.br/home/`**:

1. **`/home/paroquias/`** — índice com as 43 paróquias e o link da ficha de cada uma.
2. **`/home/paroquia/<slug>/`** — **43 fichas individuais**, lidas uma a uma. Cada ficha traz
   endereço, CEP, telefone, e-mail, pároco, vigários, diácono permanente, data de fundação,
   **CNPJ** (filial da mitra `01.226.927/____-__`), população da paróquia, distância da sede
   diocesana e, em 39 delas, a **lista nominal de capelas e comunidades** com o setor/fazenda/
   povoado/assentamento de cada uma.
3. `catholic-hierarchy.org/diocese/dslmb.html` — bispo, área, série histórica.

### Obstáculo de rede e como foi contornado

**O domínio `diocesesaoluis.org.br` não é acessível por `curl` desta máquina**: a conexão TCP na
porta 443 é recusada (`curl: (7) Failed to connect ... Connection refused`), inclusive com
`--resolve` apontando para o IP correto (185.213.81.83, resolvido via DNS-over-HTTPS). **Não é o
bloqueio Fortinet descrito no README** — é recusa de conexão, não filtro HTTP. A saída foi usar
`WebFetch`, que atravessa por outro caminho e funcionou em todas as 46 páginas.

> Nota para os próximos agentes de GO: se `curl` der `Connection refused` (e não 403), não perca
> tempo com `--resolve`; vá direto para `WebFetch`.

## Armadilha de dados encontrada: campos-padrão do formulário

As fichas repetem o **endereço e o CEP da Cúria Diocesana** quando a paróquia não preencheu o
campo:

- **CEP `76050-322`** apareceu em **10 fichas** de cidades diferentes (Anicuns, Avelinópolis,
  Palestina de Goiás, Paraúna, Jandaia, Nazário, Turvelândia, Cezarina, Córrego do Ouro,
  Israelândia, São João da Paraúna). É o CEP da Cúria em São Luís de Montes Belos, confirmado na
  home do site. **Todos foram gravados como `null`**, com a explicação no `notes`.
- **Endereço `Rua Cidade de Goiás, 500 – Centro`** (também da Cúria) apareceu em 2 fichas:
  **Nossa Senhora Aparecida (Anicuns)** e **Nossa Senhora Aparecida (Palestina de Goiás)**.
  Ambos gravados como `null`.

Sem esse filtro, 10 paróquias entrariam no banco com o CEP errado e 2 com o endereço da Cúria.

## Horários — a diocese não publica nenhum

**Nenhuma das 43 fichas tem seção de horário de missa.** Varri o `horariodemissa.com.br` nas 34
cidades da diocese: só 3 paróquias têm grade cadastrada, e nenhuma tem corroboração oficial. Todos
os 14 horários entraram como `baixa`:

| Paróquia | Horários |
|---|---|
| Santa Cruz (São Luís de Montes Belos) | Dom 07:00/08:00/19:30; qua 19:30; qui 15:00; **1ª sexta 19:30** (mensal) |
| Senhor Bom Jesus (Aragarças) | Dom 19:00; qua 19:00; confissão qua a partir das 09:00 |
| São João Batista (Americano do Brasil) | Dom 08:00/19:00; qui 19:00; sex 06:00; **3º sábado 19:00** (mensal) |

Dois deles são **recorrência mensal** ("Primeira Sexta-feira", "Terceiro Sábado"), com a regra
literal preservada em `notes`, conforme a decisão de produto pendente do README.

## Foranias — não foi possível atribuir

O site tem páginas de forania (`/home/forania/<slug>/`) e o mapa do site cita pelo menos cinco:
**Nossa Senhora Aparecida**, **São Sebastião**, **São Paulo da Cruz**, **Senhora Sant'Ana** e
**São Luís Gonzaga**. Mas **as páginas de forania não listam quais paróquias a compõem** — elas
renderizam a mesma barra lateral com as 43 paróquias da diocese inteira. Só deu para extrair o
vigário forâneo de duas (Pe. Warley Barbosa de Oliveira / N. Sra. Aparecida; Pe. João Aurélio
Almeida Alves / São Sebastião). **O campo `forania` ficou `null` em todas as 43 paróquias.**

## Comunidades homônimas — desambiguação aplicada

Numa diocese rural o mesmo padroeiro se repete dentro da mesma paróquia (Firminópolis tem duas
"Comunidade São Sebastião" e duas "Comunidade Santo Antônio"; Palmeiras de Goiás tem duas
"Comunidade São Pedro"). Como o importador identifica a comunidade pelo nome, elas colidiriam.
**Sempre que houve colisão dentro da mesma paróquia, o local foi acrescentado ao `name`**
(ex.: `Comunidade São Sebastião – Povoado Campo Grande`), mantendo o `neighborhood` intacto.
**29 comunidades** foram renomeadas assim, em 13 paróquias.

## Precisa de validação humana

1. **Telefones com 8 dígitos e prefixo de celular** (provável 9 faltando):
   - Divino Pai Eterno (Cachoeira de Goiás): `(64) 8456-0944`
   - Senhor Bom Jesus e São Miguel Arcanjo (Doverlândia): `(64) 8431-2988`
   Gravados como publicados, sem "corrigir".
2. **E-mails com acento**, que o site publica assim e provavelmente estão errados:
   - Palminópolis: `pnsgpalminópolis@gmail.com` → gravado `pnsgpalminopolis@gmail.com`
   - Acreúna: `paróquia.sao.benedito_@hotmail.com` → gravado `paroquia.sao.benedito_@hotmail.com`
3. **Capela de Baliza listada em Amorinópolis** — a Paróquia Nossa Senhora da Guia (Amorinópolis)
   lista "Capela Nossa Senhora Aparecida – **Baliza**". Baliza é município com paróquia própria
   (Paróquia São Sebastião). Pode ser o povoado "Balizinha" (também listado ali) ou sobreposição.
4. **Comunidade duplicada entre paróquias de Iporá** — "Imaculada Conceição – Vila Itajubá" consta
   como comunidade da Paróquia **São José**, mas a Paróquia **Nossa Senhora da Imaculada
   Conceição** tem sede na Vila Itajubá. Provável resíduo do desmembramento de 2021.
5. **Pe. Talisson Mendes Lopes** aparece como **pároco de Diorama** e como **vigário da Paróquia
   São José (Iporá)** ao mesmo tempo. Confirmar qual é o ofício atual.
6. **Nove sacerdotes acumulam duas paróquias** (é a norma numa diocese rural de 37 municípios com
   ~40 padres): Jorge Luiz Julio Ferreira (Cachoeira de Goiás + Aurilândia), Welliton Elias da
   Costa (Jandaia + Palminópolis), Newton Neri de Oliveira (Ivolândia + Moiporá), Divino Monteiro
   de Oliveira (Jaupaci + Israelândia), Marcus Vinícius Alves Santiago (Paraúna + São João da
   Paraúna), Silas Bruno Ferreira dos Santos (Bom Jardim de Goiás + Baliza). Dado correto, só
   registrado para não parecer erro.
7. **Fichas sem CNPJ**: N. Sra. Aparecida (São Luís de Montes Belos), N. Sra. Aparecida (Anicuns)
   e N. Sra. da Imaculada Conceição (Iporá) — as três mais recentes (2020, 2024 e 2021).
8. **Fichas sem e-mail**: N. Sra. Aparecida (São Luís de Montes Belos), N. Sra. Aparecida
   (Anicuns), N. Sra. da Piedade (Diorama), São José (Iporá), Santa Bárbara, São Sebastião
   (Palmeiras de Goiás).
9. **Quase-paróquias promovidas?** — três e-mails oficiais ainda usam prefixo `qp` ou `quase`:
   Jaupaci (`qpsantoantonio@`), Moiporá (`qpsaosebastiaomoipora@`) e Avelinópolis (`quasepnsa@`).
   A diocese as lista como "Paróquia"; o nome oficial foi mantido.
10. **Divergência de contagem** — o texto institucional (e a Wikipédia) diz "42 paróquias em 37
    municípios"; a listagem oficial traz **43**. A diferença é quase certamente a Paróquia Nossa
    Senhora Aparecida de **Anicuns**, criada em **13/10/2024**. Já o Annuario Pontificio (2021)
    registra **63** "parishes", número muito acima — o Anuário deve contar comunidades e
    quase-paróquias. Adotado o número da diocese.
11. **Santuário Diocesano de Nossa Senhora Aparecida (BR-158, km 38)** — a própria diocese o lista
    como **comunidade** da Paróquia São João Batista (Bom Jardim de Goiás), não como jurisdição
    separada. Foi respeitado, mas vale conferir se tem reitor próprio.
12. **Telefone repetido** — `(62) 3695-1196` é publicado pela Paróquia São Sebastião (Adelândia) no
    site oficial e, pelo agregador, atribuído também à Paróquia São João Batista (Americano do
    Brasil). Provável erro do agregador; prevaleceu o oficial em ambos os casos.
