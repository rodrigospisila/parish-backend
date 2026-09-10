# Relatório de pesquisa — Diocese de Araçuaí (MG)

**Agente:** pesquisa de território (Vale do Jequitinhonha / Alto Jequitinhonha)
**Data da pesquisa:** 2026-09-10
**Arquivo gerado:** `paroquias/MG/aracuai.json`

## Resumo numérico

| Métrica | Valor |
|---|---|
| Paróquias no arquivo | **29** (28 paróquias + 1 quase-paróquia; 1 delas é a Catedral) |
| Paróquias esperadas | 30 (Annuario Pontificio 2023) · 29 (GCatholic, 10/09/2026) · 29 (Receita Federal) · 27/28 (Wikipédia) |
| Confiança das paróquias | 29 `alta` |
| Comunidades/capelas | **73** (56 `alta`, 17 `media`) — o universo real passa de 500 |
| Horários fixos | **101** (99 missas + 2 adorações) |
| Confiança dos horários | 69 `alta` · 32 `baixa` |
| Paróquias com horário | **20 de 29** |
| Regiões pastorais | 5 |
| Municípios | 27 |
| Bispo | Dom Geraldo dos Reis Maia (desde 30/04/2024) |

## Fontes principais

1. **https://diocesedearacuai.com.br/mapa-da-diocese/** — **a fonte que fechou a lista.** Publica as
   **29 paróquias organizadas nas 5 Regiões Pastorais**. Página atualizada em 01/08/2025.
   *Acessada em 10/09/2026.*
2. **https://diocesedearacuai.com.br/paroquias/** — galeria com apenas **20** das 29, cada uma com
   link para sua página. Atualizada em 03/09/2025.
3. **https://diocesedearacuai.com.br/team/&lt;slug&gt;/** — as 20 páginas de paróquia (custom post type
   `neeon_team`, encontradas pelo sitemap `wp-sitemap-posts-neeon_team-1.xml`). Cada uma traz
   *HISTÓRIA DA PARÓQUIA · **HORÁRIO DE MISSAS** · CLERO · Info (telefone, e-mail, endereço próprios)*.
   Atualizadas entre **23/07/2025 e 31/03/2026**. *Acessadas em 10/09/2026.*
4. **https://gcatholic.org/churches/local/arac2** — 37 igrejas por cidade, **29 marcadas "(Parish)"**.
   *Atualizado em 10/09/2026* — mesma data da consulta, fonte fresquíssima.
5. **Receita Federal, via https://minhareceita.org/&lt;cnpj&gt;** — **todas as paróquias são filiais do
   CNPJ da DIOCESE DE ARACUAI, raiz 21.249.255.** A varredura das filiais 0001→0040 devolveu
   exatamente **31 estabelecimentos ativos** (matriz + 29 paróquias + a "Fazenda Alagadico", em
   Coronel Murta) e **nada a partir de 0032**. Deu endereço, bairro, CEP, telefone e data de inscrição
   de **todas as 29**, inclusive das 9 sem página. *Consultado em 10/09/2026.*
6. **https://www.catholic-hierarchy.org/diocese/darai.html** — diocese erigida em 25/08/1913;
   23.526 km²; 306.000 católicos (70,2%); 41 presbíteros; 30 paróquias (AP 2023).

## Cobertura: encontrado vs. esperado

**29 encontradas, com TRIPLA corroboração** (Mapa da Diocese + GCatholic + Receita Federal — as três
listas batem item a item). O AP 2023 diz 30; a diferença provável é a contagem separada do
**Santuário de Nossa Senhora da Lapa** (Virgem da Lapa), padroeira da diocese, que o GCatholic lista
como igreja distinta da matriz São Domingos.

| Região Pastoral | Paróquias | Com página no site |
|---|---|---|
| 1 – Araçuaí | 8 (Araçuaí ×3, Berilo, Francisco Badaró, Jenipapo de Minas, Virgem da Lapa, Coronel Murta) | 6 |
| 2 – Itaobim | 5 (Itaobim, Itinga, Ponto dos Volantes, Medina, Comercinho) | 1 |
| 3 – Minas Novas | 6 (Minas Novas, Chapada do Norte, Veredinha, Turmalina, Leme do Prado, José Gonçalves de Minas) | 6 |
| 4 – Novo Cruzeiro | 5 (Novo Cruzeiro, Itaipé, Catuji, Caraí, Padre Paraíso) | 3 |
| 5 – Pedra Azul | 5 (Pedra Azul, Cachoeira de Pajeú, Divisa Alegre, Águas Vermelhas, Curral de Dentro) | 4 |

**As 9 sem página no site** (ficaram com nome, cidade, região, endereço, CEP e telefone, mas **sem
pároco, sem comunidades e sem horário**): Francisco Badaró, Coronel Murta, Itaobim, Itinga,
Ponto dos Volantes, Comercinho, Itaipé, Caraí e Curral de Dentro.
A Região Pastoral de **Itaobim** é a mais prejudicada: 4 das suas 5 paróquias não têm página.

Os agregadores **não** ajudaram nos horários: o `horariodemissa.com.br` TEM ficha para Itaobim,
Itinga, Ponto dos Volantes, Comercinho, Coronel Murta e as demais cidades — corroborando endereço e
telefone —, mas **com o campo "Missas" vazio em todas**; o site está congelado desde 2019.

## Horários

- **101 registros**, sendo 99 missas e 2 adorações (Hora Santa Solene em Araçuaí/Santo Antônio e a
  adoração da 1ª sexta em Jenipapo de Minas).
- **32 ficaram `baixa`**, quase todos por **recorrência mensal** — a regra literal da fonte está em
  `notes` de cada horário. Só a Paróquia Santa Rita de Cássia (Medina) tem 11 registros mensais: sua
  tabela de capelas e distritos é a mais detalhada da diocese.
- **Celebração da Palavra excluída**: a Paróquia São Pedro do Fanado (Minas Novas) publica
  "Sexta-feira 19h30 – **Celebração** nas comunidades urbanas e capelas". Não é missa e **não** foi
  gravada.
- **Sem horário, por falta de dado**: 9 paróquias sem página (acima).

## Precisa de validação humana

1. **Paróquia São Sebastião (Águas Vermelhas) — dia da semana ausente.** A fonte publica apenas
   `HORÁRIO DE MISSAS / Igreja Matriz – 9h e 19h`, **sem dizer o dia**. Foram gravados como domingo,
   com `confidence: "baixa"` e a ressalva em `notes`. **É o registro mais frágil do arquivo.**
2. **Veredinha — a Matriz foi DEMOLIDA em 2025.** A própria página diz que a Igreja Matriz de Nossa
   Senhora do Patrocínio "foi demolida e, a partir disso, iniciou-se a construção da nova igreja
   Matriz". Os horários da "Igreja Matriz" devem estar acontecendo em local provisório.
3. **Mesmo pároco em paróquias distantes** (provável dado desatualizado numa das páginas):
   - **Pe. José Willian Marques da Silva** aparece como pároco de **Turmalina** *e* de
     **Virgem da Lapa** — municípios distantes, em regiões pastorais diferentes.
   - **Pe. Sebastião Tiago Gomes** aparece como pároco de **Minas Novas** e como "Admin. Paroquial"
     de **Leme do Prado**.
   - **Pe. Adilson Pereira de Sousa** é pároco de **Leme do Prado** *e* da quase-paróquia de
     **José Gonçalves de Minas** (essa combinação é plausível — cidades vizinhas).
   - **Pe. Altamiro Domingos da Silva** é vigário em **Virgem da Lapa** *e* em **Padre Paraíso**.
4. **Endereços divergentes entre a Receita Federal e a página da paróquia** (gravado o da página, que
   é mais recente; o da Receita está na fonte correspondente):
   | Paróquia | Página da diocese | Receita Federal |
   |---|---|---|
   | N. Sra. da Conceição – Pedra Azul | Avenida Joaquim Antunes, 126 | Rua Colatino Antunes, 103 |
   | N. Sra. da Conceição – Cachoeira de Pajeú | Rua Bahia, s/n | Rua Minas Gerais, 282 |
   | N. Sra. da Piedade – Turmalina | Praça Horácio Viana, 228 | Rua Hélio Maciel, 100 |
   | Quase-paróquia – José Gonçalves de Minas | Praça José Lago de Mendonça, 13 | Praça São Sebastião, 03 |
5. **Telefones divergentes** entre Receita e agregador/página (gravado o da página quando existe):
   Ponto dos Volantes `(33) 3733-8088` vs `(33) 8428-5711`; Comercinho `(33) 3732-1126` vs
   `(33) 9841-6010`; Padre Paraíso `(33) 3534-1080` (Receita) e `(33) 9 9849-2838` (página) —
   gravados os dois. **Telefone malformado**: Turmalina publica `(38) 91603923`.
6. **Divergências de NOME entre as fontes oficiais**:
   - **Ponto dos Volantes**: "Paróquia N. Sra. do Perpétuo Socorro e São Sebastião" (Mapa da Diocese,
     GCatholic) vs "Paróquia São Sebastião e N. Sra. do Perpétuo Socorro" (Receita, agregador).
     Adotada a ordem do Mapa da Diocese.
   - **Catuji**: "Paróquia São Miguel" (Mapa da Diocese, Receita) vs "Paróquia São Miguel Arcanjo"
     (página da paróquia, GCatholic). Adotado "Paróquia São Miguel".
   - **Araçuaí/Santo Antônio**: o Mapa da Diocese escreve "Matriz Santo Antônio".
7. **Igrejas listadas pelo GCatholic que NÃO são paróquia** e por isso **não** entraram no arquivo:
   Nossa Senhora de Fátima e Nossa Senhora do Rosário (Araçuaí); Nossa Senhora de Fátima (Francisco
   Badaró); Bom Jesus (Marambainha); Nossa Senhora do Amparo e São Gonçalo (Minas Novas);
   Nossa Senhora Aparecida (Padre Paraíso); **Santuário de Nossa Senhora da Lapa** (Virgem da Lapa).
   O Santuário da Lapa foi gravado como **comunidade** da Paróquia São Domingos de Gusmão — é dele que
   sai a missa de sábado 19h e a **missa votiva do dia 15 de cada mês** (recorrência por dia do mês,
   que não cabe no modelo e por isso não virou horário).
8. **"Fazenda Alagadico"** (CNPJ 21.249.255/0002-43, Rodovia BR-342 km 33, zona rural de Coronel
   Murta) é filial ativa da Diocese mas **não é paróquia** — não foi gravada.
9. **COMUNIDADES — o ponto fraco desta diocese.** As páginas **declaram os totais** mas **não os
   nomeiam**. Os números declarados pelas próprias paróquias somam mais de 500:
   Novo Cruzeiro "mais de 70" · Berilo 45 (38 rurais + 7 urbanas) · Virgem da Lapa 44 (39+5) ·
   Chapada do Norte 42 (34+8) · Turmalina 38 · Catuji 38 · Jenipapo de Minas 37 (32+5) ·
   Padre Paraíso 36 (29+7) · Águas Vermelhas 34 (26+8) · Perpétuo Socorro/Araçuaí 32 (24+8) ·
   Cachoeira de Pajeú 31 (24+7) · Veredinha 15 rurais + 3 capelas urbanas.
   **Só 73 comunidades foram gravadas**, quase todas deduzidas dos locais citados nas tabelas de
   horário. É o maior buraco do dataset desta diocese.
10. **Ano de criação**: só 6 das 29 têm data segura (Araçuaí/Santo Antônio 1858, Pedra Azul 1918,
    Novo Cruzeiro 1917, Jenipapo de Minas 1981, Catuji 2001, Divisa Alegre 2013). As demais ficaram
    `null` — os históricos falam da fundação do povoado ou da construção da igreja, não da ereção
    canônica, e não se deve confundir as duas coisas.
11. **Pároco**: 20 das 29 têm pároco identificado; as 9 sem página ficaram com `priestName: null`.
12. **O e-mail da Cúria aparece grafado de duas formas** no próprio site:
    `curiaracuai@yahoo.com.br` (rodapé das páginas de paróquia e bloco Info) e
    `curiaaracuai@yahoo.com.br` (topo do site, com dois "a"). Gravado o primeiro, que é o que aparece
    em mais lugares.

## Observações de método

- O site é WordPress com um **custom post type `neeon_team`** (do tema Neeon) usado tanto para as
  paróquias quanto para o bispo e as congregações religiosas. **O REST API do tipo devolve 404**, mas
  o **sitemap** (`wp-sitemap-posts-neeon_team-1.xml`) expõe as 31 URLs — foi assim que as 20 páginas
  de paróquia foram localizadas.
- A galeria `/paroquias/` só mostra 20; a página `/mapa-da-diocese/` é que tem a lista completa. Vale
  a lição: **em site de diocese, procurar sempre "Mapa da Diocese" / "Regiões Pastorais" além da
  página "Paróquias"**.
- **A varredura de CNPJ funcionou perfeitamente** (mesma técnica que resolveu Januária). Basta a raiz
  do CNPJ da Mitra/Diocese: gerar `raiz + 0001..00NN` com dígito verificador calculado e consultar
  `minhareceita.org`. Aqui fechou exatamente em 31 filiais, o que dá **confiança de completude** à
  lista — não é só um complemento, é uma prova de que não falta nenhuma paróquia.
- Os horários foram transcritos **à mão** a partir das 20 páginas, e não por parser: os formatos são
  muito variados ("Segunda, quarta, quinta e sábado às 19hs", "1º 3º 4º e 5º domingo", "Sábado – 19h
  ou domingo – 17h", "dia 15 de cada mês"). Cada registro carrega em `notes` o texto literal da fonte.
