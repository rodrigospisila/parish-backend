# Diocese de Penedo (AL) — relatório de pesquisa

Data da coleta: 2026-09-11

## Fontes principais

| Fonte | Uso | Observação |
|---|---|---|
| https://diocesedepenedo.webnode.page/paroquias/ | **lista integral, por vicariato** | Site oficial vivo da diocese. Traz, para cada paróquia: endereço, CEP, telefone, e-mail, pároco/administrador e data de criação. Página atualizada (inclui paróquias criadas em 2022 e 2023; a home fala do Jubileu 2025 "Peregrinos da Esperança"). |
| Receita Federal via `minhareceita.org` — CNPJ **12.398.749** (Diocese de Penedo) | prova de completude, endereços | Varredura das filiais 0001→0063: 1 cúria + 62 estabelecimentos. Bate unidade a unidade com a lista do site. |
| https://gcatholic.org/dioceses/diocese/pene0.htm | número esperado | 59 paróquias + 5 missões (31/12/2022). |
| http://cnbbne2.org.br/diocese-de-penedo/ | cúria e bispo | Dom Valdemir Ferreira dos Santos; Rua Siqueira Campos, 187 – Centro, 57200-000; (82) 3551-2227. |
| http://catequesepenedo.blogspot.com/p/vicariatos-paroquias-e-areas-pastorais.html | estrutura antiga de vicariatos | Blog da catequese diocesana; lista de ~2015. Serviu só para entender a divisão em vicariatos — **não** foi usada como fonte de dados (várias "áreas pastorais" dela já viraram paróquias). |

## Cobertura

- **Paróquias/entradas encontradas: 62 / 62** (59 paróquias + 3 áreas pastorais), todas `confidence: alta`.
  Bate com o GCatholic (59 paróquias em 2022) e com as 62 filiais ativas do CNPJ da mitra.
- Mais 1 entrada `status: "nao-paroquial"` e `confidence: baixa`: **Santuário Diocesano da Santa Cruz (Arapiraca)** — existe como filial 0042 do CNPJ, mas a diocese não o lista entre as paróquias. Não entra na carga.
- 60 das 62 têm endereço; 58 têm CEP; 49 têm telefone; 43 têm e-mail; 62 têm pároco; 57 têm ano de criação.
- **Comunidades/capelas: 0.** O site não publica capelas. `communities: []` em todas.
- **Horários fixos: 0.** A diocese não publica grade de missas em nenhuma página; `buscamissa.com.br` não tem nenhuma cidade do território de Penedo (nem Arapiraca) cadastrada; `horariodemissa.com.br` devolve 404 para as cidades.

## Decisões de modelagem

- **Áreas pastorais** (`Área Pastoral Nossa Senhora do Livramento` – Roteiro, `Área Pastoral São Sebastião` – Distrito de Piranhas/Traipu, `Área Pastoral São José` – Olho d'Água Grande) foram mantidas com o nome oficial e marcadas com `loadAsParish: true`, para que um eventual filtro de prefixo de nome no importador não as descarte: são unidades pastorais reais, com igreja e padre designado.
- Cada paróquia recebeu o campo extra `vicariate` ("Vicariato de …"), que o importador pode ignorar.
- O domínio **diocesedepenedo.com.br não existe mais** (NXDOMAIN em 11/09/2026), embora ainda apareça nos buscadores e no CNBB NE2 (que registra "www.diocesepenedo.com.br"). O site vivo é `https://diocesedepenedo.webnode.page/` — **corrigir isso em `dioceses.json` se lá estiver o domínio antigo**.

## Pontos que precisam de validação humana

1. **CEPs suspeitos publicados pela própria diocese**:
   - Paróquia Santa Madre Teresa de Calcutá (Arapiraca, bairro Senador Arnon de Melo) com CEP **57330-000**, que é o CEP de Lagoa da Canoa;
   - Paróquia São Brás (município de São Brás) com CEP **57360-000**, que é o de Girau do Ponciano;
   - Paróquia Nossa Senhora da Penha (São Sebastião) aparece **duas vezes** na mesma página, com CEPs conflitantes **57225-000** e **57275-000**. Ficou com 57225-000 (o bloco principal).
2. **Telefones malformados na fonte**: São José – Gerais (Teotônio Vilela) publica "82 9939-2668" (8 dígitos) → gravado como `null`. Porto Real do Colégio publica DDD **(24)**, do Rio de Janeiro → gravado como `null`.
3. **Paróquia São Luís Gonzaga (Arapiraca)** aparece em bloco duplicado com dois responsáveis diferentes (Pe. Samuel Ventura de Oliveira e Pe. José Adeilton da Silva). Ficou o primeiro.
4. **Paróquia Santíssimo Redentor (Arapiraca)** só informa vigário paroquial (redentorista), sem pároco e sem data de criação.
5. **Duas paróquias com o mesmo pároco**: Pe. Edson Lira (N. Sra. das Graças e N. Sra. do Carmo, Arapiraca) e Pe. Jackson Ribeiro do Nascimento (Santo Antônio/Cacimbas – Arapiraca e N. Sra. Mãe do Povo – Tanque d'Arca). Pode ser real (acumulação) ou desatualização.
6. **Duas paróquias homônimas em Girau do Ponciano** (Nossa Senhora da Conceição, no Centro e em Canafístula do Cipriano): os slugs foram desambiguados pelo bairro.
7. **Santuário Diocesano da Santa Cruz (Arapiraca)**: confirmar se é reitoria/santuário sem território ou se virou paróquia.
8. **Horários** — diocese inteira sem grade publicada. Candidata ao enxame de validação; as 43 paróquias com e-mail e as com Facebook próprio seriam o caminho.
