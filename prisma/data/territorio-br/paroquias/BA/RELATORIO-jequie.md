# Diocese de Jequié — relatório de pesquisa

- **Slug**: `jequie` · **UF**: BA · **Sede**: Jequié · **Província**: Vitória da Conquista
- **Pesquisa**: 17/09/2026
- **Bispo**: Dom Paulo Romeu Dantas Bastos · **Site**: **não há mais** (ver abaixo)
- **Território**: 22 municípios — Aiquara, Apuarema, Boa Nova, Brejões, Cravolândia, Dário Meira,
  Irajuba, Itagi, Itagibá, Itaquara, Itiruçu, Jaguaquara, Jequié, Jitaúna, Lafaiete Coutinho,
  Lajedo do Tabocal, Manoel Vitorino, Maracás, Marcionílio Souza, Nova Itarana, Planaltino e
  Santa Inês.

## Resultado

| Métrica | Valor |
|---|---|
| Entradas | **40** = 39 paróquias + 1 santuário não paroquial (`status: "nao-paroquial"`, `loadAsParish: true`) |
| Confiança das paróquias | 8 `alta` · 32 `media` · 0 `baixa` |
| Comunidades/capelas | 53 = 40 matrizes + 13 capelas/comunidades (1 `media`, 12 `baixa`) |
| Horários fixos | **106** (90 MASS · 10 CONFESSION · 6 ADORATION) — **15 `alta`**, 0 `media`, 91 `baixa` |
| Paróquias com algum horário | 14 de 40 |
| Paróquias com horário **carregável** | **2** (Santuário Jesus Crucificado, 13 missas; Paróquia Espírito Santo, 2) |

**Cobertura: 39 de 39.** O número fecha em três contagens independentes (ver "Prova de completude").

## O problema central: a diocese não tem mais site

`diocesedejequie.com.br` **deixou de existir no registro.br** (resposta NXDOMAIN em 17/09/2026, tanto
no DNS local quanto no `dns.google`). Não é bloqueio, nem domínio tomado por apostas: o nome
simplesmente não resolve. No Arquivo da Internet a home já devolvia 404 em 07/04/2025, e a última
notícia publicada é de **15/12/2021**. Nenhum domínio alternativo existe (`.org.br`, `.org`, `.com`,
`diocesejequie.*` — todos NXDOMAIN). A diocese hoje comunica só por redes sociais
(Instagram `@diocesejequie`, 12 mil seguidores, posts até 14/09/2026; Facebook `diocesedejequieoficial`).
Por isso `diocese.website` ficou `null`.

A lista-base saiu da **captura de 21/05/2022** de `/paroquias/` (38 cartões com nome, ano de criação,
cidade, endereço, CEP, telefone, pároco e e-mail — este ofuscado pelo Cloudflare e decodificado de
`data-cfemail`).

> **Armadilha: a captura é de 2022, mas o conteúdo é de ~2017.** A captura de 01/12/2017 da mesma
> página traz **os mesmos párocos** da de 2022. Só o menu dos bispos foi atualizado; os cartões das
> paróquias ficaram congelados. Prova: o cartão põe "Pe. Matheus Muniz" em Itagi, e o Instagram oficial
> de 2026 o mostra pároco da São João Batista (Jequié); põe "Pe. Sonildo" no Entroncamento de
> Jaguaquara, e em 2022 ele já administrava a Senhor do Bonfim (Jequié).

Consequências (seguindo a regra do README: *telefone e pároco de captura antiga não vão para os campos
de produção*):

1. **`priestName` só com fonte de 2023 em diante** — boletim diocesano de 21/11/2023 (reproduzido pelo
   Jequié Repórter), bios oficiais do Instagram de 2026 e imprensa de 2025. Resultado: 12 paróquias com
   pároco, 28 com `null`. Os 28 nomes do cartão antigo **não foram gravados**; estão na captura citada
   em `sources`.
2. **`phone` só com fonte de 2025–2026** — 6 paróquias: São João Batista, Maria Auxiliadora, Santuário
   Jesus Crucificado (bios oficiais), N. Sra. das Graças/Jequié (Linktree oficial), São José da Sagrada
   Família e São Judas Tadeu (link `wa.me` do perfil oficial — nesta, o mesmo número do cartão antigo).
   Os outros **28 telefones ficaram em `phoneHistoric`** (e repetidos em `notes`): 25 do cartão antigo
   (24 fixos e o celular do Entroncamento de Jaguaquara, que a Receita repete e ao qual acrescentei o nono
   dígito) e 3 fixos de cadastro antigo — Receita Federal em Nova Itarana e Manoel Vitorino, Receita +
   horariodemissa de 2013 na N. Sra. Aparecida de Jequié.
3. **`email` vazio em todas**; os **19 e-mails institucionais** do cartão (`paroquia…@`, `sec.catedral…@`)
   ficaram em `emailHistoric`.
4. **Fora até do campo histórico**, por serem dados pessoais de padres de ~2017: **18 e-mails pessoais**
   (`pe.fulano@…`, `fulano35@…`) e **5 celulares** sem segunda fonte (Nova Itarana, Manoel Vitorino,
   Valentim, Apuarema, Marcionílio Souza). Continuam visíveis na captura do Arquivo.
5. **Confiança `media` para as 32 paróquias conhecidas só pela lista congelada** (fonte oficial sem
   sinal de atualidade + Receita + GCatholic). **`alta` só para as 8 com fonte oficial viva em 2026**:
   São João Batista, Espírito Santo, São Judas Tadeu, Maria Auxiliadora (Jaguaquara), N. Sra. das Graças
   (Jequié), Santuário Jesus Crucificado, São José da Sagrada Família e São Francisco de Assis.

## Prova de completude — Receita Federal por município (truque novo)

Aqui **as paróquias não são filiais do CNPJ da diocese** — cada uma tem CNPJ próprio, de natureza
"Organização Religiosa" e identificador MATRIZ (o CNPJ 14.516.728 da diocese só tem uma filial, um
centro de treinamento de líderes). A varredura de filiais do README, portanto, não se aplica.

O substituto foi a **busca avançada do Mapa das OSC (IPEA)**, que aceita razão social + código IBGE do
município e devolve a base da Receita de **05/2026**:

```
https://mapaosc.ipea.gov.br/api/api/osc/busca_avancada/lista/200/0?avancado={"dadosGerais":{"tx_razao_social_osc":"PAROQUIA","cd_municipio":"2918001"}}
```

Rodada nos 22 municípios (termos PAROQUIA, DIOCESE, MITRA, SANTUARIO, CATEDRAL, CURIA), e cada CNPJ
conferido em `minhareceita.org` (todos **ATIVA**): **38 "PAROQUIA" + o Santuário Jesus Crucificado**.
Só N. Sra. da Boa Nova (Boa Nova) não apareceu — deve ter outra razão social. Somando-a: **39 paróquias
+ 1 santuário, 15 paróquias na sede** — exatamente a frase da Wikipédia ("22 municípios, 39 paróquias e
1 santuário, sendo 15 paróquias na cidade de Jequié"). `catholic-hierarchy` dá 36 paróquias em 2023 e o
GCatholic lista 39 igrejas em 01/01/2026.

Foi a Receita que revelou as **duas paróquias que o site antigo não tinha**:

| Paróquia | Bairro | Origem |
|---|---|---|
| **São José da Sagrada Família** | Parque da Colina, Jequiezinho | bio oficial `@saojosedejequie`: comunidade de 22/04/1976, **criação canônica em 30/01/2022**, 1º pároco Pe. Manoel Brito; 95 FM (03/2025); CNPJ de 2020 |
| **São Francisco de Assis** | Joaquim Romão | boletim de 21/11/2023 a chama de "**Futura** Paróquia São Francisco de Assis"; CNPJ aberto em 23/07/2024; Instagram `@saofranciscojequie` e Facebook oficial da diocese já a tratam como paróquia |

## Horários

Não existe publicação diocesana de horários. As fontes, em ordem de valor:

1. **Bios oficiais do Instagram** lidas em 17/09/2026 (perfis com posts de 08–09/2026) — `alta`:
   - Santuário Jesus Crucificado: "Domingo 06h30, 10h e 18h · Segunda a sexta 06h30 e 18h30 · Quinta-…"
     (o resto vem truncado) → 13 missas;
   - Paróquia Espírito Santo: "Missas Dominicais: 7h e 19h" → 2 missas.
   Cada leitura foi repetida com um segundo prompt antes de gravar.
2. **`liriocatolico.com.br`** (`/horario_missa/dados/uf/BA.json`) — 8 fichas no território, tudo `baixa`.
   500 das 501 fichas da Bahia têm `ultima_atualizacao = 2026-09-02`: é **data de regeneração da base, não
   de conferência**. Dois casos em que eu tinha pensado em subir para `media` e **não subi**, pela regra do
   README ("corroboração só vale entre fontes independentes e ATUAIS"):
   - **Catedral**: 6 horários coincidem entre o Lírio e a ficha de 2014 do horariodemissa (dom 07h e
     18h30, ter–sex 18h30). A ficha do Lírio tem ID baixo (1617) — é a própria ficha do horariodemissa
     importada e depois editada —, então a coincidência pode ser só texto antigo copiado. `baixa`.
   - **Santuário Jesus Crucificado**: a ficha do Lírio **bate com a bio oficial nos 13 horários visíveis**;
     os 3 restantes (sábado 06h30 e 18h, adoração de quinta 06h30) caem exatamente no trecho truncado da
     bio. Muito provavelmente certos, mas não confirmados → `baixa`, com nota. **É o item mais barato de
     promover à mão** (basta abrir `@santuariojesuscrucificado`).
3. **`horariodemissa.com.br`** — 22 fichas nos 22 municípios, **todas de 24/05/2013 a 21/10/2016**
   (só 7 com grade). Regra pré-pandemia → tudo `baixa`.
4. `buscamissa.com.br` **não tem nenhuma cidade da diocese** (na Bahia cobre só 11 municípios).

Missa mensal: "Primeira sexta-feira" (Maracás, 2015) e "1ª sexta-feira do mês, 19:00" (Manoel Vitorino)
ficaram com `dayOfWeek: 5`, `baixa` e a frase em `notes`. Não apareceu missa de data fixa do mês.

## Comunidades

**Nenhuma fonte oficial publica lista de capelas.** As 40 matrizes têm nome por convenção minha
("Matriz <padroeiro>"; a catedral e os dois santuários levam o próprio nome). As 13 demais vêm de
locais de missa citados em fichas de agregador: 12 `baixa` (não carregam) — 8 de N. Sra. das Graças/Jequié
(ficha de 2014), 2 de Maracás, 1 de Apuarema e 1 de Marcionílio Souza — e 1 `media`, o **Santuário Nossa
Senhora Auxiliadora** de Jaguaquara (GCatholic 01/2026 o lista como "Shrine" ao lado da igreja paroquial, e a
ficha de 2014 fala em missa "na Igreja Santuário"); entra sem horário carregável.

## Pontos que precisam de validação humana

1. **Quase-paróquias de 2017 que hoje aparecem como paróquias.** O cartão antigo dizia "Quase Paróquia
   São João Batista (Km 03 e 04)" e "Quase Paróquia Senhor do Bonfim". A São João Batista hoje se apresenta
   como paróquia com pároco (bio oficial) — gravada `alta`. A **Senhor do Bonfim** tem só indícios (Receita
   "PAROQUIA SENHOR DO BONFIM", página de Facebook "Paróquia Senhor do Bonfim | Jequié BA", post do padre
   em 02/2026) — gravada como "Paróquia", `media`. O GCatholic lista as duas sem o rótulo "Parish".
   **Confirmar a elevação canônica das duas.**
2. **Ano de criação da São Francisco de Assis** (entre 11/2023 e 07/2024) e **seu pároco atual** (gravei
   Pe. Sidney Marques, do boletim de 2023).
3. **N. Sra. das Graças (Jequié) publica horário na bio do Instagram**, mas o trecho chega truncado ao
   leitor automático. Um buscador exibe "terça a sexta 18h30; domingo 7h e 18h; (73) 3047-6119" — pela
   regra do README (trecho de busca não é documento) **não gravei os horários**; o telefone entrou porque
   o Linktree oficial o confirma. **É o horário mais fácil de recuperar à mão**, junto com o sábado do
   santuário.
4. **São Judas Tadeu guarda os horários num destaque "Missas"** do Instagram, que o leitor não abre.
5. **Endereço da Catedral**: o cartão dá R. Pe. Altino Freire, 240 (é o endereço da cúria); Receita e
   Lírio dão **Rua Nestor Ribeiro, 423**; o horariodemissa (2014), Rua Virgílio Tourinho Neto.
6. **Santuário da Imaculada Conceição** é paróquia (Receita: "PAROQUIA SANTUARIO DA IMACULADA
   CONCEICAO") — entra normalmente. O **Santuário Jesus Crucificado** é igreja do convento passionista,
   não paróquia — entra por `loadAsParish` porque publica missa fixa.
7. **Santuário Nossa Senhora Auxiliadora (Jaguaquara)**: gravado como comunidade da Paróquia Maria
   Auxiliadora; conferir se tem reitoria própria.
8. **N. Sra. das Graças (Jequié) × São Francisco de Assis**: a ficha de 2014 da primeira cita uma "Com.
   S. Francisco" no Joaquim Romão, o mesmo bairro da paróquia nova. Marquei a comunidade como `baixa` com
   nota; **as 8 comunidades dessa paróquia são de 2014 e parte já deve ter mudado de dono.**
9. **Sedes fora da cidade-nome**: Sagrado Coração de Jesus fica no distrito de Stela Dubois
   (Entroncamento de Jaguaquara); Santo Antônio de Pádua no povoado do Km 100 (Brejões); Bom Jesus no
   distrito de Valentim (Boa Nova). `city` = município; o distrito foi para `neighborhood`.
10. **Nomes ajustados contra o cartão antigo**: "Paroquia Santo Antônio" de Itiruçu virou **Santo Antônio
    de Pádua** (boletim de 2023 + Receita); "Paróquia Perpétuo Socorro" virou **Nossa Senhora do Perpétuo
    Socorro** (Receita + agregadores); a de Irajuba ficou **Santo Antônio**, como no cartão (o Lírio diz
    "de Pádua").
11. **34 das 40 entradas entram em produção sem telefone e todas sem e-mail** — é o preço de não ter fonte
    atual. Conferir os 28 `phoneHistoric` é o caminho mais curto para preencher. 6 paróquias não têm telefone
    nem no campo histórico: Senhor do Bonfim/Jequié, Valentim, Apuarema, Marcionílio Souza, Santíssimo
    Sacramento e São Francisco de Assis (nas três de Jequié a Receita repete o telefone da cúria).
12. **CEP**: o cartão antigo usa o genérico 45200-000 em várias paróquias da sede; troquei pelo CEP
    específico da Receita quando havia. A Receita repete **45202-130** em quatro paróquias de bairros
    diferentes (Aparecida, Perpétuo Socorro, Graças, Cristo Rei) — valor suspeito, ignorado.

## Truques que renderam (para o README)

- **Mapa das OSC/IPEA como "varredura de filiais" quando a paróquia tem CNPJ próprio** — busca por razão
  social + município, base Receita de 05/2026, sem captcha. Ver URL acima.
- **Bio do Instagram pelo leitor automático (WebFetch)**: ele entrega a bio (até ~150 caracteres) e as
  datas dos últimos posts, que servem de sinal de atualidade. Depois de ~40 leituras o Instagram passa a
  devolver tela de login. `curl` com UA `facebookexternalhit` lê legenda e data de um **post**
  (`og:description`), mas não a bio. A API `web_profile_info` exige login.
- **Cuidado com resumo de buscador**: numa busca por "Perpétuo Socorro Jequié" o resumo atribuiu a Jequié o
  perfil e a grade de uma paróquia de João Pessoa; noutra, um agregador (`horariomissa.org`) devolveu a
  catedral de Chapecó como se fosse a de Jequié. Nada disso entrou.
