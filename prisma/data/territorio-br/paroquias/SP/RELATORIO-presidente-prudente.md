# Relatório de pesquisa — Diocese de Presidente Prudente (SP)

- **Arquivo**: `paroquias/SP/presidente-prudente.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território BR — oeste paulista (onda SP)

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **57** (todas `alta`) |
| Confiança | 57 alta / 0 media / 0 baixa |
| Comunidades/capelas | 356 |
| Horários fixos | 610 (560 `media`, 50 `baixa`) |
| Paróquias esperadas (Catholic-Hierarchy, anuário 2024) | 55 |
| Municípios cobertos | 27 |

Cobertura estimada: **100%+** (57 fichas oficiais contra 55 esperadas).

Campos preenchidos em **todas** as 57 paróquias: nome, cidade, bairro, endereço, CEP, telefone,
e-mail, site, pároco e ano de fundação. É o dataset mais completo das quatro dioceses desta rodada.

## Fontes principais

1. **Site oficial** — https://www.diocesepresidenteprudente.com.br
   - `/paroquias/` — listagem por região pastoral (4 regiões) e por cidade; **57 links de ficha**.
   - `/paroquia/<slug>/` — ficha por paróquia com padres, telefone/WhatsApp, e-mail, data de fundação e
     endereço completo com CEP e cidade.
   - `wp-admin/admin-ajax.php` com `action=getHorarios&paroquia=<id>&local=<id>` — endpoint oficial que
     devolve, por **local**, o endereço da comunidade e a **tabela semanal de missas** (domingo a sábado).
     Foram feitas **364 consultas** (uma por local), sem nenhum erro.
2. **Catholic-Hierarchy** — https://www.catholic-hierarchy.org/diocese/dprpr.html (55 paróquias, ap2024;
   diocese erigida em 16/01/1960, sufragânea de Botucatu; bispo Dom Benedito Gonçalves dos Santos).

## Decisões de confiança

- **Horários = `media`**, não `alta`: todas as 57 fichas trazem o aviso *"Última atualização de horários
  ocorreu em **julho de 2025** nesta página"*. Como a pesquisa é de setembro/2026, a publicação passa dos
  12 meses exigidos pelo README para `alta` — fonte oficial, mas sem sinal de atualidade.
- **50 horários marcados `baixa`**: a tabela do site marca alguns horários com **asterisco (`*`)** e
  **não publica a legenda** do símbolo em lugar nenhum (nem na ficha, nem no rodapé do AJAX). O padrão
  sugere recorrência não semanal (capelas rurais, comunidades de assentamento). A observação literal foi
  gravada em `notes` de cada um desses horários.

## O que ficou faltando

- **Bairro das comunidades**: o endpoint devolve o endereço da capela (muitas vezes rural: "Sítio Gleba
  Nova", "Assentamento Chico Castro Alves", "Fazenda Sasa"), mas não um campo de bairro. Gravei
  `neighborhood: null` nas comunidades e o endereço integral em `address`.
- **Horários de confissão, adoração e terço**: o site só publica missas.
- **Nome do pároco**: gravei apenas o **primeiro** sacerdote listado (o pároco); vigários e administradores
  paroquiais que aparecem na ficha não foram gravados (o modelo tem um campo só).

## Pontos que precisam de validação humana

1. **Dois slugs do site estão trocados** (o `h1` e o endereço da ficha são os corretos, e foi o que usei):
   - `/paroquia/paroquia-nossa-senhora-aparecida-primavera/` → a ficha é da **Paróquia Nossa Senhora dos
     Navegantes**, Praça Paulo VI 1495, Centro, **Rosana**.
   - `/paroquia/paroquia-nossa-senhora-dos-navegantes-rosana/` → a ficha é da **Paróquia Nossa Senhora
     Aparecida**, Praça Antônio Castilho, Distrito de **Primavera**, Rosana.
   - Também `/paroquia/paroquia-nossa-senhora-do-carmo/` → **Santuário Diocesano Nossa Senhora do Carmo**;
     `/paroquia/paroquia-sao-miguel-arcanjo-pp/` → **Santuário Diocesano São Miguel Arcanjo**;
     `/paroquia/671-2/` → **Paróquia Nossa Senhora das Graças** (Distrito de Montalvão).
2. **Três "São Miguel Arcanjo" na diocese, dois deles em Presidente Prudente** (Paróquia São Miguel
   Arcanjo, Maré Mansa; e Santuário Diocesano São Miguel Arcanjo, Parque Residencial Damha). Como a regra
   de slug `<nome>-<cidade>` colidiria, acrescentei o bairro ao slug dos dois:
   `sao-miguel-arcanjo-presidente-prudente-mare-mansa` e
   `sao-miguel-arcanjo-presidente-prudente-parque-residencial-damha`.
3. **Datas de fundação**: a ficha traz `dd/mm/aaaa` (ex.: Catedral 29/04/1925, Nossa Senhora Aparecida de
   Teodoro Sampaio 01/05/1963, Paróquia Nossa Senhora do Perpétuo Socorro de Teodoro Sampaio 27/06/2022).
   São variadas e plausíveis — **não parecem data de cadastro no CMS** —, mas só o ano foi gravado.
   Vale conferir as que caem em 01/01 ou 01/05 (aparentam ser aproximações).
4. **5 santuários diocesanos** aparecem na lista de paróquias e foram tratados como paróquias
   (Santa Teresinha do Menino Jesus e da Sagrada Face, Nossa Senhora Aparecida, Nossa Senhora do Carmo,
   São Miguel Arcanjo — todos em Presidente Prudente — e Santo Expedito, em Santo Expedito). A diocese os
   lista dentro de `/paroquias/`, então presumi que são paróquia-santuário; se algum for santuário **não
   paroquial**, precisa virar `status: "nao-paroquial"`.
5. **Telefones em formato composto**: várias fichas trazem dois números na mesma string, com sufixo
   "(WhatsApp)" — ex.: `(18) 3223-2016 | (18) 98114-0066 (WhatsApp)`. Gravei a string literal; a
   normalização fica para a carga/validação.
6. **Comunidades homônimas dentro da mesma paróquia**: em Martinópolis (Paróquia Santa Bibiana, 21 locais)
   há "Capela Nossa S. Aparecida", "Capela Nossa S. Aparecida - Represa" e "Capela Nossa Senhora
   Aparecida" — nomes distintos no site, endereços distintos, mantidos como estão.
7. **Paróquias com apenas 1 local cadastrado** (a própria matriz) e **0 comunidades**: Catedral São
   Sebastião, Santuário Diocesano de Santo Expedito, Santuário de Santa Teresinha, Paróquia Santa Luzia
   (Distrito de Araxans/Presidente Bernardes), Paróquia Santo Antônio de Pádua (Presidente Prudente),
   Paróquia São Sebastião (Estrela do Norte). Pode ser cadastro incompleto do site e não ausência real
   de capelas.
