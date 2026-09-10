# Relatório de pesquisa — Diocese de Umuarama (PR)

Data da pesquisa: 2026-09-09. Arquivo de dados: `umuarama.json`.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://diocesedeumuarama.org.br/paroquias/ (+ `?region=<id>` por decanato e paginação `page/N/`) | Listagem oficial: 52 entradas (46 em 9 decanatos, 5 sem decanato, 1 missão) | alta |
| https://diocesedeumuarama.org.br/paroquia/{slug} | Página de cada paróquia (plugin "wp-parresia-register"): nome, fundação, telefone, endereço completo com CEP, e-mail (protegido por Cloudflare, decodificado), clero com função, lista de capelas, texto "Sobre" com horários de missa e confissões | alta |
| https://diocesedeumuarama.org.br/capela/{slug} | Página de cada capela (170): nome, endereço/localidade e "Sobre" com celebrações | alta |
| https://diocesedeumuarama.org.br/curia-diocesana/ e /telefones-e-enderecos/ e /contato/ | Bispo (Dom Frei João Mamede Filho, OFMConv), endereço, telefone e e-mail da Cúria | alta |
| https://www.catholic-hierarchy.org/diocese/dumua.html | Nº esperado de paróquias (48 em 2023), data de criação | media |
| https://pt.wikipedia.org/wiki/Diocese_de_Umuarama | Bispo, área, província (Maringá) | media |

Observações técnicas: a listagem carrega só 9 cartões por página e o filtro por decanato é feito por
query string; as rotas REST do plugin exigem login, então tudo foi extraído do HTML renderizado.
Os horários NÃO são estruturados no site — estão em texto livre na seção "Sobre" de cada paróquia
e capela — e foram convertidos por um parser (dias, intervalos "Segunda à Sexta", faixas "das 9h às
11h", exceções "exceto na terça", recorrências mensais). Linhas não reconhecidas estão listadas abaixo.

## Cobertura

- **Paróquias encontradas: 51** — **esperadas: 48** (Catholic-Hierarchy, 2023). A diferença corresponde a
  paróquias criadas em 2022–2025 e já presentes no site: N. S. Aparecida/Vidigal (2022), N. S. das
  Graças/Cianorte (2022), Divina Misericórdia/Cianorte (2023), Santo Expedito/Umuarama (2023),
  Santo Antônio/Serra dos Dourados (2025).
- Decanatos (site): Cianorte 8, Douradina 6, Iporã 6, São Francisco de Assis 6, Catedral 5, Pérola 4,
  Tapejara 4, Nova Olímpia 4, Indianópolis 3; **5 paróquias sem decanato na listagem** (N. S. do Rocio/
  São Manoel do Paraná, Santo Antônio/Esperança Nova, Santo Antônio/Indianópolis, São José Operário/
  Umuarama, São Tomé).
- Entrada **"Mato Grosso do Sul"** (sem endereço, clero "Padre Missionário") não é paróquia — excluída.
- Confiança das paróquias: **51 alta**.
- Comunidades: **170 capelas** em 32 paróquias (nomes oficiais das páginas das paróquias; endereço e
  localidade tirados da página de cada capela). Nessas 32 a matriz foi incluída com `isMatriz: true`;
  as outras 19 ficaram com `communities: []`.
- Horários: **668 registros** — 431 MASS, 236 CONFESSION, 1 ADORATION; **546 alta / 122 baixa**;
  129 deles em capelas. Os "baixa" são celebrações com recorrência mensal declarada ("1ª sexta do
  mês", "3º sábado", "último domingo"), muito comuns nas capelas rurais; o esquema só representa
  recorrência semanal, então ficam fora da carga automática com a observação em `notes`.
- Sem horários no site (texto "Sobre" vazio): N. S. Aparecida/Tapejara, N. S. das Graças/Cianorte,
  Santa Maria Goretti e São José Operário/Cidade Gaúcha, São Sebastião/Altônia. São Tomé publica
  apenas confissões.

## Regras aplicadas

- Nome do site sem o sufixo de localidade ("Paróquia X - Cidade"). Normalizações: "Paróquia Catedral
  do Divino Espírito Santo" → **Catedral do Divino Espírito Santo**; "Paróquia da Ressureição" (erro de
  grafia do site; o e-mail é pa.ressurreicao@) → **Paróquia da Ressurreição**; "Paróquia Nossa Senhora
  de Fátima - Santuário Eucarístico Diocesano" → **Paróquia Nossa Senhora de Fátima (Santuário
  Eucarístico Diocesano)**, Cianorte.
- Paróquias sediadas em distritos: Vidigal e São Lourenço (Cianorte), Santa Eliza e Serra dos
  Dourados (Umuarama) — `city` = município (endereço), `neighborhood` = "Distrito de …", e o slug usa
  o distrito para não colidir (ex.: `sagrado-coracao-de-jesus-santa-eliza`).
- Cidade e CEP extraídos do campo de endereço ("…, Cidade - PR - CEP: 00000-000"), com correção de
  caixa ("IvatÉ" → "Ivaté").
- `priestName`: clérigo com função "Pároco". Vigários e diáconos permanentes (listados no site) não têm
  campo no esquema.
- `phone`: como exibido no site. Atenção: quase todos vêm no formato "(44) 9xxx-xxxx" (8 dígitos
  começando por 9), que não é um número válido de fixo nem de celular — provável erro sistemático do
  cadastro (ex.: Catedral "(44) 9362-2160", cujo fixo real deve ser 3622-2160). Validar antes de expor.
- Confissões: cada faixa "das 9h às 11h" virou um registro CONFESSION com `time` = início e a faixa
  completa em `notes`. Horários de "atendimento dos padres/secretaria" foram descartados.
- Excluídos de propósito: "Celebração da Palavra" (não é missa — 8 linhas, sobretudo capelas de
  Pérola), celebrações por data ("todo dia 04/13/19 do mês"), "Solenidades", "Novena" (Japurá).

## Registros que precisam de validação humana

1. **Telefones** em formato inválido (ver acima) — praticamente todas as 51 paróquias.
2. **Santo Antônio (Esperança Nova)**: CEP do site "97845-000" é inválido (faixa do RS) e o ViaCEP não
   confirma 87545-000 → `zipCode: null`; e-mail "santoantonioesp.nova@htmail.com" (domínio errado).
3. **N. S. Aparecida (Vidigal)**: confissões "Todos os dias exceto na Terça" foram gravadas literalmente
   (inclusive domingo).
4. **Sagrado Coração de Jesus (Brasilândia do Sul)**: "Quinta às 19h / capelas" → gravado como `baixa`
   na matriz com nota "capelas" (missa itinerante).
5. **Santa Luzia (Umuarama)**: "Última quarta 20h (cada quarta-feira em uma capela)" → `baixa`.
6. **Capela Santo Antônio (Par. Santa Clara de Assis)**: "3ª quinta: Adoração ao Santíssimo 20h" gravado
   como ADORATION `baixa`; Capela Santa Ana: "Adoração ao Santíssimo às 19h30" sem dia — ignorado.
7. **Capelas homônimas** na mesma paróquia (Altônia: 3× N. S. Aparecida, 2× Santo Antônio, 2× São João
   Batista; Cruzeiro do Oeste: 2× N. S. Aparecida; Alto Paraíso: 2× São Sebastião; Serra dos Dourados:
   2× São Sebastião) receberam o bairro/rua entre parênteses (ou "(1)"/"(2)" quando as páginas não
   trazem endereço) para manter `name` único.
8. Nomes de capelas mantidos como no site, inclusive sufixos "- Par. X" e "- Cidade" e grafias
   ("Cruziero do Oeste", "Sant'ana", "Nª Sra.").
9. Santuário São José (Alto Piquiri): confissão de sábado "conforme a disponibilidade do padre".
10. Padres com mais de uma paróquia não ocorrem; mas o Pe. Edivaldo Lopes de Farias (Vidigal) é também
    Vigário-Geral, e o Pe. Ayres Michel Melchiotti (São Vicente de Paulo) é Moderador da Cúria.

## Linhas de horário não importadas (para conferência)

- Ivaté / Capela São Paulo: "Demais Sábados - Celebração da Palavra: 19h30".
- N. S. Aparecida (Umuarama): "Todo dia 04 de cada mês: 20h".
- Cruzeiro do Oeste: "Todo dia 13 do mês: 19h30 em uma das comunidades".
- Tuneiras do Oeste: "Solenidades nos dias de semana 20h" / "Solenidades feriados 9h".
- Pérola (capelas Corpus Christi, N. S. Aparecida, Sagrado Coração, Santa Luzia, São José): Celebrações
  da Palavra em sábados/sextas alternados.
- São Francisco de Assis (Umuarama) / capelas N. S. de Fátima, Santa Inês, Santo Antônio de Pádua:
  "Todo dia 13/19 do mês … às 20h/19h30".
- São José Operário (Umuarama): "Terça-feira: 18h30 (Celebração da Palavra)".
- Japurá: "Novena de N. S. do Perpétuo Socorro: quarta-feira 19h30".
- Esperança Nova: confissões "Das 08h às 11hrs" (sem dia).
- Santa Clara de Assis / Capela Santa Ana: "Demais domingos: Celebração da Palavra 8h".

## Dúvidas abertas

- Campos Facebook/Instagram existem no site mas estão vazios em todas as paróquias (`website: null`).
- A capela "Comunidade Nossa Senhora do Carmo - Cruzeiro do Oeste" é listada entre as capelas; mantida
  como comunidade.
