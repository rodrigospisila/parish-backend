# Diocese de Garanhuns (PE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-17
- **Arquivo**: `paroquias/PE/garanhuns.json`
- **Cobertura**: **37 / 37 paróquias (100%)**, todas `alta`, + 5 entradas extras `baixa` que não
  contam (1 área pastoral e 4 igrejas não paroquiais com missa cadastrada em agregador)
- **Comunidades**: 53 (41 igrejas-sede + 12 capelas/comunidades)
- **Horários fixos**: 270 — **80 `alta`, 126 `media`, 64 `baixa`** (213 missas, 53 confissões,
  4 adorações). **As 37 paróquias têm grade de missa**; nas paróquias são 226 horários
  (80 `alta`, 126 `media`, 20 `baixa`); os outros 44 `baixa` são das igrejas não paroquiais.

## Fontes principais

| Fonte | URL | O que deu |
|---|---|---|
| Índice de paróquias | `https://www.diocesegaranhuns.org/paroquias` | as 37 paróquias numeradas, por município |
| 37 fichas de paróquia | `https://www.diocesegaranhuns.org/paroquia/<nn>-<slug>` | endereço, CEP, telefone/WhatsApp, e-mail, pároco, vigários, diáconos, **data de criação**, **missas**, confissões, batizados, expediente |
| Cúria / Vicariatos | `/organismos/curia-diocesana-de-garanhuns/`, `/organismos/vicariatos/` | endereço e e-mail da cúria; os 7 vicariatos (Centro, Norte, Leste 1, Leste 2, Oeste, Sul, Sudoeste) |
| Receita Federal | `https://minhareceita.org/<cnpj>` (raiz **10.140.424**) | varredura das filiais 0001–0070: **prova de completude** + endereço/CEP de conferência |
| Wikipédia / catholic-hierarchy / gcatholic | — | "37 paróquias e 1 área pastoral em 26 municípios"; 37 paróquias em 2023; bispo desde 14/05/2024 |
| Lírio Católico | `https://www.liriocatolico.com.br/horario_missa/dados/uf/PE.json` | 49 registros nos municípios da diocese (carga de 2026-09-02): segunda fonte para 18 grades e única fonte de 9 capelas e 4 igrejas não paroquiais |

### Prova de completude (truque do CNPJ)

A raiz **10.140.424** tem **39 estabelecimentos ativos e nenhum além da ordem 0039**: a cúria
(0001), o Seminário São José (0027) e **exatamente 37 paróquias** (0002–0026 e 0028–0039). A mais
recente é a 0039, Paróquia do Cristo Redentor, aberta em 24/02/2021 — a mesma que fecha a lista do
site. Site (37) = Wikipédia (37) = catholic-hierarchy 2023 (37) = Receita (37).

### Atualidade da fonte

O site é um CMS próprio em PHP (agência Arcanjo). As fichas **não têm data**, mas o site está vivo:
última notícia em **17/06/2026** (palestra na Catedral), Corpus Christi em 10/06/2026, 56ª Assembleia
Diocesana em 03/12/2025. As fichas já trazem a paróquia criada em 2021 (Cristo Redentor) e a posse
canônica de agosto/2023 em Lajedo. Em compensação, a página de **Vicariatos está defasada** (cita
coordenadores que já não aparecem como párocos das paróquias do vicariato) e há uma contradição
interna (ver item 4 abaixo). O Arquivo da Internet estava fora do ar no dia da coleta ("Temporarily
Offline"), então não foi possível datar as fichas por comparação de capturas.

Critério adotado: **paróquia = `alta`** (fonte oficial + Receita). **Horário = `media`** por padrão
(fonte oficial sem data na página) e **`alta` quando o mesmo dia/hora aparece também no Lírio
Católico** (base de 2026) — 80 dos 160 horários semanais de missa. Divergências entre as duas
fontes ficaram `media` com a nota na paróquia; prevaleceu sempre a ficha da diocese.

## Agregadores

- **horariodemissa.com.br**: só **6 fichas, todas na cidade de Garanhuns e todas de 29/01 ou
  05/03/2013** — pré-pandemia, não aproveitadas (pároco de São Sebastião na ficha: "Pe. José
  Émerson", hoje pároco de Capoeiras). Os outros 25 municípios não existem no agregador.
  Busca certa: `search.php?opcoes=cidade_opcoes&uf=PE&cidade=<cidade>&bairro=&submit=<token>` —
  o `submit` é um token que vem no `index.php` e o parâmetro `opcoes=cidade_opcoes` é obrigatório
  (sem ele o site devolve a home com HTTP 200). `autocomplete/cidade.php?term=a&uf=PE` lista as
  cidades cadastradas do estado.
- **buscamissa.com.br**: o `sitemap.xml` tem 43 URLs de PE, **todas da Região Metropolitana,
  Caruaru e Zona da Mata** — nada no território desta diocese.
- **liriocatolico.com.br**: a página `/horario_missa/` carrega `dados/indice.json` e
  `dados/uf/<UF>.json` — o **estado inteiro num JSON** (443 registros em PE), com missas,
  confissões, adoração, telefone, Instagram e coordenadas. Ficha individual em
  `/horario_missa/paroquia/<id>-<slug>/`. Atenção: 441 dos 443 registros têm a mesma
  `ultima_atualizacao` (2026-09-02) — é **data de carga, não de conferência**; os ordinais em
  espanhol nas observações ("1er e 4to Domingo", "2da") indicam base importada de um agregador
  hispânico. Há erros visíveis (telefone com DDD 41 numa paróquia de Abreu e Lima; uma capela do
  bairro de Afogados, no Recife, atribuída ao município de Afogados da Ingazeira). Por isso o que
  vem **só** dele é `baixa`.

## Decisões de modelagem

- **Catedral**: a fonte escreve "Paróquia Santo Antônio de Garanhuns - Catedral (1786)"; gravada
  como `Catedral Santo Antônio`, com o nome original em `notes`.
- **`foundedYear`**: vem da data entre parênteses no título de cada ficha (de 1766 a 2021, sem
  repetição em massa) — confiável. **Angelim** é a única ficha sem data → `null`.
- **Distritos**: Rainha Isabel (Bom Conselho) e Cruzes (Panelas) têm paróquia própria; `city` é o
  município e o distrito foi para `neighborhood`. O slug de Cruzes leva o distrito
  (`nossa-senhora-da-conceicao-cruzes-panelas`) para não colidir com outras Conceição.
- **Pároco**: onde a ficha diz "Adm. Paroquial", o nome foi para `priestName` e a condição para
  `notes` (Cristo Redentor, Jucati, Jupi, Lajedo/Santa Mãe de Deus, Palmeirina, Saloá).
  Bom Conselho (só dois vigários), Brejão e Iati **não têm pároco na ficha** → `null`.
- **Telefone**: primeiro número em `phone`, os demais em `notes`.
- **CEP**: usado o da ficha, exceto onde ele é impossível ou contradiz o CEP geral do município —
  Catedral ("55230-000" → 55293-000), Iati (55343 → 55345-000), Terezinha (55326 → 55305-000) e
  São Sebastião/Garanhuns (55293-230 → 55293-231, confirmado por duas fontes). Divergências sem
  desempate ficaram em `notes` (Perpétuo Socorro, Sagrada Família).
- **Recorrência mensal** ("1ª sexta", "último sábado", "1º, 2º e 3º domingo") → dia da semana +
  `baixa` + frase em `notes` (8 horários). **Data fixa do mês** ("todo dia 18", missa da Aliança
  com a Mãe Rainha — Brejão, Sagrado Coração e Jurema) → `dayOfWeek: null` + `baixa` (3 horários).
- **Adoração**: só onde a ficha dá o horário (Brejão qui 18h40; Cruzes qui 18h; Bom Conselho
  "Adoração e Missa às 19h").
- **Confissões**: 43 horários; o fim da faixa vai em `notes` ("Das 9h às 12h"). Fichas que dizem
  só o dia ("Sextas"), só a hora ("9h") ou "30 min antes de cada missa" não geraram horário.
- **Celebração da Palavra** (Cristo Redentor, domingos nas comunidades Santo Afonso e São
  Francisco e Santa Clara) **não é missa** e não entrou — ficou na nota do horário de sábado.
- **Comunidades**: a diocese **não publica lista de capelas**. Entraram só as que a própria ficha
  cita — as 4 comunidades do Cristo Redentor (confirmadas pelo Google Sites da paróquia), Capela São
  Geraldo (Perpétuo Socorro), Capela São Sebastião (Panelas), Capela de São Sebastião (Bom
  Conselho, sem missa) e Comunidade Queimadas (Jurema) — mais 4 do Lírio Católico com vínculo
  evidente (mesmo telefone da paróquia ou observação explícita), todas `baixa`: Santuário Nossa
  Senhora do Perpétuo Socorro, Capela São Sebastião e Capela da Ressurreição (Lajedo/Santo
  Antônio) e Capela Nossa Senhora das Graças (São Sebastião/Garanhuns).
- **Igrejas não paroquiais** (`status: "nao-paroquial"` + `loadAsParish: true`, todas `baixa`):
  Santuário Mãe Rainha (Schoenstatt), Mosteiro de São Bento, Seminário São José e Convento dos
  Capuchinhos (Bom Conselho). Vêm só do Lírio Católico; ficam no dataset para o enxame de validação.
- **Área Pastoral Dom Hélder Câmara** (Cohab III): só a Wikipédia a cita. Entra `baixa`, sem
  horário. Pista: o Lírio Católico tem no bairro a "Comunidade Nossa Senhora de Lourdes" (R. Paulo
  Gervais Veloso, 200; dom 10h30, qui 19h30).

## Pontos que precisam de validação humana

1. **Datar as fichas.** Nenhuma ficha tem data. Quando o Arquivo da Internet voltar, comparar
   capturas de `diocesegaranhuns.org/paroquia/*` para saber quando cada grade mudou pela última vez.
2. **Divergências diocese × Lírio Católico (2026)** — prevaleceu a diocese, `media`:
   - Sagrada Família: domingo **10h30** (diocese) × 11h.
   - Cristo Redentor (matriz): sábado **16h30** × 16h; domingo **17h30** × 17h; o agregador ainda
     acrescenta quarta e quinta 18h.
   - Jurema: domingo à noite **19h30** × 19h.
   - São Bento do Una (Bom Jesus): domingo **19h30** × 19h; **terça** 19h30 × quarta 19h30.
   - Caetés: domingo **9h e 19h** × 7h, 9h, 11h e 19h.
   - Capoeiras: domingo **9h** × 8h; quinta **16h** × 18h30.
   - Perpétuo Socorro: o agregador tem missas de **terça (6h, 12h, 17h)** e novena perpétua
     (9h, 15h, 19h30) que a ficha da diocese não cita — gravadas `baixa`. É igreja redentorista,
     a terça da novena é plausível; **confirmar no Instagram da paróquia**.
3. **Três paróquias sem pároco na ficha**: Bom Conselho (Jesus, Maria e José), Brejão e Iati —
   vacância real ou ficha incompleta?
4. **Mesmo padre em duas fichas**: Pe. Pedro Eduardo Alves de Souza é *pároco* de São Benedito do
   Sul e *vigário paroquial* de Canhotinho; "Padre José Paulo" é *pároco* de Cruzes e o Pe. José
   Paulo Santos da Silva é *vigário* de Panelas-sede. Uma das fichas de cada par está defasada.
   A página de Vicariatos também está velha (coordenadores que não batem com os párocos atuais).
5. **E-mails inválidos na fonte** (não gravados; ficaram em `notes`):
   `paroquia_daconceicao_jurema@htmail.com` (Jurema) e `paroquiqdequipapa@yahool.com.br` (Quipapá).
6. **Endereços divergentes site × Receita**: São João (secretaria na Rua Augusto Peixoto, 122;
   matriz na Rua Manoel Rodrigues — gravados os dois, um na paróquia e outro na comunidade-matriz);
   Santa Mãe de Deus/Lajedo ("Rua Santa Mãe de Deus, 149" × "Rua Miguel Gomes da Rocha, 149");
   Rainha Isabel ("Praça Manoel Ribeiro dos Anjos, 50" × "Praça Pedro Moraes, 50"); São
   Sebastião/Águas Belas (nº 19 × nº 109); Lagoa do Ouro (Rua Francisco da Silva, 50 × Praça Nossa
   Senhora da Conceição, s/n).
7. **Sem telefone**: Canhotinho, Correntes e Palmeirina (campo em branco na ficha).
8. **Comunidades**: só 12 além das matrizes — a diocese não publica capelas. Numa diocese de 26
   municípios rurais o número real é de várias centenas. Caminho: Instagram de cada paróquia.
9. **Pistas não gravadas (Lírio Católico, paróquia desconhecida)**: em Garanhuns — Capela Nossa
   Senhora Aparecida (R. João Geraldo, 18; dom 16h, sex 19h30), Capela Nossa Senhora Aparecida
   (R. José Vieira Câmara, São José; dom 9h), Capela Nossa Senhora da Conceição (R. Francisco
   Branco Filho, 1251; dom 17h, qui 19h30), Capela São Paulo Apóstolo (R. Osvaldo Cruz, 180; dom
   9h), Capela de São Cristóvão (Av. da Liberdade, 1548; dom 16h), Capela Divina Misericórdia
   (Rua Alípio Medeiros; dom 16h, qua 19h30), Comunidade Nossa Senhora do Carmo (R. André Vidal de
   Negreiros, 305; dom 17h — telefone da Catedral), capelas do Abrigo São Vicente, do Colégio Santa
   Sofia e do Colégio Diocesano; em São Bento do Una — Igreja de Santo Afonso (R. Edson Salvino;
   dom 9h e 17h, qui 19h30); em Caetés — Capela da Santa Cruz (sáb 17h).
10. **`dioceses.json`**: está correto para Garanhuns (site, bispo). Falta só o e-mail da cúria,
    `diocesedegaranhuns@hotmail.com`, e o CEP da cúria é 55293-000 (o arquivo traz 55290-000).
