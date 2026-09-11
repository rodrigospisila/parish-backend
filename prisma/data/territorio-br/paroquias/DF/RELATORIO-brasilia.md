# Arquidiocese de Brasília — relatório de pesquisa

- **UF:** DF · **slug:** `brasilia` · **sede:** Brasília/DF
- **Data da coleta:** 11/09/2026
- **Arquivo:** `brasilia.json`

## Resultado

| | |
|---|---|
| Paróquias no arquivo | **172** fichas |
| — entram na carga | **167** (todas `confidence: alta`) |
| — fora da carga | 5 (3 `duplicada`, 2 `nao-paroquial`) |
| Comunidades/capelas | **416** (172 matrizes + **244 capelas nomeadas**) |
| Horários fixos | **2.537** (1.843 missas, 675 confissões, 18 adorações, 1 terço) |
| — por confiança | 1.033 `alta`, 1.405 `media`, 99 `baixa` |
| Paróquias ativas com pelo menos 1 horário | **163 de 167** |
| Cobertura | **167 / 167** esperadas |

## Fonte principal — uma só, e ótima

O portal oficial **https://arqbrasilia.com.br** publica cada paróquia como ficha do plugin
**GeoDirectory** (tipo `gd_place`, rotulado "Paróquias"). A ficha tem campos estruturados para
endereço, telefone, WhatsApp, e-mail, site, Facebook, Instagram, pároco, vigários, diáconos,
vicariato, setor, **nome e endereço das capelas**, **horários de missa**, **horários de confissão**
e horários da secretaria.

A listagem canônica saiu de uma chamada só à API REST do próprio site:

```
https://arqbrasilia.com.br/wp-json/geodir/v2/todas_paroquias?per_page=100&page=1..2
   → X-WP-Total: 172
```

(O endpoint `wp/v2/todas_paroquias` devolve 404 — o GeoDirectory serve o post type no namespace
`geodir/v2`, não no `wp/v2`. O caminho para descobrir isso é `wp-json/wp/v2/types`, que lista
`rest_base` e `rest_namespace` de cada tipo.)

**Atualidade:** 54 fichas foram modificadas em 2026 (a mais recente no próprio dia 11/09/2026),
113 em 2025 e 5 em 2023. Regra aplicada aos horários: ficha modificada a partir de 11/09/2025
(≤ 12 meses) → `alta`; mais antiga → `media` (fonte oficial sem sinal de atualidade). Nenhuma ficha
é anterior a 2023, então nada caiu na regra do "horário pré-pandemia".

Fontes secundárias usadas só para conferir números e resolver ambiguidades:
`arqbrasilia.com.br/vicariatos/`, `arqbrasilia.com.br/paroquias/`, Wikipédia (território e
estatísticas), catholic-hierarchy.org, e buscas pontuais para os casos duvidosos listados abaixo.

## Decisões de modelagem

- **`city` = "Brasília" em todas as paróquias.** O território da arquidiocese é exatamente o
  Distrito Federal (5.814 km², faz divisa com Formosa, Luziânia e Paracatu), e o DF é juridicamente
  um município único. A **região administrativa** (Ceilândia, Taguatinga, Samambaia, Gama, Asa Sul…)
  vai em `neighborhood` — são 39 RAs distintas no dataset.
- **`slug` usa a região administrativa no lugar da cidade** (`sao-sebastiao-taguatinga`,
  `sao-sebastiao-gama`, …). A regra do README (`<nome>-<cidade>`) colidiria: há 6 "São José
  Operário", 5 "Nossa Senhora de Fátima", 5 "São Sebastião", 4 "Nossa Senhora Aparecida" e 4
  "São José" — todas em Brasília. Os 172 slugs conferidos são únicos.
- **Campos extras** gravados por serem a chave de organização da arquidiocese: `vicariato`
  (Norte/Sul/Centro/Leste) e `setor` (I a XV).
- **`website`** recebe, nessa ordem, o site próprio, o Facebook ou o Instagram oficial da paróquia —
  o que a ficha publicar. 112 das 172 têm alguma presença web registrada.
- **`foundedYear` = null em todas.** O portal não publica ano de criação (o campo "Histórico da
  Paróquia" é só um contêiner de shortcodes).

## Conferência de cobertura

| Fonte | Número |
|---|---|
| `arqbrasilia.com.br/vicariatos/` | **167 paróquias + 2 áreas pastorais** (Norte 33, Sul 52, Centro 47, Leste 32) |
| `arqbrasilia.com.br/paroquias/` (texto da página) | 153 paróquias + 2 áreas pastorais |
| Wikipédia (2023) | 167 paróquias, 2 áreas pastorais, 4 vicariatos, 15 setores |
| API GeoDirectory | 172 fichas publicadas |
| Soma do campo `vicariato` das fichas | Norte 33, Sul 53, Centro 44, Leste 31 = 161 (+11 sem vicariato) |

Depois de tirar as 5 fichas que não são paróquia (abaixo), sobram **167** — exatamente o número que a
própria arquidiocese declara. O "153" da página `/paroquias/` é texto desatualizado; a página
`/vicariatos/` e a listagem da API concordam entre si.

## Fichas que não entram na carga

| Ficha | `status` | Motivo |
|---|---|---|
| Igrejinha Nossa Senhora de Fátima (EQS 307/308, Asa Sul) | `nao-paroquial` | É a capela histórica do **Santuário Nossa Senhora de Fátima**: mesmo telefone (61) 3443-2869 e o Santuário a lista no campo "capelas". Os 4 horários dela já entram como a comunidade "Igrejinha Nossa Senhora de Fátima" do Santuário — carregá-la de novo duplicaria as missas. |
| Capelania Divino Mestre (Samambaia) | `nao-paroquial` | A própria fonte a chama de capelania; sem vicariato/setor e sem horário publicado. |
| Nossa Senhora da Assunção – Águas Claras | `duplicada` | Ficha de 2023, sem vicariato e sem horários, do mesmo endereço (Quadra 103 Lote 865, Águas Claras) publicado como "PARÓQUIA NOSSA SENHORA DA ASSUNÇÃO" (Vicariato Sul / Setor VII). |
| São Francisco – Vicente Pires | `duplicada` | Ficha de 2023 da mesma paróquia publicada como "São Francisco de Assis" (Vicente Pires): mesma grade de missas e mesmas redes (@saofranciscovp). O endereço desta é o antigo (Chácara 127 Lote 01); o vigente é EPTG 4, Trecho 03. |
| Beato José Allamano (Samambaia) | `duplicada` | Mesma paróquia de "São Bento" (QS 305 conj. 1 lotes 1/4): mesmo endereço, mesmo pároco (Pe. Alexis Alfonzo Guanipa Flores) e as mesmas capelas (Santo Antônio e Nossa Senhora da Guia). **Ver "validação humana" abaixo.** |

## Paróquias ativas sem nenhum horário (4)

| Paróquia | RA | Motivo |
|---|---|---|
| Paróquia Bem-Aventurada Virgem Maria de Guadalupe | Ceilândia | ficha nova (09/04/2026), grade ainda vazia |
| Paróquia Divino Espírito Santo Paráclito | Park Way | ficha nova (13/07/2026), grade ainda vazia |
| Paróquia Maria de Nazaré | Samambaia | campo de horários vazio desde 2025 |
| Paróquia Nossa Senhora da Glória | Ceilândia | **a grade existe, mas veio como tabela achatada** (ver abaixo) |

A ficha da N. Sra. da Glória publica o horário como uma tabela do Word que perdeu as células ao ser
colada: *"Matriz Segunda à Sexta Sábado Domingo 19h 8h e 19h 8h, 11h e 19h"*. Dias e horas ficaram em
blocos separados e não há como saber com segurança o que é de quem — o parser rejeita esse formato de
propósito, em vez de espalhar 33 horários errados. **Precisa de transcrição manual.**

## Melhores fichas

- Mais capelas: Santo Afonso (São Sebastião) 14, Santa Rita de Cássia (Planaltina) 11,
  Nossa Senhora Aparecida – PADDF e Nossa Senhora da Medalha Milagrosa (Riacho Fundo II) 10 cada.
- Mais horários: São Gabriel Arcanjo (Recanto das Emas) 32, Santuário Nossa Senhora da Saúde
  (Asa Norte) 32, Maria Imaculada (Guará II) 31, São José Operário (Asa Norte) 31.

## Pontos para o enxame de validação

1. **"Paróquia São Bento" ou "Paróquia Beato José Allamano"?** (QS 305 conj. 1, Samambaia).
   O portal publica as duas fichas para a mesma paróquia. Gravei "Paróquia São Bento" como a ativa,
   porque é a ficha que tem vicariato (Leste / Setor IX), pároco e horários; a outra é um esboço de
   2023. Mas o Facebook oficial (@**SaoBentoDF**) hoje se chama "**P Beato José Allamano**", e o site
   antigo da arquidiocese também a registrava com esse nome. Como José Allamano foi **canonizado em
   outubro de 2024**, o nome em vigor pode ainda ser um terceiro ("São José Allamano"). Precisa de
   confirmação humana.
2. **99 horários `baixa` em 25 paróquias** são missas de **recorrência mensal** ("1º sábado do mês",
   "1º, 2º e 4º domingo", "todo primeiro sábado"). É o mesmo bloqueio de modelagem já registrado no
   README: `MassSchedule` só tem dia da semana. Ficam no dataset, fora da carga.
3. **Paróquia Santíssima Trindade (Guará II)** publica "Horários de missa: 07h30, 10h e 19h" **sem
   dizer o dia**. Quase certamente é domingo, mas não inventei: os três horários ficaram de fora e a
   paróquia só tem a confissão de quarta e domingo. Vale uma conferência.
4. **Paróquia São José (Guará I)**, **Santuário Santíssimo Sacramento** e **Paróquia São Pedro de
   Alcântara** têm ficha completa (pároco, telefone, grade de missas) mas **sem vicariato/setor**
   preenchido no portal. Entraram como paróquias — o Santíssimo Sacramento é paróquia *e* santuário
   arquidiocesano de adoração perpétua (decreto 11/2006), confirmado por busca. As outras duas não
   foram confirmadas por segunda fonte.
5. **Ficha "Nossa Senhora Aparecida (Contagem)"**, em Sobradinho: o "(Contagem)" é o nome do
   condomínio/localidade, não a cidade mineira. Mantido no nome para desambiguar.
6. **Endereços dentro do campo "capelas"**: 244 capelas foram extraídas do campo livre
   `nome_e_endereço_das_capelas`, que mistura nome e endereço em uma linha só, com separadores
   irregulares (`/`, `|`, ` I `, vírgula). O parser separa nome e endereço por marcador de logradouro;
   nomes com mais de 45 caracteres ou com resto de endereço podem ter sobrado. Amostra revisada à mão
   ficou limpa, mas a varredura completa das 242 não foi feita.
7. **7 fichas trazem `city: "Philadelphia"`** no portal (valor padrão do GeoDirectory nunca corrigido).
   Foi ignorado — todas são do DF. Não é erro nosso, é erro da fonte, e vale avisar a arquidiocese.
8. **CEP**: 149 das 172 fichas trazem CEP embutido no texto do endereço; foi extraído por regex. As
   23 restantes ficaram com `zipCode: null`.
