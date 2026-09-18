# Relatório — Arquidiocese de Manaus (AM)

Pesquisa: 2026-09-17 · Arquivo: `manaus.json` · Regional Norte 1 da CNBB · 8 municípios
(Manaus, Careiro, Careiro da Várzea, Iranduba, Manaquiri, Novo Airão, Presidente Figueiredo e
Rio Preto da Eva).

## Resultado

| Métrica | Valor |
|---|---|
| Entradas | **97** — 57 paróquias (com a Catedral e 3 santuários paroquiais), 39 áreas missionárias e 1 santuário não paroquial (fora da carga) |
| Confiança das paróquias | 97 `alta` |
| Comunidades/capelas | **1.003** (97 matrizes/sedes + 906 comunidades; 28 marcadas `status: "transferida"`) |
| Horários fixos | **333** em 46 unidades — 286 `alta`, 9 `media`, 38 `baixa` (320 missas, 7 confissões, 6 adorações) |
| Cobertura | **96 encontradas / 96 esperadas** |

## Fontes principais

1. **`https://arquidiocesedemanaus.org.br/paroquias/`** — "Paróquias e Áreas Missionárias –
   Contatos". Uma única página com **97 fichas** em 3 regiões episcopais e 13 setores: telefone,
   e-mail (ofuscado pelo Cloudflare — decodificado de `data-cfemail`), endereço, CEP, redes sociais,
   lista de comunidades eclesiais e, em 46 fichas, a grade de missas. A API do WordPress
   (`/wp-json/wp/v2/pages?slug=paroquias`) informa `modified: 2026-09-14` — **três dias antes da
   pesquisa** — e `date: 2022-11-01`, ou seja, o texto é todo posterior à pandemia. A página é viva:
   já traz a área missionária instalada em 13/12/2025 e um link de abril de 2026.
2. **`/abrangencia-e-dados-eclesiais/`** (modificada em 02/04/2026) — a contagem oficial: **57
   paróquias + 39 áreas missionárias**, 3 regiões episcopais, 13 setores, "aproximadamente 1 mil
   comunidades eclesiais" (o arquivo tem 1.003).
3. **API `/wp-json/wp/v2/clero`** — 170 fichas de padres e diáconos, várias com a função ("Pároco –
   Área Missionária X") e data de modificação. Junto com as **notícias de posse** do próprio site
   (API `/wp-json/wp/v2/posts?search=…`), deu o pároco de 40 unidades.
4. **Receita Federal via `minhareceita.org`** — varredura das filiais do CNPJ **04.026.811** de 0001
   a 0160: **94 estabelecimentos ativos** (0001–0094), nenhum depois. Serviu de prova de completude
   e deu o CEP de 8 fichas que a página publica sem CEP.
5. gcatholic.org (95 paróquias e 2 missões em 31/12/2022). catholic-hierarchy.org respondeu 429.
   O Arquivo da Internet estava fora do ar ("Temporarily Offline") durante toda a pesquisa.

## A conta fecha

- Página de contatos: 57 paróquias + 39 áreas missionárias + Santuário da Misericórdia = 97 fichas.
- Página de dados eclesiais: 57 + 39 = **96**. Idêntico.
- Receita: das 94 filiais, 3 não são paróquia (cúria, Centro de Formação Maromba, Seminário São
  José); as outras **91 casam uma a uma** com fichas da página. Só **5 das 96 unidades não têm
  filial própria**: Paróquia Dom Bosco (salesianos) e Santuário N. Sra. Aparecida (redentoristas),
  que usam o CNPJ das congregações, e as áreas missionárias São José do Rio Negro (2021), Santo
  Antônio da Samaúma (2024) e Maria Mãe da Esperança (2025). Nenhuma filial sobra sem ficha.

## Decisões de modelagem

- **Área missionária entra como paróquia.** Em Manaus é unidade territorial com pároco, secretaria e
  comunidades — 39 das 96 unidades. O nome fica "Área Missionária …" (prefixo aceito pelo validador).
- **Matriz/sede.** O importador exige uma igreja principal por unidade e, sem ela, criaria
  "Matriz Área Missionária X". Por isso toda unidade tem uma comunidade `isMatriz: true` na 1ª
  posição: (a) quando a lista da fonte traz a igreja-sede (mesmo endereço, mesmo padroeiro ou a
  marca "(matriz)"), ela foi marcada — nas paróquias virou "Matriz <padroeiro>", nas áreas
  missionárias cujo templo-sede tem outro padroeiro o nome foi mantido (ex.: a sede da A. M. Menino
  Jesus é a igreja Santo Expedito, Rua Vinca 37); (b) quando a lista não traz a matriz, ela foi
  criada com o endereço da paróquia; (c) em **8 áreas missionárias** o endereço-sede não bate com
  nenhuma comunidade listada — entrou como **"Sede da Área Missionária X"** (Ponta Negra, São José
  do Rio Negro, Divina Misericórdia, São Lucas, São Paulo Apóstolo, São Pedro Apóstolo, São Daniel
  Comboni e São João XXIII). **Validar qual é a igreja principal de cada uma.**
- **Nomes.** Sufixos de localização saíram do nome e foram para `city`/`neighborhood`:
  "São Pedro Apóstolo – Manaquiri", "… – Rio Preto da Eva", "… – Presidente Figueiredo",
  "N. Sra. do Perpétuo Socorro – Balbina", "Santa Luzia – Presidente Vargas – Matinha",
  "N. Sra. das Graças – Aleixo", "Sagrada Família – Tarumã / -Japiim", "São José – Belo Horizonte"
  (Belo Horizonte é localidade de Adrianópolis). Mantive "Paróquia São José Operário – Leste", que é
  como a arquidiocese a distingue do Santuário São José Operário. Homônimas na mesma cidade (2 ×
  Santa Luzia, 2 × N. Sra. das Graças, 2 × A. M. Sagrada Família) têm `neighborhood` preenchido — o
  importador acrescenta o bairro ao nome.
- **Área Missionária Santa Teresinha do Menino Jesus** é o nome novo da "Área Missionária Nossa
  Senhora das Vitórias", que a página de contatos ainda usa. A mudança foi em **11/04/2025**
  (notícia oficial de 12/04/2025) e a Receita já registra o nome novo (filial 0091). A igreja-sede
  continua se chamando N. Sra. das Vitórias.
- **Santuário da Misericórdia** (Fazenda da Esperança, BR-174; decreto de 19/03/2018; reitor Dom
  Mário Pasqualotto) está na lista oficial mas não é paróquia nem publica horário →
  `status: "nao-paroquial"`.
- `website` só quando a fonte dá a URL. Onde ela dá apenas "Rede Social: @perfil", sem dizer a rede,
  o perfil foi guardado na chave extra `social` (não virou URL — seria inventar).
- `foundedYear` só onde há fonte: N. Sra. da Glória (15/08/1959, post de história), A. M. São José
  do Rio Negro (decreto de 26/06/2021), A. M. Santo Antônio (25/08/2024), A. M. Maria Mãe da
  Esperança (13/12/2025) e Santuário da Misericórdia (2018). **A data de abertura do CNPJ não é a
  fundação** (dezenas de filiais repetem 15/10/1997 e 12/09/2006) e não foi usada.

## Listas desatualizadas dentro da própria página (28 comunidades `transferida`)

A página é atualizada ficha a ficha, e quando uma unidade nova é desmembrada a lista da unidade-mãe
não é corrigida. Onde a duplicidade é clara, a comunidade ficou na unidade **nova** e recebeu
`status: "transferida"` (fora da carga) na antiga:

| Unidade antiga | Unidade nova | Comunidades |
|---|---|---|
| A. M. N. Sra. Aparecida (Cacau Pirêra, Iranduba) | A. M. Maria Mãe da Esperança (13/12/2025, km 22–68 da AM-070) | 17 |
| A. M. Ternura de Deus | A. M. Santa Teresinha do Menino Jesus (seis comunidades definidas em 13/09/2024) | 4 |
| A. M. Santa Maria Goretti | idem (Santa Inês, Rua Q) | 1 |
| Paróquia Santo Ângelo (Novo Airão) | A. M. São José do Rio Negro (decreto de 26/06/2021) — rio Cuieiras | 6 |

Ficaram **sem decisão** (duplicadas nas duas listas ou sem par claro): "Sagrada Família – Rua 03,
Parque Eduardo Braga" aparece tanto na A. M. Família de Nazaré quanto na A. M. São Paulo Apóstolo;
cinco comunidades do antigo Núcleo V de Cacau Pirêra (km 26–28 e Igarapé do Cardoso) estão no
território da área nova mas fora da lista dela; "Santa Bárbara – Balbina" ainda consta na paróquia
de Presidente Figueiredo embora Balbina seja paróquia própria.

## Horários

- 46 das 97 fichas publicam grade. Vieram todas da página oficial (`alta`), com estas exceções:
- **`baixa` — recorrência mensal** (4): 1ª sexta-feira em São Raimundo Nonato (17h) e N. Sra.
  Auxiliadora (19h); adoração da 1ª sexta e da última quarta em N. Sra. das Mercês.
- **`baixa` — dia não informado, domingo presumido** (22): São Vicente de Paulo ("Missa às 9h" em
  cada uma das 7 igrejas), A. M. N. Sra. do Rosário ("7h e 18h30") e A. M. Família de Nazaré, que
  ainda diz "**Missa ou celebração da palavra**, às 9h".
- **`baixa` — a fonte diz "Celebração", não "Missa"** (12): comunidades das paróquias Cristo Rei e
  São José Operário – Leste e São Geraldo (A. M. Santa Rosa de Lima). Na matriz de São José
  Operário – Leste o rótulo também é "Celebração" (seg–sáb 18h30, dom 7h e 18h) → `media`.
- **`media`** também para a sexta-feira de N. Sra. dos Remédios ("Adoração, terço e missa – a
  partir das 10h": gravei a adoração às 10h, a hora da missa não é dada).
- **Santuário N. Sra. Aparecida**: a página publica a grade logo abaixo da Capela N. Sra. do
  Perpétuo Socorro, o que deixava dúvida sobre o local. O perfil do santuário no Instagram
  (`@aparecidamanaus`, visto em resultado de busca) repete seg/qua/qui/sex 18h e dom 6h30/9h/18h —
  atribuí ao santuário. O mesmo perfil cita sábado 16h (crianças) e 18h, **que não gravei** por não
  estar em documento aberto.
- **Não entraram** (não são missa nem cabem nos quatro tipos): "Novena: todo dia 13, 12h"
  (Santuário de Fátima), "Novena de São José todo dia 19 – 6h, 9h, 12h, 16h e 19h" (Santuário São
  José Operário), celebração da Palavra de segunda no Santuário de Fátima, novenas de terça de
  Mercês e Santíssima Trindade, expediente de secretaria.
- 51 fichas não publicam horário nenhum — inclusive todo o interior, exceto a sede de Novo Airão.
  Nenhum agregador foi usado.

## Párocos (43) — conferir os mais antigos

`priestName` só onde uma fonte oficial diz "pároco"/"reitor" de forma expressa. A data é a da
notícia de posse ou da última modificação da ficha no cadastro do clero:

| Fonte anterior a 2025 (validar primeiro) | Pároco | Data |
|---|---|---|
| Sagrado Coração de Jesus | Pe. Edson Armindo Ausier de Oliveira | clero 19/10/2023 |
| Santuário N. Sra. Aparecida | Pe. José Amarildo Luciano da Silva, CSsR | posse 15/01/2024 (presidiu missa no santuário em ago/2026) |
| A. M. Divina Misericórdia | Pe. Manoel Rubson Balieiro de Vilhena | posse 28/01/2024 |
| A. M. Santa Rosa de Lima | Pe. Izaías Andrade | posse 19/02/2024 (citado em ago/2025) |
| São Sebastião | Frei Eduardo Luiz de Queiroz de Abreu e Silva, OFMCap | posse 24/02/2024 |
| Santuário N. Sra. de Fátima | Pe. Helton Luiz Wachholz de Souza, SAC | clero 06/03/2024 |
| Santuário São José Operário | Pe. Francisco Alves de Lima, SDB | posse 10/03/2024 (citado em ago/2026) |
| N. Sra. das Dores | Pe. José Domingos Damasceno Barão, SME | clero 23/03/2024 |
| São Francisco das Chagas | Frei Paulo Xavier Ribeiro, OFMCap | clero 23/03/2024 |
| A. M. Santa Catarina de Sena | Pe. Francisco Silva de Oliveira | clero 06/05/2024 |
| A. M. João Paulo II | Pe. Matheus Marques | clero 28/05/2024 |
| Divino Espírito Santo | Pe. Ângelo Ferreira da Silva | clero 14/08/2024 |
| A. M. São João XXIII | Pe. Edimundo Almeida dos Santos | clero 15/08/2024 (citado em ago/2025) |
| Cristo Libertador | Pe. Claudi Gonçalves da Silva | posse 02/09/2024 |
| N. Sra. da Glória | Pe. José Rodrigues Filho, SAC | clero 11/09/2024 |

Dos outros 28, 10 têm fonte entre setembro de 2024 e julho de 2025 e 18 são de outubro de 2025 em diante (3 deles vêm da própria ficha da paróquia). Casos em que o
cadastro do clero contradiz uma notícia mais nova foram resolvidos pela data: Catedral (Pe. Nelson
Pereira, posse em 09/03/2026 — a ficha do Pe. Flávio Gomes ainda diz "Catedral", mas ele assumiu N.
Sra. dos Remédios em 08/03/2026), São José Operário – Leste (Pe. Gilson Falcão, 02/02/2026) e A. M.
Santa Rita de Cássia (Frei Francisco Freitas, ficha de 22/07/2025, depois de Frei Darez Narbone,
empossado em 10/03/2024). Fichas do clero que citam a paróquia **sem dizer a função** não viraram
`priestName` (Cristo Redentor, Santo Antônio, São Lázaro, N. Sra. Consoladora dos Aflitos, A. M.
Menino Jesus, A. M. N. Sra. das Vitórias, A. M. Família de Nazaré, São Bento).

## Precisa de validação humana

1. **8 "Sedes da Área Missionária"** sem igreja principal identificada (lista acima).
2. **Município da A. M. Santo Antônio (Samaúma)**: a página só diz "Km 78 – BR 319"; gravei
   **Manaquiri** porque a notícia de 14/03/2025 fala em "município do Manaquiri, onde há a Paróquia
   São Pedro e Área Missionária Santo Antônio da Samaúma". O km 78 da BR-319 fica no limite com
   Careiro — confirmar.
3. **A. M. Araçá**: a página dá "BR-319, 54 – Careiro/AM" e a Receita registra Careiro; gravei
   `city: "Careiro"`. Falta confirmar se "54" é número ou quilômetro.
4. **CEP da A. M. Maria Mãe da Esperança**: a página traz "89415 000" (erro de digitação); gravei
   **69415-000**, o CEP de Iranduba usado pela paróquia São João Batista. Na mesma lista, "Menino
   Jesus – Acajatuba" parece ser o "Menino Jesus – Açutuba" da lista antiga; mantive o texto da fonte.
5. **E-mails**: N. Sra. Consoladora dos Aflitos traz `consolata_betania@arthur-amorimhotmail.com`
   (malformado → `null`); São Geraldo traz só `secretaria@` (truncado → `null`).
6. **CEPs vindos da Receita** (a página não publica): A. M. N. Sra. da Amazônia, Ternura de Deus,
   São Francisco das Chagas, São Pedro Apóstolo e Santíssimo Redentor, e as paróquias de Presidente
   Figueiredo, Balbina e Rio Preto da Eva (estas três com o CEP geral do município). Só usei o CEP
   quando o logradouro da Receita coincide com o da página; em outras 8 unidades o endereço fiscal é
   diferente do pastoral e o CEP ficou `null`.
7. **Divergências de endereço** (gravei o da página): Divino Espírito Santo — a ficha diz nº 268 e a
   linha da matriz diz "n.68" (Receita: 268); N. Sra. Mãe da Misericórdia — "Compensa 1" na página,
   "Compensa II" na Receita (gravei "Compensa"); N. Sra. do Perpétuo Socorro (Educandos) — a
   paróquia fica na Rua Inocêncio de Araújo, 44, mas a igreja com a grade de matriz (dom 7h, 10h e
   19h) está listada na Rua Paes Barreto, 84 — marquei esta como matriz.
8. **Grafias mantidas como na fonte**: "Santa Luiza (Igarapé Açu)" na A. M. Santo Antônio
   (provável Santa Luzia), "Nossa Imaculada Conceição" (A. M. Santos Mártires), "Cristo Rey" (São
   Geraldo), "Francisclariana" (A. M. Santa Mônica). Em São Pedro Apóstolo (Petrópolis) a diaconia
   São Sebastião traz o número ilegível ("no7 1") — gravei só a rua.
9. **Comunidades definidas por ruas, não por templo**: Santa Teresinha (Alvorada II) e N. Sra.
   Consoladora dos Aflitos listam 15 + 5 comunidades como conjuntos de ruas ("Ruas 12, 13 e 14");
   entraram com esse texto no endereço. Nove "núcleos/CEBs" (Menino Jesus de Praga, São Jorge, A. M.
   Menino Jesus) levam a nota de que podem não ter igreja própria. "Entorno da Catedral
   Metropolitana" (mesma praça da Catedral) não virou comunidade.
10. **Nova área missionária no Residencial Viver Melhor**, anunciada em 16/08/2025 e entregue ao
    PIME (padres da Paróquia São Bento): ainda não está na lista oficial nem tem nome publicado.
    Quando entrar, três comunidades hoje listadas na A. M. São João XXIII e na A. M. São Daniel
    Comboni devem migrar.
11. **Paróquias militares**: a arquidiocese cita "2 paróquias militares e 1 capela" no território;
    são do Ordinariado Militar e não foram pesquisadas.
12. **Sem horário em produção**: 51 unidades, entre elas todas as do interior (Careiro, Careiro da
    Várzea, Iranduba, Manaquiri, Presidente Figueiredo, Rio Preto da Eva) — comunidades ribeirinhas
    e de estrada atendidas por desobriga, sem grade fixa publicada.
