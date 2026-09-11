# Relatório de pesquisa — Arquidiocese de Vitória (ES)

- **Data da coleta:** 2026-09-11
- **Arquivo:** `paroquias/ES/vitoria.json`
- **Sede:** Vitória/ES — Rua Soldado Abílio Santos, 47, Centro, CEP 29015-620
- **Arcebispo:** Dom Ângelo Ademir Mezzari, R.C.J. (bispo auxiliar: Dom Andherson Franklin
  Lustoza de Souza; arcebispo emérito: Dom Dario Campos, O.F.M.)
- **Site oficial:** https://www.aves.org.br
- **Sufragâneas:** Cachoeiro de Itapemirim, Colatina, São Mateus (não fazem parte deste arquivo)

## Resultado

| Item | Quantidade |
|---|---|
| Paróquias | **91** (todas `alta`) + 1 entrada não paroquial = **92 registros** |
| Comunidades/capelas | **10** |
| Horários fixos | **166** (14 `alta`, 149 `media`, 3 `baixa`) |
| Cobertura esperada (Anuário Pontifício 2024) | **91 — bate exatamente** |

Distribuição por município (15): Vila Velha 20, Serra 17, Vitória 14, Cariacica 14, Guarapari 8,
Anchieta 3, Viana 3, Domingos Martins 3, Afonso Cláudio 2, Fundão 2, Marechal Floriano 2,
Alfredo Chaves 1, Brejetuba 1, Santa Leopoldina 1, Santa Maria de Jetibá 1.

Completude dos campos: **91/92 com CEP, 92/92 com endereço, bairro, cidade e telefone,
89 com pároco, 85 com e-mail, 85 com ano de fundação.**

## Fontes principais

1. **API REST do site oficial** — `https://www.aves.org.br/wp-json/wp/v2/paroquias?per_page=100`
   (`X-WP-Total: 95`). Os 95 registros são **91 paróquias + 2 Áreas Pastorais** (Vitória e
   Cariacica/Viana) **+ o Centro de Treinamento Dom João Batista**; os 3 últimos foram descartados.
2. **Fichas individuais** `aves.org.br/paroquias/<slug>/` — é onde estão os dados. O `content` da
   API vem vazio: os campos são pares de `<h2 class="elementor-heading-title">` alternando rótulo
   ("Pároco:", "Fundada em:", "Telefone:", "E-mail:", "Site:", "Instagram:", "Facebook:",
   "Youtube:", "Endereço:") e valor. Os e-mails vêm ofuscados pelo Cloudflare e foram decodificados
   do atributo `data-cfemail`.
3. **Cadastro da Receita Federal via minhareceita.org** — as paróquias são filiais do CNPJ da
   **Mitra Arquidiocesana de Vitória, 27.054.162**. Varri `/0001` a `/0140`: 111 estabelecimentos,
   97 ativos. **91 das 92 entradas casaram com uma filial ativa** e trouxeram o CEP, que o site
   quase não publica (só 5 fichas o traziam).
4. **Páginas de CEB do mini-site da Paróquia Bom Pastor (Serra)** — `aves.org.br/ceb-*` e
   `aves.org.br/matriz-bom-pastor/`, com endereço e grade fixa por comunidade (posts de
   out/2022–jan/2023).
5. **https://www.horariodemissa.com.br** — 16 igrejas da arquidiocese, **todas com ficha de
   janeiro/fevereiro de 2023**, o que é pós-pandemia e por isso carregam como `media`.
6. **https://www.catholic-hierarchy.org/diocese/dvito.html** — arcebispo e nº esperado (91).

## Prova de completude

Os 5 CNPJs ativos que **não** casaram com nenhuma paróquia são, todos, entidades não paroquiais:
Centro Católico de Estudos Dom Silvestre Luiz Scandian (`/0015`), Centro de Treinamento Dom João
Batista (`/0040`), Seminário Nossa Senhora da Penha (`/0075`), **Reitoria Nossa Senhora das
Graças** (`/0079`, Centro de Vitória) e Casa Sacerdotal (`/0111`). Ou seja, **o conjunto de
paróquias do site é exatamente o conjunto de filiais paroquiais do CNPJ da Mitra** — o mesmo
número que o Anuário. É a melhor cobertura das três circunscrições desta rodada.

## Decisões de modelagem

- **Convento Nossa Senhora da Penha (Vila Velha, Prainha)** entra com
  `status: "nao-paroquial"` + `loadAsParish: true`. É o santuário franciscano estadual, não é
  paróquia (e não tem filial no CNPJ da Mitra), mas publica **43 horários fixos** — a maior grade
  da arquidiocese. Pela regra do README, igreja não paroquial com horário publicado entra.
  Por isso o arquivo tem 92 entradas e `coverage.parishesFound` é 91.
- As duas **Áreas Pastorais** e o **Centro de Treinamento** foram simplesmente omitidos (não são
  lugares de missa nem paróquias). A **Reitoria Nossa Senhora das Graças** também ficou de fora:
  não é paróquia e o site não publica horário dela.
- Nomes: o site publica sem o prefixo ("São Pedro – Praia do Suá", "Ressurreição"). Acrescentei
  "Paróquia " e **removi o sufixo de desambiguação** (bairro/cidade depois do travessão), que foi
  para `neighborhood`/`city`. Quatro nomes receberam o prefixo correto, não "Paróquia":
  *Catedral Metropolitana Nossa Senhora da Vitória*, *Basílica Santuário de Santo Antônio*,
  *Santuário do Rosário de Fátima* e *Convento Nossa Senhora da Penha*.
- **Recorrência mensal vira `baixa`**, como manda o README: 3 adorações das CEBs do Bom Pastor são
  "Primeira quinta-feira do mês" / "quinta-feira do mês" e não cabem em `MassSchedule`. Ficaram
  com o texto original em `notes`.

## Pontos para o enxame de validação

1. **Dois erros de cidade no endereço publicado pelo site, já corrigidos — conferir:**
   - *Paróquia Bom Jesus* (Cariacica): o site escreve **"Caricica-ES"** (falta o "a"). Gravei
     Cariacica; a nota está no registro.
   - *Paróquia São José de Anchieta*: o endereço é "José de Anchieta / **Serra** – ES" (bairro
     José de Anchieta, em Serra) — o município é **Serra**, não Anchieta. Confirmado pelo CNPJ
     `27.054.162/0003-40`, cadastrado em Serra.
   - *Paróquia Santíssima Trindade*: endereço "Rua **Fundão** s/nº, Vila Capixaba / **Cariacica**"
     — a rua chama Fundão, o município é Cariacica. Confirmado pelo CNPJ `/0060`.
2. **"São Geraldo – Domingos Martins" ficou de fora.** O agregador tem essa igreja
   (Rua Pedro Gerhardt, 59, Campinho, Domingos Martins, ficha de 16/02/2023, 2 horários) e ela não
   está entre as 91 do site nem entre as filiais ativas do CNPJ. É provavelmente **comunidade** de
   uma das três paróquias de Domingos Martins. Precisa de confirmação humana; os 2 horários não
   foram gravados.
3. **"Santa Clara – Jardim da Penha, Vitória"** (agregador, Av. Alziro Zarur 470) foi gravada como
   **capela da Paróquia São Francisco de Assis (Jardim da Penha)**, não como paróquia: a
   *Paróquia Santa Clara de Assis* da lista oficial fica em **Vila Bethânia, Viana**, endereço
   completamente diferente. Conferir se a capela pertence mesmo a São Francisco de Assis.
4. **"Santuário do Divino Espírito Santo" (Vila Velha, Centro)** foi gravado como comunidade da
   **Paróquia Nossa Senhora do Rosário**, porque o endereço que o agregador dá a ele
   (Rua Cabo Aylson Simões, 762) é **exatamente** o que o site oficial publica como endereço da
   Paróquia Nossa Senhora do Rosário — enquanto o agregador põe a matriz N. Sra. do Rosário na
   Prainha (R. Delmar Duarte). Uma das duas fontes está com o endereço trocado. Os 32 horários
   desta paróquia (22 do Santuário + 10 da Matriz) dependem dessa desambiguação.
5. **Só 12 das 91 paróquias têm horário** (166 no total). A arquidiocese **não publica grade de
   missas** — a ficha de paróquia não tem campo de horário, e apenas a Paróquia Bom Pastor (Serra)
   montou um mini-site com as CEBs e suas grades. O resto veio do agregador. É o principal buraco
   deste dataset.
6. **Só 10 comunidades.** Cinco CEBs + matriz da Paróquia Bom Pastor (Serra), a Capela Santa Clara
   e o Santuário do Divino Espírito Santo. Três outras paróquias (Santíssima Trindade,
   São Francisco de Assis/Porto de Santana e Maria Mãe da Igreja) têm páginas de "Rede de
   Comunidades" no site, mas os links que encontrei apontam para **notícias** sobre as comunidades,
   não para fichas com endereço e horário — vale um segundo passe.
7. **Seis paróquias usam um template de mini-site** que não tem os pares rótulo/valor; endereço,
   telefone e pároco delas foram lidos do rodapé da própria página:
   Bom Pastor (Serra), Nossa Senhora da Assunção (Anchieta), Nossa Senhora Aparecida (Vila Velha),
   Santíssima Trindade (Cariacica), São Francisco de Assis (Porto de Santana, Cariacica) e
   São Pedro Apóstolo (Nova Palestina, Vitória).
8. **`priestName` traz a linha inteira publicada**, que às vezes lista pároco + vigário
   (ex.: "Pe. Teodósio Cesar de Aquino (Pároco) / Pe. Eduardo de Oliveira Rodrigues (vigário)").
   O esquema não separa vigário.
9. **Marechal Floriano** (2 paróquias: Sant'Ana e São Miguel Arcanjo) não aparece na lista de
   municípios da arquidiocese na Wikipédia — o município emancipou-se de Domingos Martins em 1991
   e a lista está defasada. Os endereços oficiais confirmam Marechal Floriano.
10. **Sete fichas tinham o bairro grudado no logradouro**, sem vírgula, e foram separadas à mão
    (Sagrada Família/Jardim Camburi, Mãe da Divina Misericórdia/Marcílio de Noronha,
    São Tiago Maior/Setiba, Sagrada Família/Praia do Morro, São Francisco Xavier/Iriri,
    São José/Guarapari e N. Sra. de Lourdes/Pontões).
