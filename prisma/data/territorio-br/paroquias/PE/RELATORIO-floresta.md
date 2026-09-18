# Diocese de Floresta (PE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-18
- **Arquivo**: `paroquias/PE/floresta.json`
- **Cobertura**: **12 / 12 paróquias (100%)**, todas `alta` — uma por município, provada pela
  varredura do CNPJ da mitra
- **Comunidades**: 17 (12 igrejas-sede + 5 igrejas não paroquiais do gcatholic.org)
- **Horários fixos**: **4, todos `baixa`**, e só de uma paróquia (Petrolândia). **A diocese não
  publica horário de missa em lugar nenhum.** Esta é a pior cobertura de horários das cinco
  dioceses desta rodada.

## O problema central: o site oficial está congelado em 2014

`diocesedefloresta.wordpress.com` está no ar e é o site oficial (é o endereço registrado na CNBB
Nordeste 2), mas **o último post é de 16/09/2014** e o menu ainda anuncia a "Agenda
Diocesana-2014". O que ele publica, por município, é a ficha de contato: endereço, telefone,
secretaria paroquial, pároco e congregações religiosas — tudo de 2014.

Por isso, e seguindo a regra de captura antiga do README:

- `phone`, `email` e `priestName` ficaram **`null`** nos 12 registros;
- o telefone e o e-mail foram para **`phoneHistoric` / `emailHistoric`**;
- o pároco de 2014 ficou em **`notes`**, marcado como tal.

Que os párocos mudaram é fato observável: a bio do Instagram oficial de Petrolândia (ativo, posts
até 16/09/2026) diz que o pároco é "Pe. Geraldino de…", enquanto o site diz Pe. Antonio Miglio.

**Endereço e CEP entram nos campos de produção** porque são corroborados pela Receita Federal
(snapshot CNPJ/SRF/MF **2026-05**).

## Fontes principais

| Fonte | URL | O que deu |
|---|---|---|
| Site oficial (12 fichas) | `https://diocesedefloresta.wordpress.com/contatos/<municipio>/` e `/manari-pe/` | **dedicação de cada paróquia**, endereço, telefone, secretaria, pároco e congregações (tudo de 2014) |
| **Receita Federal** | `https://minhareceita.org/108783390001XX` | **prova de completude** + endereço, bairro e CEP atuais de cada paróquia |
| gcatholic.org | `/churches/local/flor2` e `/dioceses/diocese/flor2.htm` | 16 igrejas ("Last updated on 2026.01.01"), 12 paróquias em 31/12/2022 → **as 5 igrejas não paroquiais viraram comunidades** |
| Mapa das OSC / IPEA | `https://mapaosc.ipea.gov.br/api/api/osc/dados_gerais/459238` | **achou a raiz do CNPJ** (a busca por "MITRA DIOCESANA DE FLORESTA" e por "PAROQUIA" nos 12 municípios devolve zero — as paróquias são filiais, e o IPEA só indexa uma delas) |
| ViaCEP | `https://viacep.com.br/ws/…` | corrigiu 3 CEPs inválidos |
| liriocatolico.com.br | `/horario_missa/dados/uf/PE.json` | 2 registros na diocese; **a única grade existente** (Petrolândia) |
| horariodemissa.com.br | `search.php?uf=PE&cidade=…` | 4 fichas (Floresta, Carnaubeira, Ibimirim, Tacaratu) — **todas sem horário** |
| Instagram oficiais | `@paroquiadepetrolandiape`, `@nossasenhoradopatrocinio` | perfis ativos (posts de setembro/2026), mas **sem horário na bio** |

### Prova de completude (CNPJ) — o achado da diocese

A busca do Mapa das OSC por razão social devolve **zero** em todos os 12 municípios: as paróquias
não têm CNPJ próprio, são **filiais da mitra**. A raiz saiu pelo caminho inverso — a única OSC
indexada da diocese (`/detalhar/459238`, nome fantasia "PAROQUIA DE FLORESTA") tem
`cd_identificador_osc` = **10878339001030**, ou seja, raiz **10.878.339**, ordem 0010.

Varridas as ordens **0001 a 0045** em `minhareceita.org` (DVs calculados): existem **15**, e nada
além da 0015.

| Ordem | Nome fantasia | Situação |
|---|---|---|
| 0001 | DIOCESE DE FLORESTA (cúria) | ATIVA |
| 0002 | PAROQUIA DE BELEM DO SAO FRANCISCO | ATIVA |
| 0003 | PAROQUIA DE BETANIA | ATIVA |
| 0004 | PAROQUIA DE CARNAUBEIRA DA PENHA | ATIVA |
| 0005 | PAROQUIA DE CUSTODIA | ATIVA |
| 0006 | PAROQUIA DE JATOBA | ATIVA |
| 0007 | PAROQUIA DE TACARATU | ATIVA |
| 0008 | PAROQUIA DE IBIMIRIM | ATIVA |
| 0009 | PAROQUIA DE INAJA | ATIVA |
| 0010 | PAROQUIA DE FLORESTA | ATIVA |
| **0011** | **PAROQUIA DE CABROBO** | **BAIXADA** (município hoje na Diocese de Salgueiro) |
| 0012 | PAROQUIA DE ITACURUBA | ATIVA |
| 0013 | PAROQUIA DE PETROLANDIA | ATIVA |
| **0014** | **PAROQUIA DE OROCO** | **BAIXADA** (município hoje na Diocese de Petrolina) |
| 0015 | PAROQUIA DE MANARI | ATIVA (aberta em **24/01/2012**) |

13 ativas = cúria + **12 paróquias**, exatamente as do site. Nenhuma filial nova desde 2012, ou
seja, **nenhuma paróquia criada de 2012 para cá**. `parishesExpected` = 12, confirmado também pelo
gcatholic (31/12/2022) e pela Wikipédia.

## Divergências resolvidas

1. **Belém do São Francisco** — o gcatholic chama a paróquia de "Santo Antônio". Está errado: o
   site da diocese, o registro do ipatrimônio/IPHAN, o Tripadvisor e o Instagram oficial
   `@nossasenhoradopatrocinio` confirmam **Nossa Senhora do Patrocínio**.
2. **Ibimirim** — o gcatholic diz "São Francisco de Assis"; o site da diocese e o
   horariodemissa dizem **Santo Antônio de Pádua**. Mantido Santo Antônio de Pádua.
3. **Manari** — não aparece no gcatholic (paróquia de 2012) e a página dela está fora do menu
   "Organização Diocesana" no site (URL `/manari-pe/`).
4. **CEPs** — três publicados eram inválidos ou de outra UF:
   - Floresta: `56400-000` não existe no ViaCEP → **56402-195** (Praça Antônio Ferraz);
   - Ibimirim: o site publica `58580-000` (**CEP da Paraíba**); a Receita traz 56580-000, também
     inexistente → **56582-025** (Av. Manoel Vicente);
   - Itacuruba: o site publica `58430-000` (**Paraíba**); a Receita traz 56430-000, inexistente →
     **56431-207** (Rua Rufino Aníbal Cantarelli).
5. **Endereço da catedral** — site, horariodemissa e liriocatolico dizem "Praça Antônio Ferraz,
   120"; a Receita registra "Avenida Deputado Audomar Ferraz, 120". Gravada a praça (a igreja);
   a divergência está em `notes`.

## Horários — por que praticamente não há

- **Site diocesano**: publica expediente de secretaria, nunca horário de missa.
- **horariodemissa.com.br**: existem 4 fichas (Floresta, Carnaubeira da Penha, Ibimirim,
  Tacaratu), todas com a seção "Missas:" **vazia**.
- **buscamissa.com.br**: nenhum dos 12 municípios está no sitemap (3.314 URLs).
- **liriocatolico.com.br**: 2 registros. A Catedral (ficha 5077) **não tem horário**. Só
  Petrolândia (ficha 5166) tem: dom 8h e 19h30, qui 19h30 e adoração qui 18h-19h. Fonte única,
  não oficial e sem data de conferência (o `ultima_atualizacao` 2026-09-02 é a regeneração da
  base) → **os 4 horários ficaram `baixa`** e não entram em produção.
- **Redes sociais**: dois perfis oficiais ativos foram lidos e nenhum publica grade. A bio de
  `@nossasenhoradopatrocinio` anuncia "Lives aos domingos às 09h" — **não** foi convertido em
  horário de missa, porque o texto não diz que a transmissão é a missa; ficou em `notes`.

## Precisa de validação humana

1. **Horários de todas as 12 paróquias** — é o maior buraco. Só um levantamento por telefone ou
   pelas redes sociais paróquia a paróquia resolve.
2. **Párocos atuais** — nenhum foi gravado; os de 2014 estão em `notes`. Sabe-se que ao menos o de
   Petrolândia mudou.
3. **Telefones e e-mails** — em `phoneHistoric` / `emailHistoric`, de 2014. Vários e-mails são
   hotmail/yahoo e o site paroquial de Custódia (`www.paroquiadecustodia.com`) já não resolve.
4. **Nome da paróquia de Belém do São Francisco e de Ibimirim** — resolvidos contra o gcatholic,
   mas vale reconferir com a diocese.
5. **Ano de criação** — nenhuma paróquia tem `foundedYear`: o site não publica.
6. **As 5 comunidades do gcatholic** (N. Sra. de Fátima, N. Sra. do Rosário, N. Sra. Sant'Ana e
   Santa Rosa de Lima em Floresta; Santo Expedito em Petrolândia) foram atribuídas à **única
   paróquia do município** — atribuição segura, mas é inferência; ficaram `media`.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `address`: está "Curia Diocesana, Praca Antonio Ferraz, Boiadeiro 01" (com a vírgula no lugar
  errado); o correto é **"Praça Antônio Ferraz Boiadeiro, 01 – Centro"**.
- `zipCode`: está `56400-000`, que **não existe no ViaCEP**. O CEP da Praça Antônio Ferraz
  Boiadeiro é **56402-060**.
- `email`: está `null`. O site publica **diocesedefloresta@gmail.com**; a CNBB NE2 publica
  `diocesefloresta@oxente.net` (provavelmente morto).
- `foundedYear`: está **1920** — errado. A Diocese de Floresta foi criada em **15/02/1964**
  (catholic-hierarchy, gcatholic e Wikipédia). *(1920 é o ano de criação da Diocese de Bom Jesus do
  Gurguéia, que no `dioceses.json` também está 1920 — possível troca de linha na 1ª rodada.)*
- `phone`: (87) 3877-1149 confere. A CNBB NE2 acrescenta fax (87) 3877-1258 e caixa postal 15.
