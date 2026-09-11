# Relatório — Arquidiocese de Palmas (TO)

**Pesquisa:** 2026-09-11 · **Arquivo:** `paroquias/TO/palmas.json`

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias/entradas | **40** (40 alta, 0 media, 0 baixa) |
| Comunidades/capelas | **160** |
| Horários fixos | **355** (319 alta, 2 media, 34 baixa) |
| Cobertura | 40/40 (100% da lista oficial) |

Composição das 40 entradas: 1 catedral, 1 santuário (N. Sra. de Fátima), 1 paróquia-santuário
(Mãe Rainha de Schoenstatt), 2 áreas missionárias/pastorais, 1 centro de evangelização e 34 paróquias.

## Fontes principais

1. **Site oficial** — <https://arquidiocesedepalmas.org.br> (WordPress + Elementor + ACF).
2. **API REST do próprio site** — `GET /wp-json/wp/v2/paroquias?per_page=100`.
   O cabeçalho **`X-WP-Total: 40`** entrega a lista canônica de uma vez e serve de **prova de
   completude**: não existe 41ª ficha publicada. O tipo `horarios` também existe no CMS mas
   devolve `X-WP-Total: 0` (não exposto na API) — os horários foram lidos das fichas.
3. **Fichas individuais** — `https://arquidiocesedepalmas.org.br/paroquias/<slug>/`, uma por
   paróquia, com região pastoral, endereço, CEP, telefone, e-mail, clero, repetidor ACF de
   comunidades e bloco "Celebrações"/"Outras Atividades".

**Sinal de atualidade:** os `modified` das 40 fichas vão de 2024-04-09 a 2026-08-11; 31 das 40
foram alteradas em 2025 ou 2026. Por isso tudo entrou como `alta`.

E-mails vinham ofuscados pelo Cloudflare (`data-cfemail`) e foram decodificados.

## Estrutura pastoral

O site organiza as paróquias em três **regiões pastorais**: **São Pedro**, **São João** e
**São Paulo** (esta última reúne as paróquias do interior/Jalapão). O campo não tem lugar no
schema atual e ficou fora do JSON — registro aqui caso vire agrupamento no Parish.

## Decisões de modelagem

- **`Centro de Evangelização Casa de Maria, Rainha da Paz`** recebeu `status: "nao-paroquial"` +
  `loadAsParish: true`: a própria fonte não o chama de paróquia, mas publica missa **todos os
  dias** (14 missas fixas, incluindo 8 só nas quartas-feiras) — é lugar de missa de verdade.
- **Áreas Missionária Santa Dulce e Pastoral Missionária São José de Anchieta** entraram como
  entradas normais: são unidades territoriais com pároco e missa, equivalentes a quase-paróquias.
- **Matriz**: marcada com `isMatriz: true` sempre que o site nomeia a igreja-matriz ou quando o
  bloco "Celebrações" usa o rótulo "Matriz". Duas inferências assinaladas em `notes`:
  - *Cristo Rei* — o endereço da paróquia é idêntico ao da Comunidade São Mateus.
  - *Área Missionária Santa Dulce* — o endereço (ARNE 81) é o da Comunidade Santo Amaro.
  - *Jesus Bom Pastor* — **nenhuma** comunidade marcada: as 4 comunidades têm missa própria e o
    site não identifica sede. Não há missa rotulada "Matriz", então não há risco de desvio.
- **Comunidades extraídas do bloco de horários**: em São Sebastião (Tocantínia), São João Batista
  (Lagoa do TO) e N. Sra. do Perpétuo Socorro (Rio Sono) o repetidor de comunidades estava vazio
  ou incompleto, mas o texto oficial das celebrações nomeia as comunidades. Elas foram criadas a
  partir dessa mesma fonte oficial (`alta`).

## Os 34 horários `baixa` — recorrência mensal

Como no Jequitinhonha, aqui a missa mensal é regra e não exceção nas paróquias rurais. Todos os
34 registros `baixa` são recorrências que **não cabem em `MassSchedule`** (só dia da semana), e
cada um traz a regra literal publicada em `notes`. Concentração:

| Paróquia | `baixa` | Padrão publicado |
|---|---|---|
| N. Sra. do Perpétuo Socorro (Rio Sono) | 13 | 1º/3º sábado e 1º/3º domingo — 13 das 15 comunidades |
| N. Sra. Aparecida (Aparecida do Rio Negro) | 7 | 1º/2º/3º/4º domingo e 1º/3º sábado |
| N. Sra. das Graças (Novo Acordo) | 4 | último sábado, 3ª sexta, "de 15 em 15 dias" |
| Divino Espírito Santo (Mateiros) | 3 | 1ª sexta do mês e quinzenais |
| N. Sra. Mãe da Divina Providência (Lajeado) | 2 | 1º/3º domingo, 4º domingo |
| São Sebastião (Tocantínia) | 3 | 3º sábado (Buritirana, Água Fria I e II) |
| São Francisco de Assis, São João Batista, Sta. Teresa D'Ávila | 1 cada | dia 04 do mês; último domingo; 1×/mês |

## Pontos para o enxame de validação

1. **CEP inválido — Jesus de Nazaré (Palmas)**: o site publica `77.000-1328` (8 dígitos).
   Gravado como `null`.
2. **CEPs com pontuação errada**, normalizados por mim: Área Missionária Santa Dulce
   (`77.006.112` → `77006-112`) e Santo Expedito (`77.270.000` → `77270-000`).
3. **Telefone de 8 dígitos — São João Batista (Palmas)**: `(63) 9947-6346`, provavelmente falta
   o nono dígito.
4. **Telefone malformado — N. Sra. das Mercês**: publicado `(063 )99217 - 8476 / (63)3225 - 0226`;
   gravei `(63) 99217-8476 / (63) 3225-0226`.
5. **Telefone com parêntese aberto — Santo Antônio de Pádua**: `(63 3224-3451`; gravei
   `(63) 3224-3451`.
6. **CEP 77260-000 (Taquaruçu) em duas fichas urbanas**: Área Pastoral São José de Anchieta
   (Jardim Santa Helena) e São Francisco de Assis usa 77270-000 (Aureny II) igual a Santo
   Expedito (Santa Bárbara) — conferir.
7. **N. Sra. Aparecida (Taquaralto)**: a ficha **não publica missa de domingo**, só terça e
   quinta. É a maior paróquia do sul de Palmas; quase certamente é lacuna da ficha, não realidade.
8. **N. Sra. do Rosário (Taquaruçu)**: 6 comunidades listadas, **nenhuma com horário**. Só a
   matriz tem grade.
9. **Capela São Miguel Arcanjo (Santo Expedito)** e **Com. Nossa Senhora das Graças e São Felipe
   Neri (N. Sra. das Mercês)**: aparecem no bloco de celebrações com rótulo mas **sem dia**
   (a segunda traz só "19h30"). Nenhum horário gerado.
10. **Com. Nossa Senhora Aparecida (Mumbuca, Mateiros)**: comunidade quilombola com missa
    "uma vez por mês", **sem horário publicado** — não gerou registro.
11. **Sem CEP**: Catedral Divino Espírito Santo e Paróquia Bom Jesus da Serra (o site deixa o
    campo vazio).
12. **Sem telefone**: Área Missionária Santa Dulce, Divino Espírito Santo (Mateiros), Bom Jesus
    da Serra. **Sem e-mail**: Área Missionária Santa Dulce, Sagrado Coração de Jesus, Casa de
    Maria, Área São José de Anchieta (as fichas mostram o rótulo sem valor).
13. **Duas fichas homônimas de Imaculada Conceição** (Lizarda e São Félix do TO) e duas de
    N. Sra. do Perpétuo Socorro (Palmas/Aureny IV e Rio Sono) — desambiguadas pelo slug com
    a cidade, conforme a regra.
14. **Atendimento indígena e quilombola** (dado útil ao produto, não ao schema): São Sebastião
    (Tocantínia) atende a **Aldeia Krité, povo Xerente**; Santa Teresa D'Ávila atende a
    **comunidade quilombola Barra do Aroeira**; Mateiros atende a **Mumbuca**.
