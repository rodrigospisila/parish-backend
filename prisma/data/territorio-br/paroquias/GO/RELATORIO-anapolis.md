# Diocese de Anápolis (GO) — relatório de pesquisa

- Agente de pesquisa, rodada **Goiás**, coleta em **11/09/2026**.
- Arquivo: `paroquias/GO/anapolis.json`.

## Números

| Item | Valor |
|---|---|
| Registros no arquivo | **63** |
| Paróquias/santuários de fato | **58** (5 vão com `status: "nao-paroquial"`) |
| Confiança das paróquias | 63 `alta` |
| Municípios cobertos | 19 |
| Comunidades/capelas | **63** (só a matriz de cada uma — a diocese não publica capelas) |
| Horários fixos | **404** (21 `alta` · 383 `baixa`) — 296 missas e 108 confissões |
| Paróquias com pelo menos 1 horário | 38 de 63 |
| Com endereço 63 · CEP 59 · telefone 62 · e-mail 63 · pároco 18 · ano de criação 60 |

## Fontes principais

1. **Portal oficial** — `https://www.diocesedeanapolis.org.br`
   - `/paroquias-por-regiao/` → lista canônica das **63 unidades**, agrupadas nas 4 regiões
     pastorais (Anápolis Sul, Anápolis Norte, Região Leste, Região Oeste), com a cidade no rótulo.
   - `/paroquias-26-old/` → grade com nome, cidade e telefone das 63.
   - **`/detalhes-da-paroquia/`** → a página inteira embute, num `<script>` inline, um array
     JavaScript `const paroquias = [...]` com **as 63 fichas completas**: `nome`, `cidade`,
     `telefone`, `endereco`, `criacao` (data de ereção), `email`, `territorio` (bairros da
     paróquia), `clero` (lista histórica de párocos com período), `horarios`, `instagram`,
     `paroco`, `vigarios`, `colaborador`, `residente`, `diacono`. Foi daí que veio praticamente
     todo o conteúdo deste arquivo.
2. **catholic-hierarchy.org** (`/diocese/danap.html`) — 58 paróquias, 461.360 católicos,
   erigida em 11/10/1966, bispo Dom Waldemar Passini Dalbello (11/11/2025).
3. **horariodemissa.com.br** — único agregador com cobertura da diocese; 39 fichas em 19
   municípios, 37 com missas. Entra tudo como `baixa` (ver abaixo).

### Truques que fizeram diferença (para o README)

- **Todas as listagens JetEngine do site estão quebradas**: `/paroquias/`, `/paroquia?id=<slug>`,
  `/horario-de-missas-anapolis/`, `/horario-de-confissoes-anapolis/` e
  `/horario-de-missas-outras-cidades/` devolvem HTTP 200 com o corpo
  *"Please select listing to show."* (o widget perdeu a listagem associada). O portal parece
  intacto de fora — só percebendo pelo tamanho idêntico das páginas (~202 KB).
- **A página quebrada guardava o dado**: a versão antiga `/detalhes-da-paroquia/` (e a
  `/paroquias-26-old/`) ainda está publicada e traz o dataset inteiro embutido como array JS.
  `node -e` resolve o literal de objeto (chaves sem aspas) melhor do que qualquer regex.
- **A REST do WordPress não ajuda aqui**: não existe post type de paróquia; o CPT
  `calendario_missas` (14 itens) é um calendário de eventos com registros de teste. O dado vive
  num *Advanced Content Type* do Pods, e `/wp-json/pods/v1/*` exige autenticação.
- **O Arquivo da Internet não serve para horário nesta diocese**: as únicas capturas de
  `/missas-em-anapolis/por-dia-e-horario/` são de 2011–2012 e a de `/horario-de-missas-anapolis/`
  é de 2017 — todas anteriores à pandemia, e portanto descartadas pela regra do README.

## Cobertura vs. esperado

- 63 registros publicados − 5 não paroquiais = **58 paróquias/santuários**, exatamente o número
  que a catholic-hierarchy.org atribui à diocese. Cobertura da LISTA: **100%**.
- Marcados `status: "nao-paroquial"`: Capelania Militar Nossa Senhora de Loreto e Capelania da
  Saúde São Camilo de Lellis (a própria diocese as chama de capelania), Seminário Maior Diocesano
  Imaculado Coração de Maria, Seminário Propedêutico São José e a *Região Pastoral Nossa Senhora
  de Fátima* (Edilândia, Cocalzinho de Goiás), que a diocese publica como região pastoral, ainda
  não erigida em paróquia. A Capelania Militar recebeu `loadAsParish: true` porque tem missa
  publicada.

## Pontos para validação humana

1. **Horários são o ponto fraco desta diocese.** Só **3 paróquias** têm grade publicada pela
   própria diocese (Catedral Bom Jesus, Santuário Diocesano de Sant'Ana e N. Sra. D'Abadia de
   Anápolis) — 21 horários `alta`. As outras 35 grades vieram do agregador
   horariodemissa.com.br e estão **todas `baixa`**, porque: (a) é fonte única e não oficial;
   (b) o site não publica data de atualização por ficha e ainda exibe avisos de topo do tipo
   *"…um Santo Natal e um Feliz 2019!"*, ou seja, sem sinal de atualidade. Pela regra de carga do
   README, **a diocese entra em produção com 21 horários**. É o mesmo caso consciente de Pouso
   Alegre/Caratinga. Para virar `media` bastaria corroborar com uma segunda fonte
   (Instagram das paróquias — o array oficial traz o `@` de 8 delas).
2. **25 registros ficam sem horário nenhum**, entre eles paróquias grandes de Anápolis:
   Sagrado Coração de Jesus, Sagrada Família, Santa Clara, Santíssima Trindade, São Mateus,
   São João Evangelista, São Pedro e São Paulo, São Pedro Apóstolo, Santo Antônio de Santana
   Galvão, Jesus Bom Pastor, N. Sra. das Graças, N. Sra. de Lourdes, N. Sra. Rosa Mística e
   Santa Terezinha do Menino Jesus; fora Campo Limpo de Goiás, Jesúpolis, Vila Propício,
   Jaranápolis, Nerópolis (Imaculado Coração de Maria) e Santa Bárbara de Pirenópolis.
3. **Nenhuma comunidade/capela**: a diocese não publica capelas em lugar nenhum do portal.
   Cada paróquia entra só com a matriz. É a maior lacuna depois dos horários.
4. **`priestName` só em 18 de 63**: o array oficial preenche `paroco` em 18 fichas; nas demais o
   campo está vazio (embora o histórico `clero` esteja completo, com o último período muitas
   vezes aberto em "….."). Não foi inferido pároco a partir do histórico.
5. **Duas igrejas que o agregador lista e a diocese não** (ficaram FORA do arquivo, para não
   inventar paróquia): *Santuário Santo Expedito* (Rua PSJ 10, São Jerônimo, Anápolis — 2 missas)
   e *Capela Santa Maria das Vitórias* (Rua Espírito Santo, Lt. 27, Vila Santa Rita, Anápolis —
   só confissões). Provavelmente são santuário/capela dentro de alguma paróquia existente;
   vale conferir.
6. **O agregador funde dois titulares**: publica *"Paróquia Nossa Senhora Aparecida e São Pedro
   e São Paulo"* no mesmo endereço (Rua Rialma, Qd. 13, Lt. 07, Jd. Alexandrina) que a diocese
   registra para a **Paróquia Nossa Senhora Aparecida** de Anápolis. Os horários foram atribuídos
   a ela; conferir se não pertencem à Paróquia São Pedro e São Paulo (Maracanã).
7. **CEP incoerente**: a ficha da *Paróquia Imaculado Coração de Maria e São Judas Tadeu*
   (Jaranápolis) traz CEP 72980-000, que é de Pirenópolis, enquanto Jaranápolis é distrito de
   Jaraguá. O CEP foi removido (`zipCode: null`) e a observação ficou em `notes`.
8. **Distritos normalizados para o município** (o `city` publicado pela diocese era o distrito):
   Souzânia e Interlândia → Anápolis; Abadiânia Velha / Posse d'Abadia → Abadiânia;
   Olhos d'Água → Alexânia; Girassol e Edilândia → Cocalzinho de Goiás; Jaranápolis → Jaraguá;
   "Terezópolis" → Terezópolis de Goiás. O nome do distrito ficou em `neighborhood`.
9. **`website` guarda o Instagram oficial** quando a diocese publicou a URL (8 paróquias); nas
   demais o campo do array vinha como `"#"` e foi anulado.
10. **108 horários de confissão** vieram junto do agregador e estão `baixa` como as missas.
    O agregador publica faixas ("08:00 às 10:00, 14:00 às 16:00"); foi gravado só o início da
    primeira faixa, com a faixa completa em `notes`.
