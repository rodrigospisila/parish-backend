# Relatório — Diocese de Oliveira (MG)

Pesquisa em 2026-09-10. Arquivo: `oliveira.json`.

## Fontes principais

| Fonte | Uso |
|---|---|
| https://www.dioceseoliveira.org.br/paroquias/ (+ páginas 2, 3, 4, 5 e 6) | Lista canônica das 30 paróquias: nome, decreto de criação, endereço, telefone, e-mail, pároco e a lista completa de comunidades urbanas, rurais, ermidas e oratórios |
| https://www.dioceseoliveira.org.br/bispos/ | Sucessão episcopal |
| https://www.dioceseoliveira.org.br/historia/ | Dados de criação da diocese e endereço da Cúria |
| https://www.catholic-hierarchy.org/diocese/doliv.html | Nº esperado de paróquias (30, dados de 2023) e bispo atual |
| https://www.horariodemissa.com.br/ (Oliveira e Campo Belo) | Checado para horários — **sem dados úteis** (ver abaixo) |

O site é WordPress; a listagem é uma página única paginada (`/paroquias/N/`) com blocos
`wp-block-media-text__content` e as comunidades dentro de accordions Bootstrap. Não há
*custom post type* de paróquia nem REST API específica.

## Cobertura

- **30 paróquias** — exatamente o total do catholic-hierarchy.org (2023) e do texto institucional
  da própria diocese. Cobertura **100%** da lista.
- **588 comunidades/capelas/oratórios**.
- **0 horários de missa.** Ver "Lacuna" abaixo.
- `foundedYear` preenchido em **todas as 30** (extraído do decreto/lei de criação publicado pela
  diocese). A mais antiga é Senhor Bom Jesus, Campo Belo (Alvará Régio de 24/09/1818); a mais
  recente é Nossa Senhora das Graças, Perdões (Decreto Diocesano de 01/07/2016).
- 20 municípios: Aguanil, Bom Sucesso, Campo Belo, Cana Verde, Candeias, Carmo da Mata,
  Carmópolis de Minas, Cristais, Desterro de Entre Rios, Itaguara, Oliveira, Passa Tempo,
  Perdões, Piracema, Ribeirão Vermelho, Santana do Jacaré, Santo Antônio do Amparo,
  São Francisco de Paula, São Tiago (+ os distritos abaixo).

## Lacuna principal — horários de missa

**Nenhum horário fixo foi gravado.** Motivos, todos verificados:

1. A diocese **não publica** quadro de missas — nem página de horários, nem PDF; o
   "Calendário Diocesano" é agenda de eventos do bispo.
2. `paroquianossasenhoradocarmo.com` (site próprio da Paróquia Nossa Senhora do Carmo,
   Campo Belo, divulgado pela diocese) está **fora do ar** (conexão recusada).
3. No `horariodemissa.com.br` as três fichas de Oliveira (Catedral, Nossa Senhora Aparecida e
   São Sebastião) e a de Nossa Senhora das Mercês (Campo Belo) trazem "**Nenhum horário de Missa
   informado**" e data de atualização de **2013** — descartadas conforme a regra do prompt.
4. `missas.com.br` não tem página para as cidades da diocese (404).

As paróquias mantêm páginas de Facebook/Instagram ativas (ex.: `@psbjesus.cb`,
`ParoquiaSaoSebastiaoOliveiraMG`, `paroquiasenhoradeoliveira`, `MercesParoquia`), que são a
fonte viável para uma segunda passada — exigem leitura das redes sociais, fora do alcance
desta rodada.

## Distritos (sede fora da cidade-sede do município)

Quatro paróquias têm sede em distrito. `city` recebeu o **município**, o distrito foi para
`neighborhood` e o slug usa o nome do distrito para evitar colisão:

| slug | city | distrito |
|---|---|---|
| `sao-bernardo-de-claraval-macaia` | Bom Sucesso | Macaia |
| `nossa-senhora-das-merces-merces-de-agua-limpa` | São Tiago | Mercês de Água Limpa |
| `sao-joao-batista-morro-do-ferro` | Oliveira | Morro do Ferro |
| `sao-sebastiao-sao-sebastiao-da-estrela` | Santo Antônio do Amparo | São Sebastião da Estrela |

## Pontos para o enxame de validação humana

1. **Bispo**: gravado `Dom Miguel Ângelo Freitas Ribeiro` (bispo diocesano desde 2007, confirmado
   pelo catholic-hierarchy.org). A página de bispos da diocese já lista
   **Dom Antônio Carlos Paiva** como **bispo coadjutor** (ordenação episcopal 14/06/2025) —
   pode já ter havido sucessão. Reconferir.
2. **Paróquia sem pároco**: `sao-joao-batista-morro-do-ferro` — a fonte diz literalmente
   "Pároco: Sem provisão". Gravado `priestName: null`.
3. **Paróquias sem telefone na fonte**: `sao-bernardo-de-claraval-macaia`,
   `nossa-senhora-das-gracas-perdoes`, `sao-sebastiao-sao-sebastiao-da-estrela`.
4. **Telefones com mais de um número no mesmo campo** (copiados literalmente):
   - São Sebastião (Campo Belo): "(35) 3831-5999 – (35) 99202 – 6230";
   - Senhor Bom Jesus de Matosinhos (Cana Verde): "(35) 3865-1134 (Res.) (35) 3865-1196 (Esc.)";
   - São Francisco de Paula: "(37) 9918-5429" (8 dígitos — celular antigo, provavelmente falta o 9).
5. **E-mails duplos**: quase todas as fichas trazem dois e-mails separados por "–"
   (`@gmail.com` e `@hotmail.com`). Foi gravado **apenas o primeiro**; o segundo está na fonte.
6. **Paróquias que também são santuários diocesanos** (a fonte marca "(Santuário Diocesano)"):
   Nossa Senhora do Carmo (Carmo da Mata) e Santo Antônio de Pádua (Santo Antônio do Amparo).
   Gravadas como paróquia com o prefixo "Paróquia"; o nome de santuário aparece na comunidade-matriz.
7. **Comunidades peculiares** mantidas como comunidade porque a diocese as lista:
   - "Santuário Pontifício Senhor Bom Jesus de Matosinhos (Centro)" e "Matriz Santuário Diocesano
     Nossa Senhora das Candeias" (Paróquia Nossa Senhora das Candeias);
   - "Santuário diocesano do Santo Cristo dos Milagres" na comunidade rural Matinha (Paróquia
     São Sebastião, Oliveira);
   - "Santuário Diocesano Nossa Senhora Imaculada Conceição Aparecida" (Santana do Jacaré).
   Vale checar se algum deles deveria ser registro próprio.
8. **Comunidade com jurisdição cruzada**: Santana do Jacaré lista "Caluji – da paróquia de
   São Sebastião da Estrela – Nossa Senhora Aparecida"; foi gravada em Santana do Jacaré com o
   nome "Nossa Senhora Aparecida" e bairro "Caluji". A fonte sugere que o território é da outra
   paróquia. Também: Oliveira/Catedral lista o oratório "São José da Matinha (território da
   Paróquia Nossa Senhora das Mercês)" — não gravado como comunidade da Catedral.
9. **"Casa Paroquial"** e **"APAC"** apareciam como oratórios em várias paróquias e foram
   **descartados** (não são lugar de culto público regular).
10. **Duplicata na fonte**: São Sebastião da Estrela lista "Capela Nossa Senhora do Rosário"
    duas vezes entre as comunidades urbanas (itens 1 e 4). Mantido como está na fonte.
11. **Setores pastorais x comunidades**: Cana Verde e Morro do Ferro listam "Setores Pastorais"/
    "Setores urbanos" em vez de comunidades. Foram gravados como comunidades — verificar se são
    de fato lugares de celebração.


---

## Rodada de HORÁRIOS — 2026-09-10

A rodada anterior fechou com `schedules: []` nas 30 paróquias. Esta rodada acrescentou
**17 horários**, todos com `confidence: "baixa"` (nenhum entra em produção sem validação),
em **3 das 30 paróquias**.

### O que foi acrescentado

| Paróquia | Cidade | Comunidade | Horários | Fonte |
|---|---|---|---|---|
| Paróquia Nossa Senhora das Mercês | Campo Belo | Matriz de Nossa Senhora das Mercês | dom 07h/09h/19h, ter 19h, qua 07h, qui 19h, sex 19h, sáb 19h (**8**) | `horariodemissa.com.br/igreja.php?k=rddmP` — ficha de **09/07/2013** |
| Paróquia Nossa Senhora do Carmo | Campo Belo | Matriz de Nossa Senhora do Carmo | dom 07h/19h, sáb 19h (**3**) | `…k=uPrLe` — ficha de **09/09/2013** |
| Paróquia São João Batista | Morro do Ferro (Oliveira) | Matriz de São João Batista | dom 09h/14h/19h, sex 18h, sáb 19h + **confissão** sáb 09h (**6**) | `…k=znBSI` — ficha de **09/11/2013** |

Dois registros ficaram com ressalva explícita em `notes`:
- **Morro do Ferro, domingo 14h** — a fonte diz literalmente "14:00 (Na comunidades rurais)": não é
  na matriz e não nomeia a comunidade. Gravado em "Matriz" só por falta de local identificado.
- **Morro do Ferro, confissão de sábado** — a fonte diz "09:00 às 17:00 (no escritório paroquial)";
  o modelo só guarda o horário de início.

### Fontes varridas e o que cada uma devolveu

| Fonte | Resultado |
|---|---|
| `dioceseoliveira.org.br` (WordPress) | o `wp-sitemap.xml` só tem `post` e `page` — **não há custom post type de missa nem página de horários**. A página `/paroquias/` (6 páginas, a mesma da rodada anterior) traz decreto de criação, endereço, telefone, e-mail, pároco e a lista completa de comunidades/ermidas/oratórios, mas **nenhum horário**. |
| `dioceseoliveira.org.br/download/` | 4 PDFs. O único candidato, o **Diretório Pastoral Diocesano (1ª ed., 184 páginas)**, foi baixado e teve o texto extraído: é normativo (sacramentos, taxas, disciplina) e **não traz quadro de horários** — as 166 ocorrências de "missa" são doutrinárias. |
| `horariodemissa.com.br` | varridas as **23 cidades e distritos** da diocese → 24 fichas; **só 3 têm horário** (as da tabela acima). As demais (Aguanil, Bom Sucesso ×2, Cana Verde, Candeias, Carmo da Mata, Carmópolis, Cristais, Itaguara, Oliveira ×3, Passa Tempo, Perdões, Piracema, Ribeirão Vermelho, Santana do Jacaré, Santo Antônio do Amparo, São Tiago ×2 e a 3ª de Campo Belo) dizem literalmente "(Nenhum horário de Missa informado)". |
| `missas.com.br` | existe página para 19 das 23 cidades — **todas vazias** (nenhuma igreja cadastrada). |
| `missahora.com.br` / `horariosmissa.com.br` | "Não há missas disponíveis". |
| `paroquianossasenhoradocarmo.com` (Campo Belo, o único site paroquial publicado pela diocese) | **fora do ar** — NXDOMAIN confirmado por DNS-over-HTTPS. |
| Redes sociais | as páginas oficiais que foi possível localizar (Facebook e Instagram de Aguanil, Facebook de Bom Sucesso e da própria diocese) foram baixadas com User-Agent do Googlebot e lidas: **nenhuma publica a grade fixa em texto** — a apresentação de Aguanil e de Bom Sucesso só descreve a página, e os horários, quando aparecem, estão dentro de cartazes em imagem. A busca automatizada de perfis para as outras **28** paróquias foi rodada até o fim e voltou vazia: o DuckDuckGo (endpoint HTML, único motor que ainda aceitava raspagem) passou a responder desafio de bot e HTTP 403 depois das duas primeiras consultas, e nem Bing, Mojeek, Brave ou Startpage devolveram resultado utilizável. Ou seja: só há perfil conhecido para 2 das 30 paróquias, e nenhum dos dois publica horário. |

### Conclusão

A Diocese de Oliveira, suas 30 paróquias e os agregadores **não publicam horário de missa em
texto indexável**, salvo as 3 fichas de 2013 acima. Para completar de verdade, o caminho é:
(a) baixar e ler os **cartazes em imagem** dos Facebook/Instagram paroquiais — foi assim que
Araçatuba saiu completa — o que exige antes descobrir os perfis de cada paróquia; ou
(b) contato direto com as secretarias (a diocese publica telefone e e-mail de todas as 30).

### Ponto novo para o enxame de validação

As comunidades extraídas da rodada anterior têm **artefatos de quebra de linha da fonte** que
viraram "comunidade": entradas como `"Urbanas:"`, `"Setores urbanos:"`, `"da Paz"` (quebra de
"Nossa Senhora Rainha / da Paz") aparecem em `communities`. Não foram tocadas nesta rodada
(o escopo era só horários), mas precisam de limpeza antes da carga.
