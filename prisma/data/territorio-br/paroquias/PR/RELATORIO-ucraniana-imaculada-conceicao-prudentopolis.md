# Relatório — Eparquia da Imaculada Conceição em Prudentópolis dos Ucranianos

Pesquisa de 18/09/2026. Arquivo: `paroquias/PR/ucraniana-imaculada-conceicao-prudentopolis.json`.

> Circunscrição **pessoal**, sufragânea da Arquieparquia de São João Batista em Curitiba, erigida em
> **12/05/2014**. O site oficial lhe atribui os estados do **PR (oeste), MS, MT, RO, AC, AM, RR, PA e AP**,
> mas na prática **todas as 12 paróquias estão no Paraná**.

## Resumo

| | |
|---|---|
| Paróquias encontradas | **12** — todas `alta` |
| Distribuição por UF | **PR 12** (0 fora do Paraná) |
| Comunidades/capelas | **140** (12 matrizes + 128 capelas) — todas `alta` |
| Horários | **27** (25 `MASS` + 2 `CONFESSION`): 17 `media`, 10 `baixa` |
| Cobertura | 12/12 — bate com o site oficial, com o gcatholic.org e com a Receita Federal |
| Bispo | Dom Meron Mazur, O.S.B.M. (eparca desde 13/07/2014) |

## Fontes principais

1. **`metropolia.org.br/eparquia/`** — o site da Metropolia cobre as **duas** eparquias. A REST do
   WordPress (`/wp-json/wp/v2/pages?parent=443`) entrega as 12 fichas de uma vez, com histórico, clero,
   endereço, telefone, ano de criação e a **lista nominal de comunidades** com padroeiro, número de
   famílias e distância da sede. Fichas de 2015 a 2023 (campo `modified`).
2. **Receita Federal via `minhareceita.org`** — **prova de completude**: CNPJ **21.543.643**
   (*MITRA EPARQUIAL NOSSA SENHORA IMACULADA CONCEICAO DE RITO CATOLICO UCRANIANO*), filiais 0001 a 0013,
   **exatamente 13 estabelecimentos ATIVOS = 1 sede + 12 paróquias, nada além** (0014 em diante não
   existe). As mesmas 12 aparecem com situação **BAIXADA** sob o CNPJ da Metropolia de Curitiba
   (75.038.554), o que documenta o desmembramento de 2014/2015. Achei o CNPJ no rodapé da ficha que a
   **Diocese de Guarapuava** publica da paróquia ucraniana de Guarapuava (`21.543.643/0004-02`).
3. **`diopuava.org`** (Diocese latina de Guarapuava) — publica por cortesia fichas **de 2026** das cinco
   paróquias ucranianas de seu território (Guarapuava, Prudentópolis ×2, Pitanga, Cantagalo), com clero,
   endereço, CEP e telefone **mais novos** que os do site oficial da eparquia. Foi a melhor fonte de
   atualização de contato.
4. **`gcatholic.org`** — `/churches/local/imac0` (12 igrejas, 01/01/2026) e a estatística de 31/12/2022
   (12 paróquias, 83.200 fiéis, 42 padres, 175 religiosos).
5. **Prefeitura Municipal de Prudentópolis** (`prudentopolis.pr.gov.br/turismo/...`) — a única fonte que
   publica **grade de Divina Liturgia**: a da Matriz São Josafat. A página da Catedral, no mesmo portal,
   **não** traz horários.
6. **ViaCEP**, **`liriocatolico.com.br`** (`/horario_missa/dados/uf/PR.json`), Diocese de Ponta Grossa,
   Diocese de Campo Mourão, Diocese de Apucarana, Arquidiocese de Cascavel e Facebook oficial.

## Paróquias (12) — todas no Paraná

| # | Paróquia | Cidade | Comunidades | Horários |
|---|---|---|---|---|
| 1 | Paróquia Divino Espírito Santo | Apucarana | 6 | 1 (baixa, em Ortigueira) |
| 2 | Paróquia Santíssima Trindade | Campo Mourão | 6 | 0 |
| 3 | Paróquia São José | Cantagalo | 9 | 0 |
| 4 | Paróquia Nossa Senhora do Perpétuo Socorro | Cascavel | 8 | 5 (baixa) |
| 5 | Paróquia Assunção de Nossa Senhora | Guarapuava | 7 | 0 |
| 6 | Paróquia Imaculado Coração de Maria | Irati | 10 | 7 (media) |
| 7 | Paróquia Sagrado Coração de Jesus | Ivaí | 8 | 0 |
| 8 | Paróquia Nossa Senhora do Perpétuo Socorro | Pato Branco | 8 | 4 (baixa) |
| 9 | Paróquia Nossa Senhora da Glória | Pitanga | 20 | 0 |
| 10 | **Catedral Nossa Senhora Imaculada Conceição** | Prudentópolis | 13 | 0 |
| 11 | Paróquia São Josafat | Prudentópolis | 27 | 10 (media) |
| 12 | Paróquia São Nicolau | Roncador | 6 | 0 |

**Sete paróquias entram sem nenhum horário**: Campo Mourão, Cantagalo, Guarapuava, Ivaí, Pitanga,
Catedral de Prudentópolis e Roncador.

A **Paróquia São Josafat** de Prudentópolis é, de longe, a maior: declara **42 comunidades, 34 igrejas,
~5.000 famílias e ~35.000 fiéis**, com 13 vigários paroquiais basilianos. O site nomina 27 — as outras 15
não têm lista pública.

## Horários (27)

| Paróquia | Grade | Conf. | Fonte |
|---|---|---|---|
| São Josafat (Prudentópolis) | seg–sáb 19:00; dom 06:15, 08:00, 10:00 e 19:00 | media | Prefeitura de Prudentópolis (portal oficial ativo, sem data na página) |
| Imaculado Coração de Maria (Irati) | dom 08:00; seg–sex 06:25; sáb 19:00 | media | ficha da Diocese latina de Ponta Grossa (coleta de 23/07/2026) |
| N. Sra. do Perpétuo Socorro (Cascavel) | dom 08:30; qua e sex 19:00; sáb 19:00 | baixa | liriocatolico |
| N. Sra. do Perpétuo Socorro (Pato Branco) | dom 08:00; sáb 19:00; confissões dom 07:00 e sáb 18:00 | baixa | liriocatolico |
| Divino Espírito Santo (Apucarana) | qua 19:30 **na comunidade de Ortigueira** | baixa | liriocatolico (ficha "Paróquia Ucraniana Católica Cristo Rei", Rua Goiás 111, Ortigueira — mesmo padroeiro da comunidade) |
| N. Sra. do Perpétuo Socorro (Cascavel) | **1º domingo do mês, 19:00, em Foz do Iguaçu** | baixa | site oficial — recorrência mensal, `dayOfWeek: null` |

O **06:25** de segunda a sexta em Irati é atípico e merece conferência; está como publicado pela Diocese
de Ponta Grossa.

## Vocabulário do rito (para quem for validar)

**Divina Liturgia** = missa (gravada como `type: "MASS"`). **Não são missa** e não foram gravadas:
**Moleben**, **Panakhyda/Panahyda**, **Acatisto**, **Vésperas**, **Liturgia dos Dons Pré-Santificados**
(Quaresma), **Maivka** (novena de maio) e a novena ao Sagrado Coração (junho). A página de Irati registra
o caso típico: na comunidade de Linha "B" "duas vezes por mês é celebrada a Santa Missa; quando não há
celebração, toda a comunidade se reúne para rezar *moleben* ou terço" — só a missa entraria, e como
recorrência mensal fica `baixa`. Clero: **basilianos (OSBM)**; religiosas: **Irmãs Servas de Maria
Imaculada**, **Irmãs Catequistas de Santa Ana** (Pato Branco) e **Catequistas do Sagrado Coração de
Jesus** (instituto secular com sede geral em Prudentópolis).

---

# Paróquias ucranianas que estão em arquivos de dioceses LATINAS (as duas eparquias)

Esta é a lista completa pedida — o que precisa ser movido / marcado ao carregar os dois arquivos novos.

## A) Já no dataset, dentro do JSON de uma diocese latina

| Paróquia no arquivo latino | Arquivo | `status` atual | Jurisdição correta | Registro correspondente nos arquivos novos |
|---|---|---|---|---|
| Paróquia Católica Ucraniana Transfiguração de Nosso Senhor (Ponta Grossa/PR) | `PR/ponta-grossa.json` | `outra-jurisdicao` | **Curitiba** | `transfiguracao-de-nosso-senhor-ponta-grossa` |
| Paróquia Católica Ucraniana Nossa Senhora do Perpétuo Socorro (Reserva/PR) | `PR/ponta-grossa.json` | `outra-jurisdicao` | **Curitiba** | `nossa-senhora-do-perpetuo-socorro-reserva` |
| Paróquia Católica Ucraniana Imaculado Coração de Maria (Irati/PR) | `PR/ponta-grossa.json` | `outra-jurisdicao` | **Prudentópolis** | `imaculado-coracao-de-maria-irati` |
| Paróquia Católica Ucraniana Sagrado Coração de Jesus (Ivaí/PR) | `PR/ponta-grossa.json` | `outra-jurisdicao` | **Prudentópolis** | `sagrado-coracao-de-jesus-ivai` |
| Paróquia Nossa Senhora do Perpétuo Socorro (Rito Ucraniano) (Cascavel/PR) | `PR/cascavel.json` | `outra-jurisdicao` | **Prudentópolis** | `nossa-senhora-do-perpetuo-socorro-cascavel` |
| **Paróquia Espírito Santo (Rito Ucraniano)** (Apucarana/PR) | `PR/apucarana.json` | **`null`** ⚠️ | **Prudentópolis** | `divino-espirito-santo-apucarana` |
| **Paróquia Santíssima Trindade (Rito Ucraniano)** (Campo Mourão/PR) | `PR/campo-mourao.json` | **`null`** ⚠️ | **Prudentópolis** | `santissima-trindade-campo-mourao` |
| **Paróquia São Nicolau (Rito Ucraniano)** (Roncador/PR) | `PR/campo-mourao.json` | **`null`** ⚠️ | **Prudentópolis** | `sao-nicolau-roncador` |

⚠️ **As três últimas estão sem `status`** e, portanto, **entram na carga na diocese errada**. É o achado
mais urgente deste relatório: marcar `status: "outra-jurisdicao"` em `apucarana.json` e nas duas de
`campo-mourao.json`, ou removê-las de lá.

Nota: a de Ponta Grossa observa no relatório que "nenhuma tem membro, evento ou usuário vinculado", então
a movimentação é segura.

## B) Listadas pelo site de uma diocese latina, mas já **fora** do JSON (nada a fazer)

Cinco paróquias que o agente da **Diocese de Guarapuava** excluiu de propósito (ver
`RELATORIO-guarapuava.md`, seção "Excluídas (5)"). Todas são da **Eparquia de Prudentópolis** e estão nos
arquivos novos:

| Paróquia | Cidade | Registro novo |
|---|---|---|
| Paróquia Assunção de Nossa Senhora | Guarapuava | `assuncao-de-nossa-senhora-guarapuava` |
| Paróquia São Josafat | Prudentópolis | `sao-josafat-prudentopolis` |
| Catedral Imaculada Conceição | Prudentópolis | `nossa-senhora-imaculada-conceicao-prudentopolis` |
| Paróquia Nossa Senhora da Glória | Pitanga | `nossa-senhora-da-gloria-pitanga` |
| Paróquia São José | Cantagalo | `sao-jose-cantagalo` |

## C) Caso especial — São Paulo/SP

`SP/sao-paulo.json` tem `nossa-senhora-da-gloria-sao-paulo` (Rua das Valerianas, 168, Vila Bela), sem
`status`, `alta`, com **pároco basiliano Pe. Josafat Vozivoda OSBM**. **Não é um erro de jurisdição**: são
**duas paróquias no mesmo templo** — a latina Nossa Senhora da Glória (Arquidiocese de São Paulo) e a
ucraniana Nossa Senhora Imaculada Conceição (Arquieparquia de Curitiba), que o gcatholic.org descreve como
usando a "Igreja Nossa Senhora da Glória". A entrada latina pode ficar como está; a ucraniana foi gravada
em `ucraniana-sao-joao-batista-curitiba.json` (`nossa-senhora-imaculada-conceicao-sao-paulo`), com só o
**domingo 10:00** (a Divina Liturgia) — as demais missas do prédio são da paróquia latina.

## D) Não estão em nenhum arquivo latino

As outras 16 paróquias (13 da Arquieparquia de Curitiba + 3 da Eparquia de Prudentópolis: Cantagalo,
Guarapuava, Pitanga, São Josafat, Catedral e Pato Branco) não aparecem em nenhum JSON de diocese latina do
dataset. Em particular, **Pato Branco** não é listada pela Diocese de Palmas-Francisco Beltrão.

---

## Pontos para a validação humana

1. **Endereço de Cascavel**: Receita diz Rua Mato Grosso, **151** – Centro (CEP 85812-020); site oficial,
   Arquidiocese de Cascavel e liriocatolico dizem Rua Mato Grosso, **373** – Jd. São Cristóvão
   (85813-020, conferido no ViaCEP). Gravei 373.
2. **Pároco de Campo Mourão**: site oficial (2020) = Pe. Antonio Nazarko, OSBM; Diocese de Campo Mourão
   (2026) = Pe. Deonísio Mazur, OSBM — que o site oficial dá como pároco de **Irati**. Um dos dois está
   defasado. Gravei Pe. Antonio Nazarko com a divergência em `notes`.
3. **Pároco/telefone de Cantagalo, Guarapuava, Pitanga e Catedral**: prevaleceram os dados de 2026 da
   Diocese de Guarapuava sobre os de 2023 do site da eparquia (todas as divergências estão em `notes`).
4. **Telefone de Pitanga**: (42) 3646-1336 (diocese, 2026) contra (42) 3746-1336 (site oficial).
5. **Horário 06:25** de segunda a sexta em Irati (fonte: Diocese de Ponta Grossa).
6. **CEPs**: o ViaCEP **não reconhece** 84500-000 (Irati), 84400-000 (Prudentópolis, genérico),
   85160-000 (Cantagalo) como CEPs de logradouro. Substituí por CEP de rua onde havia
   (Irati 84500-064, Catedral 84402-103, São Josafat 84400-065, Pitanga 85200-053).
7. **Sites mortos**: `www.comunidadeucraniana.com.br` (Irati) e `www.paroquiasaojosafat.com.br` não
   resolvem DNS a partir desta rede; `www.pstrindade.com` (Campo Mourão) virou domínio estacionado.
   Os três ficaram com `website: null` — vale reconferir de outra rede, porque a Diocese de Guarapuava
   ainda publica o de São Josafat.
8. **Comunidades de São Josafat**: 27 nominadas contra **42 declaradas**. Faltam 15 sem lista pública.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `website`: está `null`. **Sugestão: `https://metropolia.org.br/eparquia/`** — a Eparquia não tem domínio
  próprio, mas tem seção oficial no site da Metropolia, com as 12 fichas de paróquia.
- `address`: está `"Eparquia, Rua Duque de Caxias 1615"`. Forma da CNBB Sul 2 e da Receita:
  **"Rua Duque de Caxias, 1.615 – Centro – Caixa Postal 137"**.
- `email`: está `null`. A CNBB Sul 2 publica **`meron.mazur@gmail.com`** — é o e-mail pessoal do bispo,
  não um endereço institucional; **não sugiro gravar**.
- `foundedYear` (2014) **está certo**: é o ano de ERECÇÃO (bula de 12/05/2014). Não mexer.
- Confere tudo o mais: `type: "Eparquia"`, `city: "Prudentópolis"`, `phone: "(42) 3446-5552"`,
  `zipCode: "84400-000"`, `bishopName: "Dom Meron Mazur, O.S.B.M."`, `regional: "Sul 2"`,
  `province: "São João Batista em Curitiba"`, `rite: "ucraniano"`.
