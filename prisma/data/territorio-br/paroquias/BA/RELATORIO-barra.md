# Diocese de Barra — relatório de pesquisa

- **Slug**: `barra` · **UF**: BA · **Sede**: Barra · **Província**: Feira de Santana · **Regional**: Nordeste 3
- **Pesquisa**: 18/09/2026
- **Bispo**: Dom João Batista Alves do Nascimento, C.SS.R. (desde 31/05/2023) · **Vigário Geral**: Pe. Antônio Pereira de Souza
- **Cúria**: Rua Dr. Augusto Torres, 02, Centro · 47100-000 · (74) 3662-2014 · diocesedebarraadm@gmail.com
- **Site oficial**: <https://diocesedebarra.com.br> — **vivo** (WordPress 7.1.1 + Elementor)
- **Território**: 11 municípios — Barra, Brotas de Macaúbas, Buritirama, Gentio do Ouro, Ibotirama, Ipupiara,
  Itaguaçu da Bahia, Morpará, Muquém do São Francisco, Oliveira dos Brejinhos e Xique-Xique

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **18** — 17 `alta` + 1 `media` |
| Comunidades | **638** = 17 matrizes + 621 capelas/comunidades, todas `alta` |
| Horários fixos | **41** (32 MASS · 7 ADORATION · 2 CONFESSION) — **todos `baixa`** |
| Paróquias com algum horário | 4 de 18 |
| Horários carregáveis (`alta`/`media`) | **0** |

**Cobertura: 18 encontradas / 21 declaradas no Annuario Pontificio 2023.**

## Fontes principais

1. **`diocesedebarra.com.br`** — WordPress. A lista canônica saiu do
   `wp-sitemap-posts-page-1.xml` e do menu: **17 fichas de paróquia**, uma por página
   (`/paroquia-…`, `/<cidade>-paroquia-…`). O índice `/paroquias/` é uma página Elementor **vazia**
   (só título e rodapé) — não use.
2. **A tabela de comunidades de cada ficha** é o achado desta diocese: 16 das 17 fichas publicam a
   lista **nominal e completa** das comunidades, com **padroeiro e dia da festa**, em `<table>` no
   corpo da página (acessível pela REST `/wp-json/wp/v2/pages?per_page=100`, campo `content`).
   Daí vieram as **638 comunidades**. Só Morpará não tem tabela.
3. **`/clero-diocesano/`** — republicada em **10/09/2026**, é a página mais atual do site: 28
   presbíteros com a função paroquial de cada um. Foi ela que corrigiu párocos das fichas (de 07/2024)
   e revelou a **18ª entrada** (a quase-paróquia de Barra, abaixo).
4. **Receita Federal via `minhareceita.org`** — todas as paróquias antigas são filiais do CNPJ
   **13.648.696**. Varredura de `/0001` a `/0024`: **17 filiais ATIVAS**, nada de `/0018` em diante.
   Deu endereço, bairro e CEP de 14 paróquias.
5. **Mapa das OSC / IPEA** (`mapaosc.ipea.gov.br`) — funcionou aqui: a busca avançada por razão social
   `DIOCESE DE BARRA` devolveu a raiz do CNPJ, que era o dado que faltava para varrer a Receita.
6. `liriocatolico.com.br` (`/horario_missa/dados/uf/BA.json`) — **9 fichas** no território, a única
   fonte de horário existente.
7. `catholic-hierarchy.org/diocese/dbarb.html` — 21 paróquias e 21 presbíteros em 2022.

## Prova de completude — as duas contagens NÃO fecham

| Fonte | Total |
|---|---|
| Fichas de paróquia no site oficial | 17 |
| + Clero Diocesano (quase-paróquia sem ficha) | 18 |
| Filiais ATIVAS do CNPJ 13.648.696 | 17 = sede + Casa Santo Afonso + **15 paróquias** |
| Annuario Pontificio 2023 (ap2023) | **21** |

As 15 filiais paroquiais da Receita casam uma a uma com fichas do site (14 com nome fantasia de
paróquia + 1 sem nome fantasia, na Rua Santa Luzia, Muquém do São Francisco = Paróquia Santa Luzia do
Javi). **Três paróquias do site não têm CNPJ próprio**, por serem recentes: São José (Beira Rio,
2020/2022), Quase-paróquia São Francisco de Assis (Muquém sede) e a quase-paróquia de Barra.

**As 3 que faltam para chegar a 21 não foram localizadas em nenhuma fonte pública.** A contagem do
Annuario é de 2022 e pode incluir áreas pastorais (o site usa o termo "área pastoral" dentro das
sedes) ou quase-paróquias posteriormente fundidas.

## A 18ª paróquia — `media`, precisa de validação humana

**Quase-paróquia Nossa Senhora Aparecida (Barra)** existe apenas numa linha da página *Clero
Diocesano*: "PE. ADVAR FRANCISCO MORÃES — Administrador Paroquial da Quase Paróquia Nossa Senhora
Aparecida – Barra – BA / Reitor do Seminário Propedêutico Santo Afonso". Não tem ficha no site, não
tem CNPJ na Receita, não tem notícia de criação no portal e não aparece no Lírio Católico. Gravei
`media` com endereço, comunidades e ano `null`. **Atenção ao homônimo**: a Paróquia Nossa Senhora
Aparecida do bairro BNH de **Xique-Xique** é outra, e tem ficha, CNPJ e pároco próprios.

## Horários — tudo `baixa`, nada carrega

A diocese **não publica horário de missa em página nenhuma** (busquei "missa", "horário" e
"celebração" no corpo das 55 páginas: só aparecem em texto histórico). As 41 grades vieram todas do
**Lírio Católico**, cujo `ultima_atualizacao` é `2026-09-02` em **500 das 501 fichas da Bahia** — é a
data de recarga da base, não de conferência. Fonte única não oficial ⇒ `baixa`.

Tentativas de corroboração que **falharam**:
- `buscamissa.com.br` não tem nenhuma cidade do oeste baiano (o sitemap só traz 11 cidades da BA,
  todas da região metropolitana, Feira e Conquista).
- `horariodemissa.com.br` tem a Catedral (`igreja.php?k=odEcQ`), mas a ficha é de **18/10/2016** —
  pré-pandemia, cai pela regra do README, e traz uma grade diferente (só 19:30).

**Suspeita sobre a Catedral**: o Lírio dá à Catedral São Francisco das Chagas 3 missas em cada dia
útil (07:30, 12:00, 19:00), 5 no domingo e 2 no sábado — 23 celebrações semanais numa cidade de
~55 mil habitantes com 1 pároco e 1 colaborador. **É o primeiro item para o enxame de validação.**

Distribuição dos 41 horários:

| Paróquia | Horários |
|---|---|
| Catedral São Francisco das Chagas (Barra) | 23 |
| Paróquia Nossa Senhora da Guia (Ibotirama) | 12, espalhados por 5 locais |
| Paróquia São João Batista (Ipupiara) | 4 |
| Paróquia São Francisco de Assis (Ibotirama) | 2 |

O caso de Ibotirama é o único em que o agregador separa comunidade de matriz, e as 5 igrejas do
Lírio casam **uma a uma** com comunidades da tabela oficial da Paróquia N. Sra. da Guia
(Santuário / Bairro São José / Alto do Cruzeiro-São Leonardo Murialdo / Veredinha-Madre Regina).
O vínculo comunidade↔paróquia é `alta`; só o horário é `baixa`.

**Faixas de horário**: adoração e confissão publicadas como intervalo ("15:00–19:00") entraram com a
hora de início e o intervalo literal em `notes`.

## Divergências registradas

| Registro | Divergência | O que gravei |
|---|---|---|
| Cúria | Rodapé do site: Rua Dr. Augusto Torres, 02. Receita: Praça Barão de Cotegipe, 250 | o do site (`address`), a da Receita em `notes` |
| Paróquia Santa Cruz (Ibiraba) | Ficha: "Pe. Marcelo da Conceição Souza". Clero Diocesano (mesma data, 10/09/2026): "Pe. Diego Rodrigues dos Santos" | o do Clero Diocesano, com a divergência em `notes` |
| Paróquia N. Sra. da Guia | Ficha: "Pe. Cláudio de Souza Nogueira". Clero: "Pe. Claudivaldo de Sousa Nogueira" | o do Clero (mesma pessoa) |
| Clero Diocesano | A lista em prosa e a tabela ao pé da mesma página divergem em **datas de nascimento e de ordenação** de quase todos os padres | não gravei nenhuma dessas datas |
| Paróquia N. Sra. da Piedade | "Pe. Walfrido, CSsR" não consta do clero diocesano (é redentorista) | gravei o nome da ficha |

## Pontos para o enxame de validação

1. **Os 23 horários da Catedral** (acima) — implausíveis para o porte da cidade.
2. **Quase-paróquia Nossa Senhora Aparecida (Barra)** — confirmar existência, endereço e se não é
   duplicata da de Xique-Xique.
3. **Paróquia São Pedro (Morpará)** — 0 comunidades no dataset; o texto oficial afirma **38
   comunidades** (6 na sede) e o atendimento a mais 6 do território de Barra, mas a lista nominal não
   é publicada. É a única lacuna grande de comunidades.
4. **As 3 paróquias que faltam para 21** — conferir com a cúria ou com o Anuário Católico.
5. **Telefones**: a Receita só traz `(74) 3662-2014` (o da cúria, repetido em Itaguaçu) e
   `(74) 8806-7452` em 4 filiais — número de celular sem DDD válido para telefone fixo, provavelmente
   de contato do contador. **Não gravei telefone em nenhuma paróquia.** O Lírio dá
   `(74) 3662-2147` para a Catedral e `(77) 3698-1182` / `(77) 3698-3356` para as duas de Ibotirama —
   ficaram de fora dos campos de produção por serem de agregador.
6. **Ano de fundação**: só gravei os que o texto histórico da própria ficha afirma (1875 Xique-Xique,
   1880 Oliveira dos Brejinhos, 1987 Morpará) ou que a Receita data como início de atividade de uma
   filial nova (2018, 2022, 2023). Os demais ficaram `null`.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `email`: hoje `null` → **`diocesedebarraadm@gmail.com`** (rodapé do site oficial).
- `address`: hoje `"Rua Dr. Augusto Torres 02, C.P. 12"` → confere com o site; manter, mas anotar que
  a Receita registra a sede do CNPJ na **Praça Barão de Cotegipe, 250, Centro**.
- `website` e `phone` conferem e estão vivos.
