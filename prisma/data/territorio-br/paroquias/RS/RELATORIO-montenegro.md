# RELATÓRIO — Diocese de Montenegro (RS)

- **Arquivo**: `paroquias/RS/montenegro.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 30 (todas paróquias) |
| Paróquias com confiança **alta** | 30 |
| Paróquias com confiança **media** | 0 |
| Paróquias com confiança **baixa** | 0 |
| Comunidades/capelas | 20 (só de 3 paróquias) |
| Horários fixos | 40 (18 `alta`, 22 `baixa`) — só de 2 paróquias |
| Cobertura | 30 / 30 (100 % da LISTA de paróquias) |

> **Lista de paróquias completa e de altíssima qualidade; contatos, comunidades e horários
> praticamente ausentes.** O site diocesano é moderno e está no ar, mas publica apenas a
> identificação de cada paróquia.

## O site oficial existe, está no ar — e não tem os dados

`www.diocesemontenegro.org.br` é uma aplicação **Next.js** (plataforma *Unitas*). A página
`/paroquias` carrega os cards por JavaScript, mas o **payload RSC embutido no HTML** contém a
relação completa de igrejas da diocese. Extraída, ela traz **53 registros**:

- **30** com `hierarchy_level: "Paróquia"` — a lista completa, com `name`, `city`, `neighborhood`
  e `forania` (área pastoral);
- **23** com `hierarchy_level: "Comunidade"`.

Cada registro tem também os campos `address`, `location`, `schedule` e `timeSlots` — **todos
vazios em 100 % dos 53 registros**. As fichas individuais (`/paroquias/<slug>`) devolvem
`{"pastorals":[],"movements":[],"history":{…vazio},"informations":{…vazio}}` e
`subscriptionLevel: "free"`: a diocese contratou a plataforma mas nunca preencheu os detalhes.
Não existe API pública alternativa (`NEXT_PUBLIC_GW_API_URL` não é inlineada no bundle).

**Consequência: 28 das 30 paróquias ficaram sem endereço, CEP, telefone, e-mail e horários.**
A confiança `alta` das paróquias se refere à **identificação** (nome, município, bairro, área
pastoral), que vem de fonte oficial viva.

## Fontes principais

1. https://www.diocesemontenegro.org.br/paroquias — **relação oficial das 30 paróquias e das 23
   comunidades** (extraída do payload da página)
2. https://www.diocesemontenegro.org.br/paroquias-areas-pastorais — as 4 áreas pastorais
3. https://www.diocesemontenegro.org.br/diocese/curia — endereço, CEP, telefone, WhatsApp e
   e-mail da Cúria
4. https://jornalibia.com.br/regiao/valedocai/reformulacoes-e-nomeacoes-da-diocese-para-2026/
   — **"Reformulações e nomeações da Diocese para 2026"** (18/11/2025): párocos, vigários e a
   reformulação das áreas pastorais
5. **https://psjb.org.br/** — site próprio da **Paróquia Catedral São João Batista**: horários,
   Pastoral da Escuta, agenda de 2026, endereço, telefone, histórico e as 14 comunidades
6. https://santuarioestrela.com.br/uploads/documento/308/Informativo_Janeiro_26.pdf — informativo
   "A Voz do Santuário" (janeiro/2026) do **Santuário Santo Antônio**, Estrela
7. https://www.catholic-hierarchy.org/diocese/dmntn.html — **30 paróquias**; ereção em 02/07/2008;
   Dom Carlos Rômulo Gonçalves e Silva
8. https://fatonovo.com.br/cidades/diocese-de-montenegro-divulga-lista-de-nomeacoes-e-transferencias-do-clero/
   — nomeações de **2021** (não gravadas; reproduzidas abaixo como pista de validação)

## Cobertura

**30 paróquias / 30 esperadas** — o número bate exatamente com o catholic-hierarchy.org.

| Área pastoral (rótulo do site) | Paróquias |
|---|---|
| Montenegro (5) | Catedral São João Batista; Sagrado Coração de Jesus (Timbaúva); Santo Antônio (Vendinha); São José (Taquari); Senhor Bom Jesus (Triunfo) |
| Bom Princípio (7) | Santo Inácio de Loyola (Alto Feliz); N. Sra. da Natividade (Barão/Linha Francesa Alta); N. Sra. da Purificação (Bom Princípio); Santa Catarina de Alexandria (Feliz); N. Sra. da Conceição (São Vendelino); Cristo Redentor (Tupandi); Santos Reis (Vale Real) |
| Estrela (7) | Sagrada Família (Bom Retiro do Sul); Santuário Santo Antônio (Estrela); São Cristóvão (Estrela/Boa União); N. Sra. do Rosário (Paverama); São Pedro Apóstolo (Poço das Antas); São José (Roca Sales); N. Sra. do Rosário (Teutônia/Canabarro) |
| São Sebastião do Caí (7) | Santa Ana (Capela de Santana); São João Nepomuceno (Harmonia); São José (Pareci Novo); N. Sra. das Graças (Portão/Rincão do Cascalho); São José (São José do Hortêncio); N. Sra. da Conceição (S. S. do Caí/Vila Conceição); São Sebastião Mártir (S. S. do Caí) |
| **sem área no site** (4) | São João Batista (Brochier); São Miguel Arcanjo (Maratá); Três Santos Mártires das Missões (Salvador do Sul); São Pedro (São Pedro da Serra) |

**Atenção — as áreas pastorais mudaram em 2026.** O Jornal Ibiá (18/11/2025) informa que a
**Área Pastoral de Salvador do Sul foi extinta**; Brochier e Maratá passaram à Área de Montenegro,
e Salvador do Sul, São Pedro da Serra/Barão e Francesa Alta à Área de Bom Princípio. O site da
diocese **ainda não refletia isso em 10/09/2026** — as 4 paróquias acima aparecem com `forania`
vazia. Os rótulos gravados são os do site.

## Párocos — só os 6 anunciados para 2026

| Paróquia | Pároco |
|---|---|
| Catedral São João Batista (Montenegro) | **Pe. Eduardo Luis Haas** (posse em 25/01/2026, confirmada pela agenda da própria paróquia) |
| N. Sra. da Natividade (Barão) | Pe. Genico Schneider |
| São Miguel Arcanjo (Maratá) | Pe. Hugo Luis Steffen |
| Santos Reis (Vale Real) | Pe. Pedro Nicolau Schneider |
| Cristo Redentor (Tupandi) | Pe. Rafael Holdefer Bohrer |
| N. Sra. do Rosário (Paverama) | Pe. Rodrigo Henrique Schneider |

Vigários anunciados para 2026 (**não** gravados em `priestName`, que guarda só o pároco):
Pe. Jonas Gomes (Catedral), Pe. Antônio Hochscheidt Becker (São Sebastião, S. S. do Caí),
Pe. Ercílio José Bohn (Sagrado Coração/Timbaúva e Santo Antônio/Vendinha), Pe. Neimar Schuster
(Santa Catarina, Feliz — também Vigário Geral), Diác. Maicon Rafael Machry (N. Sra. das Graças,
Portão).

**As outras 24 paróquias ficaram com `priestName: null`.** Existe uma lista completa, mas é de
**12/11/2021** — 5 anos — e por isso **não foi gravada**. Fica aqui como ponto de partida para
o enxame de validação:

> Pe. Ademar José Strôher (Santo Inácio, Alto Feliz) · Pe. Adilson Schlindwein (São João
> Nepomuceno, Harmonia/São José do Sul) · Pe. Alexandre Baptista de Oliveira (Senhor Bom Jesus,
> Triunfo) · Pe. Ângelo José Bach (São José, São José do Hortêncio) · Pe. Asabido Pedro Ludwig
> (Três Santos Mártires, Salvador do Sul) · Pe. Eduardo André Schuster (São Sebastião, S. S. do
> Caí) · Pe. Gabriel Zucki Bagatini (Santo Antônio, Estrela) · Pe. João Paulo Schäfer (São José,
> Roca Sales) · Pe. João Vitor Freitas (Sagrado Coração, Timbaúva) · Pe. Jorge Reckziegel (São
> Pedro Apóstolo, Poço das Antas) · Pe. Paulo Puhl (Santa Ana, Capela de Santana) · Pe. Pedro
> José Ritter (N. Sra. do Rosário, Teutônia) · Pe. Ricardo Nienov (Santo Antônio Vendinha,
> Montenegro/Triunfo).
> Vigários de 2021: Pe. Ludinei Marcos Vian (Timbaúva) · Pe. Emílio José Lunkes (Roca Sales) ·
> Pe. Guido Staudt (Bom Princípio) · Pe. Pedro Neori Theisen (S. S. do Caí) · Diác. Érick Lopes
> Vicari (Catedral) · Diác. Oséias Canísio Dreyer (Teutônia).

## Comunidades — o vínculo com a paróquia não é publicado

A diocese lista **23 comunidades**, com município, bairro e área pastoral, mas **não diz a que
paróquia cada uma pertence**. Vincular por conta própria seria inventar dado. O que foi possível:

### ✅ Catedral São João Batista (Montenegro) — 14 comunidades, `alta`

O site próprio da paróquia (**psjb.org.br**) publica a lista e afirma: *"Atualmente a paróquia é
constituída por 14 comunidades"* (13 + a matriz — bate exatamente). Nove delas casam com as da
lista diocesana e herdaram o bairro:

N. Sra. do Rosário (Rui Barbosa) · Pinheiros · N. Sra. dos Navegantes (Porto dos Pereiras) ·
Santo Antônio · Imaculado Coração de Maria · Bom Pastor (Panorama) · N. Sra. das Graças (São
João) · Espírito Santo (Olaria) · N. Sra. Aparecida (Integração) · São José do Maratá · Santo
Alberto Magno · Santos Reis · N. Sra. do Perpétuo Socorro (Centenário).

### ⚠️ N. Sra. do Rosário (Paverama) — 3 comunidades, `baixa`

Imaculado Coração de Maria · N. Sra. Aparecida (Morro Bonito) · São José. **Vínculo inferido**:
Paverama tem uma única paróquia. Marcadas `baixa` justamente por isso.

### ❌ Ficaram sem paróquia — 10 comunidades

Das 23 comunidades listadas pela diocese, 13 foram vinculadas (10 de Montenegro à Catedral e 3 a
Paverama). As 10 restantes ficaram **fora do JSON**:

| Comunidade | Município | Bairro |
|---|---|---|
| Santa Rita de Cássia | Montenegro | São Paulo |
| N. Sra. Auxiliadora | Estrela | — |
| São José | Estrela | — |
| São José Operário | Estrela | — |
| São João Batista | Estrela | — |
| São Luís Gonzaga | Estrela | — |
| São Pedro Apóstolo | Estrela | — |
| Imaculado Coração de Maria | São José do Sul | — |
| Santos Reis | São José do Sul | — |
| São José | São José do Sul | — |

- **Santa Rita de Cássia (Montenegro/São Paulo)** é a única comunidade de Montenegro que a
  Catedral **não** lista — deve ser da Paróquia Sagrado Coração de Jesus (Timbaúva) ou da Santo
  Antônio (Vendinha).
- **Estrela** tem 2 paróquias (Santuário Santo Antônio e São Cristóvão) e 6 comunidades — 50/50.
- **São José do Sul** não tem paróquia própria. Em 2021 o município era atendido pela **Paróquia
  São João Nepomuceno de Harmonia** ("Harmonia/São José do Sul"), o que torna essa a hipótese
  mais provável para as 3 comunidades de lá.

## Horários — só 2 das 30 paróquias publicam

### Catedral São João Batista (Montenegro) — `alta`

Do site próprio, com agenda de janeiro a setembro de 2026 e `© 2026`:

- **Missas na Catedral**: domingo 7h, 9h e 18h; terça a sexta 18h30 (terça com bênção da saúde);
  sábado 17h.
- **Pastoral da Escuta** (confissões): segunda a sexta, 8h30–11h30 e 14h–17h30 — gravada como
  `CONFESSION` às 8h30 e às 14h de cada dia útil.
- **Comunidades**: 13 missas em **rodízio quinzenal**, reconstruídas da agenda de janeiro/2026 —
  todas `baixa`, com a regra no `notes`.
- Adoração ao Santíssimo / grupo de oração da RCC, quartas às 20h — `baixa`.

### Santuário Santo Antônio (Estrela) — `baixa`

Terça 18h30 (Santuário) · quarta 18h30 (Capela do Hospital) · quinta 15h (Santuário) ·
sábado 17h (Capela do Hospital) e 18h30 (Santuário) · domingo 8h30 e 19h (Santuário) ·
confissões quinta das 16h às 19h.

**Todos em `baixa` por precaução**: a fonte é o informativo de janeiro/2026 da própria paróquia,
mas `santuarioestrela.com.br` devolve **403/404 a acesso automatizado** e o conteúdo só pôde ser
lido pela indexação do buscador — **não foi verificado diretamente no PDF**.

## ⚠️ Pontos para o enxame de validação

1. **28 paróquias sem endereço, CEP, telefone e e-mail.** É a maior lacuna do dataset do RS
   depois de Bagé. O site diocesano tem os campos, mas vazios. Caminhos: (a) pedir o **Guia
   Pastoral** (há um item de menu `Mídia > Guia Pastoral`); (b) buscar site/rede social próprios
   de cada paróquia — pelo menos duas têm (`psjb.org.br`, `santuarioestrela.com.br`); (c) o padrão
   de e-mail parece ser `<sigla>_<cidade>@diocesemontenegro.org.br` (ex.:
   `psa_estrela@diocesemontenegro.org.br`), o que sugere que a diocese hospeda os e-mails.
2. **28 paróquias sem nenhum horário e 27 sem nenhuma comunidade.**
3. **Vínculo das 10 comunidades órfãs** (Estrela, São José do Sul e Santa Rita de Cássia em
   Montenegro) — ver a seção "Comunidades". Provavelmente resolve-se com uma ligação à Cúria.
4. **Áreas pastorais desatualizadas no site.** Confirmar a reformulação de 2026 (extinção da Área
   de Salvador do Sul) e reatribuir Brochier, Maratá, Salvador do Sul e São Pedro da Serra.
5. **Bairro da Catedral divergente.** A lista diocesana põe a "Comunidade Catedral São João
   Batista" no bairro **Ferroviário**; o site da paróquia dá *Rua Olavo Bilac, 1212 – **Centro***.
   Foi gravado **Centro** (fonte da própria paróquia). Verificar se o registro "Ferroviário" da
   diocese é outra igreja ou apenas um erro de cadastro.
6. **CEP da Catedral divergente.** psjb.org.br diz **92510-165**; o horariodemissa.com.br diz
   95780-000 (atualizado em **14/05/2013**). Gravado o da paróquia. Curiosidade: 95780-000 era o
   CEP geral de Montenegro antes do recadastramento; o CEP da Cúria (92510-025) e o da Catedral
   (92510-165) são da faixa nova, o que dá coerência ao dado gravado.
7. **Telefone alternativo da Catedral**: (51) 98437-0817, além do (51) 3632-1196 gravado.
8. **Santuário Santo Antônio (Estrela)** — confirmar o nome oficial. A lista diocesana grava
   "Paróquia Santuário Santo Antônio" e marca `is_sanctuary: true`; as nomeações de 2021 e 2026
   dizem só "Paróquia Santo Antônio". Foi mantido o nome da lista diocesana. Segundo telefone:
   (51) 99643-7284.
9. **Site do Santuário de Estrela bloqueia robôs** (403/404). Uma verificação humana dos horários
   e da lista de comunidades reclassificaria 8 horários de `baixa` para `alta`.
10. **`foundedYear` só existe para a Catedral** (1871, do histórico da própria paróquia:
    criada em 28/04/1871 por Dom Sebastião Dias Laranjeira, desmembrada da Paróquia do Bom Jesus
    de Triunfo; matriz consagrada em 12/12/1965; elevada a Catedral em 06/09/2008). As outras 29
    estão com `null`.
11. **Paróquias com padroeiro repetido no mesmo município** — conferir que os slugs não
    colidiram: São José aparece 4× (Taquari, Roca Sales, Pareci Novo, São José do Hortêncio),
    N. Sra. do Rosário 2× (Paverama, Teutônia), N. Sra. da Conceição 2× (São Vendelino, S. S. do
    Caí). Todas em municípios distintos — sem colisão.
12. **`Comunidade Pinheiros`** (Catedral) não tem dedicação de santo no nome, só o topônimo — é
    assim que a paróquia a publica.
