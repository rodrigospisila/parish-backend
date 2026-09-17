# Relatório — Diocese de Mossoró (`mossoro`, RN)

Pesquisa em 11/09/2026.

## Fontes

| Fonte | Papel |
|---|---|
| https://diocesedemossoro.com.br/nossas-paroquias/ | Página oficial "Nossas Paróquias" — carrega só **12 fichas** (JetEngine com *scroll infinito*), várias com o texto **"Teste"** no lugar do endereço. |
| `https://diocesedemossoro.com.br/wp-json/wp/v2/paroquia?per_page=100` | **Fonte principal da lista:** a taxonomia `paroquia` do WordPress, com **62 termos** (`X-WP-Total: 62`). |
| https://www.horariodemissa.com.br | 4 fichas com horário dentro da diocese. |
| catholic-hierarchy.org | Bispo, endereço e telefone da Cúria. |

**Nota de coleta:** o site da Diocese está **em reconstrução** (tema novo, conteúdo migrado pela
metade). A paginação do grid JetEngine não foi possível: o `admin-ajax.php` responde
"Há um erro crítico no seu site" para a chamada `jet_engine_ajax/get_listing`, e o Arquivo da
Internet estava **fora do ar** no dia da pesquisa (não deu para recuperar o site antigo
`diocesedemossoro.com`, cujas páginas "Paróquias: Zonal Mossoró I/II" traziam a lista completa).

## Cobertura

| Métrica | Valor |
|---|---|
| Entradas gravadas | **48** — 39 paróquias, 1 quase-paróquia e 8 áreas missionárias |
| Municípios | 36 |
| Confiança | 46 `alta`, 2 `media` (as duas sem município informado) |
| Com endereço | **8 de 48** |
| Com telefone | 8 |
| Com e-mail | 3 |
| Comunidades | 0 |
| Horários fixos | **41**, em 4 paróquias — **todos `baixa`** |

A própria Diocese se descreve com **"39 paróquias, 2 quase-paróquias e 8 áreas missionárias = 49"**.
Cheguei a 48 depois de consolidar as duplicatas da taxonomia; **falta 1 quase-paróquia** e algumas
paróquias de municípios que não aparecem em nenhum termo (p.ex. Tibau, Riacho de Santana,
Rodolfo Fernandes, Viçosa, Doutor Severiano, Serrinha dos Pintos, Olho d'Água do Borges,
Felipe Guerra, Triunfo Potiguar).

## Duplicatas da migração consolidadas

A taxonomia repete a mesma paróquia com nomes ligeiramente diferentes (um registro completo e um de
teste). Foram unificadas, com o termo descartado anotado em `notes`:

| Mantido | Descartado |
|---|---|
| Paróquia São João Batista (Mossoró) | "Paróquia São João-Mossoró" (156) |
| Paróquia São José (Mossoró) | "Paróquia São José- Mossoró" (139) |
| Paróquia São Paulo Apóstolo (Mossoró) | "Paróquia São Paulo- Mossoró" (145) |
| Paróquia São Manoel (Mossoró) | "Paróquia São Manoel - Mossoró" (147) |
| Paróquia São João Batista (Assú) | "Paróquis São João Batista-Assu" (152, com erro de digitação) |
| Paróquia São João Batista e N. Sra. da Conceição (Apodi) | 155 e 137 |
| N. Sra. da Conceição (Alexandria e Pilões) | 141 |
| N. Sra. da Conceição (Portalegre) | 83 |
| N. Sra. da Conceição (Upanema) | 94 ("N. Sra. da Imaculada Conceição – Upanema") |
| N. Sra. das Graças (Baraúna) | 90 |
| Santa Luzia (Carnaubais) | 91 |
| Área Missionária Santa Luzia e N. Sra. de Fátima (Rafael Fernandes) | 123 |

O termo **"Sem oficio" (164)** foi descartado — é lixo de cadastro.

## O que ficou faltando (e por quê)

1. **Endereço, CEP, telefone e e-mail de 40 das 48 entradas.** Só as 12 fichas carregadas pela página
   têm dados, e 4 delas só dizem "Teste".
2. **Horários.** A Diocese **não publica**: o item de menu "Horários das Missas" aponta para `#`
   (página ainda não criada). O horariodemissa.com.br só tem 4 fichas na diocese
   (N. Sra. da Conceição e São Paulo Apóstolo em Mossoró, São Sebastião em Caraúbas e a matriz de
   Almino Afonso). **44 das 48 entradas ficam sem nenhum horário**, e os 41 horários existentes são
   `baixa` (fonte única não oficial).
3. **Comunidades/capelas: zero.**
4. **Pároco e ano de fundação: nenhum.** O site tem a lista de clero (`/membros-do-clero/`) e cada
   página de paróquia lista os padres vinculados, mas sem dizer quem é o pároco — não dava para
   preencher `priestName` sem inventar.

## Precisa de validação humana (prioridade alta — esta é a circunscrição mais frágil das oito)

1. **Refazer a lista quando o site estiver pronto**, ou recuperar o site antigo
   (`diocesedemossoro.com/p/paroquias-zonal-mossoro-i.html` e `-ii`) pelo Arquivo da Internet quando
   ele voltar. Faltam ~1 quase-paróquia e as paróquias dos municípios citados acima.
2. **Registros sem município na fonte:**
   - `Paróquia Bem-Aventurada Lindalva e São Cristóvão` — **resolvido**: fica em **Assú/RN**
     (Av. Senador João Câmara, s/n, Cohab), conforme o Instagram oficial da paróquia
     (@paroquiablsc) e a página de turismo da Prefeitura de Assú. Gravada com `confidence: media`.
   - `Área Missionária Nossa Senhora do Perpétuo Socorro` — **não resolvido**: `city: null`,
     `confidence: baixa`. Nenhuma fonte informa o município. É o único registro do lote inteiro
     (PB + RN) que o `validate.cjs` aponta como "city/state inválidos".
3. **Áreas missionárias que cobrem dois municípios** (gravei o primeiro em `city` e o par em `notes`):
   Major Sales + Paraná; Rafael Fernandes + Água Nova; Coronel João Pessoa + Venha Ver;
   Lucrécia + Frutuoso Gomes; e a paróquia de Alexandria + Pilões.
4. **Conferir a dedicação da matriz de Almino Afonso**: o horariodemissa.com.br a chama apenas
   "Paróquia de Almino Afonso"; a Diocese registra "Paróquia do Sagrado Coração de Jesus - Almino
   Afonso". Casei pelos dois.
5. **`Paróquia Nossa Senhora da Conceição` de Mossoró**: o horariodemissa.com.br a chama "Paróquia
   Imaculada Conceição" (Alto da Conceição, Av. Alberto Maranhão, 300). Mesma paróquia — confirmar
   o nome oficial.
