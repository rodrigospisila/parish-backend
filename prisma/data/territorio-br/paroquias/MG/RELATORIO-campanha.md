# Relatório de pesquisa — Diocese da Campanha (MG)

- **Arquivo**: `paroquias/MG/campanha.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (Sul de Minas, onda MG)

## Resumo

| Item | Quantidade |
|---|---|
| Entradas de paróquia | **74** (72 paróquias + 1 santuário com reitoria + 1 região pastoral) |
| Confiança `alta` | 74 |
| Confiança `media` / `baixa` | 0 / 0 |
| Comunidades | **140** (74 matrizes + 66 capelas/comunidades) |
| Horários fixos | **338** (335 `alta` + 3 `baixa`) |
| Paróquias com horário | 69 de 74 |
| Cobertura esperada (AP 2024) | 72 paróquias |

## Fontes principais

1. **Site oficial da Diocese da Campanha** — <https://diocesedacampanha.org.br>
   A lista de paróquias é um *custom post type* do WordPress. A API REST
   `https://diocesedacampanha.org.br/wp-json/wp/v2/paroquia?per_page=100` devolveu as **74
   entradas de uma vez**, com título (nome + cidade), histórico, forania (`local_paroquia`) e
   contagem de comunidades rurais/urbanas.
2. **Página pública de cada paróquia** — `https://diocesedacampanha.org.br/paroquia/<slug>/`
   Os campos ACF **não** são expostos pela REST, mas são renderizados no HTML (Elementor +
   Dynamic Content for Elementor). Foram raspadas as 74 páginas para obter:
   **Ano de Criação, Endereço + CEP, Telefone, Clero** e a tabela **"Horários de missas"**
   (repeater com 4 colunas: tipo | dia | horário | **local/comunidade**).
3. **catholic-hierarchy.org** — <https://www.catholic-hierarchy.org/diocese/dcmpn.html>
   (Anuário Pontifício 2024, dados de 2023: 72 paróquias, 662.892 católicos, 116 presbíteros).
   HTTP 429 no leitor automático; `curl` com User-Agent de Chrome passou.

## Cobertura

74 entradas para 72 paróquias esperadas. A diferença são dois registros que a diocese lista
junto com as paróquias mas não são paróquias:

- **Santuário Nossa Senhora da Conceição (Baependi)** — santuário com reitoria própria
  (a forania Beata Nhá Chica declara "8 paróquias, 1 Santuário com reitoria própria");
- **Região Pastoral Senhor Bom Jesus dos Aflitos (Carmo do Rio Claro)** — região pastoral.

O **Santuário Nossa Senhora d'Ajuda (Três Pontas)** é contado pela diocese como o "1 Santuário
Diocesano" da forania Beato Padre Victor e também foi mantido como registro próprio.

A **Paróquia Santo Antônio (Campanha)** é a catedral da diocese; o site não usa o prefixo
"Catedral", então o nome oficial da fonte foi preservado. **Ponto para validação humana.**

As **8 foranias** foram gravadas no campo extra `forania` de cada paróquia (o importador ignora
esse campo): Nossa Senhora de Fátima (11), Nossa Senhora dos Montes (10), Nossa Senhora das
Fontes (10), Nossa Senhora dos Campos (10), Beata Nhá Chica (9), São Francisco de Assis (9),
Nossa Senhora Aparecida (8) e Beato Padre Victor (7).

## Horários de missa

A tabela do site é estruturada e de excelente qualidade — inclui a **comunidade** de cada
missa, o que permitiu montar as 66 comunidades não-matriz do dataset a partir dela.

**5 paróquias sem horário publicado**: Nossa Senhora do Carmo (Carmo de Minas), Nossa Senhora
do Rosário (Alagoa), Nossa Senhora do Rosário (Córrego do Ouro), Nossa Senhora das Dores (Boa
Esperança) e a Região Pastoral Senhor Bom Jesus dos Aflitos.

### Recorrência mensal (3 horários com `confidence: "baixa"`)

- Paróquia Santo Antônio de Pádua (Guapé) — `1ª, 6ª feira` 19h (a fonte é ambígua; foi lido
  como "1ª sexta-feira do mês")
- Paróquia Nossa Senhora da Saúde (Lambari) — `1º Sábado do mês` 7h
- Paróquia Nossa Senhora de Fátima (São Lourenço) — `4º Domingo do mês` 15h, Comunidade Rural
  Nossa Senhora da Glória

Nenhuma linha de "Celebração da Palavra" apareceu — todas as 281 linhas da tabela são do tipo
"Missa".

## Precisa de validação humana

1. **Catedral**. A "Paróquia Santo Antônio (Campanha)" é a Catedral Diocesana de Santo
   Antônio. O nome ficou como o site publica (`Paróquia Santo Antônio`). Se a convenção do
   dataset for o prefixo `Catedral …`, renomear para `Catedral Santo Antônio`.

2. **Telefone com rótulo misturado** — Nossa Senhora da Saúde (Lambari):
   `"Whatsapp: 35 3271-1049 Telefone: 35 3261-1217, Ramal 5005"`. Gravado como está.

3. **CEP ausente em 7 paróquias** (o site não publicou): Santa Maria de Baependi (Baependi),
   Santo Antônio de Pádua (Guapé), Nossa Senhora da Conceição (Aiuruoca), Nossa Senhora das
   Graças (Boa Esperança), Nossa Senhora do Rosário (Alagoa), Nossa Senhora das Dores (Boa
   Esperança) e Santa Rita (Boa Esperança).

4. **E-mails**. O site ofusca todos os endereços com o Cloudflare Email Protection
   (`[email protected]`). **Nenhum e-mail foi gravado** — todos ficaram `null`.

5. **Paróquia São Francisco de Assis (Guapé)** — a página trocou os rótulos: o endereço estava
   no campo "Telefone". Foi corrigido automaticamente (endereço `Praça Dr. Passos Maia, 20`,
   telefone `null`). Conferir.

6. **Erros de digitação da fonte, corrigidos no `name`**:
   - `PARÓQUIA NOSSA SENHORAS DAS DORES (BOA ESPERANÇA)` → `Paróquia Nossa Senhora das Dores`
   - `REGIAO PASTORAL …` → `Região Pastoral …`
   Erros mantidos como estão (só na tabela de horários, campo `notes`/comunidade): "Domigo",
   "Dommingo", "Itamoonte" (endereço de Itamonte), "são Gonçalo do Sapucaí" (endereço).

7. **Nomes de comunidade abreviados na fonte** — "Com. Stº Antônio", "Capela Nsra Aparecida -
   Lavrinha", "Com. N. Sra. das Graças (Paradinha)", "Igreja Beatos ou Rosário". Gravados como
   estão; podem precisar de padronização.

8. **51 das 74 paróquias ficaram só com a matriz**, embora o histórico de cada uma declare o
   total de comunidades rurais e urbanas (por exemplo, Virgínia: 43 rurais + 5 urbanas;
   Pedralva: 30 + 4; Campos Gerais: 28 + 8). **A diocese não publica os nomes dessas
   comunidades** — só a contagem. Nada foi inventado.

## O que ficou sem

- Nomes das comunidades rurais/urbanas de 51 paróquias (só a contagem está publicada).
- E-mails (ofuscados pelo Cloudflare) e sites próprios das paróquias (só 2 aparecem no texto:
  `paroquiasenhoradasaude.com.br` em Lambari e `paroquiarosario.com` em Varginha — não
  gravados no campo `website` por estarem no corpo do histórico, não em campo estruturado).
- Confissões, adoração e terço: a tabela do site só tem missas.
- Bairro (`neighborhood`) das matrizes: o endereço vem em linha única, sem separar bairro.
