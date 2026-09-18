# Relatório — Diocese de Cruzeiro do Sul (AC)

Pesquisa: 2026-09-18. Agente de pesquisa do território (enxame Parish).

## Resumo

| Item | Valor |
|---|---|
| Unidades gravadas | **15** (13 paróquias + catedral + 1 área missionária) |
| Confiança das unidades | 15 `alta` |
| Comunidades nomeadas | **181** |
| Horários fixos | **163** (118 `alta`, 45 `baixa`) — 126 missas, 13 adorações, 13 terços, 11 confissões |
| Cobertura | **15/15** — fechada pela REST do próprio site e pela Receita |
| Estados | **AC 11, AM 4** |
| Bispo | **Dom Flávio Giovenale, S.D.B.** (nomeado 19/09/2018, entrada solene 16/12/2018) — confirmado |

## Fontes principais

1. **Site oficial — <https://diocesecruzeirodosul.org.br>** (WordPress + Elementor + JetEngine,
   **ativo**: notícias de setembro/2026, incluindo o novenário da padroeira de 2026).
2. **A REST do WordPress com tipos de conteúdo próprios** — `/wp-json/wp/v2/types` revela
   **`paroquia`** (X-WP-Total **15**), **`comunidade`** (40), **`horario-de-missa`** (15) e
   **`clero`** (39). As 15 paróquias vieram numa chamada só.
3. **As 15 fichas `/paroquia/<slug>/`** — cada uma publica ano de criação, telefone, e-mail,
   expediente da secretaria, um bloco **"Atividades na Paróquia"** (terço, adoração, confissão,
   grupos), a **lista nominal das comunidades**, endereço, **clero com função** e a
   **tabela de "Horários de Missas"**.
4. **`/horarios-de-missa/`** — a mesma tabela consolidada para as 15 unidades.
5. **`/curia-diocesana/`** e **`/bispo-diocesano/`** — contatos e bispo.
6. **gcatholic** (`churches/brazil/2693.htm`) — Catedral Nossa Senhora da Glória.
7. **Receita Federal via Mapa das OSC/IPEA** — CNPJ raiz **04.021.218**, 27 estabelecimentos.

## O achado metodológico desta diocese

**A tabela oficial tem uma coluna "Tipo" que distingue MISSA de CELEBRAÇÃO DA PALAVRA.** É a única
das cinco circunscrições desta rodada em que a própria fonte faz essa distinção — em todas as
outras foi preciso inferi-la pelo rótulo do texto. Consequência prática: **4 linhas rotuladas
"Celebração da Palavra" ficaram de fora**, conforme a regra do dataset:

- Paróquia Nossa Senhora do Rosário — domingo 8h, Comunidade São Marcos;
- Paróquia N. Sra. Imaculada Conceição de Maria (Porto Walter) — domingo 19h nas comunidades
  **São Francisco, São Pedro e Santa Luzia**.

Em Porto Walter isso deixa as três comunidades urbanas **sem nenhuma missa** — e isso é o retrato
correto de uma paróquia de um padre só no alto Juruá, não uma falha de coleta.

## Cobertura

- REST: **15**. A página `/paroquias/` publica as mesmas 15.
- **Receita**: dos 27 estabelecimentos do CNPJ 04.021.218, **as 15 paróquias casam uma a uma**,
  1 é a sede (Av. 28 de Setembro, 213) e os 11 restantes são comunidades e obras dentro do
  município de Cruzeiro do Sul. **Nenhum revela paróquia ausente do site.**
- O gcatholic registrava **12 paróquias e 99 missões** (dados de 2014); 15 unidades em 2026 é
  compatível com o crescimento.
- **A Receita erra o município em Porto Walter**: cadastra o estabelecimento 0005-07 como
  "VILA PORTO WALTER, ZONA RURAL, **Cruzeiro do Sul**, 69980-000". Porto Walter é município
  próprio desde 1992 e tem CEP 69982-000 — é exatamente o defeito que o README descreve.

## Uma diocese em dois estados

**11 unidades no Acre** (Cruzeiro do Sul, Mâncio Lima, Rodrigues Alves, Porto Walter, Marechal
Thaumaturgo, Tarauacá, Jordão, Feijó) e **4 no Amazonas**: **Eirunepé, Guajará, Envira e Ipixuna**.
Guajará/AM tem telefone de DDD **68** (Acre) — a cidade gravita sobre Cruzeiro do Sul, não sobre
Manaus.

## Projeto Igrejas Irmãs

Três paróquias são atendidas por padres de dioceses do interior de São Paulo, e a própria ficha
registra isso no campo do clero:

- **Mâncio Lima** — Pe. Sebastião de Magalhães Viana Junior, "pertence à **Diocese de Jaboticabal (SP)**";
- **Rodrigues Alves** — Pe. Nicácio Alesso Aiello e Pe. André Luís Maritan Júnior, I.M.C.I.M.,
  "pertencem à **Arquidiocese de São José do Rio Preto (SP)**";
- **Guajará (AM)** — Pe. Pedro da Silva, "pertence à **Arquidiocese de São José do Rio Preto (SP)**".

A diocese mantém uma página `/igrejas-irmas/` sobre o projeto.

## A realidade amazônica, documentada pela própria fonte

Esta é a diocese em que a fonte oficial é mais franca sobre a dificuldade pastoral:

- **Feijó** separa as comunidades em **urbanas (6), da BR-364 (5), dos ramais (6)** e
  **ribeirinhas**, e sobre estas últimas escreve **"(visitas uma vez ao ano)"** — são **11
  comunidades** nos rios **Envira** e **Jurupari** (Alto Rio Envira, Igarapé Japão, Igarapé Mauê,
  Paraná do Ouro, Canadá) que recebem o padre **uma vez por ano** e por isso **não têm horário
  nenhum**. As 28 comunidades estão nomeadas.
- **Jordão** — "O padre faz a visita e fica de 1 a 2 semanas. Quando não tem a presença do padre,
  os leigos fazem todo o trabalho de evangelização." A única missa publicada vem com a ressalva
  **"Se não tiver a presença do padre, é feito a celebração da palavra"** → gravada `baixa`.
  A ficha declara 11 comunidades sem nomear nenhuma. É município do alto Tarauacá, com forte
  presença do povo **Huni Kuin (Kaxinawá)**.
- **Área Missionária Santa Luzia (BR-364)** — as **12 missas são todas mensais**, uma por capela
  (1º/2º/3º/4º sábado ou domingo). Todas `baixa`.
- **Marechal Thaumaturgo** fica na fronteira com o Peru, vizinho da Terra Indígena
  Kaxinawá/Ashaninka do rio Amônia.

Ao todo, **45 dos 163 horários ficaram `baixa`** por recorrência mensal ou por ressalva explícita
da fonte. Em **Mâncio Lima**, 17 dos 26 horários são mensais.

## Pontos que precisam de validação humana

1. **Nome da catedral.** A ficha diocesana chama a sé de "Paróquia Nossa Senhora da Glória";
   gravei **"Catedral Nossa Senhora da Glória"**, apoiado em (a) a página `/padroeira/`, que
   declara Nossa Senhora da Glória **padroeira da diocese**, (b) o gcatholic
   (`churches/brazil/2693.htm`, "Catedral Nossa Senhora da Glória, Cruzeiro do Sul") e (c) o
   próprio histórico da ficha, que narra a construção da catedral ("Dom José lançou a pedra
   fundamental no dia 10 de maio de 1957").
2. **CEPs errados na fonte, corrigidos** (ambos confirmados pela Receita):
   - **N. Sra. do Rosário (Cruzeiro do Sul)** publica **"68980-000"** — CEP de Rondônia.
     O correto é **69980-000**.
   - **N. Sra. das Dores (Ipixuna/AM)** publica **"699890-000"** — um dígito a mais.
     O correto é **69890-000**.
3. **Telefone malformado**: N. Sra. do Rosário publica "(68) 999212-7745" — **9 dígitos** depois
   do DDD. `phone: null`.
4. **E-mail inválido como publicado**: São Francisco de Assis de **Eirunepé** publica
   `paroquiaeirunepé@gmail.com`, com acento na parte local. Não gravado.
5. **Paróquias sem pároco publicado**: **Envira/AM** (só um vigário, Pe. Anofre Vieira de Freitas)
   e **Jordão** (o clero listado é o de Tarauacá, que a atende).
6. **Comunidade repetida na própria ficha**: N. Sra. Aparecida de Cruzeiro do Sul lista
   **"São Francisco" duas vezes** entre as comunidades rurais. Mantive as duas entradas
   (desambiguadas) para não quebrar o total de **22** que a ficha declara, mas marquei a segunda
   como `media` — pode ser repetição do CMS.
7. **Totais declarados × nomes publicados**:
   - **Guajará/AM** diz "9 comunidades e a igreja matriz" mas **nomeia 7**.
   - **Porto Walter** diz "18 comunidades, 4 urbanas e 14 rurais" e **nomeia só as 4 urbanas**.
   - **Jordão** declara 11 e **não nomeia nenhuma**.
   - **Mâncio Lima** **não tem bloco de comunidades**: os 20 nomes gravados vieram da tabela de
     horários, que cita cada comunidade.
8. **Locais que não são comunidade mas têm missa publicada** (gravados como comunidade para não
   perder o horário, com nota): **Fazenda da Esperança** (Mâncio Lima, domingo 9h — é obra social
   da diocese), **Centro do Amor Misericordioso** (Mâncio Lima, 2ª terça), **"Alda Cruz"**
   (Mâncio Lima, 1ª e 3ª quarta — o nome é ambíguo na fonte) e **Capela da Casa Missionária**
   (Rodrigues Alves, 1º sábado).
9. **Possível duplicidade em Eirunepé/AM**: a tabela publica missa de quinta às 7h na "Comunidade
   São Francisco", que pode ser a própria **Matriz São Francisco**. Gravei como comunidade
   distinta, com `media` e nota.
10. **Erro de UF na própria página**: o bloco antigo de `/horarios-de-missa/` rotula a paróquia de
    Eirunepé como **"Eirunepé (AC)"** — é **AM**. A tabela nova está correta.
11. **Erros de digitação da fonte, preservados em `notes`**: "Matrz São José" (Tarauacá),
    "Domindo" (Área Missionária Santa Luzia, várias linhas), "Sâo Francisco" (Rodrigues Alves).
12. **Divergências de número entre ficha e Receita** (gravei o da ficha): N. Sra. da Glória
    (163 × 36), Rodrigues Alves (523 × 543), Marechal Thaumaturgo (113 × 99), Eirunepé
    (Rua Intendente José Pedro × Rua Felipe Cunha, 150), Mâncio Lima (Av. Japiim, 1170 ×
    Praça São Francisco, s/n).
13. **Ano de criação em texto livre**: várias fichas escrevem "Meados de 1897", "Meados de 1900",
    "Meados de 1909", "Meados de 1958", "Meados de 1959", "Meados de 1964". Gravei só o ano, mas
    são datas aproximadas declaradas pela própria paróquia — não confundir com data de erecção
    canônica.
14. **Tipos de conteúdo que não explorei a fundo**: `comunidade` (40 registros) e `clero`
    (39 registros) estão expostos na REST e podem render endereço de comunidade e biografia do
    clero numa próxima passagem. As comunidades gravadas vieram do texto das fichas, que é mais
    completo (181 nomes contra 40 registros no CPT).

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

| Campo | Valor atual | Valor encontrado | Fonte |
|---|---|---|---|
| `phone` | `(68) 9842-17556` (malformado) | **`(68) 98421-3516`** | `/curia-diocesana/` |
| `email` | `null` | **`curiacontabil@diocesecruzeirodosul.org.br`** | `/curia-diocesana/` |
| `address` | `Residencia Episcopal, Av. 28 de Setembro 213` | **`Cúria Diocesana, Av. 28 de Setembro, 213 – Centro`** (a fonte oficial e a Receita chamam de Cúria Diocesana) | `/curia-diocesana/` + rodapé + Receita (0001-83) |

Conferem e não precisam de mudança: nome, `type`, cidade, CEP (69980-000), site e `bishopName`
(Dom Flávio Giovenale, S.D.B.).

`foundedYear: 1931` é o ano da **erecção da Prelazia do Acre e Purus / Cruzeiro do Sul**
(diocese só em 1986) — está certo pela convenção do dataset, **não corrigir**.
