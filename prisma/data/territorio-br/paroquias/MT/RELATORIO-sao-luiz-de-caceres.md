# Relatório — Diocese de São Luiz de Cáceres (MT)

Pesquisa: 2026-09-11 · Arquivo: `sao-luiz-de-caceres.json`

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **27** (27 `alta`) |
| Comunidades/capelas | **27** (só as matrizes; a diocese não publica capelas) |
| Horários fixos | **0** |
| Cobertura | 27 encontradas / 27 esperadas — **fechada, com tripla confirmação** |

## Fontes principais

1. **`https://www.diocesedecaceres.com.br/`** — o menu "Paróquias" lista as 27, e cada
   `./paroquia/paroquia-<nome>--<cidade>` traz uma ficha com **data de fundação, cidade(s) atendidas,
   endereço com CEP, telefone, e-mail institucional e pároco/vigário**. Cobertura de contato: 27/27.
2. **Receita Federal via `minhareceita.org`** — varredura das filiais do CNPJ **03.192.499**
   (Bispado de Cáceres — Mitra Diocesana), gerando dígitos verificadores de 0001 a 0045: **33
   filiais**, sendo as **mesmas 27 paróquias**, a cúria, o Seminário Maior São José (Várzea
   Grande/MT), o Seminário Bom Pastor (Cáceres) e 3 baixadas (Seminário Menor de Jauru, Pastoral da
   Criança, Casa do Clero Frei Grignion). Nada entre 0034 e 0045. **Prova de completude.**
3. gcatholic.org (`zlui3.htm`): "27 pastoral centres" em 31/12/2022 — bate.
4. catholic-hierarchy.org (`dsalc.html`).

## O problema desta diocese: zero horários

A diocese tem um item de menu **"Horários de Missa"** que aponta para `/horarios` — e **essa página
está vazia** (só o cabeçalho e o rodapé). Nenhuma das 27 fichas de paróquia publica grade.
Os agregadores também não cobrem a região:

- `horariodemissa.com.br` tem **uma única igreja** em Cáceres (São Sebastião), sem horários úteis;
- `vempramissa.com.br` tem a ficha da Catedral com *"Horários ainda não cadastrados para esta
  igreja"*;
- `missahora.com.br` bloqueia leitor automático (403) e o índice de MT não trouxe nada.

**O arquivo entra em produção com 0 horários, por decisão consciente** — como Pouso Alegre,
Caratinga, Almenara e Leopoldina na rodada de MG. É a maior pendência e não tem solução pela web:
depende de a PASCOM diocesana preencher `/horarios`.

## Setores pastorais (não vão para o JSON)

| Setor | Paróquias |
|---|---|
| 1 | N. Sra. da Guia (Comodoro), N. Sra. das Graças (Campos de Júlio), N. Sra. do Carmo (Nova Lacerda), N. Sra. do Pilar (Jauru), Santíssima Trindade (Vila Bela), São José (Figueirópolis D'Oeste), São Pedro e Senhor Bom Jesus (Pontes e Lacerda) |
| 2 | N. Sra. do Rosário de Fátima (Araputanga), N. Sra. Aparecida e São Paulo (Mirassol D'Oeste), N. Sra. de Fátima (Porto Esperidião), São João Batista (Curvelândia), São José (São José dos Quatro Marcos) |
| 3 | N. Sra. do Livramento, N. Sra. do Rosário (Poconé) |
| 4 | Cristo Trabalhador, N. Sra. Aparecida, Santíssima Trindade, São Luiz (Catedral) e São Sebastião — todas em Cáceres |
| 5 | Bom Jesus (Reserva do Cabaçal), N. Sra. da Penha (Salto do Céu), São Roque (Rio Branco / Lambari D'Oeste) |
| 6 | N. Sra. Aparecida (Nova Olímpia), Santa Cruz (Barra do Bugres) |
| — | **São José Operário (Lambari D'Oeste)** não aparece em nenhuma lista de setor: é de 02/02/2022 e o menu de setores não foi atualizado |

## Precisa de validação humana

1. **Endereço da Catedral.** A ficha diz "Rua Frei Grignion van den Hemel, 15, 78210-020"; a Receita
   diz "Rua Comandante Balduíno, 2174, 78210-036"; o agregador `vempramissa` repete a Receita.
   Gravei o da ficha. **Divergência aberta** — provavelmente a igreja e a secretaria estão em
   endereços diferentes.
2. **Outras divergências ficha × Receita** (gravei sempre o da ficha, que é da própria diocese):
   - N. Sra. do Pilar (Jauru): ficha "Av. Padre Nazareno, 140" × Receita "Rua Marília, 92";
   - Senhor Bom Jesus (Pontes e Lacerda): ficha "R. Darci de Freitas Queiroz, 810" × Receita
     "Rua Bom Jesus, 644";
   - Santíssima Trindade (Cáceres): ficha "Rua dos Dulce, s/n, Cohab Nova" × Receita
     "Rua das Magnólias, s/n, Jardim Pe. Paulo";
   - São Paulo (Mirassol D'Oeste): ficha "Rua Amadeu Tamanduré, 1379, Jd. São Paulo" × Receita
     "Alm. Tamandaré, 1379, Cidade Tamandaré" — o "Amadeu Tamanduré" da ficha parece corrupção de
     "Almirante Tamandaré";
   - Santa Cruz (Barra do Bugres): nº 340 × 315;
   - N. Sra. das Graças (Campos de Júlio): CEP 78319-000 (ficha) × 78307-000 (Receita);
   - Santíssima Trindade (Vila Bela): ficha "Rua Municipal, 833" × Receita "Rua da Matriz, s/n".
3. **Erros de digitação na fonte oficial**, corrigidos por mim no JSON: "Santo do Céu" → **Salto do
   Céu**; "Povoné"/"Poconė" → **Poconé**; "Nossa Senhora do Livrameto" → **Livramento**;
   "Paróco" → Pároco. E o e-mail de Livramento está publicado como
   `livramento@diocesedacaceres.com.br` (com "**da**caceres") — gravei assim, literal, mas é quase
   certo que seja `diocesedecaceres.com.br`. **Conferir antes de usar.**
4. **Paróquias com mais de um município no território** (gravei só o da sede):
   - N. Sra. de Fátima → Porto Esperidião **e Glória d'Oeste**;
   - N. Sra. do Carmo → Nova Lacerda **e Conquista d'Oeste**;
   - N. Sra. do Pilar → Jauru **e Vale de São Domingos**;
   - N. Sra. do Rosário de Fátima → Araputanga **e Indiavaí**;
   - São Roque → Rio Branco **e Lambari d'Oeste** (segundo a lista de setores; a ficha só cita Rio
     Branco, e Lambari d'Oeste ganhou paróquia própria em 2022).
5. **Nome do registro da catedral**: o site diz "PARÓQUIA SÃO LUIZ - CATEDRAL"; gcatholic diz
   "Catedral São Luiz de França". Adotei **"Catedral São Luiz"**.
6. **São Roque (Rio Branco) e Bom Jesus (Reserva do Cabaçal) têm o mesmo pároco** — Pe. Devair
   Braga Caldeira, administrador paroquial em Rio Branco e pároco em Reserva do Cabaçal. Não é erro
   de cópia; está assim nas duas fichas.
7. **São João Batista (Curvelândia)** consta na Receita como "COMUNIDADE SÃO JOÃO BATISTA" (filial
   0029, desde 07/01/2014) e com CEP 78237-000, enquanto a ficha diz 78280-000 (que é o CEP de
   Mirassol D'Oeste). O CEP de Curvelândia é 78237-000 — **a ficha está errada** e eu gravei o CEP
   da ficha para manter a proveniência única; recomendo trocar para 78237-000 na validação.
8. **Três paróquias têm data de fundação muito antiga** — Vila Bela (1734), Poconé (09/08/1817) e
   N. Sra. do Livramento (28/08/1835). São plausíveis (são as três paróquias históricas do antigo
   Mato Grosso) e não caem na armadilha do "fundada em = data de cadastro no CMS": as 27 datas são
   todas distintas e coerentes com a história de cada município.
9. **`communities`**: gravei só a matriz de cada paróquia. A diocese não publica capelas nem
   comunidades rurais em lugar nenhum — e numa diocese com 136 mil km², isso é uma lacuna grande.
