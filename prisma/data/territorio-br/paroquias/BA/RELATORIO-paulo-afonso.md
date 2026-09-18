# Diocese de Paulo Afonso — relatório de pesquisa

- **Slug**: `paulo-afonso` · **UF**: BA · **Sede**: Paulo Afonso · **Província**: Feira de Santana · **Regional**: Nordeste 3
- **Pesquisa**: 18/09/2026
- **Bispo**: Dom Guido Zendron (desde 12/03/2008) · **Catedral**: Nossa Senhora de Fátima
- **Cúria**: Av. Getúlio Vargas, s/n, Centro · 48601-000 · (75) 3281-4268
- **Site oficial**: **FORA DO AR** (ver abaixo) — `website: null`
- **Território**: 20 municípios — Abaré, Adustina, Antas, Banzaê, Canudos, Chorrochó, Cícero Dantas,
  Coronel João Sá, Fátima, Glória, Jeremoabo, Macururé, Novo Triunfo, Paripiranga, Paulo Afonso,
  Pedro Alexandre, Ribeira do Pombal, Rodelas, Santa Brígida e Sítio do Quinto

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **28** — 26 `alta`, 2 `media` |
| Foranias | 5 (01 a 05), no campo `forania` |
| Comunidades | 50 = 28 matrizes + 19 de Ribeira do Pombal (`alta`) + Igreja Velha (`media`) + 2 de Paulo Afonso (`baixa`) |
| Horários fixos | **80** (59 MASS · 13 ADORATION · 5 CONFESSION · 3 outros) — 3 `media`, 77 `baixa` |
| Paróquias com algum horário | 10 de 28 |
| Horários carregáveis | **3** (Ribeira do Pombal: domingo 8h e 19h, quinta 7h) |

**Cobertura: 28 de 33** — faltam 5 que nenhuma fonte nomeia (ver abaixo).

## O site da diocese caiu em 2026

`diocesedepauloafonso.com.br` devolve **1.092 bytes em qualquer caminho**: uma página de 2013 com
`<title>Moxoto</title>` e um `meta refresh` para `http://www.diocesedepauloafonso.com/`. Esse segundo
domínio **resolve** (181.232.139.201) mas **recusa conexão** nas portas 80 e 443, tanto pelo leitor
automático quanto por `curl`. Última captura boa do Arquivo da Internet: **21/11/2025**, com notícias
de 20/11/2025. `diocese.website` ficou `null`.

**Toda a lista de paróquias veio dessa captura.** Ponto fraco grave: o `page-sitemap.xml` arquivado
mostra que as 23 páginas `/pagina-matriz/paroq-*` têm **lastmod de maio/junho de 2019** (a de
N. Sra. do Perpétuo Socorro, de 08/2020) — **o menu não é atualizado desde 2019**, e as páginas
individuais só trazem história do município, sem endereço, telefone, pároco ou horário.

## Como as 5 paróquias que faltavam no menu foram achadas

Um decreto de **Dom Guido Zendron de 26/12/2021**, noticiado em 30/12/2021, elevou **5
quase-paróquias a paróquias** — e nenhuma delas entrou no menu do site:

| Paróquia | Local | Confirmação extra |
|---|---|---|
| N. Sra. da Conceição Aparecida | Bairro dos Rodoviários, Paulo Afonso | filial `/0006` ATIVA do CNPJ da mitra |
| Bem-Aventurada Virgem Maria da Conceição Aparecida | Vila Moxotó / Oliveira Brito, Paulo Afonso | filial `/0009` + notícia da diocese de 20/12/2023 sobre a elevação canônica |
| Sagrado Coração de Jesus | Bairro Centenário, Paulo Afonso | filial `/0008` ATIVA |
| São José | Povoado de Quixaba, Glória | nenhuma — `media` |
| Ascensão do Senhor | Ribeira do Pombal | o site da diocese publicou em 2025 a "Programação da Festa da Ascensão do Senhor" — `media` |

A varredura do CNPJ **13.450.903** (`minhareceita.org`, `/0001` a `/0030`) confirma: **10 filiais
ATIVAS**, sendo **7 paróquias em Paulo Afonso** (o menu só listava 4) + Santa Brígida + uma filial
histórica em **Tucano**, município que hoje pertence à Diocese de Serrinha. As paróquias de fora da
sede têm **CNPJ próprio** — o Mapa das OSC/IPEA confirmou três (Canudos `13.910.914/0001-31`,
Cícero Dantas `16.299.612/0001-67`, Ribeira do Pombal `01.466.948/0001-08`) e não cobre o resto.

**Faltam 5 paróquias** para os 33 que o catholic-hierarchy conta em 2023 e o gcatholic em 2021.
Nenhuma das fontes consultadas as nomeia. É o principal item para o enxame de validação.

## Ribeira do Pombal — a única paróquia com site próprio

`paroquiasantateresadejesus.com.br` (WordPress ativo, notícias de 2026) deu, sozinha, quase tudo o
que há de bom nesta diocese:

- **19 comunidades** (4 urbanas e 15 rurais) com povoado/fazenda — `alta`;
- **pároco**: Pe. Rosivaldo Gama Wanderley, desde 24/02/2021;
- **contato**: Praça Getúlio Vargas, 48400-000, (75) 99981-5993, paroquiasantateresarp@gmail.com;
- **"Calendário de Missas"** — uma **imagem PNG** (publicada em 04/2025) com o calendário do **mês de
  maio de 2025**, lida com o leitor de imagens.

Do calendário, só três horários se repetem em **todas** as semanas do mês e foram gravados `media`:
**domingo 8h e 19h** e **quinta 7h** (parte das quintas na "Igreja Velha"). O resto é itinerante:
13 missas de comunidade que aparecem uma única vez no mês (Baixa das Antas 1º sáb 16h, Fazenda Antas
2º sáb 16h, Macambira 2º sáb 19h, Poço das Varas 2º dom 16h, Alto Santo Antônio 3ª sex 19h, Pinto II
3º sáb 17h, Piqués 3º sáb 19h, Feira da Serra 3º dom 15h, Curralinho 3º dom 17h, Santo Expedito 4ª sex
19h, Cajueiro 5º sáb 15h, Cajazeiras 5º sáb 17h, N. Sra. de Lourdes 5º sáb 17h) — todas `baixa`, com a
regra literal em `notes`, pelo mesmo motivo do Jequitinhonha: **recorrência mensal não cabe em
`MassSchedule`**. A missa de sábado 19h na Matriz também é intermitente (3 dos 5 sábados) → `baixa`.

## Horários das outras 9 paróquias

Todos do **`liriocatolico.com.br`**, fonte única não oficial (data `2026-09-02` = carga da base) →
**`baixa`**: Catedral, São Francisco de Assis (P. Afonso), N. Sra. do Perpétuo Socorro,
Bem-Aventurada Virgem Maria (Aparecida), Sagrada Família (pelas duas capelas), São João Batista
(Jeremoabo), Senhor do Bonfim (Adustina), São Francisco de Assis (Fátima), N. Sra. do Patrocínio
(Paripiranga) e São João Batista (Rodelas).

Não há outra fonte: a diocese nunca publicou horário no site (nem antes de cair), o
`horariodemissa.com.br` não devolveu ficha por cidade e o `buscamissa.com.br` não cobre a região.
A ficha do Lírio de **Abaré é de 27/05/2013** e não tem grade — dela só vieram endereço e telefone,
com aviso no registro.

## Precisa de validação humana

1. **As 5 paróquias que faltam** (28 encontradas × 33 esperadas).
2. **Site da diocese fora do ar** — vale avisar a diocese: o `.com` recusa conexão e o `.com.br` só
   redireciona para ele. É o quarto caso da série Botucatu/Tocantinópolis/Palmares (aqui ainda não
   virou site de apostas).
3. **Lista de paróquias congelada em 2019** — mesmo a captura de 11/2025 não reflete as mudanças de
   2021 em diante. Endereço, telefone e pároco faltam em **14 das 28** paróquias.
4. **Duas paróquias "Aparecida" em Paulo Afonso**: N. Sra. da Conceição Aparecida (Rodoviários) e
   Bem-Aventurada Virgem Maria da Conceição Aparecida (Vila Moxotó / Oliveira Brito). Criadas pelo
   mesmo decreto, com nomes quase iguais. A ficha do Lírio ("Paróquia Nossa Senhora Aparecida", Rua
   N. Sra. Aparecida) foi ligada à **segunda**, pelo endereço da Receita.
5. **Santa Brígida da Suécia × da Escócia** — o menu diz "Suécia", o slug da página diz "escocia".
   A Receita confirma **Suécia** (gravado).
6. **Pe. Luiz Tibúrcio da Silva Sobrinho** aparece como pároco de Antas na página de 2019
   ("nomeado em 23/05/2010") — **não foi gravado** em `priestName`, só em `notes`.
7. **Duas capelas de Paulo Afonso** entraram como comunidades da **Sagrada Família** só pelo bairro
   (Tancredo Neves I e II): N. Sra. das Dores e N. Sra. das Graças. Marcadas `baixa` com nota.
8. **Duas igrejas de Paulo Afonso ficaram FORA do arquivo** por não haver como ligá-las a uma
   paróquia — ambas do Lírio, com missa:
   | Igreja | Endereço | Grade |
   |---|---|---|
   | Igreja São José de Anchieta | Av. do Aeroporto, Jardim Bahia | dom 16:30 |
   | Igreja São Lourenço | bairro São Miguel | dom 18:00 |
9. **`paroquiaperpetuosocorro.com`** (site da paróquia do Perpétuo Socorro, em Paulo Afonso) apareceu
   nos resultados de busca mas não foi possível abri-lo nesta pesquisa — vale tentar de novo.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `website`: está `http://diocesedepauloafonso.com.br` — **o site está fora do ar**; deveria ficar
  `null` (ou apontar para o Instagram oficial `@diocesepauloafonso`, que existe).
- `zipCode`: está `48601-260`, que é o CEP da **Catedral** (Av. Getúlio Vargas, 583). A Receita
  registra **48601-000** para a sede da diocese (CNPJ 13.450.903/0001-16), na mesma avenida s/n.
- `phone` (75) 3281-4268, `bishopName` e `foundedYear` (1971) **conferem**.
