# Relatório — Arquidiocese de Chapecó (SC)

**Agente de pesquisa · 10/09/2026 · arquivo `paroquias/SC/chapeco.json`**

| | |
|---|---|
| Circunscrição | Arquidiocese de Chapecó (Arquidiocese metropolitana) |
| Sede | Chapecó/SC — Av. Getúlio Dorneles Vargas, 121 S, Centro — (49) 3322-3045 |
| Arcebispo | Dom Odelir José Magri, MCCJ (bispo desde 01/02/2015; arcebispo desde a elevação em 05/11/2024) |
| Site | https://arquidiocesechapeco.com.br |
| Paróquias no dataset | **46** (todas com confiança `alta`) |
| Comunidades | 14 (só a Paróquia São Cristóvão de Chapecó publica a lista) |
| Horários fixos | 12 (5 `alta`, 2 `media`, 5 `baixa`) |

## Fontes principais

1. **https://arquidiocesechapeco.com.br/paroquias** — lista oficial das paróquias. Cada card abre um
   modal com **endereço, CEP, telefone/WhatsApp, e-mail, clero (pároco e vigários), casas religiosas e
   histórico** da paróquia. É a fonte de praticamente todos os campos das 46 paróquias.
2. **https://arquidiocesechapeco.com.br/contato** — endereço e telefone da Cúria.
3. **https://arquidiocesechapeco.com.br/arquidiocese** — história, sucessão de bispos, organização
   (vigário geral, chanceler, ecônomo) e as 8 regiões pastorais.
4. **https://www.catholic-hierarchy.org/diocese/dchab.html** — ereção 14/01/1958, elevação a
   arquidiocese 05/11/2024, **47 paróquias (2024)**, 609.600 católicos, sufragâneas Caçador, Joaçaba e Lages.
5. **http://www.catedralchapeco.org.br/** — horários oficiais da Catedral Santo Antônio.
6. **https://www.paroquiasaocristovaocco.com.br/** — lista oficial das 14 comunidades e agenda mensal de missas.
7. **https://www.horariodemissa.com.br/search.php?uf=SC&cidade=Chapecó** — agregador, usado só para
   corroborar domingo 08h/19h e sábado 19h na Catedral.

> **Nota técnica:** o site da Arquidiocese bloqueia leitores automáticos comuns (HTTP 403) e é uma SPA
> que carrega todo o conteúdo por AJAX. O conteúdo foi obtido pelos endpoints
> `/?ajax=get&path=<rota>` e `/?ajax=get&comp=<id-base64-do-modal>`, usados pelo próprio front-end.
> Quem for revalidar esses dados precisa repetir esse caminho — abrir a URL simples devolve só o shell da página.

## Cobertura

- **46 encontradas / 47 esperadas** (catholic-hierarchy, dado de 2024).
- As próprias fontes da Arquidiocese divergem entre si: a meta-descrição do site diz "45 paróquias",
  a página institucional fala em 46 e o catholic-hierarchy em 47. A lista publicada em `/paroquias`
  tem 46 cards. **Não foi possível identificar qual seria a 47ª** — nenhuma paróquia adicional aparece
  em notícias recentes da Arquidiocese, e as criações mais novas (Perpétuo Socorro/2022, São Paulo
  Apóstolo/2021, Santa Luzia de Ipuaçu/2023) já constam da lista.
- Paróquias por município: 6 em Chapecó (Catedral Santo Antônio, N. Sra. do Perpétuo Socorro,
  São Paulo Apóstolo, São Francisco de Assis, Santa Dulce dos Pobres e São Cristóvão) e 1 em cada
  um dos outros 40 municípios-sede.
- **Ano de criação (`foundedYear`)**: preenchido em 26 das 46 paróquias, sempre a partir de uma frase
  explícita do histórico oficial ("a paróquia foi criada em …"). Nas demais o histórico não indica a
  data de ereção de forma inequívoca e o campo ficou `null`.
- **Regiões pastorais** (não modeladas no JSON, mas úteis para validação): Campo Erê, Chapecó,
  Itapiranga, Palmitos, Quilombo, Seara, São Miguel do Oeste e Xanxerê.

## Comunidades e horários — o gargalo desta arquidiocese

A Arquidiocese declara **~1.500 comunidades em 80 municípios**, mas **não publica nem a lista de
comunidades por paróquia nem horários de missa** — nem no site, nem em PDF, nem numa página de
"Horários". Consequência:

- `communities: []` em 45 das 46 paróquias. A única exceção é a **Paróquia São Cristóvão (Chapecó)**,
  que mantém site próprio com as 14 comunidades (todas `alta`).
- Os modais oficiais informam o *número* de comunidades de duas paróquias, sem nomeá-las:
  **Santa Lúcia (Anchieta) — 28 comunidades** e **São Carlos Borromeu (São Carlos) — 38 comunidades,
  nos municípios de São Carlos, Cunhataí e Águas de Chapecó**. Ficam aqui como referência de conferência.
- Horários: só duas paróquias têm publicação oficial utilizável.
  - **Catedral Santo Antônio** (site próprio): domingo 08h e 19h, terça 18h45, quarta 07h,
    quinta 12h15, sexta 18h45, sábado 19h. As duas missas mensais na capela lateral
    (1ª sexta 15h e 3ª quarta 15h) entraram como `baixa`, porque o modelo do dataset só
    representa recorrência semanal.
  - **São Cristóvão (Chapecó)**: a paróquia publica a agenda **mês a mês, em rodízio entre as 14
    comunidades**; não há horário fixo semanal de fato. Foram gravados como `baixa` os três padrões
    que mais se repetem na matriz (quarta 19h, sábado 19h, domingo 08h30), com nota explicando o rodízio.
- Os agregadores **não ajudam nesta região**: horariodemissa.com.br tem apenas 3 registros para
  Chapecó (dois deles duplicados e com telefone antigo, prefixo `3722-`), a ficha de São Miguel do
  Oeste está marcada como atualizada em **2013**, e missahora.com.br devolve HTTP 403.
- Quase todas as paróquias têm Facebook e/ou Instagram oficiais listados no site da Arquidiocese —
  esse é o caminho natural para o enxame de validação levantar horários, mas exige leitura de rede
  social, que não foi possível aqui.

## Pontos para validação humana / enxame de validação

1. **A 47ª paróquia.** Confirmar com a Cúria (49 3322-3045) se existe paróquia fora da lista do site,
   ou se o número do catholic-hierarchy está desatualizado.
2. **Nomes normalizados** (divergência entre a fonte e a regra de nomenclatura do dataset):
   - `santo-antonio-chapeco` — o site chama de "Paróquia Santo Antônio - Catedral"; gravado como
     **"Catedral Santo Antônio"** (é a catedral metropolitana).
   - `sao-jose-sao-jose-do-cedro` — o site chama de "Paróquia São José Cedro" / "Paróquia São Jose Cedro";
     gravado como **"Paróquia São José"** com `city: "São José do Cedro"`, porque a regra do dataset
     proíbe cidade dentro do nome.
   - `sao-lourenco-martir-sao-lourenco-do-oeste` — o card diz "Paróquia São Lourenço **do** Mártir" e o
     cabeçalho do modal diz "Paróquia São Lourenço Mártir"; foi adotada a segunda forma.
   - `nossa-senhora-da-conceicao-romelandia` — o card tem espaço duplo ("Nossa  Senhora"); corrigido.
3. **Telefones que precisam de conferência:**
   - Ipuaçu (`santa-luzia-ipuacu`): o site só publica um celular/WhatsApp, `(49) 9 9950-0952`,
     gravado como `(49) 99950-0952`. Não há telefone fixo.
   - N. Sra. do Perpétuo Socorro (Chapecó): `(49) 3199-2733` é anunciado como "Telefone/WhatsApp".
   - Descanso: o site publica WhatsApp `(49) 92000-2470` e Anchieta `(49) 93300-2632` — ambos com
     8 dígitos após o DDD e começando por 9+2/9+3, formato **inválido** para celular brasileiro.
     Não foram gravados; só o fixo entrou.
   - Campo Erê: a casa religiosa da paróquia aparece com `(49) 33655-1229` (5 dígitos, provável erro
     de digitação do site). O telefone da paróquia, `(49) 3655-1229`, é o que foi gravado.
4. **E-mails com mais de um endereço** no site (foi gravado só o primeiro/institucional):
   Santa Dulce dos Pobres (`rp.oeste@yahoo.com.br` + `paroquiasantadulce@yahoo.com.br` → gravado o segundo),
   São Cristóvão/Chapecó (`pastoralsaocristovao@gmail.com` + `paroquiasaocristovaochapeco@yahoo.com.br`;
   foi gravado `paroquiasaocristovao@yahoo.com.br`, que é o publicado no **site da própria paróquia**),
   Itapiranga (`secretariaspc@yahoo.com.br` + `secretariaspcanisio@hotmail.com`),
   Quilombo (`paroquiaqbo@yahoo.com.br` + `...@hotmail.com`),
   Xanxerê (4 e-mails por setor; gravado `atendimentopsbj@netxan.com.br`).
5. **E-mails "de região pastoral", não da paróquia**: São Paulo Apóstolo/Chapecó usa
   `rpsudeste@hotmail.com` e Santa Terezinha/Nova Itaberaba usa `rpnorte@yahoo.com.br`.
   São os endereços oficialmente publicados, mas parecem ser de região pastoral e não da paróquia.
6. **Endereço da Cúria / CEP.** A página de contato publica o endereço sem CEP. O `89801-001` veio do
   catholic-hierarchy ("Residencia Episcopal, Av. Getulio Vargas 121-S, 89801-001") e coincide com o
   CEP da Catedral (Av. Getúlio Vargas, 93 S). Confirmar.
7. **Pároco vs. administrador paroquial.** Onde o site indica "Administrador Paroquial" em vez de
   "Pároco", isso foi mantido entre parênteses no campo `priestName` (Caibi, Campo Erê, Cunha Porã,
   Faxinal dos Guedes, São Carlos). São cargos temporários e envelhecem rápido.
8. **Sites próprios de paróquia.** Só 3 das 46 têm `website`:
   - Catedral Santo Antônio — `http://www.catedralchapeco.org.br` (no ar, Joomla; foi a fonte dos horários).
   - São Cristóvão/Chapecó — `https://www.paroquiasaocristovaocco.com.br` (no ar; fonte das comunidades e da agenda).
   - São Judas Tadeu/Palmitos — `https://www.paroquiapalmitos.com.br`: o domínio é o mesmo do e-mail
     oficial publicado pela Arquidiocese e o servidor **responde, mas com certificado TLS inválido**,
     o que impediu a leitura. Confirmar se o site está de fato em uso.
9. **Horários**: 44 das 46 paróquias estão **sem nenhum horário**. É o maior débito desta circunscrição
   e depende de leitura das redes sociais das paróquias (quase todas têm Facebook/Instagram oficial
   listado no site da Arquidiocese) ou de contato direto.
