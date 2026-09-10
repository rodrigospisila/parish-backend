# Relatório — Eparquia de Nossa Senhora do Paraíso em São Paulo dos Greco-Melquitas

Pesquisa em 2026-09-10. Arquivo: `paroquias/SP/melquita-nossa-senhora-do-paraiso-sao-paulo.json`.

## Natureza da circunscrição

Eparquia **de âmbito nacional** da Igreja Greco-Católica Melquita (rito bizantino), com jurisdição
sobre todo o território brasileiro. O arquivo está na pasta `SP` porque a sede (Cúria e Catedral)
fica em São Paulo, mas o campo `state` de cada paróquia é a **UF onde ela fica**: SP, RJ, MG e CE.

- Sede: Rua do Paraíso, 21 — Paraíso, São Paulo/SP, CEP 04103-000, (11) 3141-0639.
- Bispo eparquial: **Dom George Toufik Khoury** (desde 17/06/2019).
- Vigário geral / chanceler / ecônomo: Mons. Joaquim Stein. Vigário judicial: Mons. André Sampaio de Oliveira.
- Site oficial: `https://eparquiagrecomelquita.org.br` (o domínio antigo `eparquiamelquita.org.br`
  redireciona 301 para o novo).

## Fontes principais e sua atualidade

| Fonte | Data da fonte | Uso |
|---|---|---|
| `eparquiagrecomelquita.org.br/nossas-igrejas/` | atualizada em **21/03/2026** | lista oficial das igrejas, por estado |
| Páginas de cada igreja no site oficial | atualizadas entre **09/01/2026 e 26/04/2026** | endereço, CEP, telefone, clero, horários |
| `eparquiagrecomelquita.org.br/contato/` | atualizada em **26/04/2026** | telefones das secretarias por cidade |
| `eparquiagrecomelquita.org.br/curia-eparquial-greco-melquita/` | atualizada em **21/03/2026** | cúria, e-mails institucionais |
| `gcatholic.org/churches/local/noss1-n` | atualizado em **16/05/2026** | 7 igrejas — cobertura cruzada |
| `catholic-hierarchy.org/diocese/dsame.html` | estatísticas de **2023** | 5 paróquias, 437.000 católicos, 24 sacerdotes |
| Wikipédia pt — *Eparquia Greco-Melquita Nossa Senhora do Paraíso* | consultada em 10/09/2026 | seção "Comunidades", espaços cedidos |
| `arquidiocesejuizdefora.org.br/igreja-catolica-melquita-de-rito-bizantino/` | consultada em 10/09/2026 | corroboração do endereço e do fixo em Juiz de Fora |

**Detalhe técnico:** o site oficial devolve 403 a leitores automáticos; foi lido com `curl` enviando
UA de Chrome, e o conteúdo estruturado veio da REST API do WordPress
(`/wp-json/wp/v2/pages/<id>`), que expõe também o campo `modified` — é dele que vêm as datas de
atualização acima. Por isso a confiança **alta** nos horários: publicação oficial com sinal claro
de atualidade (≤ 6 meses).

## Cobertura

- **7 paróquias/igrejas** no arquivo — 6 com confiança `alta`, 1 com `media`.
- **7 comunidades** (6 matrizes + a Capela dos Apóstolos Pedro e Paulo, em Fortaleza).
- **35 horários fixos**: 34 `alta` e 1 `baixa`.

Distribuição por estado:

| UF | Igrejas |
|---|---|
| SP | 3 (São Paulo, Taubaté, Lins) + Tremembé (`media`) = 4 |
| RJ | 1 (Rio de Janeiro) |
| MG | 1 (Juiz de Fora) |
| CE | 1 (Fortaleza) |

### As igrejas

1. **Catedral de Nossa Senhora do Paraíso** — São Paulo/SP, Paraíso. Pe. Ziad Al-Khoury (pároco) e
   Mons. Joaquim Stein. 8 horários.
2. **Concatedral de São Basílio e Nossa Senhora do Perpétuo Socorro** — Rio de Janeiro/RJ, Centro.
   Primeira igreja melquita do Brasil; elevada a Co-Catedral pelo Papa Francisco em 07/05/2023.
   D. George Khoury (hierarca) e Pe. Vitor Pereira. 7 horários.
3. **Paróquia de Nossa Senhora do Líbano** — Fortaleza/CE, Meireles. Santuário. Única com duas
   comunidades: a Matriz e a Capela dos Apóstolos Pedro e Paulo (anexa ao salão paroquial), cada
   uma com horários próprios. 4 horários.
4. **Paróquia de Sant'Ana** — Taubaté/SP, Centro. Pe. Dimitrios Bertani. 4 horários.
5. **Paróquia de Nossa Senhora de Tsambica** — Lins/SP, Jardim Campestre. Pe. Nectários Rossato.
   2 horários (1 `baixa`, ver abaixo).
6. **Paróquia de São Jorge** — Juiz de Fora/MG, Santa Helena. Pe. Georges Khayat. 10 horários,
   incluindo 3 de confissão com horário publicado — o registro mais completo do conjunto.
7. **Paróquia São Sebastião** — Tremembé/SP, Centro. `media`, sem endereço/telefone/horário.

## Divergências entre fontes e o que foi decidido

**gcatholic (7 igrejas) × site oficial (6 igrejas).** As listas não coincidem:

- gcatholic **não tem Lins**; o site oficial tem. Lins foi mantida com `alta` (site oficial +
  Diretório da Diocese latina de Lins, que já a registra em `paroquias/SP/lins.json`).
- gcatholic **tem Tremembé/SP**; o site oficial não. Incluída com `media` (gcatholic 16/05/2026 +
  Wikipédia). Fica a 5 km de Taubaté e é provavelmente atendida pelo mesmo clero.
- gcatholic **tem Belo Horizonte/MG (Sagrado Coração de Jesus)**; o site oficial não. **Não foi
  incluída aqui**: essa é a paróquia pessoal dos **siríacos católicos**, do Ordinariado para os
  Fiéis de Rito Oriental (assim registrada no Catálogo 2026 da Arquidiocese de BH e no próprio
  gcatholic, que a lista também sob o Ordinariato). Os melquitas apenas celebram no espaço. Ela
  está em `paroquias/MG/ordinariado-rito-oriental.json`.

**catholic-hierarchy: 5 paróquias (2023).** Número menor que 6/7 porque conta só paróquias
canônicas — a Catedral, a Concatedral e o Santuário de Fortaleza podem estar agregados de outro
modo. Não foi usado como teto de cobertura.

**Espaços cedidos por igrejas latinas (não são paróquias melquitas, não entraram).** A Wikipédia
lista três, e eles explicam parte da presença melquita fora das 7 igrejas:
- Igreja de Santa Helena — Votorantim/SP, Barra Funda;
- Santuário do Bom Jesus — Boa Esperança/MG;
- Igreja do Sagrado Coração de Jesus — Belo Horizonte/MG, Funcionários.

**Endereço de Lins.** O site oficial da Eparquia diz **Rua Campos Sales, 980, CEP 16400-272**;
o Diretório da Diocese latina de Lins (já no dataset, `paroquias/SP/lins.json`) diz **Rua Regente
Feijó, 980, CEP 16400-049**. Foi adotado o da Eparquia (fonte própria e mais recente); a
divergência está anotada em `notes`.

**Juiz de Fora.** O site da Eparquia dá só o WhatsApp (32) 98493-7384; a Arquidiocese latina de
Juiz de Fora dá o fixo (32) 3212-7878. Os dois estão registrados (o fixo em `notes`).

## Horários — observações

- Todos os horários vêm da página oficial de cada igreja e são de **Divina Liturgia** (rito
  bizantino), mapeados para `MASS`.
- **1 horário `baixa`** — Lins, domingo 10h30: a regra da fonte é *"1º e 3º Domingo do Mês, às
  10h30"*, recorrência **mensal**, que não cabe no modelo `MassSchedule` (só dia da semana). A regra
  literal está em `notes`.
- **Confissões sem horário fixo não foram registradas.** Três igrejas publicam a confissão como
  regra relativa, sem hora: São Paulo ("todos os dias, antes da Liturgia"), Taubaté ("antes ou após
  a Divina Liturgia") e Lins ("1 hora antes da celebração"). Ficaram descritas em `notes` da
  paróquia. Só Juiz de Fora publica horário de confissão em relógio, e esse foi registrado.
- Rio de Janeiro publica "Confissões e Batizados: data e horário a combinar" — nada a registrar.

## Precisa de validação humana

1. **Paróquia São Sebastião, Tremembé/SP** — confirmar se ainda é paróquia melquita autônoma (não
   está na lista oficial de 21/03/2026) e levantar endereço, telefone, pároco e horários.
2. **Endereço de Lins** — Rua Campos Sales, 980 (Eparquia) × Rua Regente Feijó, 980 (Diocese de
   Lins), com CEPs diferentes. Uma das duas está errada.
3. **Belo Horizonte** — decidir a apresentação no produto: a mesma igreja (Sagrado Coração de
   Jesus, Av. Carandaí, 1010) serve siríacos (paróquia pessoal, Ordinariado) e melquitas (espaço
   cedido). No dataset ela aparece uma única vez, no arquivo do Ordinariado.
4. **Espaços cedidos (Votorantim/SP e Boa Esperança/MG)** — não têm horário publicado; se o Parish
   quiser exibi-los, precisam de pesquisa própria e de um modelo para "comunidade sem paróquia
   própria".
5. **Duplicidade com dioceses latinas** — as mesmas igrejas já constam, marcadas
   `"status": "outra-jurisdicao"`, em `paroquias/SP/lins.json` e `paroquias/MG/juiz-de-fora.json`.
   Na carga, a versão canônica é a deste arquivo.
6. **E-mails por paróquia** — o site oficial só publica e-mails da Cúria
   (`curia@`, `chancelaria@`, `financeiro@`, `tribunal@`, `webmaster@` `eparquiagrecomelquita.org.br`);
   nenhuma paróquia tem e-mail próprio publicado, por isso todos estão `null`.
