# Relatório — Diocese de Três Lagoas (MS)

Pesquisa em 2026-09-11. Arquivo: `tres-lagoas.json`.

## Resumo

| Item | Valor |
|---|---|
| Paróquias no arquivo | **16** (15 paróquias + 1 área pastoral) |
| Confiança das paróquias | 16 `alta` |
| Comunidades/capelas | **16** — só as matrizes |
| Horários fixos | **37** — 0 `alta`, 11 `media`, 26 `baixa` |
| Paróquias com horário | 6 de 16 |
| Cobertura | 16 encontradas × 15 esperadas (Wikipédia) — 10/10 municípios, 2/2 foranias |

## Fontes principais

| Fonte | O que deu |
|---|---|
| `https://diocese3lagoas.org.br/wp-json/wp/v2/paroquia?per_page=100` | lista canônica: `X-WP-Total: 16`, com slug, link, `modified` e a taxonomia `forania` de cada ficha |
| Ficha de cada paróquia (`/paroquia/<slug>/`) | ano de criação, telefone(s), e-mail(s), nome da secretária, endereço completo com CEP e cidade, clero e um histórico narrativo — 16 páginas lidas |
| `https://pt.wikipedia.org/wiki/Diocese_de_Tr%C3%AAs_Lagoas` | contagem esperada (15 paróquias em 2 foranias, 10 municípios, **mais de 110 capelas/comunidades**), Dom Luiz Gonçalves Knupp, criação em 03/01/1978 |
| `horariodemissa.com.br` (por cidade) | os únicos horários existentes — 6 paróquias |

A lista da Wikipédia bate **uma a uma** com o CPT da diocese, o que dá confiança alta na completude:
Forania de Três Lagoas — Santo Antônio (Catedral), Santa Luzia, N. Sra. Aparecida, Santa Rita de Cássia e
São Francisco de Assis (Três Lagoas), Sagrado Coração de Jesus (Água Clara), Cristo Bom Pastor
(Brasilândia), Santa Rita de Cássia (Santa Rita do Pardo); Forania de Paranaíba — Sant'Ana e Santo Antônio
(Paranaíba), N. Sra. Aparecida (Aparecida do Taboado), São José (Cassilândia), São Pedro Apóstolo
(Chapadão do Sul), Senhor Bom Jesus (Inocência), São João Batista (Selvíria). A 16ª é a **Área Pastoral
Santa Dulce dos Pobres**, criada em 24/06/2024, posterior ao texto da Wikipédia.

## O que NÃO existe nesta diocese

**A diocese não publica horário de missa nem lista de capelas — em lugar nenhum.** Foi verificado:
- não há custom post type de horários (só `paroquia`, `clero`, `arquivo`, `banner`, `instituto_religioso`,
  `pastoral_movimento`);
- não há página de horários entre as 30 páginas do WordPress;
- a página **`/anuario-diocesano/` existe mas está vazia** (nenhum PDF, nenhum conteúdo) — foi a principal
  aposta, seguindo o truque de "procurar catálogo/anuário diocesano em PDF";
- o CPT `arquivo` (15 documentos) só traz decretos, normas de conduta e projetos pastorais;
- o site antigo (`diocese3lagoas.com.br/newsite`) está fora do ar (devolve HTTP 410 com corpo binário).

A Wikipédia declara **mais de 110 capelas/comunidades** na diocese e **nenhuma** está publicada. Todas as 16
paróquias ficaram apenas com a matriz.

## Os 37 horários e por que quase todos são `baixa`

Vieram todos de `horariodemissa.com.br`. Duas coisas denunciam a idade das fichas: os links "Site:" de cada
ficha apontam para `diocese3lagoas.com.br/newsite/?p=…`, **o site que a diocese já desativou**, e a própria
página do agregador ainda exibe avisos de Natal de 2019. Por isso:

- **26 `baixa`** — fonte única não oficial e sem sinal de atualidade.
- **11 `media`** — os corroborados por uma segunda fonte:
  - **Santuário Diocesano N. Sra. Aparecida** (Aparecida do Taboado): dom 08h e 19h, seg 19h, qua 19h,
    qui 06h30, sex 19h — a grade coincide com a divulgada pela página oficial do santuário;
  - **Catedral Sagrado Coração de Jesus**: as missas de **terça a sábado às 19h** coincidem com a ficha
    pública do Google ("missas de terça a sábado às 19h"). As missas de domingo (09h e 19h) e a de segunda
    "na Capela Santo Antônio" ficaram `baixa`, sem corroboração.

Nenhum horário desta diocese tem fonte diocesana oficial.

## PRECISA DE VALIDAÇÃO HUMANA

1. **CEP errado na fonte oficial.** A ficha da **Paróquia Santo Antônio de Paranaíba** publica
   "CEP: 79.580-000", que é o CEP de **Inocência**; Paranaíba é 79500-000. Mantive o valor oficial e
   registrei o problema em `notes` — precisa de correção.

2. **Homônimos.** Há **duas** Paróquias Santa Rita de Cássia (Três Lagoas e Santa Rita do Pardo — no CMS a
   segunda tem slug `paroquia-santa-rita-do-pardo` mas título idêntico à primeira), **duas** Santo Antônio
   (a Catedral, em Três Lagoas, e a de Paranaíba) e **duas** N. Sra. Aparecida (Três Lagoas e o Santuário de
   Aparecida do Taboado). Os slugs do dataset trazem a cidade e resolvem, mas vale conferir no import.

3. **Nome da Catedral.** O site publica "PARÓQUIA SANTO ANTÔNIO | CATEDRAL SAGRADO CORAÇÃO DE JESUS" numa
   linha só. Adotei **Catedral Sagrado Coração de Jesus** (o Sagrado Coração é o padroeiro da diocese) e
   deixei a explicação em `notes`. Confirmar qual nome a diocese prefere exibir.

4. **Área Pastoral Santa Dulce dos Pobres** — a ficha não tem endereço, telefone nem e-mail; só ano de
   criação (24/06/2024), forania (Três Lagoas) e o pároco (Pe. Cláudio Edmar da Silva). A cidade
   (Três Lagoas) foi **inferida da forania**. Ficou `alta` porque a existência é oficial, mas o endereço
   precisa ser levantado. Não recebeu `status` — é unidade pastoral real com pároco nomeado.

5. **Paróquia São José (Cassilândia) sem ano de criação** — o campo está vazio no site.
   **Paróquia Senhor Bom Jesus (Inocência) sem clero publicado.**

6. **As 10 paróquias sem nenhum horário** são a maior lacuna, e a via mais provável são as redes sociais
   próprias: Santa Luzia e São Francisco de Assis (Três Lagoas), Sagrado Coração de Jesus (Água Clara),
   São José (Cassilândia), São Pedro Apóstolo (Chapadão do Sul), Senhor Bom Jesus (Inocência), Sant'Ana
   (Paranaíba), Santa Rita de Cássia (Santa Rita do Pardo), São João Batista (Selvíria) e a Área Pastoral
   Santa Dulce dos Pobres.

7. **As 110+ capelas.** Se o Parish quiser cobertura real do Bolsão, o caminho é pedir à Cúria
   ((67) 3521-3027, secretaria@diocese3lagoas.org.br) o cadastro de comunidades — não há fonte pública.
   Vale também varrer o **cadastro da Receita Federal** pelas filiais do CNPJ da Mitra Diocesana de Três
   Lagoas, truque que fechou Januária e Araçuaí.
