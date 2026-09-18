# Diocese de Ruy Barbosa — relatório de pesquisa

- **Slug**: `ruy-barbosa` · **UF**: BA · **Sede**: Ruy Barbosa · **Província**: Feira de Santana · **Regional**: Nordeste 3
- **Pesquisa**: 18/09/2026
- **Bispo**: Dom Estevam dos Santos Silva Filho
- **Cúria**: Praça Amintas Brito, 95, Centro · 46800-000 · (75) 3252-2106
- **Site oficial**: <https://diocesederuybarbosa.com.br> — **vivo** (WordPress), mas **lento**
- **Foranias (4)**: Senhora Sant'Ana · São Francisco · Santa Luzia · Santa Dulce dos Pobres

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **26** — 25 `alta` · 1 `media` (só na Receita) |
| Comunidades | **26** (só as igrejas-matriz — a diocese não publica capelas) |
| Horários fixos | **9** (8 MASS · 1 ADORATION) — **todos `baixa`** |
| Paróquias com algum horário | **3 de 26** |
| Horários carregáveis (`alta`/`media`) | **0** |

**Cobertura: 26 de 26.** Mas **a diocese entra em produção sem nenhum horário.**

## Fontes principais

1. **REST do WordPress** — `/wp-json/wp/v2/paroquia?per_page=100` devolve **`X-WP-Total: 25`**.
   *Cuidado*: com `per_page=100` o servidor responde **504**; funcionou com `per_page=20` em duas
   páginas. Há também os tipos `clero`, `congregacao` e `pastorais_e_moviment`.
2. **A página pública de cada paróquia** (`/paroquia/<slug>/`) — traz endereço com CEP, telefone,
   e-mail (**ofuscado pelo Cloudflare em `data-cfemail`**, decodificado), **forania**, expediente da
   secretaria, **clero** e os institutos de vida consagrada presentes na paróquia.
3. **Receita Federal via `minhareceita.org`** — CNPJ raiz **13.230.735**, varredura de `/0001` a
   `/0060`: existem exatamente **30 inscrições**, nada além.
4. **Mapa das OSC / IPEA** — `cd_municipio = 2927200`, um filtro só, deu o CNPJ raiz.
5. `catholic-hierarchy.org/diocese/druba.html` — 24 paróquias e 22 presbíteros em 2022 (ap2023).
6. `liriocatolico.com.br` — só **4 fichas** no território da diocese, uma delas sem horário nenhum.

## Prova de completude — três contagens que fecham em 26

| Fonte | Total |
|---|---|
| `X-WP-Total` do tipo `paroquia` no site oficial | 25 |
| Filiais ATIVAS com nome de paróquia no CNPJ 13.230.735 | **26** |
| catholic-hierarchy (ap2023, dado de 2022) 24 + 2 criadas depois | **26** |

A Receita casa **uma a uma** com as 25 fichas do site e acrescenta **uma paróquia que o site não
publica**: a **PAROQUIA NOSSA SENHORA APARECIDA E SAO JOSE OPERARIO**, do bairro Vila Operária de
Ruy Barbosa (inscrição de **18/03/2024**) — **a segunda paróquia da cidade-sede**, ao lado da
Catedral. Gravada `media`; precisa de validação humana.

As 4 inscrições ativas que **não** são paróquia: a sede (`/0001`), o **Seminário Bom Pastor** em
Feira de Santana (`/0026`), a **Pastoral do Cuidado – PODES** em Mundo Novo (`/0033`) e o
**Santuário Diocesano Nossa Senhora das Graças** de Itaberaba (`/0030`).

### O Santuário Diocesano de Itaberaba ficou de fora

O CNPJ `13230735002601` registra, desde 15/07/2022, o **SANTUÁRIO DIOCESANO NOSSA SENHORA DAS
GRAÇAS**, na **Praça Nossa Senhora do Rosário, 450, Itaberaba** — a 10 metros da Paróquia Nossa
Senhora do Rosário (nº 460). É igreja não paroquial e **não tem missa publicada em fonte que
sustente `media` ou `alta`**, então, pela regra do README, não entrou no arquivo. Fica registrado
aqui para o enxame de validação.

**Atenção para não confundir**: a Paróquia Santa Dulce dos Pobres, também em Itaberaba, está
inscrita na Receita como **"Paróquia Nossa Senhora das Graças e Santa Dulce dos Pobres"**
(`13230735003098`, Loteamento 02 de Abril) — é **outra coisa**, e não o santuário.

## O problema desta diocese: nenhum horário oficial

**O site não publica horário de missa em lugar nenhum** — nem nas fichas de paróquia, nem em página
própria. As fichas têm "Funcionamento na Secretaria", não celebrações.

O Lírio Católico só tem **4 fichas** no território da diocese, e uma delas (Catedral Santo Antônio)
vem com os campos de missa, confissão e adoração **vazios**. Sobraram 9 horários, todos `baixa`:

| Paróquia | Do Lírio Católico |
|---|---|
| Senhora Sant'Ana (Ipirá) | qua 08:00; dom 08:00 e 19:30 |
| N. Sra. do Rosário (Itaberaba) | dom 07:30 e 19:30; qua 19:30; sex 07:00; adoração qui 19:30–20:30 |
| N. Sra. da Conceição (Mundo Novo) | dom 07:30 |

→ **A Diocese de Ruy Barbosa entra em produção com 0 horários carregáveis.** É o segundo maior
buraco desta rodada, depois de Eunápolis.

## Achados que precisam de atenção

1. **Jequitibá não é município.** A ficha se chama "Jequitibá – Paróquia N. Sra. Mãe do Divino
   Pastor (1981)", mas a Receita cadastra o CNPJ `13230735001478` no município de **Mundo Novo**,
   logradouro "Fazenda Jequitibá", CEP 44800-000. Gravei `city: "Mundo Novo"`,
   `neighborhood: "Jequitibá"` — é a **segunda paróquia de Mundo Novo**.
   **A ficha dessa paróquia nunca abriu**: o servidor devolveu **504** em quatro tentativas (inclusive
   com 110 s de timeout). O registro foi montado com o título da REST e o cadastro da Receita.
2. **Duas paróquias sem padre publicado, só com diácono**:
   - **Santa Dulce dos Pobres (Itaberaba)** — clero: Diác. Joaquim Gonçalves;
   - **Santa Luzia (Macajuba)** — clero: Diácono Genival de Jesus Araújo, com a coordenação pastoral
     a cargo das Irmãs Franciscanas de Allegany.
   Nos dois casos `priestName` ficou `null`, com o clero registrado em `notes`.
3. **Endereços que divergem entre o site e a Receita** (gravei sempre o do site): Catedral (Praça
   Santa Teresa 186 × Largo Mons. Sizínio Galvão de Souza), N. Sra. do Rosário/Itaberaba (Av. Luís
   Viana Filho 941 × Praça do Rosário 460), Boa Vista do Tupim (Av. Central 630 × Praça Ruy Barbosa),
   Miguel Calmon (Praça Rui Barbosa 44 × Rua Serafim Barreto 40), Wagner (Rua 26 de Janeiro × Rua
   Dois de Julho), Macajuba, Utinga, Mundo Novo.
4. **CEP truncado** na ficha de Ipirá/Senhora Sant'Ana: "446000". O correto, pela Receita, é
   **44600-000**.
5. **Endereço malformado** em Bonito: "217, R. Tancredo Neves, 141, Bonito - BA, 46820-000" — começa
   com um "217," solto.
6. **Piritiba**: o título oficial e a Receita dizem "Senhor Bom Jesus", mas o e-mail da paróquia é
   `paroquia.senhordobonfim1972@gmail.com`. Mantive o nome da fonte oficial.
7. **A inscrição de Wagner na Receita (`13230735000587`) está sem nome fantasia** — casa pelo
   endereço e município.
8. **8 paróquias sem telefone publicado** e **3 sem e-mail** (Ibiquera, Itaetê, Bom Pastor/Pau Ferro).

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- **`address`**: está `Rua Antonio Novais s/n, C.P. 45`. **Os dois rodapés do próprio site
  divergem**: um dá "R. Antônio Novaes - Ruy Barbosa, CEP 46800-000" e o outro "Praça Amintas Brito,
  N° 95, Bairro Centro". A **Receita registra a matriz do CNPJ na Praça Amintas Brito, 95, Centro** —
  gravei essa. Precisa de validação humana.
- **`phone`**: está `(75) 3252-2106`. Um dos rodapés do site publica **(74) 9 9995-5942** (DDD 74,
  que é o do norte do estado, não o de Ruy Barbosa) — provável WhatsApp. Não troquei.
- **`email`**: está `null`. O site não publica e-mail geral da cúria; só o
  `pascom@diocesederuybarbosa.com.br` que aparece em todas as fichas (é da Pascom, não da cúria).
- **`website`**, **`zipCode`**, **`bishopName`** e **`foundedYear` (1959)** conferem — **nada a mudar**.

## O que ficou por fazer

- **Horários**: o item nº 1. Seria preciso ir ao Instagram/Facebook de cada uma das 26 paróquias.
- **Comunidades/capelas**: a diocese não publica nenhuma lista. Curiosamente, o e-mail da paróquia de
  Itaberaba é `rededecomunidades17nsr@yahoo.com.br` ("rede de comunidades 17"), sugerindo 17
  comunidades — mas sem lista nominal não dá para gravar.
- **A ficha de Jequitibá** (504 persistente) — vale nova tentativa em outro momento.
- **Decidir o estatuto do Santuário Diocesano N. Sra. das Graças** (Itaberaba).
