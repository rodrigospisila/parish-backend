# Diocese de Salgueiro (PE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-18
- **Arquivo**: `paroquias/PE/salgueiro.json`
- **Cobertura**: **30 / 30 paróquias (100%)**, todas `alta`, + 3 áreas pastorais (entram como
  unidade própria, `status: nao-paroquial` + `loadAsParish: true`, e não contam em `parishesFound`)
- **Comunidades**: 31 (30 igrejas-sede + a Igreja Sagrada Família de Cabrobó) — a diocese **não
  publica capelas**
- **Horários fixos**: 207 — **81 `alta`, 78 `media`, 48 `baixa`** (131 missas, 49 confissões,
  27 adorações). **31 das 33 unidades têm grade oficial**; sem nenhum horário: as áreas pastorais
  Nossa Senhora de Fátima (Parnamirim) e São Pedro Apóstolo (Sipaúba).

## Fontes principais

| Fonte | URL | O que deu |
|---|---|---|
| Fichas de paróquia (33) | `https://diocesedesalgueiro.org.br/paroquia/<slug>/` | ano de criação, telefone, e-mail, expediente da secretaria, **confissões e adoração**, endereço/CEP, história, clero e **grade de missas em repeater** |
| WP REST API | `/wp-json/wp/v2/paroquia?per_page=100` | listagem canônica (`X-WP-Total: 33`), **`modified` por ficha** e a taxonomia `local_paroquia` (foranias São Marcos, São Mateus e São Lucas) |
| Horários de Missas | `/horarios-de-missas/` | grade agregada das 31 unidades — bateu linha a linha com as fichas individuais (usadas como fonte primária) |
| Bispo diocesano | `/bispo-diocesano/` | Dom José Vicente Pinto **de** Alencar da Silva, ordenado bispo em 03/06/2023, posse em 01/07/2023 |
| Mapa das OSC / IPEA | `https://mapaosc.ipea.gov.br/api/api/osc/busca_avancada/lista/200/0?avancado=…` | prova de completude (26 paróquias com CNPJ próprio nos 15 municípios) |
| ViaCEP | `https://viacep.com.br/ws/<cep>/json/` | validação dos 16 CEPs publicados |
| Wikipédia / catholic-hierarchy | — | 21 e 20 paróquias (ambos defasados) |

### Atualidade

Site WordPress 6.7.1 (tema Parresia + Elementor Pro + *Dynamic Content for Elementor*). Critério:
ficha alterada há ≤ 12 meses (≥ 18/09/2025) → horário `alta`; mais velha → `media`.

- **14 fichas** alteradas entre 03/11/2025 e 17/07/2026 → `alta`
- **19 fichas** entre 25/10/2024 e 14/08/2025 → `media`. As 9 fichas paradas em **25/10/2024** são
  o bloco da carga inicial do site; nenhuma é anterior à pandemia, então nenhuma foi rebaixada por
  esse critério.

### Truques de coleta

- Mesma pilha da Diocese de Pesqueira: a grade de missas é um **repeater ACF** renderizado pelo
  *Dynamic Content for Elementor*, com as colunas identificadas pelo id do item Elementor —
  `d17931f` = tipo, `9787391` = dia, `53c071b` = hora, `41a3150` = **observação**. Só o parser por
  coluna preserva a ligação entre a linha e a observação ("Igreja Sagrada Família", "Dia da Graça",
  "Votiva ao Padroeiro", "Estátua do Pe. Cícero").
- **O bloco "Atendimento" da ficha vale tanto quanto a grade**: é ali que estão *Confissões* e
  *Adoração* de quase todas as paróquias — 76 dos 207 horários saíram dele.
- Todos os e-mails vêm ofuscados pelo Cloudflare (`data-cfemail`) e foram decodificados. Cada
  paróquia tem e-mail próprio no domínio da diocese (`<cidade>.<padroeiro>@diocesedesalgueiro.org.br`).
- A **página-resumo `/horarios-de-missas/` não estava quebrada** (ao contrário de Campo Maior): as
  31 grades conferem com as fichas. Ainda assim a grade gravada veio da ficha individual.

### Prova de completude (CNPJ)

Em Salgueiro **cada paróquia tem CNPJ próprio** (raízes distintas), então a varredura de filiais da
mitra não se aplica — não há sequer registro de "MITRA DIOCESANA DE SALGUEIRO" na base. A busca
avançada do Mapa das OSC/IPEA por razão social (`PAROQUIA`, `IGREJA`, `MITRA`) nos **15 municípios**
da diocese devolveu **26 paróquias católicas**, todas com ficha no site e **nenhuma fora dele**.
Faltam na base do IPEA (mas existem no site, com CNPJ ainda não espelhado): Santa Cruz/Salgueiro,
Santa Teresinha/Moreilândia, N. Sra. do Carmo/Ouricuri e N. Sra. de Fátima/Ouricuri. As três áreas
pastorais também não têm CNPJ. `parishesExpected` foi fixado em **30**, o número do site.

Wikipédia (21) e catholic-hierarchy (20, estatística de **2014** — a última publicada) não contam as
**9 paróquias criadas de 2021 a 2024**: São Francisco de Assis/Salgueiro, São Sebastião/Umãs,
N. Sra. do Perpétuo Socorro/Serrolândia, N. Sra. das Graças/Rancharia, Bom Jesus da Lapa/Timorante,
Imaculado Coração de Maria/Bodocó, São Francisco de Assis/Exu, N. Sra. de Fátima/Morais e
N. Sra. de Fátima/Ouricuri.

## Agregadores

Não foram necessários: a diocese publica grade oficial de 31 das 33 unidades, com sinal de
atualidade. Nenhum horário do dataset vem de agregador.

## Comunidades

A diocese **não lista capelas** em lugar nenhum. Cinco fichas informam só a **contagem**, no texto
histórico, sem nomes — registrada em `notes` de cada paróquia:

| Paróquia | Comunidades declaradas |
|---|---|
| N. Sra. do Perpétuo Socorro — Ipubi | 25 |
| Imaculado Coração de Maria — Bodocó | 20 |
| São Sebastião — Umãs (Salgueiro) | 18 |
| N. Sra. do Perpétuo Socorro — Serrolândia (Ipubi) | 16 rurais |
| Santa Teresinha do Menino Jesus — Moreilândia | 12 |

Só uma comunidade nomeada entra no dataset: a **Igreja Sagrada Família** de Cabrobó (co-padroeira,
inaugurada em 1974), que recebe 4 das 5 missas da paróquia.

## Precisa de validação humana

1. **CEPs inválidos ou trocados** (5 registros gravados como `null`):
   - **Araripina** — as 4 fichas do município publicam `56280-000`, que **não existe no ViaCEP**
     (Araripina usa CEP por logradouro): Imaculada Conceição, N. Sra. das Dores, Bom Jesus/Nascente,
     N. Sra. das Graças/Rancharia e N. Sra. de Fátima/Morais.
   - **Cabrobó** — a ficha publica `56140-000`, que é o CEP de **Serrita**; o de Cabrobó é
     `56180-000`.
   - **Serrolândia (Ipubi)** — a ficha publica `56.2600-000` (malformado); gravado `56260-000`,
     o CEP geral de Ipubi.
2. **Paróquia São Francisco de Assis (Salgueiro)** — o campo "Ano de Criação" diz **2021**, mas a
   história na mesma ficha diz "erigida em **2017**". Gravado 2021.
3. **Paróquia N. Sra. de Fátima (Ouricuri)** — o endereço publicado ("Rua Nossa Senhora de Fátima,
   231") é **idêntico em rua e número** ao da Paróquia N. Sra. de Fátima de Morais (Araripina).
   Provável copiar-e-colar numa das duas fichas.
4. **Paróquia N. Sra. do Perpétuo Socorro (Ipubi)** — o texto histórico ainda cita "Pe. José Rogério
   e Pe. Fabrício" como pároco e vigário; o campo Clero (atualizado) traz Pe. Orlando Natel Leite.
   Foi usado o campo Clero.
5. **Slug enganoso no site**: a ficha da paróquia de **Serrolândia** tem o slug
   `paroquia-nossa-senhora-do-perpetuo-socorro-ipubi`, e a da sede de Ipubi tem
   `…-ipubi-pe`. Se alguém reconferir pela URL, é fácil trocar as duas.
6. **48 horários `baixa`**, quase todos por recorrência mensal — "1ª sexta-feira do mês" (20
   paróquias), "dia 14", "dia 20", "dia 8", "dia 04", "dia 29", "dia 18", "dia 30", "1º e 2º
   domingo", "1, 3 e 4º domingo", "2º domingo", "4ª quinta-feira do mês". É a norma no sertão, não a
   exceção; a regra literal está em `notes`. Dois horários têm `dayOfWeek: null` (datas fixas do
   mês: Bom Jesus dos Aflitos/Exu, dia 14 às 18h).
7. **5 confissões derivadas** em São Pedro Apóstolo (Barra de São Pedro): a ficha só diz
   "todos os dias, exceto a segunda-feira, no mesmo horário de atendimento da secretaria" — a grade
   foi derivada do expediente e ficou toda em `baixa`.
8. **Áreas pastorais sem horário**: N. Sra. de Fátima (Parnamirim) e São Pedro Apóstolo (Sipaúba,
   Bodocó). A segunda só publica o clero — sem endereço, telefone nem CEP.

## Correção sugerida para `dioceses.json` (NÃO aplicada)

- `bishopName`: está **"Dom José Vicente Pinto del Alencar da Silva"**; o site oficial e a Wikipédia
  escrevem **"Dom José Vicente Pinto de Alencar da Silva"** (*de*, não *del*).
- `email`: está `null`; a cúria publica **curia@diocesedesalgueiro.org.br** no rodapé do site.
- `address`: está "Avenida Aurora de Carvalho Rosa 2253, Santo Antonio"; o rodapé do site diz
  **"Avenida Aurora de Carvalho Rosa, 2253 – Centro"**.
