# Relatório — Diocese de Bragança do Pará (`braganca-do-para`)

Pesquisa em 2026-09-17. Arquivo: `braganca-do-para.json`.

## Resultado

| Item | Valor |
|---|---|
| Entradas | **31** — 30 paróquias + 1 área pastoral (São José, Capitão Poço) |
| Confiança das entradas | 31 `alta` · 0 `media` · 0 `baixa` |
| Comunidades | 56 (31 igrejas-sede + 25 comunidades nomeadas nas grades de missa); **1.204 CEBs declaradas** em `declaredCommunityCount` |
| Horários | 139 — 26 `alta` · 67 `media` · 46 `baixa` (119 missas, 14 confissões, 3 adorações, 3 terços) |
| Cobertura | **31/31** unidades do Anuário Diocesano 2025 (29 paróquias + 2 áreas pastorais); Anuário Pontifício 2024: 29 |
| Regiões episcopais | N. Sra. do Rosário 9 · São Francisco de Assis 8 · Pe. Marino Conti 5 · Dom Luís Ferrando 5 · Dom Eliseu Coroli 4 |

## Fonte principal — o Anuário Diocesano 2025 em PDF

O site oficial é Joomla e está ativo (`https://novo.diocesedebragancapa.org.br`; o domínio sem "novo" redireciona
para ele). A página **Pastorais → Anuário** oferece o *Anuário Diocesano e Calendário 2025* completo:
`/images/arquivos/Anurio_e_Calendrio_2025.pdf` (903 KB, 84 páginas, arquivo de 23/05/2025), lido com `pdftotext`.

- **Seção 14** — as 5 regiões episcopais com suas paróquias (31 unidades).
- **Seção 16 "Paróquias (29)"**, por município: nome, **ano de fundação**, **CNPJ**, clero, endereço, bairro, CEP,
  telefone, e-mail e a contagem de **CEBs urbanas e rurais** de cada paróquia, mais as duas áreas pastorais
  criadas em 2024 (São José, em Capitão Poço, e Santa Luzia, em Paragominas).
- Seção 5 — dados gerais: "31 Paróquias", 5 regiões, 1.158 comunidades (240 urbanas; 924 rurais).

Toda a ficha das 31 unidades veio do Anuário, digitada a partir do texto extraído (sem leitura por modelo) e
conferida linha a linha. Tudo `alta`.

**Paróquia Santa Luzia (Paragominas)**: no Anuário ainda é "Área Pastoral Santa Luzia (2024*)"; o site publicou
em 20/12/2025 a página "Santa Luzia — Fundação 2025", que já a chama de paróquia. Gravei como paróquia, com
`foundedYear: 2025` e nota. Por isso a contagem do arquivo é 30 paróquias + 1 área pastoral.

### Prova de completude

- Anuário Pontifício 2024 (catholic-hierarchy): 29 paróquias em 2023 — igual às 29 do Anuário Diocesano.
- Receita Federal, CNPJ-base **05.321.575** ("Obras Sociais da Diocese de Bragança"; 33 ordens, 32 ativas): 26
  filiais de paróquia que batem com os CNPJs impressos no Anuário; as demais unidades (São João Batista de
  Bragança, Santa Teresinha e Santa Luzia de Paragominas, Área Pastoral São José) não têm CNPJ próprio. As
  outras filiais são a matriz, o Sítio N. Sra. da Divina Providência, o Hospital das Bem-Aventuranças, o ECRAMA,
  um seminário baixado e uma **filial-fóssil "Paróquia de São Domingos do Capim"** (1970), paróquia que hoje
  pertence à Diocese de Castanhal.

## Horários — as páginas de paróquia do site

O site tem **19 páginas de paróquia** (`/index.php/paroquias/<id>-<slug>`; conferi feed RSS e `limit=0`: não há
outras). Cada uma traz `dateModified` em JSON-LD. **13 publicam grade**; 6 têm o molde "HORÁRIO DE MISSAS FIXOS"
em branco (Augusto Corrêa, São João Batista, Tracuateua, Açaiteua, Curupaiti e Santa Luzia de Paragominas); as
outras 12 unidades não têm página. Todas as páginas são de jun/2020 em diante (nenhuma cai na regra
pré-pandemia pela data), e a confiança seguiu a data de modificação:

| Confiança | Critério | Paróquias |
|---|---|---|
| `alta` | página modificada há ≤ 12 meses | Catedral (13/02/2026), N. Sra. Aparecida de Rondon (13/02/2026), Santa Teresinha de Paragominas (27/05/2026) |
| `media` | fonte oficial sem sinal de atualidade | Perpétuo Socorro e Sagrado Coração (Bragança), Cristo Crucificado, Santa Luzia do Pará, São José (Paragominas), Viseu, Nova Esperança do Piriá, Ulianópolis |
| `baixa` | texto da época da pandemia, com grade "normal" e grade "durante a pandemia" | N. Sra. Aparecida (Dom Eliseu) e N. Sra. da Piedade (Irituia) — 12 horários |
| `baixa` | recorrência mensal, com a regra literal em `notes` | 34 horários: rodízios de quarta e domingo da Catedral, comunidades urbanas do Sagrado Coração, de Viseu e de Rondon, primeiras sextas etc. |

Um horário sem dia da semana (`dayOfWeek: null`): "Matriz, dia 13 de cada mês: Missa e Novena de Santa Luzia,
19:30hs" (Santa Luzia do Pará).

Detalhes de leitura: "119h" do Sagrado Coração lido como 19h (nota); as segundas-feiras de Cristo Crucificado são
Celebração da Palavra e **não** entraram; a segunda de Rondon ("Missa/Celebração da Palavra") entrou como
`media`; as missas "semanais às 18h30" de Dom Eliseu ficaram de fora porque a fonte não diz os dias.

## Comunidades

O Anuário **não lista** comunidades — só a contagem de CEBs por paróquia, gravada em `declaredCommunityCount`
(`urban`/`rural`). A soma das fichas é 1.204 (250 urbanas + 954 rurais), enquanto os "dados gerais" do mesmo
Anuário dizem 1.158 (e 240 + 924 = 1.164): o total impresso é de edição anterior. Entraram como comunidade só
as 25 nomeadas nas grades de missa do site (8 da Catedral, 6 do Sagrado Coração com bairro, 4 de Viseu, 4 de
Rondon, 2 de Santa Luzia do Pará e 1 de Cristo Crucificado). Irituia sozinha declara 111 comunidades.

## Pontos para validação humana

1. **Sem nenhum horário**: 18 unidades (12 sem página + 6 com grade em branco) — entre elas São Miguel do Guamá
   (64 CEBs), Capitão Poço (87), Mãe do Rio (73) e Paragominas/Sagrado Coração.
2. **Dom Eliseu e Irituia** — reconfirmar as grades (texto de 07/2020). **Rondon** não publica sábado e domingo.
3. **Catedral** — "Comunidade São Pedro/ Santa Rita" (e pares análogos): a fonte não diz se a missa é nas duas
   comunidades ou em rodízio; gravei um registro `baixa` para cada. Telefone: Anuário e cartão do site dão
   (91) 3425-**1520**; o corpo da página, (91) 3425-**4520**.
4. **Ano de fundação divergente** (adotado o Anuário 2025): Irituia 1757 × 1957 no cartão do site; Rondon 1972 ×
   1993; Cristo Crucificado 2010 × 2012; São José de Paragominas 2010 × 2011 (o site diz "tornou-se paróquia em
   19/03/2011").
5. **Endereço divergente**: São José de Paragominas (Anuário: Rua São Marcos, 303 e CEP de caixa postal; site e
   Receita: Rua/Av. Leo Bruno Pimenta Rocha, 303, CEP 68630-637 — adotei esse CEP); Cristo Crucificado (Rua Frei
   Miguel de Bulhões × Praça/Rua Getúlio Batista); Sagrado Coração de Bragança (bairro Centro no Anuário × Morro
   no site e na Receita — adotei Morro); Itinga (Av. Getúlio Vargas × Rua Presidente Dutra, 260).
   Ipixuna e Ulianópolis têm o **mesmo** endereço "Av. Presidente Vargas, 750" no Anuário e na Receita.
6. **Erros de impressão do Anuário corrigidos pela Receita**: CEP de Ulianópolis (68682-000 → 68632-000); CNPJ de
   Cachoeira do Piriá ("05.321.075/…") e de Aurora do Pará ("…/23-35"). O CNPJ atribuído à Área Pastoral Santa
   Luzia é o da matriz (0001-20) e ficou nulo.
7. **Clero**: `priestName` e `clergy` são os do Anuário (mai/2025). Páginas do site mais velhas ainda citam
   párocos anteriores (Curupaiti: Pe. Nelsinho Soeiro; Nova Esperança: Pe. Antonio Ronaldo no corpo do texto).
8. **Contagem de comunidades**: Tracuateua — site diz 6 urbanas e 10 rurais; Anuário, 5 e 48.
9. **Sites próprios mortos** (não gravados em `website`): `saojosepgm.com.br`, `paroquiadeirituia.com.br`,
   `paroquiaviseu.com` — nenhum resolve. Instagram/Facebook citados nas páginas foram gravados.
10. **`dioceses.json` (não alterei)**: está sem e-mail; o site dá `secretario@diocesedebragancapa.org.br` e o
    Anuário, `curiabraganca@diocesedebragancapa.org.br`, além do celular (91) 98802-0978.

## Fontes

- https://novo.diocesedebragancapa.org.br/images/arquivos/Anurio_e_Calendrio_2025.pdf
- https://novo.diocesedebragancapa.org.br/index.php/pastorais/anuario · `/index.php/paroquias` e 19 páginas de paróquia
- https://minhareceita.org/05321575000120 e filiais 0002–0033
- https://www.catholic-hierarchy.org/diocese/dbrag.html
