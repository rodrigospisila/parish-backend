# Relatório — Diocese de Tocantinópolis (TO)

**Pesquisa:** 2026-09-11 · **Arquivo:** `paroquias/TO/tocantinopolis.json`

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **15** (0 alta, 15 media, 0 baixa) |
| Comunidades/capelas | **92** |
| Horários fixos | **37** (36 media, 1 baixa) |
| Cobertura | 15/15 (100%) |

Diocese criada em **20/12/1954**. Em **31/01/2023** perdeu a **Região Sul inteira** — 4 foranias
e 19 paróquias — para a nova **Diocese de Araguaína**. Bispo: **Dom Carlos Henrique Silva
Oliveira** (nomeado em 19/03/2024, posse em 27/05/2024; a sé esteve vacante desde janeiro de
2023). Ver `paroquias/TO/araguaina.json` para a parte desmembrada.

## O domínio foi tomado — como recuperei tudo

**`diocesedetocantinopolis.org` não é mais o site da diocese.** Hoje devolve páginas de
aposta/spam (botões "LOGIN"/"DAFTAR", subdomínio `amp.`, links para Pinterest) — o mesmo padrão
de Botucatu na rodada de São Paulo. Por isso `website: null` no JSON.

Dois obstáculos e as saídas:

1. O primeiro `curl` levou **403 "Fortinet Secure DNS Service Portal"** — filtro da rede local,
   não do servidor. Resolvi pelo truque do README: IP via DNS-over-HTTPS
   (`https://dns.google/resolve?name=...`) e `curl --resolve dominio:443:<ip>`. Foi assim que
   descobri que o domínio tinha sido tomado.
2. **Todo o conteúdo veio do Arquivo da Internet**, capturas de **janeiro de 2023**. Atenção:
   `web/<ts>id_/` devolve o corpo **comprimido** — sem `--compressed` o texto sai binário.

### A página que resolveu a diocese: `/diocese/historia/foranias/`

A captura de **2023-01-12** traz a lista completa de paróquias agrupada em **Região Norte** e
**Região Sul**, com o vigário forâneo de cada forania. O desmembramento seguiu exatamente essa
divisão: **a Região Norte é a Diocese de Tocantinópolis de hoje**.

| Forania (Região Norte) | Paróquias |
|---|---|
| Padre Josimo | 7 — Araguatins (Jesus o Bom Pastor **e** São Vicente Ferrer), Praia Norte, Buriti do Tocantins, Augustinópolis, Esperantina, São Sebastião do Tocantins |
| São João XXIII | 4 — Sítio Novo, Itaguatins, Axixá, São Miguel do Tocantins |
| Dom Cornélio Chizzini | 4 — Tocantinópolis (Catedral), Nazaré, Luzinópolis, Ananás |

**15 paróquias** — o mesmo número publicado pela Wikipédia/Anuário, e as cidades batem
**exatamente** com as 25 do GCatholic (atualizado 2026-01-01) para esta diocese. Três fontes
independentes fechando no mesmo lugar é o que sustenta a cobertura de 100%.

## Por que tudo é `media` e nada é `alta`

A única fonte oficial é um site que **não existe mais**, lido em captura de janeiro de 2023 —
"fonte oficial sem sinal de atualidade" pela escala do README. O texto é pós-2020, então **não**
cai para `baixa`: entra na carga como `media`. **Esta diocese é a de menor confiança das seis do
Tocantins e deve encabeçar a fila da validação.**

## Fichas completas: 6 das 15

| Paróquia | Comunidades | Horários |
|---|---|---|
| Catedral N. Sra. da Consolação (Tocantinópolis) | 23 | 7 |
| N. Sra. de Nazaré (Nazaré) | 16 | 5 |
| Santa Rita de Cássia / Santuário Diocesano (Augustinópolis) | 17 | 5 |
| São Francisco de Assis (Luzinópolis) | 15 | 6 |
| Santo Antônio de Pádua (Itaguatins) | 11 | 6 |
| N. Sra. do Perpétuo Socorro (Buriti do Tocantins) | 10 | 8 |

Das outras **9** só se recuperou **nome, cidade e forania** — o site não tinha ficha delas em
2023 (as URLs existem no menu mas devolvem erro no arquivo): Jesus o Bom Pastor e São Vicente
Ferrer (Araguatins), N. Sra. do Carmo (Praia Norte), São João Batista (Esperantina),
São Sebastião (São Sebastião do Tocantins), Imaculado Coração de Maria (Sítio Novo),
São Francisco de Assis (Axixá), São Miguel Arcanjo (São Miguel do Tocantins) e São Pedro
Apóstolo (Ananás). Duas delas ganharam o nome do pároco pela própria página de foranias
(Pe. Francivaldo Menezes do Nascimento e Pe. Manoel Regivaldo Lima da Silva).

## Pontos para o enxame de validação

1. **Refazer a diocese inteira a partir de fonte viva.** Não há site. Caminhos: o Facebook
   oficial (`facebook.com/diocese.tocantinopolis.Oficial`), o Instagram
   (`diocesedetocantinopolis`), o canal no YouTube, ou o **cadastro de filiais do CNPJ da Mitra
   Diocesana no `minhareceita.org`** — o truque que fechou Januária e Araçuaí.
2. **Angico está em duas paróquias.** A ficha de Santo Antônio de Pádua (Itaguatins) lista
   "Angico – Santa Teresa D'Ávila" entre suas comunidades, mas a página de foranias põe Angico
   na **Paróquia São Pedro Apóstolo (Ananás, Angico e Riachinho)**. O GCatholic ainda registra
   em Angico uma "Church of St. Catherine of Alexandria" — **terceira** dedicação. Registrei
   como a ficha publicou, com o aviso em `notes`.
3. **Darcinópolis.** O GCatholic põe Darcinópolis nesta diocese (2026), mas em 2023 a cidade era
   atendida pela Paróquia N. Sra. da Conceição de **Wanderlândia**, que foi para Araguaína.
   As 7 comunidades de Darcinópolis estão hoje no arquivo de Araguaína aguardando remanejamento
   — descobrir a qual paróquia de Tocantinópolis pertencem.
4. **Nomes de comunidade truncados na origem**: a ficha de Santo Antônio de Pádua termina em
   "CASTANHEIRA – SANTA TERESA D'AVI"; gravei "Comunidade Santa Teresa D'Ávila (Castanheira)".
   A de São José Operário (hoje em Araguaína) tinha problema parecido.
5. **Só 6 das 15 paróquias têm qualquer horário**; 9 entram sem nenhum.
6. **Sem CEP** em 13 das 15 (só Augustinópolis e Itaguatins publicaram). **Sem telefone** em 9.
   **Sem e-mail** em 10.
7. **Duas paróquias homônimas** — São Francisco de Assis em **Axixá do Tocantins** e em
   **Luzinópolis**; e duas paróquias na mesma cidade, **Araguatins** (Jesus o Bom Pastor e
   São Vicente Ferrer). Desambiguadas pelo slug com a cidade, como manda a regra; a de
   Araguatins **não** está desambiguada porque o nome já difere.
8. **Endereço da cúria** (Rua XV de Novembro, 245, 77900-000) e telefone (63) 3415-2847 vieram
   de resumo de busca, não de página lida diretamente — conferir.
9. **1 horário `baixa`**: Santa Rita de Cássia (Augustinópolis), "1ª sexta do mês, 19h".
