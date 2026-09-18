# Relatório — Prelazia de Itaituba (PA)

Pesquisa: 18/09/2026. Arquivo: `itaituba.json`.

## Resultado

| | |
|---|---|
| Unidades pastorais | **14** (11 paróquias, 2 áreas pastorais, 1 missão indígena) |
| Confiança das unidades | 13 `alta`, 1 `media`, 0 `baixa` |
| Comunidades | 73 (13 `alta`, 2 `media`, 58 `baixa`) |
| Horários fixos | 41 (29 `alta`, 12 `baixa`) |
| Cobertura | 14/14 — lista fechada por duas fontes independentes |

## Fontes principais

1. **Site oficial — `https://prelaziadeitaituba.com.br`** (plataforma **Cúria Online do Brasil**, a mesma
   da Arquidiocese de Santarém). Está **ativo**: as últimas notícias são de julho de 2026.
   - `paroquias-da-prelazia.php` → 13 fichas (`?relacionado=1..8,11..15`), com pároco, horário de
     atendimento, endereço, cidade, telefone, e-mail, "fundação" e **grade de missa por dia da semana**
     (blocos `<div id='dom'|'seg'|…>`).
   - `historia-da-prelazia.php` → **a fonte mais valiosa**. Página com data de atualização **17/09/2025**
     e uma seção "ESTRUTURA ATUAL" que enumera as 14 unidades, além das datas de ereção de quase todas
     as paróquias e do acordo sobre Castelo de Sonhos.
   - `horarios-de-missa.php` (grade consolidada, idêntica à das fichas), `clero.php`, `contato.php`.
2. **Receita Federal** (via `minhareceita.org`), CNPJ raiz **10.222.560** — achado pelo **Mapa das
   OSC/IPEA** (`tx_razao_social_osc=PRELAZIA`, `cd_municipio=1503606`). Varri as ordens 0001–0060 e
   existem **15, todas ATIVAS**: Cúria + 14 filiais. Deu endereço, CEP, telefone e data de início de
   cada paróquia, **e serviu de prova de completude**.
3. **Portal antigo** `http://prelaziaitb.blogspot.com` (conteúdo de ~2014): endereços, telefones e
   párocos da época (foram para `archived`, não para produção) e — o achado importante — a página
   `p/area-pastoral-tres.html`, com o **histórico da Região Pastoral III e a lista de 46 comunidades
   por distrito**, única lista de comunidades que a prelazia já publicou.
4. `catholic-hierarchy.org/diocese/ditai.html` (erigida 06/07/1988, 177.743 km², 8 paróquias em 2021).
5. `liriocatolico.com.br/horario_missa/dados/uf/PA.json` (agregador; 14 fichas de Itaituba).
6. `horariodemissa.com.br` — verificado e **descartado**: a única ficha da região (Paróquia Santa Luzia,
   Novo Progresso, `igreja.php?k=fHqeL`) é de **16/05/2013** e nem sequer tem grade.

## Como a lista fechou

A seção "ESTRUTURA ATUAL" (17/09/2025) e a Receita batem exatamente:

| | Site (história) | Receita |
|---|---|---|
| Paróquias | 11 | 11 filiais |
| Área Pastoral São Francisco do Tapajós | 1 | filial 0015 |
| Área Pastoral Sagrada Família (Moraes Almeida) | 1 | — (sem CNPJ) |
| Missão Indígena São Francisco do Rio Cururu | 1 | — (sem CNPJ) |

As outras três ordens do CNPJ não são unidades pastorais: a própria Cúria (0001), o **Centro de
Formação São José do Laranjal** (0010) e o **Tribunal Diocesano de Itaituba** (0013).

O Anuário Pontifício 2022 registra 8 paróquias (dado de 2021), número anterior às três paróquias
criadas em agosto/setembro de 2021 — por isso 14 > 8 não é excesso, é atualização.

## Armadilhas encontradas

- **A página de fichas está desatualizada em relação à página de história.** Ela ainda publica como
  "Área Pastoral Miritituba" (`?relacionado=13`) e "Área Pastoral III" (`?relacionado=7`) as duas
  unidades que viraram **Paróquia Nossa Senhora da Conceição** (Miritituba) e **Paróquia Nossa Senhora
  do Perpétuo Socorro** (Campo Verde) em **15/08/2021**. O nome de produção veio da página de história
  + Receita; o nome antigo ficou registrado em `notes`. A Área Pastoral Sagrada Família não tem ficha.
- **Registro-fantasma do CMS.** As páginas `bispos.php` e `clero.php` trazem no topo
  **"Dom Geremias Steinmetz — Posse: 2011"**, e a página de paróquias tem um cartão
  **"Catedral Maria mãe da Igreja — Paranavaí"**. São registros de demonstração da plataforma Cúria
  Online (Paranavaí/PR), **não** dados da prelazia. Não entraram no arquivo. O bispo real é
  **Dom Frei Wilmar Santin, O.Carm.**, como já consta no `dioceses.json`.
- **Telefone malformado na ficha de Castelo de Sonhos**: "(93) 93300-6293 / (93) 93300-6295".
  Usei o da Receita, (93) 3518-1107.
- **"Fundação" da ficha nem sempre é a fundação.** N. Sra. Aparecida (Trairão) traz 23/05/2016, que é a
  data do cadastro da troca de padroeiro (a paróquia é de 16/10/1994); São José Operário traz
  01/01/1985, que é a paróquia antiga de Jamanxinzinho (a atual é de 01/05/2016). Em ambos os casos usei
  a data que a história e a Receita confirmam e expliquei em `notes`.

## Particularidades geográficas registradas

- **Paróquia Santo Antônio de Pádua, Castelo de Sonhos**: `city = "Altamira"` (o distrito pertence ao
  município de Altamira), `neighborhood = "Castelo de Sonhos (distrito)"`. Pastoralmente é de Itaituba
  desde fevereiro de 2012, por acordo entre Dom Capistrano e Dom Erwin Kräutler; a mudança canônica
  formal só se fará quando Castelo de Sonhos virar município. **Não confundir com a Diocese de
  Xingu-Altamira**, que tem o resto do município.
- **Paróquia São José Operário**: `city = "Trairão"` (Agrovila Jamanxim), embora a ficha diga
  "Cidade: Jamanxim".
- **Miritituba**, **Campo Verde** e **Moraes Almeida** são distritos do município de Itaituba; ficaram
  como `city = "Itaituba"` com o distrito em `neighborhood`.

## Precisa de validação humana

1. **Sem nenhum horário publicado** (6 unidades): Santa Luzia (Novo Progresso), Santo Antônio e São
   Pedro (Jacareacanga), N. Sra. da Conceição (Miritituba), N. Sra. do Perpétuo Socorro (Campo Verde),
   Área Pastoral Sagrada Família e Missão do Rio Cururu. Nenhum agregador cobre essas cidades.
2. **As 11 capelas urbanas de Itaituba** (`baixa`) vêm só do Lírio Católico, que **não diz a paróquia**.
   Ficaram penduradas na Área Pastoral São Francisco do Tapajós com nota explicando a provisoriedade —
   podem ser de Sant'Ana, Bom Remédio, Santa Teresinha ou Conceição/Miritituba. Cinco delas repetem o
   telefone **(93) 99126-9592**, que não é o de nenhuma das paróquias com telefone conhecido: descobrir
   de quem é resolve a atribuição das cinco de uma vez.
3. **As 47 comunidades rurais** (`baixa`) vêm do histórico da Região Pastoral III de ~2014, que contava
   48 comunidades. Reparti pelo distrito: o **Distrito II (Miritituba, km 11–25)** foi para a Paróquia
   N. Sra. da Conceição e os **Distritos I, III, IV e V** para a Paróquia N. Sra. do Perpétuo Socorro.
   **A repartição é inferência minha** e está dita na `notes` de cada comunidade.
4. **Paróquia Santa Teresinha**: bairro divergente — "Jardim América / Avenida dos Ypês quadra 10" na
   ficha contra "Jardim Aeroporto / Rua Quarta" na Receita. Pároco ficou `null` porque a ficha repete o
   pároco do Bom Remédio e a página de clero não o confirma.
5. **Área Pastoral Sagrada Família (Moraes Almeida)** é a única unidade `media`: existe apenas na lista
   da página de história, sem ficha, sem CNPJ e sem nenhum outro dado.
6. **Missão Indígena São Francisco do Rio Cururu**: a própria prelazia diz que "nunca foi erigida como
   paróquia". Entrou porque a página "ESTRUTURA ATUAL" a lista como uma das 14 unidades e há igreja com
   celebrações (concluída em 2003). Se a regra do projeto for mais estrita, é a candidata natural a
   `status: "nao-paroquial"`.
7. **Endereços administrativos na Receita**: N. Sra. da Conceição (Miritituba) está registrada no
   endereço da Cúria, e N. Sra. do Perpétuo Socorro (Campo Verde) no mesmo endereço da Área Pastoral São
   Francisco, em Itaituba. Nenhum dos dois é o endereço da matriz — por isso ficaram `address: null`.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `email`: está `null`; o correto é **`prelaziaitb@gmail.com`** (rodapé e página de contato do site).
- `website`: está `http://www.prelaziadeitaituba.com.br`; o domínio responde em **HTTPS** —
  `https://prelaziadeitaituba.com.br`.
- `phone`: além do (93) 3518-2820, a página de contato publica o celular **(93) 99106-1798**.
- `bishopName`: "Dom Wilmar Santin, O. Carm." está correto. **Ignorar** o "Dom Geremias Steinmetz" que
  o site exibe — é registro de demonstração da plataforma.
