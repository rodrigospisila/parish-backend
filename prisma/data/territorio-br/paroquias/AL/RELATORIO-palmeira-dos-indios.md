# Diocese de Palmeira dos Índios (AL) — relatório de pesquisa

Data da coleta: 2026-09-11

## Fontes principais

| Fonte | Uso | Observação |
|---|---|---|
| http://diocesedepalmeiradosindios.blogspot.com/p/paroquias_16.html | **lista integral das 38 paróquias** | Site oficial da diocese (blog institucional). Traz nome, endereço, CEP, cidade, data de criação e pároco de cada paróquia, organizadas por século (XVIII, XIX, XX, XXI). Página viva: já inclui a paróquia de Mar Vermelho, criada em 08/02/2024, e a Divina Pastora, de 13/07/2023. |
| https://gcatholic.org/churches/local/palm4-n | corroboração / completude | Lista 37 igrejas paroquiais; bate uma a uma com o blog, faltando só Mar Vermelho (2024). Confirmou que a Paróquia Nossa Senhora Divina Pastora fica na cidade de Palmeira dos Índios (o blog não informa o endereço dela). |
| http://cnbbne2.org.br/diocese-de-palmeira-dos-indios/ | dados da cúria e do bispo | Endereço, CEP, telefone e e-mail da cúria; bispo Dom Manoel de Oliveira Soares Filho. |
| https://pt.wikipedia.org/wiki/Diocese_de_Palmeira_dos_%C3%8Dndios | número esperado | 38 paróquias, 11.027 km². |

## Cobertura

- **Paróquias encontradas: 38 / 38 esperadas (100%)** — todas com `confidence: alta` (fonte oficial da diocese, página ativa).
- 37 das 38 têm endereço completo e CEP; 37 têm data de criação; 38 têm pároco.
- **Comunidades/capelas: 0.** A diocese não publica lista de comunidades em nenhuma das páginas do blog (`/p/paroquias_16.html`, `/p/historia.html`, `/p/clero.html`). `communities: []` em todas — o importador cria a matriz.
- **Horários fixos: 0.** Nenhuma fonte oficial publica grade de missas. Verificado:
  - o blog diocesano não tem página de horários;
  - `buscamissa.com.br/missas/al/...` tem fichas de cidades do território da diocese, mas em Palmeira dos Índios são só 5 paróquias e **nenhuma com horário cadastrado** ("Ainda não há missa de domingo cadastrada");
  - `horariodemissa.com.br` devolve 404 para as cidades do interior de Alagoas.

## Pontos que precisam de validação humana

1. **Paróquia Nossa Senhora Divina Pastora (Palmeira dos Índios)** — o blog dá só data de criação (13/07/2023) e pároco; `address`, `neighborhood` e `zipCode` ficaram `null`. A cidade veio do GCatholic. Confirmar endereço.
2. **Paróquia Nossa Senhora da Saúde e São Francisco (Piranhas)** — única sem data de criação na fonte; `foundedYear: null`.
3. **"Paróquia Nossa Senhora da Conceição" de Água Branca vs. Mata Grande vs. Carneiros** e **"Santo Antônio de Pádua"** (5 paróquias homônimas em cidades diferentes): os slugs são desambiguados pela cidade, mas vale conferir na carga se o importador não funde por nome.
4. **Datas de criação anteriores a 1900** (1798 da Catedral, 1836 Santana do Ipanema, 1837 Mata Grande, 1853 Pão de Açúcar, 1856 Quebrangulo, 1864 Água Branca, 1885 Belo Monte) são de freguesias anteriores à criação da diocese (1962) — estão como `foundedYear` porque é o que a fonte oficial publica.
5. **Horários** — a diocese é candidata natural ao enxame de validação: 38 paróquias e nenhum horário. As redes sociais das paróquias (Facebook/Instagram) não foram varridas uma a uma por orçamento.
