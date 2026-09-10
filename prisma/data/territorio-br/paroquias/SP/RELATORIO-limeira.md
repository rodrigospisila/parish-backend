# Diocese de Limeira (SP) — relatório de pesquisa

- **Arquivo**: `paroquias/SP/limeira.json`
- **Data da coleta**: 2026-09-10
- **Resultado**: **100 paróquias** (96 `alta`, 4 `media`), **468 comunidades/capelas**
  (100 matrizes + 368 comunidades), **715 horários fixos** (572 `alta`, 35 `media`, 108 `baixa`).
- **Cobertura**: 100 encontradas / **99 esperadas** (catholic-hierarchy.org, estatística de 2023).
- **16 municípios**, **5 foranias**, todos cobertos.

---

## 1. Fontes

### 1.1 Site oficial ATUAL — `https://diocesedelimeira.org.br` (WordPress)

É a fonte canônica e está viva: os 96 posts do tipo `paroquias` foram modificados em **14/08/2026**.

| Recurso | Uso |
|---|---|
| `wp-json/wp/v2/paroquias?per_page=100` (`X-WP-Total: 96`) | lista canônica, endereço, CEP e lista de capelas/comunidades no `content` |
| `wp-json/wp/v2/cidade` (16) e `wp-json/wp/v2/forania` (5) | município e forania de cada paróquia |
| `https://diocesedelimeira.org.br/missas/` | **horários de missa atuais** (campo ACF `field_664d59d85a487` em 90 das 96 paróquias) |
| `https://diocesedelimeira.org.br/horarios-de-missas/` | **telefone** (96/96) e horário de atendimento da secretaria |
| `https://diocesedelimeira.org.br/paroquias/<slug>/` | URL de proveniência de cada paróquia |

As duas grades (`/missas/` e `/horarios-de-missas/`) são renderizadas pelo WPBakery com todos os 96
itens no HTML — não há paginação AJAX a resolver.

### 1.2 Portal ANTERIOR — `https://diocesedelimeira.com.br` (PHP, ainda no ar)

Muito mais rico por registro, mas **sem sinal de atualidade**: a última notícia do portal é de
**março/2025** e as fotos das paróquias param em 01/2025. Endpoints usados:

- `paroquia.php?id=N` (N = 1…104, varrido por força bruta): pároco, padroeiro, data de criação,
  endereço completo, telefones, e-mail (ofuscado pelo Cloudflare, decodificado por XOR do 1º byte),
  site, atendimento, **horários de missa por comunidade** e a lista completa de comunidades/capelas.
- `horario_missa_paroquia.php?ambiente=site&id=N` — mesma seção de horários.
- `foranias.php`, `paroquia_lista.php?cidade=…&forania=…`, `horario_missa_mapa.php` — mapa por cidade.

Observação técnica: os links de `paroquia_lista.php` no HTML estão com **duplo encoding** (mojibake),
por isso as cidades acentuadas devolvem página vazia se o href for reusado literalmente. A varredura
direta por `id` contorna isso e foi o caminho adotado (ids válidos: 2–98 e 101–104; 1 = Cúria,
104 = Seminário, 99/100 inexistentes).

### 1.3 Corroboração

- `catholic-hierarchy.org/diocese/dlime.html` — 99 paróquias (ano 2023, fonte `ap2024`);
  ereção em **29/04/1976** (desmembrada da Arquidiocese de Campinas e da Diocese de Piracicaba).
- Notícias do próprio site diocesano sobre a sede vacante e o administrador diocesano.

---

## 2. Como as duas fontes foram combinadas

1. **Identidade da paróquia** (nome, cidade, forania, endereço, CEP, telefone): site atual.
2. **Dados que só o portal anterior publica** (pároco, padroeiro, ano de criação, e-mail, site
   próprio): portal anterior.
3. **Horários**: `/missas/` do site atual quando existe (90 paróquias, `alta`); portal anterior como
   segunda opção (6 paróquias, `media`).
4. **Comunidades**: união das duas listas, deduplicada por nome normalizado.

**Confiança das paróquias**: `alta` para as 96 confirmadas pelos dois portais; `media` para as 4 que
só constam no portal anterior.

**Confiança dos horários**: `alta` para o site atual (página ativa, posts com `modified` de 08/2026);
`media` para o portal anterior (fonte oficial **sem** sinal de atualidade); `baixa` para recorrência
mensal (ver §4.1).

---

## 3. Divergências de cobertura (86 × 96 × 99 × 100)

| Contagem | Fonte |
|---|---|
| 86 | Wikipédia — **desatualizado**, não usar |
| 96 | `wp-json/.../paroquias` do site atual |
| 99 | catholic-hierarchy.org (2023) — usado como `parishesExpected` |
| **100** | união site atual + portal anterior (este dataset) |

As 4 paróquias que **só aparecem no portal anterior** (gravadas com `confidence: "media"` e um
campo `notes`) são:

| Paróquia | Cidade | Sinais de que é real |
|---|---|---|
| Quase-paróquia Nossa Senhora de Lourdes | Araras | pároco (Pe. Donizete Quirino dos Santos), endereço, e-mail `nsralourdes.araras@diocesedelimeira.org.br`, 6 horários |
| Paróquia Sagrado Coração de Jesus | Cosmópolis | criada em 05/12/2014, Pe. Diego Fabian Humeniuk, tel. (19) 3882-3529, e-mail diocesano |
| Paróquia Santo Expedito | Limeira | criada em 09/02/2014, tel. (19) 3444-4860, e-mail `stoexpedito@diocesedelimeira.org.br`, 6 comunidades |
| Paróquia Santa Luzia | Nova Odessa | Pe. Luís Ferreira Casimiro Júnior, tel. (19) 3363-6219, e-mail diocesano |

Todas têm e-mail no domínio `@diocesedelimeira.org.br`, o que sustenta que são paróquias reais
omitidas da migração para o site novo — **mas isso precisa de confirmação com a Cúria** (§6).

Uma paróquia mudou de nome entre os portais e foi tratada como **um único registro**, com o nome
atual: *Santuário São Manoel* (antigo) → **Santuário São Manoel e Nossa Senhora Aparecida** (atual).

O dataset inclui **9 quase-paróquias**. Nenhuma entrada não paroquial (capelania, igreja de convento,
rito oriental) foi identificada — a diocese não publica esse tipo de registro na lista.

---

## 4. Horários

- **715 horários**, todos do tipo `MASS`. A diocese publica **apenas missas** — não há página de
  confissões, adoração ou terço. Por isso o dataset tem **0 `CONFESSION`, 0 `ADORATION`, 0 `ROSARY`**.
- Distribuição por dia: domingo 275, sábado 152, sexta 92, quarta 70, quinta 64, terça 43, segunda 19.
- 668 vêm do site atual, 47 do portal anterior.
- **4 paróquias ficaram sem nenhum horário** porque a fonte não publica: São Francisco de Assis
  (Americana), Nossa Senhora de Fátima (Araras), de Nossa Senhora Aparecida (Araras) e
  Santo Expedito (Limeira).

### 4.1 Recorrência mensal → `confidence: "baixa"` (108 horários, 46 paróquias)

Seguindo a regra do dataset, tudo que a fonte descreve como "1ª sexta-feira do mês", "2ª quinta de
cada mês", "todo dia 22", "de 15 em 15 dias" etc. **não cabe em `MassSchedule`** (que só tem dia da
semana). Esses registros ficaram `baixa`, com o texto literal copiado em `notes` começando por
`"Recorrência mensal (não cabe no modelo semanal): …"`. Concentração: Santa Gertrudes/Cosmópolis (10),
Nossa Senhora Aparecida/Pirassununga (7), Santa Rita de Cássia/Artur Nogueira (5),
Sagrado Coração de Jesus/Conchal (5), Quase-paróquia São José Operário/Conchal (5),
Sagrado Coração de Jesus/Cosmópolis (5), São Pedro/Engenheiro Coelho (5).

### 4.2 Adoração e novena embutidas na missa

10 registros trazem no `notes` menção a adoração/Santíssimo (ex.: *"Quinta-feira: 19h30 com Adoração
e Benção do Santíssimo"*). Como a fonte é o campo **"Horário das missas"** e o texto descreve a missa,
foram gravados como `MASS` com o texto integral em `notes` — não como `ADORATION`. Se o Parish quiser
separar os dois eventos, esses 10 são o ponto de partida.

### 4.3 Validação automática aplicada

Cada horário foi conferido nos dois sentidos contra o texto bruto da fonte:
**0 horários da fonte ficaram de fora** e **0 horários inventados**. Também: 0 referências órfãs
(todo `schedules[].community` existe em `communities`), 0 nomes de comunidade com ruído,
0 slugs duplicados, 1 matriz por paróquia.

---

## 5. Sede vacante — atenção

A **Diocese de Limeira está em sé vacante** desde **08/01/2026**, quando Dom José Roberto Fortes
Palau foi transferido para a Arquidiocese de Sorocaba. O Colégio de Consultores elegeu o
**Padre Cássio Roberto Rossette** como **administrador diocesano** (ele também é pároco do Santuário
São Manoel e Nossa Senhora Aparecida, em Leme). Bispo emérito: Dom Vilson Dias de Oliveira, DC
(renúncia em 17/05/2019).

Por isso `diocese.bishopName` está **`null`** — administrador diocesano não é bispo. Se qualquer
fonte ainda listar Dom José Roberto como bispo de Limeira, o dado está desatualizado.

---

## 6. Pontos para validação humana

1. **As 4 paróquias que só existem no portal anterior** (§3). Confirmar com a Cúria se seguem ativas,
   se foram extintas/incorporadas, ou se apenas faltaram na migração do site. São o único bloco
   `media` do arquivo.
2. **`priestName` pode estar desatualizado.** Os párocos vêm do portal anterior, cuja última
   atualização visível é de março/2025 — e há registros de trocas de pároco em 2025/2026 nas notícias
   do site novo (ex.: "Padre Nilson toma posse como administrador paroquial da Paróquia Imaculada
   Conceição de Leme"). O site atual **não** publica o pároco por paróquia (só 1 das 96 traz o campo),
   e o post type `clero` (159 registros) não tem vínculo com a paróquia. 5 paróquias ficaram com
   `priestName: null`: São José/Americana, São Judas Tadeu/Araras, São Sebastião/Descalvado,
   Nossa Senhora de Fátima/Limeira, Santo Expedito/Limeira.
3. **Atribuição de comunidade em 3 horários de Santo André Apóstolo (Limeira).** O site publica
   `"Quarta-feira: 10h – Recanto dos Idosos | Sábado: 16h – São Geraldo Majella / 18h - Matriz"`,
   um formato livre em que o local vem depois da hora sem palavra-chave. Os dias e horas estão certos;
   `qua 10:00` e `sab 16:00` foram atribuídos à Matriz quando pertencem, respectivamente, ao
   Recanto dos Idosos e a São Geraldo Majella.
4. **Basílica de Nossa Senhora do Patrocínio (Araras)**: `dom 08:30` foi gravado na Matriz, mas a
   fonte diz *"e às 8h30 na Comunidade Santo Antônio"*.
5. **`foundedYear` ausente em 29 paróquias** — o portal anterior simplesmente não publica a data
   nesses casos. Os 71 anos coletados vão de **1824 a 2018**, bem distribuídos: são datas históricas
   reais de ereção, **não** timestamps de CMS (foi verificado explicitamente).
6. **2 paróquias sem CEP** (São Marcos/Limeira, Santa Luzia/Nova Odessa) e **1 sem telefone**
   (Quase-paróquia Nossa Senhora de Lourdes/Araras) — a fonte não publica.
7. **`neighborhood` é melhor-esforço** (9 nulos). Vem do trecho após o traço no logradouro ou da
   segunda linha do endereço; alguns podem ser condomínio/referência em vez de bairro.
   Caso conhecido: a comunidade Santa Luzia da Paróquia Santo Expedito ficou com endereço
   `"Rodovia Limeira - Mogi-Mirim"` — correto, mas o nome da cidade faz parte do nome da rodovia.
8. **11 paróquias têm site próprio** (basílicas, catedral, santuários e algumas paróquias). Um deles
   é uma página do Facebook (São José Operário/Leme) — pode-se preferir deixar `null`.
9. **Horário de atendimento da secretaria** está publicado em `/horarios-de-missas/` para as 96
   paróquias do site atual. **Não foi gravado** porque não há campo no esquema do dataset. Se o Parish
   passar a ter esse campo, a fonte está pronta.

---

## 7. Conflito de gravação

Ao final da coleta, o arquivo `paroquias/SP/limeira.json` já existia, gravado por **outro agente
alguns minutos antes** (99 paróquias, 576 comunidades, 673 horários, tudo `alta`). Esta versão o
substituiu. Comparação:

| | Versão anterior | Esta versão |
|---|---|---|
| Fonte | só `diocesedelimeira.com.br` (portal antigo) | site atual `.org.br` + portal antigo |
| `diocese.website` | `diocesedelimeira.com.br` (desatualizado) | `diocesedelimeira.org.br` |
| Paróquias | 99 | **100** (inclui Paróquia Santo Expedito/Limeira) |
| Horários | 673, todos `alta` (fonte de 2025) | 715, sendo 572 `alta` (fonte de 08/2026) |
| Comunidades | 576, com ruído — entradas como `"Tel.: (19) 3406-1567"`, `"E-mail: …"`, `"Coordenadora: Giuliana Meira"`, `"Jardim Ipiranga"` viraram comunidades | **468**, limpas (instituições e linhas de endereço descartadas) |
| CEP | `"13468580"` (sem máscara) | `"13468-580"` |
| Sede vacante | não tratada | `bishopName: null` + explicação |

Se outro agente gravar por cima depois desta rodada, vale reconciliar a partir deste relatório.
