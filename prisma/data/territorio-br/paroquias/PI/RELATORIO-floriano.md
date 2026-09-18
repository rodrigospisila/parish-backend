# Diocese de Floriano (PI) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-18
- **Arquivo**: `paroquias/PI/floriano.json`
- **Cobertura**: **29 / 29 paróquias (100%)** — 27 `alta`, 2 `media` — nos 23 municípios da
  diocese, sendo 7 paróquias na cidade de Floriano
- **Comunidades**: 29 (só as igrejas-sede) — **nenhuma capela publicada em lugar nenhum**
- **Horários fixos**: 45, **todos `baixa`** (fonte única não oficial). 6 paróquias com grade, todas
  em Floriano; **as outras 23 paróquias não têm um único horário publicado**.
- **6 entradas extras** `status: nao-paroquial` (igrejas/capelas de Floriano), sem `loadAsParish`.

## A diocese não tem site

Este é o achado que define a pesquisa. `diocesedefloriano.org.br` (o endereço que a Wikipédia
ainda registra) **morreu em 2014**: a última captura útil do Arquivo da Internet é de 2011 e a de
22/12/2014 já é `cgi-sys/suspendedpage.cgi`, a página de "conta suspensa" da hospedagem. Não há
domínio alternativo (foram testados `.com.br`, `.com`, `.org`).

O que existe é o **Instagram oficial `@diocesedefloriano`** — 10,7 mil seguidores, 1.766 posts,
publicação diária (o mais recente em 16/09/2026) —, mas o Linktree da bio
(`linktr.ee/diocesedefloriano2008`) tem só **dois links**: um formulário do Google para a DNJ 2026
e o WhatsApp da cúria. Nenhuma lista de paróquias, nenhum horário.

## Fontes principais

| Fonte | URL | O que deu |
|---|---|---|
| **Receita Federal** | `https://minhareceita.org/095244080000XX` | **toda a lista de paróquias**, com endereço, bairro, CEP e data de abertura |
| Mapa das OSC / IPEA | busca avançada por razão social em Floriano/PI (IBGE 2203909) | **achou a raiz do CNPJ** (09.524.408) — a busca por "PAROQUIA" e "MITRA" devolve zero; é por "DIOCESE" que aparecem 9 filiais |
| catholic-hierarchy.org | `/diocese/dfloo.html` | **29 paróquias** em 2013, 2016, 2019, 2021 e 2023 — número estável, bate com a Receita |
| Wikipédia | `/wiki/Diocese_de_Floriano` | 29 paróquias (2021) e a **lista dos 23 municípios** |
| Instagram oficial | `@diocesedefloriano` | bispo, data de fundação, padroeiro e a prova de que a diocese está ativa |
| liriocatolico.com.br | `/horario_missa/dados/uf/PI.json` | 15 fichas em Floriano — a **única** fonte de horário da diocese |
| Arquivo da Internet | CDX de `diocesedefloriano.org.br` | provou que o site está morto desde 2014 |

### Prova de completude (CNPJ) — 33 ordens, 29 paróquias

Raiz **09.524.408**; testadas as ordens 0001 a 0060, existem **33**. Descontando:

- **0001** cúria (DIOCESE DE FLORIANO, Rua Francisco de Abreu Rocha 777);
- **0002** Casa João XXIII (BAIXADA);
- **0004** Seminário Maior São Pedro de Alcântara;

sobram **29 unidades paroquiais**, que é exatamente o número do catholic-hierarchy. Dois ajustes
foram necessários para fechar em 29:

1. **Ribeiro Gonçalves tem duas inscrições ativas no mesmo endereço** (Rua Félix Pacheco, 120): a
   0013, aberta em 14/07/2008 como **"Área Pastoral São João Batista"**, e a 0024, aberta em
   19/10/2010 como **"Paróquia São João Batista"**. É a mesma unidade — a área pastoral virou
   paróquia e a inscrição antiga não foi baixada. Contada **uma vez**.
2. **Porto Alegre do Piauí (0026) e Pavussu (0031) estão BAIXADAS**, mas os dois municípios
   continuam na diocese (a Wikipédia os lista entre os 23) e sem eles a conta não fecharia em 29.
   Entraram com confiança **`media`** e estão marcados em `notes` como ponto de validação humana.
   Bases de CNPJ de terceiros (econodata) ainda exibem a "Paroquia Nossa Senhora de Fatima em
   Pavussu, PI" sob o CNPJ 09.524.408/0031-52.

Também confirmado pela Receita: **Paes Landim saiu para a Diocese de Oeiras** — a única OSC
"DIOCESE" registrada naquele município é a Diocese de Oeiras (CNPJ 06.577.100/0010-52).

Distribuição: **Floriano 7 paróquias** (Catedral São Pedro de Alcântara, N. Sra. das Graças,
Senhora Sant'Ana, São José Operário, São Raimundo Nonato, Santa Cruz e N. Sra. das Mercês) e uma
paróquia em cada um dos outros 22 municípios.

## Horários — 45 registros, todos `baixa`

O `liriocatolico.com.br` é a única fonte. Ele tem **15 fichas** na diocese, **todas no município de
Floriano** e nenhuma nos outros 22 municípios. Delas:

- **6 são das paróquias** (Catedral, N. Sra. das Graças, São José Operário, São Raimundo Nonato,
  Santa Cruz e N. Sra. das Mercês) → 39 horários;
- **6 são de igrejas não paroquiais** → entraram como entradas próprias com
  `status: "nao-paroquial"` e **sem `loadAsParish`**, porque a regra do README só admite igreja não
  paroquial com horário que sustente `media`/`alta`: Capela Nossa Senhora Rosa Mística (dom 10h),
  Igreja Nossa Senhora do Desterro (dom 10h), Igreja Nossa Senhora Aparecida (dom 9h30), Igreja
  Nossa Senhora de Fátima (dom 17h), Convento São Pio de Pietrelcina (dom 10h30) e Mosteiro das
  Monjas Concepcionistas (seg-sáb 6h25 e dom 7h30). **Não foi possível determinar a qual das 7
  paróquias de Floriano cada uma pertence** — atribuir seria inventar;
- 3 fichas (São Gonçalo do Amarante/Amarante e outras) não pertencem à diocese.

Como o `ultima_atualizacao` do liriocatolico é a data de **regeneração da base** (2026-09-02, igual
em todas as fichas do estado) e não há segunda fonte, **nenhum horário sobe de `baixa`**. Tentativa
de corroboração por Instagram (`@pnsg_flo`, `@paroquiasaononato`) falhou: depois de ~40 leituras o
Instagram passou a devolver tela de login, como o README previa.

Também verificados e sem nada: o `horariodemissa.com.br` só tem a cidade de Floriano no sitemap do
PI (e o `buscamissa.com.br` não cobre nenhum município da diocese).

## Precisa de validação humana

1. **Horários de 23 das 29 paróquias** — zero registros. E os 45 que existem são todos `baixa`, ou
   seja, a diocese entra em produção **sem nenhum horário**.
2. **Porto Alegre do Piauí e Pavussu** — CNPJ baixado; confirmar que as paróquias existem e obter o
   CNPJ novo.
3. **Ribeiro Gonçalves** — confirmar que 0013 (área pastoral) e 0024 (paróquia) são a mesma
   unidade, e se a área pastoral foi de fato elevada.
4. **Endereço da Catedral** — a Receita diz Praça Sebastião Martins, 480; o liriocatolico diz
   "Av. Getúlio Vargas 350". Gravado o da Receita.
5. **As 6 igrejas não paroquiais de Floriano** — descobrir a paróquia de vinculação de cada uma.
6. **Nenhuma paróquia tem pároco, telefone, e-mail ou ano de criação** — a Receita não publica
   telefone por filial (todas repetem o número da cúria ou da contabilidade) e não há outra fonte.
7. **Nenhuma comunidade/capela rural** foi encontrada. Numa diocese de sertão com 23 municípios,
   isso certamente subestima muito a realidade.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `website`: está `null` — **correto**, e vale registrar no dataset que o antigo
  `diocesedefloriano.org.br` está morto desde 2014, para que ninguém o reinsira. O canal oficial
  vivo é o Instagram `@diocesedefloriano`.
- `zipCode`: está `64800-124`; a Receita Federal registra a cúria (CNPJ 09.524.408/0001-49, Rua
  Francisco de Abreu Rocha, 777) com CEP **64800-002**.
- `address`: está "Curia Diocesana, Rua Francisco de Abreu Rocha 777"; a Receita confirma o
  logradouro e acrescenta o bairro **Centro**.
- `bishopName` ("Dom Júlio César Souza de Jesus") e `foundedYear` (2008) conferem.
