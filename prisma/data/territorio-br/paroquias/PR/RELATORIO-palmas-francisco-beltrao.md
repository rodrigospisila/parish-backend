# Relatório de pesquisa — Diocese de Palmas-Francisco Beltrão (PR)

Data da pesquisa: 2026-09-10. Arquivo de dados: `palmas-francisco-beltrao.json` (novo).

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://www.diocesepalmasbeltrao.com.br/modulos/handlers/paroquias.ashx?decanato={id}&type=list | API que alimenta a seção "Paróquias" do site oficial (o HTML é só uma casca carregada por JavaScript): 7 decanatos (IDs 3, 6, 7, 8, 10, 11, 12; IDs 1–2, 4–5, 9, 13–15 vazios), 48 unidades com ID, tipo, nome e cidade | alta |
| …/paroquias.ashx?decanato={id}&type=detail&id={ParoquiaID} (48 chamadas) | Detalhe de cada unidade: endereço, CEP, telefone, e-mail, site, pároco, atendimento, "Horário das Missas" (texto livre), histórico | alta |
| …/comunidades.ashx?type=list&idParoquia={ParoquiaID} (48 chamadas) | Lista oficial de comunidades — só retorna dados para 5 unidades (Santa Isabel da Hungria, Cristo Rei/FB, Concatedral, São Jorge, São Roque/Coronel Vivida) | alta |
| https://paroquiafatimapb.com.br/comunidades/ | Comunidades da Paróquia N. S. de Fátima (Pato Branco) com horários por comunidade | alta |
| https://paroquiasaopedropb.com.br/ (home, /fraternidades, /horarios-de-missas, /horarios-de-confissao) | Comunidades, missas e confissões de São Pedro Apóstolo (Pato Branco) | alta |
| https://paroquias.marvirtual.com.br/santoantoniodv/… e …/imaculadadv/… | Comunidades e horários das duas paróquias de Dois Vizinhos (sites próprios) | alta |
| https://cnbbs2.org.br/arquidiocese/diocese-de-palmas-francisco-beltrao/ | Bispo (Dom Edgar Xavier Ertl, SAC), Cúria em Francisco Beltrão (Av. Dom Agenor Girardi, 2833, Bloco 01, Jardim Seminário, 85605-693) e Cúria em Palmas (Rua Bispo Dom Carlos, 819, sala 01); fone (46) 3263-1134 | alta |
| https://www.diocesepalmasbeltrao.com.br/organizacao-diocesana/curia-diocesana/ e /governo-igreja/ | Cúria (endereço de Palmas), bispo | alta |
| https://www.catholic-hierarchy.org/diocese/dpafb.html; https://gcatholic.org/dioceses/diocese/palm3.htm | Nº esperado de paróquias (47 em 2023 / 47 em 2022) | media |
| https://rbj.com.br/portaria-reestrutura-decanatos-na-diocese-de-palmas-francisco-beltrao/ | Portaria de 20/12/2018: 7 decanatos e 46 paróquias (conferência da composição dos decanatos) | media |
| https://pt.wikipedia.org/wiki/Diocese_de_Palmas-Francisco_Beltr%C3%A3o | Histórico, catedral e concatedral | media |

## Cobertura

- **Unidades encontradas: 48** — **paróquias esperadas: 47** (Catholic-Hierarchy 2023 / GCatholic 2022). As 48 são
  45 paróquias + Catedral Senhor Bom Jesus da Coluna (Palmas) + Concatedral Nossa Senhora da Glória (Francisco
  Beltrão) + Reitoria Nossa Senhora da Conceição (distrito de Doutor Antônio Paranhos, São Jorge d'Oeste). A portaria
  de 2018 listava 46; a Paróquia Sagrado Coração de Jesus (Pato Branco, Bairro Planalto) é posterior.
- Decanatos (site): Dois Vizinhos 8, Palmas 5, Realeza 6, Pato Branco 8, Francisco Beltrão 6, São João 9, Barracão 6.
- Confiança das unidades: **48 alta**, 0 media, 0 baixa.
- Comunidades: **197** registros em 10 unidades (inclui a matriz com `isMatriz: true` nessas 10). As outras 38 ficaram
  com `communities: []` (o site diocesano não publica; o importador cria a matriz) e os horários usam `"Matriz"`.
- Horários: **253** registros — **196 alta, 56 baixa, 1 media**; por tipo: 235 MASS, 9 CONFESSION (São Pedro Apóstolo/PB),
  5 ADORATION, 4 ROSARY. Os "baixa" são recorrências mensais (1ª sexta-feira, 2º sábado etc.) com a recorrência em
  `notes`, pois o esquema só representa recorrência semanal (mesma convenção dos relatórios de Paranavaí e Foz), mais
  dois casos de conflito entre fontes (N. S. de Fátima/PB) e um de dia não indicado (Cruzeiro do Iguaçu).
- Sem horários publicados: N. S. Aparecida (Boa Esperança do Iguaçu) e Sagrado Coração de Jesus (Pato Branco).
- Sem pároco na fonte: Boa Esperança do Iguaçu, Sagrada Família (Sulina) e a Reitoria.
- `foundedYear` extraído do histórico da própria página em 6 unidades (Concatedral 1956, Cristo Rei/FB 1977, Santa Rita
  de Cássia/Marmeleiro 1961, Imaculada Conceição/DV 1978, São Roque/CVV 1956, São Jorge 1965); `null` nas demais.

## Regras aplicadas

- `city` da diocese = **"Francisco Beltrão"**, conforme instrução, com o endereço da Cúria de Francisco Beltrão (CNBB
  Sul 2). O site oficial e o `dioceses.json` (não alterado) trazem a Cúria de Palmas (Rua Bispo Dom Carlos, 819, CEP
  85555-000 / 85690-025 conforme a fonte); a diocese tem, de fato, duas sedes de cúria — decidir qual prevalece na carga.
- Nome: `Tipo` + `Nome` da API sem o sufixo " - Cidade"; acentuação normalizada ("Santo Antonio" → "Santo Antônio").
  Homônimos são distinguidos pela cidade no slug (quatro "Cristo Rei", cinco "N. S. Aparecida", três "N. S. de Fátima").
- Municípios com grafia IBGE: Pérola d'Oeste, São Jorge d'Oeste, Itapejara d'Oeste, Flor da Serra do Sul, Santa Izabel do
  Oeste, Nova Esperança do Sudoeste, Boa Esperança do Iguaçu. A Reitoria recebeu `city` São Jorge d'Oeste e
  `neighborhood` "Doutor Antônio Paranhos".
- `address`: rua/número/bairro do campo "Endereço"; caixa postal, telefones extras e "endereço da secretaria" foram
  descartados; CEP normalizado (Bom Jesus do Sul: "8.5708-000" → "85708-000").
- `phone`: campo "Telefone" da API. Números malformados foram mantidos como na fonte quando a correção seria
  adivinhação; dois foram apenas reagrupados sem alterar dígitos (ver validação).
- `email`: "paroquiasantarita" (Marmeleiro) não é e-mail → `null`. O campo "Link" com telefone (Cristo Rei/PB) foi ignorado.
- Comunidades: nome como na fonte, com prefixo "Comunidade" quando a fonte traz só a localidade (São Roque/CVV, São
  Jorge, sites de Dois Vizinhos, São Pedro/PB); "Capela …" quando a fonte assim nomeia; localidade após " – " também
  em `neighborhood`. Na Paróquia N. S. da Luz (Clevelândia) a "Capela São Sebastião" foi criada a partir do horário
  oficial (quinta 15h).
- Horários: texto livre "Horário das Missas" interpretado linha a linha; horário de inverno/verão → gravado o horário
  padrão/inverno com a variação em `notes`; "Missa da Saúde", "Missa do Apostolado", "RCC" etc. em `notes`; missas em
  datas fixas do mês (dia 12, dia 13, dia 19) e celebrações não fixas **não** foram importadas.

## Registros que precisam de validação humana

1. **Sede da diocese** — `city`/`address` do JSON (Francisco Beltrão) divergem de `dioceses.json` (Palmas). Ver acima.
2. **Telefones malformados na fonte**, mantidos: Cristo Rei/Realeza "(46) 35431-4904"; São Francisco de Assis/Chopinzinho
   "(46) 9997-9648"; Bom Jesus/Bom Jesus do Sul "(46) 9998-4402"; N. S. Aparecida/Palmas "(43) 3263-1334" (DDD 43
   provavelmente é 46). Reagrupados sem alterar dígitos: N. S. do Bom Parto "9913-48226" → "(46) 99134-8226";
   N. S. do Carmo/Pranchita "9993-11791" → "(46) 99931-1791". N. S. de Fátima/PB: o diretório traz "(46) 32243-6344";
   usado "(46) 3224-3634" do site paroquial.
3. **Paróquia N. S. de Fátima (Pato Branco)** — conflito entre o diretório diocesano (quarta 7h, domingo 9h) e o site
   paroquial (quarta 19h, domingo 8h); gravado o site paroquial com `confidence: "baixa"` e a divergência em `notes`.
   Sábado 19h e 1ª sexta 19h coincidem nas duas fontes.
4. **Paróquia Santa Isabel da Hungria** — os horários oficiais citam "Santuário Diocesano Nossa Senhora Aparecida"
   (domingo 9h) e "Bairro São José Operário" (domingo 19h), que não constam na lista de comunidades da API
   (que traz "Comunidade N. S. Aparecida" e "Comunidade São José"). Foram criadas duas comunidades com
   `confidence: "media"`; podem ser duplicatas das existentes. A API listava "Comunidade Santo Antônio" duas vezes
   (mantida uma).
5. **Paróquia Cristo Rei (Francisco Beltrão)** — a API lista "Capela São Francisco" duas vezes (mantida uma; pode haver
   duas capelas homônimas em localidades diferentes).
6. **São Pedro Apóstolo × N. S. de Fátima (Pato Branco)** — seis comunidades aparecem nos dois sites paroquiais
   (Linha Esperança – N. S. de Lurdes, Sede Dom Carlos, Rondinha – São Pedro, Sede Gavião – São José Operário,
   Rio Gavião – N. S. do Rosário, São Brás). Provável transferência entre paróquias; ambas as listas foram gravadas
   como publicadas.
7. **Paróquia N. S. de Fátima (Cruzeiro do Iguaçu)** — "1º e 3º do mês: 19hs" não indica o dia; assumido domingo (baixa).
8. **Não importados por falta de local ou horário**: Cristo Rei/Realeza "1ª sexta 19h missa na capela" (capela não
   identificada); São José/Enéas Marques 1ª sexta 17h30 "Capela da casa das irmãs"; Imaculada Conceição/Mangueirinha
   3ª sexta 15h no Hospital São Judas Tadeu e adoração "36 horas para Jesus" (sem horário); São Jorge "último sábado
   9h30 celebração do Batismo"; Pranchita "Noite de louvor" quarta 19h30.
9. **São Pedro Apóstolo (PB)** — o diretório diz "7h na Capela" (segunda a sábado) e o site paroquial "7h e 19h30" na
   matriz; gravado na matriz com nota.
10. **Santa Rita de Cássia (Marmeleiro)** — "quarta 16h Novena do Perpétuo Socorro" gravada como MASS com
    `confidence: "media"` (a fonte não explicita missa). Na Concatedral, "quarta 16h – Novena" consta sob "Horário das
    Missas" e foi gravada como MASS (alta) com nota.
11. **São Roque (Coronel Vivida)** — 57 comunidades da API incluem escolas usadas como local de celebração ("Escola Mãe
    Rainha", "Escola La Salle" etc.), mantidas como publicadas.
12. **Catedral** — a secretaria tem endereço próprio (Rua Cap. Frederico Teixeira Guimarães, 541, CEP 85690-063), não gravado.
13. O diretório diocesano tem sinais de desatualização pontual (ex.: aviso "a Missa das Mães não acontecerá mais no dia
    27" em Cristo Rei/PB); os horários semanais foram mantidos como "alta" por ser publicação oficial ativa (2026).

## Dúvidas abertas

- As publicações "Diretórios"/"PDF" do site podem conter um diretório diocesano completo (comunidades por paróquia)
  — não explorado.
- Sites próprios de Santa Isabel da Hungria (paroquiastaizabel.com.br) e da Reitoria (imaculadaconceicaoparanhos.com.br)
  não responderam no momento da pesquisa.
- Horários das capelas/comunidades das 38 unidades sem lista oficial.
