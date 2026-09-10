# RELATÓRIO — Diocese de Santo Ângelo (RS)

- **Arquivo**: `paroquias/RS/santo-angelo.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 40 (todas paróquias) |
| Paróquias com confiança **alta** | 40 |
| Paróquias com confiança **media** | 0 |
| Paróquias com confiança **baixa** | 0 |
| Comunidades/capelas | 0 |
| Horários fixos | 7 (todos `baixa`, só a Catedral) |
| Cobertura | 40 / 40 (100 %) |

> **Lista de paróquias perfeita, contato e horários quase inexistentes.** O site oficial está
> vivo e atualizado, mas publica apenas **nome + município** de cada paróquia.

## Fontes principais

1. https://www.diocesedesantoangelo.com.br/paroquias — **lista oficial das 40 paróquias**,
   agrupadas em 6 foranias. `pages-sitemap.xml` com `lastmod` **2026-09-08** (site vivo).
2. https://www.diocesedesantoangelo.com.br/clero — **clero secular e religioso**, cada verbete
   com "Pároco/Vigário Paroquial da Paróquia X – município de Y". Foi a fonte de `priestName`.
   Traz ordenações de **2024**, o que confirma a atualidade da página.
3. https://www.diocesedesantoangelo.com.br/contato — endereço, CEP e telefone da Cúria.
4. https://www.catholic-hierarchy.org/diocese/dsabr.html — **40 paróquias** (estatística de 2022);
   bispo Dom Liro Vendelino Meurer desde 24/04/2013.
5. https://www.cnbb.org.br/dioceses/ e https://pt.wikipedia.org/wiki/Diocese_de_Santo_Ângelo
6. https://www.horariodemissa.com.br/ — fichas de 4 paróquias (endereço/telefone) e os únicos
   horários encontrados (Catedral). **Última atualização declarada: 06/06/2013.**

## Cobertura

**40 paróquias / 40 esperadas.** O total do site oficial bate exatamente com o
catholic-hierarchy.org. Distribuição por forania:

| Forania | Paróquias |
|---|---|
| Santo Ângelo | 8 |
| São Luiz Gonzaga | 7 |
| Cerro Largo | 6 |
| Santo Cristo | 5 |
| Santa Rosa | 6 |
| Três de Maio | 8 |

**Párocos identificados: 35 de 40.** Ficaram sem pároco na página "Clero":
Três Mártires das Missões (Entre-Ijuís), São Pedro Apóstolo (São Pedro do Butiá) e
São Paulo Apóstolo (São Paulo das Missões) — nenhum verbete do clero as cita. A Catedral e as
demais têm pároco explícito.

## O que NÃO foi encontrado

- **Endereço, CEP, telefone, e-mail, site e ano de criação**: o site oficial não publica esses
  dados de paróquia nenhuma. Ficaram `null` em **36 das 40**. As 4 exceções vieram do agregador
  horariodemissa.com.br (ver "Validação humana").
- **Comunidades/capelas**: nenhuma lista oficial ou do Anuário foi localizada. Todas as
  paróquias ficaram com `communities: []` (o importador cria a igreja-matriz sozinho).
- **Horários fixos**: só a Catedral tem horários publicados em algum lugar, e a fonte é de 2013.
  As outras 39 paróquias ficaram com `schedules: []`.

## Páginas do site que são apenas casca

O `pages-sitemap.xml` mostra 6 páginas por forania
(`paroquias-forania-s-a`, `copia-par-forania-s-l-g`, `copia-par-forania-c-l`,
`copia-par-forania-s-c`, `copia-par-forania-s-a`, `copia-par-forania-s-a-1`) que, à primeira
vista, prometeriam a ficha de cada paróquia. **Todas estão vazias**: renderizam só o título
("Paróquias da Forania de …") e o rodapé. A página `guia-diocesano` também está vazia — traz
apenas o texto "Guia Diocesano 2021", sem arquivo anexado. Se o Guia Diocesano em PDF
aparecer, ele é o caminho natural para completar endereços e telefones.

O domínio alternativo `www.diocesedesantoangelo.org` (que aparece em resultados de busca com
as páginas `/paroquias` e `/clero`) **não resolve em DNS** — é índice velho de buscador.

## Pontos para o enxame de validação

1. **Horários da Catedral (7 registros, `baixa`)** — fonte
   https://www.horariodemissa.com.br/igreja.php?k=1gH3E, com **última atualização 06/06/2013**.
   São eles: domingo 09:00 e 19:00; quarta 19:00; sexta 19:00; sábado 17:00; confissões quinta
   e sexta a partir das 08:00 (a ficha diz "08:00 às 11:30 e 13:30 às 17:30", gravado como um
   registro por dia com a nota). **Confirmar por telefone antes de carregar.**
2. **Endereço/CEP/telefone de 4 paróquias** vieram da mesma fonte de 2013 (o registro da
   paróquia continua `alta` porque nome, município e pároco são oficiais):
   - Catedral Santo Anjo da Guarda — Rua Augusto Nascimento e Silva, 46, Centro, 98800-970,
     (55) 3312-1416
   - Paróquia Sagrada Família (Santo Ângelo) — Rua Antunes Ribas, 2586, Centro, 98800-970,
     (55) 3312-2815
   - Paróquia Santo Antônio (Santo Ângelo/Pippi) — Rua São Miguel, 175, 98800-970, (55) 3312-4677
   - Paróquia Sagrado Coração de Jesus (Santa Rosa) — Rua Dr. João Dahne, 250, Centro,
     98900-000, (55) 3512-1020
   O CEP **98800-970** aparece nas três fichas de Santo Ângelo — é CEP de caixa postal/agência,
   provavelmente **errado como CEP de logradouro**.
3. **CEP da Cúria divergente**: a página "Contato" da diocese dá **98801-640** para o logradouro
   (Rua Marquês do Herval, 1113) e **98801-610** para a Caixa Postal 1090. O `dioceses.json`
   está com **98801-610**. Gravei 98801-640 no JSON desta diocese.
4. **Telefone da Cúria divergente**: o site oficial dá **(55) 3313-5308**; o `dioceses.json`
   está com **(55) 3313-5263**. Gravei o do site.
5. **Variantes de nome entre as duas páginas oficiais** (usei sempre o nome da página
   "Paróquias", que é a lista canônica):
   - "Paróquia São Miguel" (São Miguel das Missões) — a página "Clero" chama de
     **"Paróquia São Miguel Arcanjo"**.
   - "Paróquia Nossa Senhora da Imaculada Conceição" (Três de Maio) — o "Clero" usa
     **"Paróquia Nossa Senhora da Conceição"**.
   - "Paróquia Sagrada Família de Nazaré" (Cerro Largo) — o "Clero" alterna entre
     **"Sagrada Família"**, **"Sagrada Família de Nazaré"** e **"Sagrada Família de Nazaréth"**.
   - "Paróquia Todos os Santos do Caaró" (Caibaté) — o "Clero" chama de
     **"Paróquia Todos os Santos"** e cita, no mesmo município, o **Santuário Diocesano do
     Caaró** (não gravei o Santuário como entrada separada: a diocese o trata como parte
     da paróquia, mas vale conferir).
   - "Paróquia Santa Teresa d'Ávila" (Guarani das Missões) — gravei **"Paróquia Santa Teresa de
     Ávila"** para evitar apóstrofo no nome; conferir a preferência da diocese.
6. **Município grafado "Chiapeta" no site**, "Chiapetta" na página do clero e no IBGE. Gravei
   **Chiapetta**.
7. **Paróquias que atendem mais de um município** (gravei só o município-sede):
   Três Mártires das Missões → Entre-Ijuís **e Vitória das Missões**;
   Santo Antônio (Santo Antônio das Missões) → **e Garruchos**;
   São Roque (Tucunduva) → **e Novo Machado**;
   Santa Lúcia (Caibaté) → **e Mato Queimado**.
8. **Dois párocos na mesma paróquia dupla**: Pe. Leandro Defendi, OFM consta como pároco de
   **São José (São José do Inhacorá)** e de **São Sebastião (Alegria)** ao mesmo tempo; idem
   Pe. Sadi Rambo, OFM como vigário das duas. Não é erro de leitura — é o que a página diz.
9. **Pendência de campo**: nenhuma das 40 paróquias tem `foundedYear`. Se o enxame de validação
   for atrás disso, o Anuário Católico é o caminho.
