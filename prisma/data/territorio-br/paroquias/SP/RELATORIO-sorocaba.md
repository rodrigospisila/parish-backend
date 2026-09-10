# Relatório de pesquisa — Arquidiocese de Sorocaba (SP)

- **Arquivo gerado:** `paroquias/SP/sorocaba.json`
- **Data da pesquisa:** 2026-09-10
- **Agente:** enxame de pesquisa do território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **58** (58 alta / 0 media / 0 baixa) |
| Comunidades / capelas | **359** (todas alta) |
| Horários fixos | **438** (411 alta / 0 media / 27 baixa) |
| Cobertura | **58 / 58 (100 %)** |

Tipos de horário: 427 `MASS`, 6 `ADORATION`, 4 `CONFESSION`, 1 `ROSARY`.

Municípios cobertos (12): Sorocaba (36), Votorantim (6), Porto Feliz (3), Boituva (2),
Cerquilho (2), Piedade (2), Tietê (2), Araçoiaba da Serra (1), Iperó (1), Jumirim (1),
Salto de Pirapora (1), Tapiraí (1).

Preenchimento: telefone 57/58, e-mail 58/58, endereço 58/58, bairro 56/58, CEP 50/58,
pároco 54/58, site próprio 12/58.

## Fontes principais

Tudo veio do **site oficial da arquidiocese** (`https://arquidiocesesorocaba.org.br`), que
mantém um custom post type `paroquias` com uma página por paróquia contendo bloco
"Informações" (site, expediente, horário de missa, telefone, e-mail, WhatsApp, endereço,
cidade), bloco "Clero" (nome + função) e bloco "Comunidades".

| Fonte | Uso |
|---|---|
| `https://arquidiocesesorocaba.org.br/paroquias/` | listagem canônica (6 páginas) |
| `…/wp-json/wp/v2/paroquias?per_page=100` | índice completo: 59 registros com título, slug, link e data de modificação |
| `…/paroquias/<slug>/` | endereço, CEP, telefone, e-mail, pároco, comunidades e grade de missas de cada paróquia |
| `…/curia-metropolitana/` (rodapé do site) | Cúria: Av. Dr. Eugênio Salerno, 140, Centro, CEP 18035-430; (15) 3221-6880; curia@arquidiocesesorocaba.org.br |
| `…/arcebispo-atual/` | Dom José Roberto Fortes Palau |
| `https://www.catholic-hierarchy.org/diocese/dsoro.html` | conferência do número esperado (58 paróquias, dado de 2023); diocese em 04/07/1924, arquidiocese em 29/04/1992 |

**Nota de acesso:** o domínio devolve **HTTP 403 a leitores automáticos** (WebFetch e
Arquivo da Internet inclusive). A coleta foi feita com `curl` enviando User-Agent de
navegador — o bloqueio é por User-Agent, o conteúdo é público. O mesmo vale para
`diocesedeitapetininga.org.br` e `dioceseitapeva.com.br`. Fica registrado para as próximas
rodadas: **não concluir que o site está fora do ar só porque WebFetch devolveu 403.**

Os e-mails do site são ofuscados pelo Cloudflare (`data-cfemail`); foram decodificados no
processamento, por isso os 58 e-mails estão em texto limpo no JSON.

## Cobertura

A listagem oficial traz **59 registros** e o catholic-hierarchy.org registra **58
paróquias** (2023). A diferença é exatamente 1 entrada que não é paróquia e foi
**excluída de propósito**:

- **Mosteiro São Bento (Sorocaba)** — `…/paroquias/mosteiro-sao-bento/`. Comunidade
  beneditina, sem território paroquial, com `Comunidades: Nenhuma` e clero listado como
  "Dom Inácio Caciagli, OSB" (sem função de pároco). A **Paróquia São Bento (Sorocaba)** é
  registro separado e **está incluída**. A missa do mosteiro ("segunda à sexta 7h") ficou
  de fora junto com o registro.

Com isso, 58 encontradas = 58 esperadas.

## Pontos para o enxame de validação

### 1. Telefone da Paróquia Senhor Bom Jesus e São Roque (Jumirim) — erro na origem

O campo "Telefone:" da página traz **o próprio nome da paróquia** ("Paróquia Senhor Bom
Jesus e São Roque (Jumirim/SP)") em vez de um número. Gravado como `null`. É a única
paróquia sem telefone. O mesmo cadastro tem os rótulos "Padroeiro:", "Dia do padroeiro:",
"Criação da paróquia:" e "Dedicação da Matriz:" todos vazios — o registro está pela metade
na origem.

### 2. Paróquia São Guilherme (Sorocaba) — grade de missas incompleta na origem

Único caso sem nenhum horário: o bloco "Horário de Missa" da página contém apenas a
palavra **"Quarta-feira"**, sem hora. Nada foi inferido. Também é uma das 4 paróquias sem
pároco cadastrado.

### 3. Missas de recorrência mensal — 27 registros `baixa`

Conforme a decisão registrada no README, missas do tipo "1ª sexta-feira do mês",
"3º sábado", "4ª terça-feira" foram gravadas com o `dayOfWeek` correto, `confidence`
`baixa` e `notes` começando por **"Recorrência mensal"**. Elas *não* devem entrar em
produção como missa semanal — é o mesmo bloco de decisão de produto pendente descrito no
README.

### 4. Dez horários que não cabem no modelo (nenhum dia da semana)

Missas de **dia fixo do mês** não têm `dayOfWeek` e por isso **não foram gravadas**. Ficam
aqui para não se perderem:

| Paróquia | Texto na origem |
|---|---|
| Paróquia Nossa Senhora da Conceição Aparecida (Sorocaba/Cajuru do Sul) | "Todo dia 12 – 19h30 (Missa Votiva Padroeira, exceto sábados, domingos e no tempo da quaresma)" |
| idem, Comunidade Santo Antônio de Sant’Ana São Galvão | "Todo dia 25 – 19h30 (Missa votiva de São Galvão, mesmas exceções)" |
| Paróquia Nossa Senhora Mãe dos Homens (Porto Feliz) | "Missa Votiva todo dia 15" (sem hora) |
| Paróquia Sagrado Coração de Jesus (Sorocaba), Comunidade Santo Expedito | "Todo dia 19 do mês 19h30 (exceto quando cai no domingo)" |
| Paróquia Santa Rita de Cássia (Sorocaba) | "Missa Votiva a Santa Rita — Todo dia 22 às 12h" |

Outras 5 linhas descartadas eram **endereços de comunidade** escritos dentro do bloco de
horários (Paróquia Nossa Senhora Rainha da Paz e Paróquia Sagrado Coração de Jesus) — o
nome da comunidade foi aproveitado, o endereço não.

### 5. Oito paróquias só com a matriz

Bom Jesus dos Aflitos, Nossa Senhora Auxiliadora, Santa Rosália, São Benedito, São Carlos
Borromeu, São Guilherme, São Lucas e São Paulo Apóstolo (todas em Sorocaba) têm o bloco
"Comunidades" vazio na origem. São paróquias urbanas — plausível que não tenham capelas,
mas vale conferir. Nas outras 50 a lista veio preenchida.

### 6. Quatro paróquias sem pároco

Nossa Senhora Aparecida (Vila Angélica), Nossa Senhora de Fátima (Jardim América), São
Carlos Borromeu e São Guilherme — todas em Sorocaba — têm o bloco "Clero" vazio ou sem
alguém marcado como "Pároco". Gravadas com `priestName: null`.

### 7. Nomes de comunidade transcritos da origem

Alguns nomes carregam qualificadores que a fonte usa para desambiguar e que foram mantidos:
*"Comunidade do Divino (Capela)"*, *"Comunidade Santa Paulina (Cristo Rei)"*, *"Capela
Santa Maria (Usina)"*, *"Comunidade Santo Antônio (Centro Social)"*. Nomes idênticos escritos
de formas diferentes na lista de comunidades e no bloco de horários (ex.: "Comunidade N.Sª
Guadalupe" × "Comunidade Nossa Senhora de Guadalupe"; "Matriz do Divino" × "Comunidade do
Divino (Matriz)") foram **unificados** — vale uma passada de conferência nas paróquias com
muitas comunidades (Nossa Senhora da Conceição Aparecida/Porto Feliz tem 21).

### 8. `foundedYear` sempre `null`

O site **não publica ano de criação** de nenhuma paróquia (os rótulos existem no template
mas estão vazios). Nada foi inferido.

### 9. Endereço da Paróquia São Francisco de Assis (Boituva)

A origem coloca **dois endereços no mesmo campo**: o da secretaria (Rua Viriato da Silva
Viana, 278, Centro) e o da matriz ("Rua Benedito Antonio de Campos, nº 447 - bairro
D’Lorenzi (matriz)"). Ambos ficaram na string de `address`. Convém separar na validação.

### 10. Oito paróquias sem CEP

O CEP não aparece no campo de endereço de: Paróquia Nossa Senhora das Dores (Araçoiaba da
Serra) e, em Sorocaba, Catedral Metropolitana de Nossa Senhora da Ponte, Paróquia Divino
Espírito Santo, Paróquia Nossa Senhora Rainha da Paz, Paróquia Santuário Arquidiocesano
Nossa Senhora da Conceição Aparecida, Paróquia São Benedito, Paróquia São Guilherme e
Paróquia São José – Cerrado. Gravado `null`.
