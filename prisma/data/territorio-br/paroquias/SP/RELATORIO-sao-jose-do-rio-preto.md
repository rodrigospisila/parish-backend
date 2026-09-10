# Arquidiocese de São José do Rio Preto (SP) — relatório de pesquisa

- **Arquivo**: `paroquias/SP/sao-jose-do-rio-preto.json`
- **Data da coleta**: 2026-09-10
- **Resultado**: 73 paróquias (73 `alta`), 241 comunidades (241 `alta`), 711 horários fixos
  (654 `alta`, 57 `baixa`) em 26 municípios.
- `validate.cjs` roda limpo, com uma única ressalva informativa (item 1 abaixo).

## Fontes principais

| Fonte | Uso |
|---|---|
| https://arquidiocesesjrp.org.br/organizacao/ | 9 foranias e 26 municípios; espinha dorsal da varredura |
| https://arquidiocesesjrp.org.br/forania-*/ | Listagem ordenada de paróquias e capelas por forania |
| Página de cada paróquia/capela (73 + 161 páginas) | Nome, endereço, CEP, telefone, e-mail, pároco, ano de fundação, missas e confissões |
| https://arquidiocesesjrp.org.br/curia-arquidiocesana/ | Endereço, CEP e telefone da Cúria |
| https://arquidiocesesjrp.org.br/dom-vilar/ | Arcebispo: Dom Antônio Emídio Vilar, SDB |
| https://www.catholic-hierarchy.org/diocese/dsjrp.html | Elevação a arquidiocese (22/05/2025) e nº esperado de paróquias |

O portal é WordPress e mantém cada paróquia e cada capela como um *post* com as categorias
`Paróquia` (72), `Capela` (161), `Área Missionária` (1), a forania e o município. A coleta
percorreu as 9 foranias na mesma ordem em que o site as exibe, o que reproduz o agrupamento
capelas → paróquia usado pela própria arquidiocese. O conteúdo vem em abas
(`História`, `Padre/Diácono`, `Celebrações`, `Secretaria`, `Endereço`, `Confissões`), presentes
nas 234 páginas.

## Cobertura

- **73 encontradas** × **71 esperadas** (catholic-hierarchy, dado de 2023, anterior à elevação a
  arquidiocese). Os 73 registros são 72 posts da categoria `Paróquia` — incluindo a **Catedral
  Metropolitana de São José**, a **Basílica Menor de Nossa Senhora Aparecida**, os santuários
  Nossa Senhora das Graças, Nossa Senhora do Perpétuo Socorro, Nossa Senhora da Paz (Bálsamo) e
  São João Batista/Santuário das Almas — mais a **Área Missionária Santa Maria Madalena**
  (São José do Rio Preto), que não é paróquia canônica.
- Preenchimento: endereço 73/73, bairro 72/73, pároco 71/73, telefone 68/73, e-mail 50/73,
  CEP 48/73, ano de fundação 45/73.
- **16 paróquias ficaram só com a matriz** (o site não lista capelas para elas) e **15 estão sem
  horário** porque a aba `Celebrações` está vazia na origem — verificado uma a uma
  (Icém, Ipiguá, N. Sra. do Carmo/Mirassol, as duas de Monte Aprazível, Onda Verde, Palestina,
  Maria Mãe de Deus/SJRP, entre outras).

## Decisões de normalização

- **Distritos como município**: `Talhados` e `Engenheiro Schmitt` são categorias do site mas são
  distritos de São José do Rio Preto. A aba `Endereço` das duas paróquias confirma
  "São José do Rio Preto-SP", e é esse o valor gravado em `city`.
- **Capelas fora do município da paróquia**: quando o endereço da capela aponta outro município
  (ex.: Capela Santo Antônio, no bairro rural de Perobas, **Jaci**, pertencente à Paróquia
  Nossa Senhora Aparecida de **Nova Aliança**), o vínculo seguiu o título/forania e o município
  próprio foi preservado no campo `neighborhood` (`"Perobas - Jaci-SP"`).
- **Celebração da Palavra** não entra como `MASS`: linhas do tipo "às 07h – Celebração da Palavra"
  foram descartadas (não há tipo correspondente no modelo).
- **Missas de recorrência mensal** ("1ª Sexta-feira", "2º e 4º Sábado", "Última Sexta-feira")
  receberam `confidence: "baixa"` e o texto original em `notes` — são os 57 horários `baixa`.
  É a mesma pendência de modelagem já registrada no README do dataset.
- Dois slugs colidiam em São José do Rio Preto (Basílica Menor e Paróquia Nossa Senhora
  Aparecida): a basílica ficou com `basilica-nossa-senhora-aparecida-sao-jose-do-rio-preto`.
- **Capelas homônimas sem endereço**: o portal publica páginas-esqueleto repetidas — 4 "Capela
  Nossa Senhora Aparecida" e 2 "Capela Santo Antônio" na Paróquia Senhor Bom Jesus
  (Potirendaba) e 2 "Capela Nossa Senhora Aparecida" na Paróquia Nossa Senhora D'Abadia (Icém),
  todas sem endereço, sem horário e sem secretaria. Como nada as distingue, foram **fundidas**
  (5 registros a menos) e **todas as URLs de origem foram preservadas** em `sources`, para que a
  validação possa reabri-las.

## Pontos para o enxame de validação

1. **Área Missionária Santa Maria Madalena** (São José do Rio Preto) está no JSON como paróquia,
   mas é área missionária — é a única ressalva do `validate.cjs`
   (*"nome sem prefixo padronizado"*, pois o validador aceita "Área Pastoral" e não
   "Área Missionária"). O nome oficial da arquidiocese foi mantido em vez de forçar um prefixo
   da lista; decidir se ela entra no sistema como paróquia ou se o validador ganha o prefixo.
2. **Capela Santa Inês – Ipiguá** está na Forania Senhor Bom Jesus dos Castores enquanto a
   Paróquia São Sebastião de Ipiguá está na Forania Santo Antônio de Pádua. O vínculo foi feito
   por ser Ipiguá município de uma única paróquia; confirmar com a arquidiocese.
3. **Erro de digitação na origem**: a Paróquia Santo Antônio de Pádua (Mirassol) escreve
   "Capeça São Benedito e Santo Expedito"; gravado como "Capela São Benedito e Santo Expedito".
4. **CEPs suspeitos na origem**: "15.140-00" (Capela São Geraldo Majella, Bálsamo, 8 dígitos) e
   "15-440-000" (Capela Nossa Senhora Aparecida, Nova Granada) — normalizados quando possível,
   mas conferir.
5. **25 paróquias sem CEP e 23 sem e-mail** — completar por contato direto.
6. **15 paróquias sem nenhum horário** e **16 sem comunidades** — o site não publica; buscar redes
   sociais das paróquias.
7. Conferir se **Paróquia Nossa Senhora do Carmo** (Mirassol) e a homônima de São José do Rio
   Preto são de fato duas paróquias distintas (os slugs saíram distintos pela cidade).
