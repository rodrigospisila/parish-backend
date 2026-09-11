# Ordinariado Militar do Brasil — relatório de pesquisa

- **UF da pasta:** DF (só a **sede**) · **slug:** `ordinariado-militar` · **sede:** Brasília/DF
- **Âmbito:** **NACIONAL, não territorial.** Cuida das capelanias católicas das Forças Armadas e das
  Forças Auxiliares (Polícia Militar e Corpo de Bombeiros) no país inteiro. O campo `state` de cada
  registro é a **UF onde a capelania funciona**, e não DF.
- **Data da coleta:** 11/09/2026
- **Arquivo:** `ordinariado-militar.json`

## Resultado

| | |
|---|---|
| Registros no arquivo | **179** |
| — do índice oficial de capelanias | 174 |
| — só da página oficial de horários do DF | 3 |
| — vindos de fonte cruzada (outra diocese) | 2 |
| Registros que **entram na carga** | **7** |
| UFs cobertas | **26** (todas, exceto o Amapá) |
| Municípios distintos | **80** |
| Com endereço | 179 (100%) · com CEP 164 · com telefone 153 · e-mail 21 · site 28 |
| Horários fixos | **60** (54 `alta`, 6 `baixa`) |
| Comunidades | 7 matrizes (uma por registro que carrega e tem culto) |
| Cobertura | 179 fichas encontradas · 149 "paróquias" esperadas (Anuário 2023) |

### Distribuição por UF

`RJ 43 · DF 16 · MG 14 · SP 14 · RS 11 · AM 10 · PE 7 · BA 6 · CE 6 · MS 6 · PA 6 · RN 6 · PR 5 ·
GO 4 · MA 4 · SC 4 · AL 3 · ES 2 · PI 2 · RO 2 · RR 2 · TO 2 · AC 1 · MT 1 · PB 1 · SE 1`

### Distribuição por força

Exército 64 · Aeronáutica 42 · Marinha 36 · Polícia Militar 28 · Corpo de Bombeiros 6 · 3 sem força
declarada (as fichas novas do DF).

## Fontes

1. **`https://arquidiocesemilitar.org.br/locais/capelanias`** — índice oficial. Cada capelania é um
   post do tipo `local` (`/local/<slug>`, WordPress + Elementor), com endereço, telefone e, às vezes,
   e-mail e site, em widgets `text-editor` numa ordem fixa. Foram baixadas e lidas as **174** páginas.
   O total foi conferido pelas cinco páginas por força: Marinha 36, Exército 63, Aeronáutica 42,
   Polícia Militar 29, Corpo de Bombeiros 7 (soma 177 — 3 fichas aparecem em duas forças).
2. **`https://arquidiocesemilitar.org.br/horarios-de-missas`** — a **única** página de grade fixa do
   OMB, e só do Distrito Federal: 6 lugares, com endereço, telefone, site e horários.
3. `https://arquidiocesemilitar.org.br/local/catedral-militar-rainha-da-paz` — a ficha da Catedral é
   a única do índice que traz grade de missas própria (mais detalhada que a da página de horários).
4. catholic-hierarchy.org (`dmlbr`) — estatística do Anuário; Wikipédia; `/historia` do próprio OMB.

**O que a fonte NÃO tem:** nome do padroeiro da capelania (o índice usa o nome da organização
militar), nome do capelão por local, e horário de missa fora do DF. Não existe API REST útil: o post
type `local` não é exposto em `wp/v2` e o `sitemap.xml` (426 URLs) é quase todo de notícias.

## Decisões de modelagem

- **Prefixo `Capelania Militar …`** nos 170 registros que a fonte publica com o nome da unidade
  militar (ex.: `Capelania Militar Comando Militar do Leste`). O prefixo mantém a entrada fora da
  carga, como manda o importador, e o nome da unidade fica preservado no campo extra `militaryUnit`.
- **Campos extras**: `militaryUnit` (organização militar) e `militaryBranch` (Marinha / Exército /
  Força Aérea / Polícia Militar / Corpo de Bombeiros), e `scope: "nacional"` no bloco da diocese.
- **`loadAsParish: true`** só onde há **missa fixa publicada** e o nome não tem prefixo aceito pelo
  importador — um caso: a `Capela Militar de São Paulo Apóstolo (PMDF)`.
- **`slug`**: `<slug-da-ficha-do-OMB>-<cidade>` (ex.: `comando-militar-do-leste-rio-de-janeiro`).
  A regra do README (`<nome-sem-prefixo>-<cidade>`) produziria slugs como
  `militar-comando-militar-do-leste-…`; usar o slug da própria fonte é mais curto, estável e único.
  Os 179 slugs foram conferidos: não há repetição.
- **Sem comunidades** nas capelanias sem culto publicado (`communities: []`) — o importador cria a
  matriz sozinho se algum dia elas entrarem.

## Os 7 registros que entram na carga

| Nome | Cidade/UF | Horários |
|---|---|---|
| Catedral Militar Rainha da Paz | Brasília/DF | 9 |
| Paróquia Militar de São Miguel Arcanjo e Santo Expedito | Brasília/DF | 21 |
| Paróquia Militar do Oratório do Soldado | Brasília/DF | 8 |
| Paróquia Militar do Divino Espírito Santo (CBMDF) | Brasília/DF | 6 |
| Capela Militar de São Paulo Apóstolo (PMDF) — `loadAsParish` | Brasília/DF | 2 |
| Santuário da Mãe Rainha e Vencedora Três Vezes Admirável de Schoenstatt | Brasília/DF | 8 |
| Paróquia Nossa Senhora de Loreto (Militar) | Lagoa Santa/MG | 0 |

Três fichas das seis do DF foram **fundidas** com a ficha correspondente do índice de capelanias,
porque é o mesmo lugar (mesmo telefone): Catedral, `PM DF` → Capela de São Paulo Apóstolo, e
`CBM DF` → Paróquia do Divino Espírito Santo. Nesses três casos o endereço gravado é o da **igreja**
(página de horários), e o endereço do quartel ficou registrado em `notes` — no caso do CBMDF os dois
são diferentes de verdade (SAIN, o comando; SAIS, a igreja).

## As duas fichas vindas de fonte cruzada

O prompt já apontava duas entidades do OMB citadas por dioceses latinas; ambas **não têm ficha** no
índice `/locais/capelanias` e foram acrescentadas aqui, que é onde elas pertencem:

- **Capelania Militar São Sebastião** — Av. Duque de Caxias, 760, Vila Militar, Deodoro,
  Rio de Janeiro/RJ. O próprio OMB noticia posse de capelães nela; a Arquidiocese do Rio não a lista
  entre as suas paróquias, e `RJ/sao-sebastiao-do-rio-de-janeiro.json` já a marcou
  `status: "outra-jurisdicao"`, apontando para cá. Os **6 horários vieram de agregador** e ficaram
  `baixa`, sem `loadAsParish` — não entram na carga.
- **Paróquia Nossa Senhora de Loreto (Militar)** — Av. Brigadeiro Eduardo Gomes s/nº, Vila Asas,
  **Lagoa Santa/MG** (Base Aérea / PAMA-LS), CEP 33400-000, (31) 3689-3275, fundada em 1986.
  Dados do **Catálogo 2026 da Arquidiocese de Belo Horizonte** (item 7.13 B), que a publica por
  cortesia e cujo dataset a marca `outra-jurisdicao`. *Atenção:* o prompt a situava em Belo
  Horizonte; a fonte oficial diz **Lagoa Santa**. Sem horário publicado, mas entra na carga por ser
  paróquia de verdade.

Outras duas capelanias militares aparecem em datasets de dioceses latinas e **não** foram duplicadas
aqui — só usadas para enriquecer o nome ou registradas como referência cruzada:

- `Capelania Militar Nossa Senhora das Graças` (AMAN, Resende/RJ): o padroeiro veio da ficha da
  Diocese de Barra do Piraí-Volta Redonda e foi aplicado à ficha da Academia Militar das Agulhas
  Negras. Lá está como `nao-paroquial` (não carrega).
- `Capelania Militar Santa Efigênia – 10º BPM` (Montes Claros/MG): está em
  `MG/montes-claros.json` **sem** marca de outra jurisdição, ou seja, **carrega a partir de lá**.
  Não foi replicada aqui para não duplicar — mas o certo seria marcá-la `outra-jurisdicao` no arquivo
  de Montes Claros e trazê-la para cá. **Fica para validação humana.**

## Pontos para o enxame de validação

1. **170 das 179 fichas não têm horário de missa nenhum.** Não é falha de coleta: o OMB só publica
   grade do Distrito Federal. Levantar horário das capelanias do Rio (43), de São Paulo (14) e de
   Minas (14) exigiria ir a fonte por fonte (Instagram de capelania, agregadores), quase sempre em
   `baixa`. Decisão consciente de não fazer nesta rodada.
2. **A ficha `PM MG – Santa Efigênia` está incoerente na própria fonte**: endereço "Rua Cmte Nélio
   nº 111 – Centro – Santa Efigênia – CEP: 39725-400 – **LAVRAS** – MG" com telefone de DDD **98**
   (Maranhão). O CEP 39725-400 é de **Santa Efigênia de Minas**, não de Lavras. Gravei `Lavras`,
   que é o que a fonte diz. Precisa de conferência.
3. **`PM RJ – Mesquita`**: o endereço termina em "NOVA IGUAÇU – RJ", mas a rua e o título são de
   **Mesquita** (município emancipado de Nova Iguaçu). Gravei `Mesquita`.
4. **`Comando em Chefe da Esquadra`**: o endereço diz "Ilha do Mocanguê – **Niterói** – CEP 24040-300
   – **Rio de Janeiro** – RJ". Gravei `Niterói` (onde fica a Ilha do Mocanguê).
5. **16 fichas não traziam cidade/UF extraível** (estado por extenso, CEP grudado no nome da cidade,
   ou nenhuma cidade). Foram corrigidas à mão pelo CEP/logradouro — lista no código, e todas as 179
   têm agora cidade e UF. Vale revisar as de navio (`Fragata União e Fragata Liberal`,
   `Navio Polar Almirante Maximiano`, `Navio de Apoio Oceanográfico Ary Rongel`): o endereço é o do
   **porto de origem**, não um lugar de missa.
6. **`Santuário … de Schoenstatt` (Brasília/DF)** aparece na página de horários do OMB, mas **não**
   na lista de paróquias da Arquidiocese de Brasília. É um santuário de Schoenstatt, não uma
   capelania militar. A jurisdição precisa de confirmação — se for da Arquidiocese, o registro deve
   migrar para `DF/brasilia.json`.
7. **Fichas repetidas na própria fonte** — quatro pares são a mesma capelania publicada duas vezes:
   `Comando da 6ª Região Militar` / `Comando da 6ª Região Militar do Exército` (Praça Duque de
   Caxias, Mouraria, Salvador/BA); `Comando Militar do Oeste` / `Comando Militar do Oeste e 9ª Região
   Militar` (Av. Duque de Caxias 1628, Campo Grande/MS); `2º Centro Integrado de Defesa Aérea e
   Controle de Tráfico Aéreo` / `SEGUNDO CENTRO INTEGRADO … CINDACTA II` (Av. Erasto Gaertner 1000,
   Bacacheri, Curitiba/PR); `Grupamento de Infraestrutura e Apoio` / `… de São José dos Campos`
   (Praça Mal. Eduardo Gomes 50, São José dos Campos/SP). As duas versões de cada par foram mantidas
   porque nenhuma delas carrega; se um dia carregarem, os quatro pares precisam ser fundidos.
   Outros dois pares **compartilham endereço mas são unidades distintas** e devem continuar separados:
   `Comando da 11ª Região Militar` e `Comando Militar do Planalto` (Avenida do Exército, SMU,
   Brasília — inclusive com o mesmo telefone), e `Fragata União e Fragata Liberal` e o
   `Serviço de Assistência Religiosa da Marinha – SARM` (Praça Barão de Ladário, Rio de Janeiro).
8. **Número esperado**: o Anuário oscila demais para servir de meta (169 em 2013, 165 em 2016, 152 em
   2019, 170 em 2021, **149 em 2023**). Usei 149 em `parishesExpected`, mas a referência real é o
   índice oficial: **174 fichas**.
