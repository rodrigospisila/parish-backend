# Relatório — Diocese de Caxias do Sul (RS)

Pesquisa de **2026-09-10**. Arquivo de dados: `caxias-do-sul.json`. Todas as estatísticas abaixo
foram computadas do próprio JSON.

## Resumo

| Item | Quantidade |
|---|---|
| Paróquias | **73** (73 alta / 0 media / 0 baixa) |
| Comunidades/capelas nomeadas | **25** (todas alta) — em **6** paróquias |
| Horários fixos | **377** (352 alta / 0 media / 25 baixa) |
| Cobertura | 73 / 73 esperadas (catholic-hierarchy, dado de 2023) — **100 %** |
| Cidades cobertas | 31 municípios |

> **Fonte única e suficiente:** o site diocesano publica, numa só página, a ficha completa de cada
> paróquia (endereço, CEP, telefone, e-mail, data de fundação, pároco e vigários, número de
> comunidades e horários de missa). Não foi preciso recorrer a agregadores — **nenhum registro veio
> de horariodemissa.com.br, missas.com.br ou Google Maps**.

## Fontes principais

4 URLs distintas, todas acessadas em **2026-09-10**.

1. **`https://www.diocesedecaxias.org.br/paroquias/all/0`** — a fonte de **tudo**: as 73 fichas de
   paróquia com contato, fundação, clero e horários. A página é um app Next.js; os dados vêm do
   bloco `__NEXT_DATA__` (`props.pageProps.churches`, 73 registros; `props.pageProps.cities`, 32
   cidades). As URLs por cidade (`/paroquias/<cidade>/0`) devolvem o mesmo conjunto e filtram no
   cliente — por isso **todas as `sources` apontam para `/paroquias/all/0`**.
2. `https://www.diocesedecaxias.org.br/diocese/curia` — Cúria Diocesana: Rua Os 18 do Forte, 1771 –
   1º Andar, 95020-472; `mitra@diocesedecaxias.org.br` (e-mail ofuscado por Cloudflare, decodificado
   do atributo `data-cfemail`); (54) 3214-5388; Dom José Gislon, OFMCap (bispo) e Pe. Leonardo
   Inácio Pereira (vigário-geral).
3. `https://www.catholic-hierarchy.org/diocese/dcxds.html` — ereção 08/09/1934 (como Diocese de
   Caxias; nome mudado em 19/10/1966), sufragânea de Porto Alegre, **73 paróquias** e 862 missões,
   910.000 católicos em 2023 (Annuario Pontificio 2024), 11.892 km².
4. `https://gcatholic.org/dioceses/diocese/caxi1` (via busca) — corrobora sede e bispo.

**Sinal de atualidade:** a lista de clero da mesma página traz uma ordenação diaconal de
**01/08/2026** e um diácono ordenado em 07/07/2026 — o site está sendo mantido. Por isso todos os
registros de paróquia e os horários semanais entraram como `alta`.

## Cobertura

`coverage`: `parishesFound` 73, `parishesExpected` 73.

As 73 fichas do site se dividem em 69 marcadas como "Paróquia" e 4 como "Santuário"; **as quatro
santuários têm pároco/reitor, comunidades e horários próprios**, e o total bate exatamente com as 73
paróquias do Annuario Pontificio. Entraram todas como paróquia:

| Ficha do site | Nome gravado | Cidade |
|---|---|---|
| Paróquia e Santuário Santo Antônio | (igual) | Bento Gonçalves |
| Santuário de Nossa Senhora de Caravaggio | (igual) | Farroupilha |
| Paróquia São João Batista e Nossa Senhora Aparecida - Santuário | Paróquia e Santuário São João Batista e Nossa Senhora Aparecida | Nova Prata |
| Paróquia Nossa Senhora do Rosário de Pompeia - Santuário | Paróquia e Santuário Nossa Senhora do Rosário de Pompeia | Pinto Bandeira |
| Paróquia Santa Teresa D'Avila - Catedral Diocesana | Catedral Santa Teresa d'Ávila | Caxias do Sul |

### Preenchimento por campo (de 73 paróquias)

| Campo | Preenchido | Nulo |
|---|---|---|
| `priestName` | 72 (99 %) | 1 |
| `foundedYear` | 71 (97 %) | 2 |
| `phone` | 71 (97 %) | 2 |
| `zipCode` | 69 (95 %) | 4 |
| `address` | 68 (93 %) | 5 |
| `email` | 62 (85 %) | 11 |
| `neighborhood` | 41 (56 %) | 32 |
| `website` | **7 (10 %)** | 66 |

Fundações de **1850** (São Francisco de Paula) a **2010**. Sites próprios: Santo Antônio (Bento
Gonçalves), Arcoverde, Mãe de Deus (Carlos Barbosa), Catedral, N. Sra. de Lourdes (Caxias),
São Pelegrino e Caravaggio.

## Comunidades

- **25 comunidades**, todas `alta`, concentradas em **6 paróquias**: Santos Apóstolos (12, Caxias do
  Sul), Santa Maria do Belo Horizonte (7, São Francisco de Paula), N. Sra. das Graças (3, São
  Francisco de Paula), Cristo Operário (1 — "Comunidade Santos Anjos"), N. Sra. da Saúde/Fazenda
  Souza (1 — "Capela Beato João Schiavo") e N. Sra. de Lourdes/Flores da Cunha (1 — "Mosteiro Nossa
  Senhora do Brasil", das Clarissas Capuchinhas).
- **67 das 73 paróquias ficam com `communities: []`** — o importador cria só a igreja-matriz. Essa é
  a maior lacuna do arquivo: **o site informa o NÚMERO de comunidades de cada paróquia (de 2 a 40;
  862 missões no total segundo o catholic-hierarchy), mas não os nomes.** Só entraram as comunidades
  que aparecem nominalmente dentro do texto de horários.
- "Matriz de Cazuza Ferreira" (Santa Maria do Belo Horizonte) veio marcada com `isMatriz: true`.

## Horários

| Tipo | Total | alta | media | baixa |
|---|---|---|---|---|
| MASS | 350 | 327 | — | 23 |
| ROSARY | 17 | 17 | — | 0 |
| ADORATION | 5 | 3 | — | 2 |
| CONFESSION | 5 | 5 | — | 0 |
| **Total** | **377** | **352** | **0** | **25** |

- Por dia da semana: domingo 119, sábado 68, quarta 50, sexta 50, terça 35, quinta 32, segunda 23.
- Faixa: **07:00 às 20:00**. Nenhum `time`/`dayOfWeek` malformado, nenhum duplicado, nenhum sem
  `sources`, nenhum `community` órfão.
- **Os 25 `baixa` são todos de recorrência mensal ou quinzenal** ("1ª sexta-feira do mês",
  "2º e 4º sábados", "4º sábado de cada mês", "último sábado do mês") — o schema só guarda dia da
  semana, então eles ficam fora da carga e aguardam o enxame de validação. O texto original está no
  campo `notes`.
- **83 horários têm `notes`** (novenas, bênçãos, adoração antes da missa, mudança de horário no
  inverno/horário de verão, missas em cemitério/gruta/mosteiro).
- **3 paróquias sem nenhum horário:** Jesus Bom Pastor e São João Batista (Farroupilha), Jesus
  Ressuscitado (Farroupilha) e São Sebastião (Jaquirana) — as fichas do site não trazem a seção
  "Horários de Missa".

## Pontos para o enxame de validação

1. **Nomes das comunidades: a lacuna nº 1.** 67 paróquias declaram um total de centenas de
   comunidades e o site não as nomeia. Preencher exige as páginas/redes sociais de cada paróquia ou
   contato com a Cúria. Casos com mais comunidades declaradas: São Luiz Gonzaga/Veranópolis (40),
   Sagrado Coração/Antônio Prado (32), N. Sra. de Lourdes/Flores da Cunha (32), São Pedro/Garibaldi
   (31), São Marcos/São Marcos (26), Imaculada Conceição/Caxias (26).
2. **Telefone malformado — `(54) 3272.107`** na Paróquia São Pedro (Guabiju): só 7 dígitos. Foi
   gravado como o site publica; não é discável. **Corrigir ou anular.**
3. **Ano de fundação inválido** na mesma Paróquia São Pedro (Guabiju): o site diz `25/03/0954`
   (provável erro de digitação de 1954, igual ao de outras paróquias da mesma leva). `foundedYear`
   ficou `null`.
4. **Dois e-mails publicados** na Paróquia Nossa Senhora de Fátima – Bairro Fátima (Caxias do Sul):
   `paroquiadespiritosanto@gmail.com` e `paroquianossasenhoradefatima24@gmail.com`. Gravei o
   segundo (o que casa com o nome da paróquia); confirmar qual é o oficial.
5. **7 paróquias entram sem missa de domingo `alta`/`media`:** São Vicente de Paulo (Caxias do Sul,
   só sábado 16h30), São Marcos – Marcorama (Garibaldi, só horários mensais), São Pedro (Guabiju, só
   sábado 19h), São João Batista (Imigrante, só sábado 19h), N. Sra. das Graças e Santa Maria do Belo
   Horizonte (São Francisco de Paula, 100 % mensal) e Santa Bárbara (São Valentim do Sul, só sábado
   19h). Nos quatro primeiros o próprio site só publica esses horários; nas duas de São Francisco de
   Paula **todos** os horários são mensais e por isso **nenhum entra na carga**.
6. **Missas votivas de dia fixo do mês foram descartadas** (não têm dia da semana): dia 13 em
   Santo Antônio/Bento Gonçalves ("Dias Votivos", 5 missas) e em N. Sra. de Fátima – Bairro Fátima;
   dia 8 na Capela Beato João Schiavo (Fazenda Souza); dias 13, 16, 19 e 23 nas comunidades da
   Paróquia Santos Apóstolos. Se o app vier a suportar recorrência por dia do mês, refazer.
7. **Paróquia Santos Apóstolos (Caxias do Sul):** as 12 comunidades listadas concentram todos os 27
   horários; a igreja-matriz criada pelo importador ficará **sem nenhuma missa**. A sede fica no
   bairro São Romédio, que também é uma das comunidades — verificar se "São Romédio" é a própria
   matriz (nesse caso marcar `isMatriz`).
8. **`priestName` fora do padrão:** Paróquia São Ciro (Caxias do Sul) traz "Daniel D'Agnoluzzo
   Zatti" sem o prefixo "Padre" (a página de clero da diocese diz "Pe. Daniel D'Agnoluzzo Zatti");
   Paróquia Santo Antônio (Vila Flores) traz "Nilmar Carlos Gatto, OFMCap" sem "Frei". Paróquia São
   João Batista (Imigrante) é a **única sem sacerdote publicado**.
9. **Santuário de Nossa Senhora de Caravaggio (Farroupilha)** é a ficha única de duas realidades: o
   santuário diocesano (reitor Pe. Ricardo Fontana) e a Paróquia Nossa Senhora de Caravaggio (pároco
   Pe. Joone Fachinelli). Gravei o **pároco** em `priestName` e mantive o nome oficial do site.
   Também é a única entrada sem `foundedYear` (o site não publica).
10. **Tipos inferidos do texto corrido — reconferir:** as 5 CONFESSION são todas de São Leonardo
    Murialdo (Caxias do Sul), de "Atendimento do sacerdote para confissões… Terça a sábado, das 15h
    às 18h" (gravei só o início da faixa, 15:00, com a faixa completa em `notes`). Os 17 ROSARY vêm
    de "Terço", "Récita do terço" e "Terços": 7 do Santuário de Caravaggio, 6 do Sagrado Coração de
    Jesus (Antônio Prado), 2 de Santos Apóstolos, 1 da Sagrada Família e 1 de Santo Antônio –
    Cinquentenário. As 5 ADORATION (Cristo Rei/Bento Gonçalves sexta 15:30; Sagrada Família quarta
    17:30; Santos Apóstolos sexta 15:00 ×2, mensais; Caravaggio quinta 19:30) vêm de linhas em que a
    adoração aparece **fora** de parênteses — quando ela está entre parênteses (ex.: "Sexta-feira:
    19h30min (Adoração ao Santíssimo)" em Faria Lemos), o registro ficou como `MASS` com o texto em
    `notes`, porque a seção da fonte é "Horários de Missa".
11. **Ambiguidades de horário que resolvi por convenção — vale conferir na fonte:**
    - N. Sra. de Caravaggio/Ana Rech: "Domingo: 09h e 19h (maio, junho, julho e agosto, às 18h)" →
      gravei 09:00 e 19:00; o 18h de inverno **substitui** o 19h e não foi gravado.
    - Santo Antônio – Forqueta: "Sábado: 18h (no inverno passa para às 17h)" → gravei 18:00.
    - São Pedro e São Paulo/Nova Roma do Sul: "Quarta 19h30min (20h durante o horário de verão)" e
      "Sábado 17h (18h durante o horário de verão)" → gravei o horário-base.
    - Sagrado Coração de Jesus (Antônio Prado): "Diariamente, Missas às 19h" → gerei segunda a
      sábado às 19:00 (domingo já tinha 09h e 19h próprios).
    - São Ciro (Caxias do Sul): "Segunda a sexta-feira: 19h (nas quintas-feiras, adoração e bênção
      com o Santíssimo)" → 5 missas; a adoração de quinta **não** virou registro (sem hora própria).
    - Santa Catarina (Caxias do Sul): a missa de terça 16h30 é "no Cemitério Santa Catarina" —
      registrada na Matriz com `notes`, porque o cemitério não é listado como comunidade.
    - São Luiz Gonzaga (Veranópolis): as missas de segunda a quinta às 18h15 são "na gruta" —
      idem, na Matriz com `notes`.
    - Santos Apóstolos: a linha "Terça-feira – 19h30 – Grupo de Oração" (comunidade Santo Antônio)
      foi **ignorada** por não ser missa/terço/adoração/confissão.
12. **4 paróquias sem CEP e 2 sem telefone** (o site não publica): Menino Deus, São José – Desvio
    Rizzo, São Pedro e São Paulo e São Pio X (todas em Caxias do Sul) sem CEP; Santo Antônio –
    Maragata (Nova Prata) e Santa Maria do Belo Horizonte (São Francisco de Paula) sem telefone.
13. **Endereços incompletos:** N. Sra. das Graças (São Francisco de Paula) tem só a cidade no campo
    de endereço — usei `neighborhood = "Rincão do Kroeff"`, que é como a página de clero da própria
    diocese localiza a paróquia. Santa Maria do Belo Horizonte ficou com `neighborhood = "Cazuza
    Ferreira"` e São Marcos – Marcorama com `neighborhood = "Marcorama"` (distritos, sem logradouro).
14. **`neighborhood` nulo em 32 paróquias** porque o próprio campo de endereço do site vem sem
    bairro (padrão "Rua X, nº, - Cidade - RS, CEP").
15. **Homônimos entre cidades diferentes (sem conflito, mas confirmar):** quatro "Paróquia Sagrado
    Coração de Jesus" (Antônio Prado, Caxias do Sul, Farroupilha, Nova Bassano), três "Santo Antônio"
    (Fagundes Varela, Nova Pádua, Vila Flores), três "São José" (Cambará do Sul, Caxias do Sul,
    Vista Alegre do Prata), duas "Nossa Senhora de Lourdes" (Caxias do Sul e Flores da Cunha), duas
    "São Marcos" (Farroupilha e São Marcos), duas "São Pedro" (Garibaldi e Guabiju) e duas "São Pedro
    e São Paulo" (Caxias do Sul e Nova Roma do Sul).
    **Não há duas paróquias de mesmo nome na mesma cidade** — os sufixos de
    bairro/distrito do próprio site ("- Ana Rech", "- Cinquentenário", "- Forqueta", "- Fazenda
    Souza", "- Bairro Fátima", "- Bairro Cidade Nova", "- Desvio Rizzo", "- Arcoverde",
    "- Faria Lemos", "- Maragata", "- Marcorama", "- Otávio Rocha") foram mantidos no nome porque é
    o que desambigua as homônimas dentro de Caxias do Sul, Carlos Barbosa, Bento Gonçalves,
    Flores da Cunha, Garibaldi e Nova Prata.
16. **Telefones múltiplos:** onde o site publica dois ou três números (Santo Antônio/Bento Gonçalves,
    N. Sra. Mãe de Deus/Carlos Barbosa, São Marcos/São Marcos, São Pedro e São Paulo/Caxias do Sul),
    gravei **o primeiro**. Os demais estão só na fonte.
17. Nada a corrigir em: prefixos de nome (68 "Paróquia", 3 "Paróquia e Santuário", 1 "Catedral",
    1 "Santuário de"), slugs (kebab-case ASCII, 73 únicos), `state` (73 × "RS"), formato dos demais
    70 telefones e dos 69 CEPs.
