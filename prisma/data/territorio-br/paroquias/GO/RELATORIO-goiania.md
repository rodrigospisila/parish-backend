# Arquidiocese de Goiânia (GO) — relatório de pesquisa

- Agente de pesquisa, rodada **Goiás**, coleta em **11/09/2026**.
- Arquivo: `paroquias/GO/goiania.json`.

## Números

| Item | Valor |
|---|---|
| Paróquias no arquivo | **134** (133 distintas + 1 marcada `status: "duplicada"`) |
| Confiança das paróquias | 134 `alta` · 0 `media` · 0 `baixa` |
| Municípios cobertos | 27 |
| Comunidades/capelas | **649** (134 matrizes + 515 capelas/comunidades) |
| Comunidades com endereço | 605 de 649 |
| Horários fixos | **1.546** (1.371 `alta` · 175 `baixa`) |
| Paróquias com pelo menos 1 horário | 133 de 134 |
| Paróquias com lista de comunidades | 105 |
| Com endereço | 130 · CEP 119 · telefone 100 · e-mail 128 · pároco 123 · ano de criação 130 |

## Fontes principais

O portal foi reformulado em 2026 e é, de longe, a melhor fonte encontrada até aqui em
riqueza por paróquia (endereço + CEP + e-mail + clero + comunidades com endereço **e** horário).

1. **Portal oficial** — `https://arquidiocesedegoiania.org.br`
   - `wp-json/wp/v2/paroquia?per_page=100` → **132 fichas** (`X-WP-Total: 132`), confirmado pelo
     `paroquia-sitemap.xml`. Os campos ACF não são expostos pela REST, então os dados vieram do
     HTML de cada uma das 132 fichas `/paroquia/<slug>/`.
   - `/missas/` (e `/missas/page/N/`) → **129 grades de missa**, renderizadas no servidor, com
     tabela `Tipo | Dia da Semana | Horário | Observações`.
   - `/curia/` → endereço, telefone e e-mail da Cúria Metropolitana; arcebispo Dom João Justino
     de Medeiros Silva.
2. **catholic-hierarchy.org** (`/diocese/dgoia.html`) — 122 paróquias (estatística de 2023),
   erigida em 26/03/1956, sete dioceses sufragâneas.
3. **Wikipédia (pt)** — 123 paróquias em 5 vicariatos territoriais.

### Truques que fizeram diferença (para o README)

- **A paginação do Elementor em `/missas/N/` trava na página 1 a partir da 6ª.**
  `https://.../missas/6/` devolveu byte a byte a página 1, mas
  `https://.../missas/page/6/` devolveu a página certa. O marcador `data-max-page="11"` no
  `div.e-load-more-anchor` é quem revela quantas páginas existem de verdade — a `<nav>` de
  paginação só listava 5. Sem isso teriam sido colhidos 60 dos 129 blocos de horário.
- **As comunidades estão no acordeão `scf-acc-item` da própria ficha da paróquia**, com
  endereço, CEP e a linha "Horário de Missas: Domingo: 7h30 / 3ª-feira: 19h30". Foi daí que
  saíram 515 capelas e boa parte dos 1.546 horários. O corpo do acordeão ora usa `<li><h6>`,
  ora `<p><span>` — o parser precisa aceitar os dois.
- **O clero vem em cartões `scf-clero-card`** com `Função` (Pároco / Administrador Paroquial /
  Vigário / Diácono); foi de onde saiu o `priestName` de 123 paróquias.

## Cobertura vs. esperado

- Encontradas **133 unidades distintas**; o próprio portal anuncia **135** (paróquias +
  4 quase-paróquias + 3 santuários-basílica + 1 santuário arquidiocesano + 2 reitorias +
  **2 capelanias**). As capelanias não têm ficha publicada, o que explica a diferença.
- catholic-hierarchy (122) e Wikipédia (123) contam só as paróquias em sentido estrito; somando
  as 4 quase-paróquias, as 3 reitorias e os santuários próprios, 133 fecha.
- Conferem com o esperado: **4 quase-paróquias**, **3 reitorias**, **3 santuários-basílica**
  (Divino Pai Eterno em Trindade, Sagrada Família em Vila Nova Canaã e N. Sra. do Perpétuo
  Socorro, ligado à Paróquia N. Sra. da Conceição, no St. Campinas).

## Pontos para validação humana

1. **Duas paróquias sem ficha no site, só na grade de missas** (fichas `/paroquia/` devolvem
   404 em 11/09/2026, mas os horários seguem publicados):
   - `nossa-senhora-aparecida-aparecida-de-goiania` — *Paróquia e Santuário Nossa Senhora
     Aparecida*, Aparecida de Goiânia. Endereço, telefone e e-mail em branco.
   - `nossa-senhora-aparecida-conj-primavera-goiania` — *Paróquia Nossa Senhora Aparecida*,
     Conjunto Primavera, Goiânia. Idem.
   Ambas entram com `confidence: "alta"` (a grade oficial de horários é atual), mas os campos de
   contato precisam ser preenchidos à mão.
2. **Registro duplicado**: a *Reitoria do Santíssimo Redentor* (Trindade) está publicada com dois
   slugs no portal (`/reitoria-do-santissimo-redentor/` e `/reitoria-do-santissimo-redentor-trindade/`).
   A cópia recebeu `slug` terminado em `-duplicada` e `status: "duplicada"` — não deve carregar.
3. **Sem endereço no site** (2): `Paróquia Nossa Senhora de Fátima` (Taquaral de Goiás) e
   `Paróquia São João Batista` (Vila Galvão, Senador Canedo).
4. **Sem horário publicado** (4): N. Sra. da Esperança (Jd. Nova Esperança, Goiânia),
   N. Sra. da Piedade (Bela Vista de Goiás), Reitoria São José (St. dos Aeroviários, Goiânia)
   e Santo Antônio (St. Pedro Ludovico, Goiânia). Entram sem `schedules` — as três primeiras
   têm comunidades com horário, só a Reitoria São José fica com zero.
5. **175 horários `baixa` = recorrência mensal/quinzenal** ("1ª sexta-feira do mês",
   "quinzenalmente aos domingos", "2ª e 4ª quarta-feira do mês"). É o mesmo bloqueio de modelagem
   já registrado no README: não cabem em `MassSchedule`, que só tem dia da semana. O texto
   original ficou em `notes`.
6. **7 horários descartados** por não terem dia da semana nenhum — todos com recorrência por dia
   do mês ("Todo dia 13 do mês", "dia 12 do mês", "Dia 13 do mês", "Todo dia 22 do mês") mais uma
   linha "Feriados: 7h30 e 19h" na Paróquia São João Bosco (St. Oeste, Goiânia). Se o Parish
   passar a modelar recorrência mensal, vale voltar a estas linhas.
7. **2 linhas do tipo "Celebração da Palavra" foram descartadas** (Catedral Metropolitana,
   segunda-feira 12h, e outra) — não são missa e `MassScheduleType` não tem esse valor.
8. **Missas de madrugada no Santuário Basílica Sagrada Família** (Vila Nova Canaã, Goiânia):
   3h todos os dias e 22h de domingo a sábado. É o que o portal publica; parece real para um
   santuário de romaria, mas convém conferir antes de mostrar no app.
9. **`foundedYear`**: as datas vêm de um campo de texto próprio da ficha ("28 de fevereiro de
   1968"), não de data de cadastro no CMS, então não caem na armadilha registrada no README.
   Ainda assim há concentração em 2007 (17 paróquias) e 2006 (15) — compatível com os
   desmembramentos da década, mas não conferido individualmente.
10. **Sem nome de pároco** (11): quando o cartão de clero da ficha só traz vigário ou diácono,
    `priestName` ficou `null` em vez de gravar quem não é o responsável.
11. **Telefones**: 34 paróquias não publicam telefone; parte dos 100 coletados veio do link de
    WhatsApp da ficha (`api.whatsapp.com/send/?phone=...`), cujo parâmetro em alguns casos vem
    concatenado com lixo no HTML — só foram aceitos números de 10 ou 11 dígitos com formato
    plausível, o resto virou `null`.
12. **Cidades normalizadas à mão**: o portal escreve "Campestre" e "Taquaral"; os municípios são
    *Campestre de Goiás* e *Taquaral de Goiás*. "Ap. de Goiânia" foi expandido para
    *Aparecida de Goiânia*.
