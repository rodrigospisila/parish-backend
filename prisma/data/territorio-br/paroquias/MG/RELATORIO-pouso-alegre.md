# Relatório de pesquisa — Arquidiocese de Pouso Alegre (MG)

- **Arquivo**: `paroquias/MG/pouso-alegre.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (Sul de Minas, onda MG)

## Resumo

| Item | Quantidade |
|---|---|
| Entradas de paróquia | **71** (70 paróquias + 1 santuário com reitoria própria) |
| Confiança `alta` | 71 |
| Confiança `media` / `baixa` | 0 / 0 |
| Comunidades | **122** (71 matrizes + 51 capelas/comunidades) |
| Horários fixos | **0** |
| Cobertura esperada (AP 2024) | 69 paróquias |
| Municípios cobertos | 48 |

## Fontes principais

1. **Página oficial de paróquias da Arquidiocese** —
   <https://arquidiocesepa.org.br/arquidiocese/paroquias/>
   Esta única página traz, em acordeão, **as 70 paróquias com todos os dados**: ano de
   criação, abrangência territorial, pároco, vigários, endereço com bairro e CEP, e telefones.
   Foi a fonte primária (última modificação registrada na REST: **2026-08-04**, a mais recente
   entre as páginas do site).
2. **Páginas individuais de cada paróquia** —
   `https://arquidiocesepa.org.br/arquidiocese/paroquias/<slug>/` (82 páginas, obtidas pela
   REST `wp-json/wp/v2/pages?per_page=100`). Usadas como segunda fonte e como origem das
   **listas de comunidades** de 4 paróquias de Pouso Alegre.
3. **Site próprio da Paróquia Nossa Senhora do Carmo (Cambuí)** —
   <http://www.16dejulho.com.br/comunidades.php> (14 comunidades).
4. **catholic-hierarchy.org** — <https://www.catholic-hierarchy.org/diocese/dpous.html>
   (Anuário Pontifício 2024, dados de 2023: 69 paróquias, 619.700 católicos, 140 presbíteros).
   HTTP 429 no leitor automático; `curl` com User-Agent de Chrome passou.

Também foram consultados os 3 **setores pastorais** publicados
(`/setor-pastoral-mandu/`, `/mantiqueira/`, `/altodaserra/`), mas eles só listam nomes de
paróquias sem cidade nem contato — não acrescentaram nada e cobrem apenas 31 das 70 paróquias.

## Cobertura

71 entradas para 69 paróquias esperadas. A diferença:

- a lista oficial traz **70** paróquias (uma a mais que o Anuário de 2023 — a Paróquia São
  Sebastião, em Pouso Alegre, foi criada em **2023**);
- foi acrescentado o **Santuário Nossa Senhora da Agonia (Itajubá)**, que tem reitoria própria
  (Padre Rodrigo Carneiro Paiva Mendes), não corresponde a nenhuma paróquia da lista e é
  publicado pela arquidiocese dentro de `/arquidiocese/paroquias/`.

Nenhuma paróquia da lista oficial ficou de fora. Distribuição: Pouso Alegre 11, Itajubá 7,
Ouro Fino 3, e 2 cada em Andradas, Camanducaia, Cambuí, Extrema e Santa Rita do Sapucaí.

### Santuários e basílica fundidos com a paróquia

O site publica páginas separadas para 11 santuários/basílica. Oito deles **são a própria igreja
matriz** de uma paróquia já listada; nesses casos a página não virou um registro novo — o nome
do santuário passou a ser o nome da **comunidade-matriz** da paróquia:

| Santuário / Basílica | Paróquia |
|---|---|
| Basílica Nossa Senhora do Carmo | Paróquia Nossa Senhora do Carmo (Borda da Mata) |
| Santuário Imaculado Coração de Maria | Paróquia Imaculado Coração de Maria (Pouso Alegre) |
| Santuário Nossa Senhora da Medalha Milagrosa | Paróquia homônima (Monte Sião) |
| Santuário Santa Rita de Cássia | Paróquia homônima (Extrema) |
| Santuário Santa Rita de Cássia | Paróquia homônima (Santa Rita de Caldas) |
| Santuário Santa Rita de Cássia | Paróquia homônima (Santa Rita do Sapucaí) |
| Santuário Senhor Bom Jesus | Paróquia Bom Jesus (Córrego do Bom Jesus) |
| Santuário São Francisco de Paula e N. S. de Fátima | Paróquia homônima (Ouro Fino) |

Dois santuários ficam **dentro** de uma paróquia sem ser a matriz e viraram comunidade:
Santuário Nossa Senhora Aparecida (Paróquia São Caetano, Brazópolis) e Santuário Nossa Senhora
da Piedade (Paróquia Sagrada Família, Itajubá).

O Santuário Nossa Senhora da Agonia (Itajubá) tinha **duas páginas duplicadas** (ids 2344 e
2755); a duplicata foi descartada.

## Horários de missa — **nenhum**

**A Arquidiocese de Pouso Alegre não publica horário de missa em lugar nenhum do site.** Nem a
lista de paróquias, nem as 82 páginas individuais, nem as páginas de setor pastoral trazem
horários (busca por "Horário"/"Missa … Nh" nas 82 páginas: 0 ocorrências).

Tentativas de complemento:

- **Sites próprios das paróquias** (6 registrados): `paroquiadeandradas.com.br` (fora do ar),
  `santuariodamedalha.org.br` (HTTP 403), `santuariodepousoalegre.com.br` (fora do ar),
  `nsagonia.com.br` (redirect quebrado), `webradio13demaio.com` (rádio, sem horários),
  `16dejulho.com.br` (**no ar**, mas a página "Horários de Missas" diz *"EM BREVE"*).
- **Agregadores** (`missahora.com.br`, `horariodemissa.com.br`): só mostram as missas *do dia
  corrente*, não a grade semanal, e são fonte única não oficial — pela escala do README isso
  seria `confidence: "baixa"` e não entraria na carga. **Não foram usados.**

Fica registrado como o maior buraco desta circunscrição: **0 horários para 71 registros**.

## Comunidades

Apenas 7 paróquias publicam a lista de comunidades:

| Paróquia | Comunidades |
|---|---|
| Paróquia São Cristóvão (Pouso Alegre) | 15 |
| Paróquia Nossa Senhora do Carmo (Cambuí) | 14 (site próprio) |
| Paróquia São José Operário (Pouso Alegre) | 7 |
| Paróquia Santo Antônio (Pouso Alegre) | 7 |
| Paróquia Imaculado Coração de Maria (Pouso Alegre) | 6 |
| Paróquia São Caetano (Brazópolis) | 1 (santuário) |
| Paróquia Sagrada Família (Itajubá) | 1 (santuário) |

As outras 64 ficaram só com a matriz.

## Precisa de validação humana

1. **11 divergências de pároco entre a lista oficial e a página individual da paróquia.**
   Foi adotado o **nome da lista oficial**, porque a página-lista tem modificação mais recente
   (2026-08-04) e as trocas formam uma cadeia coerente de transferências. Conferir:

   | Paróquia | Lista oficial (adotado) | Página individual |
   |---|---|---|
   | N. Sra. do Carmo — Borda da Mata | Padre Adilson da Rocha | Pe. Francisco José da Silva |
   | Sagrada Família — Itajubá | Padre Omar Aparecido Silveira | Pe. Carlos Cézar Raimundo |
   | N. Sra. das Graças — Itajubá | Padre Rodrigo Carneiro Paiva Mendes | Pe. Luciano Aparecido Pereira |
   | São Francisco de Assis — Camanducaia | Padre Antônio Aparecido Muniz | Padre Felipe Mateus da Silva |
   | Santo Antônio — Ouro Fino | Padre João Bosco de Freitas | Pe. Omar Aparecido Silveira |
   | São José — Paraisópolis | Padre Leandro de Carvalho Raimundo | Pe. João Bosco de Freitas |
   | São João Batista — Pouso Alegre | Padre Edson Aparecido da Silva | Padre Tiago da Silva Vilela |
   | São José — Pouso Alegre | Padre Samuel Henrique P. Lima Soares | Pe. Antonio Aparecido Muniz |
   | São José — Toledo | Padre Flávio Sobreiro da Costa | Padre Valdecir Mayer Molinari |
   | São Benedito — Itajubá | Padre Douglas A. Marques R. Santos | Padre Douglas Aparecido Marques Rocha dos Santos (só abreviação) |
   | São Geraldo Magela — Pouso Alegre | Padre Samuel Faria Gambaro | Padre Samuel de Faria Gâmbaro (só acento) |

2. **Catedral**. O site chama a matriz de "Paróquia Bom Jesus (Catedral)". Gravada como
   **`Catedral Bom Jesus`** (slug `bom-jesus-pouso-alegre`), seguindo a convenção usada em
   PR/SP. Se o nome canônico for "Catedral Metropolitana do Bom Jesus", ajustar.

3. **E-mails**. Todos os endereços do site estão ofuscados pelo Cloudflare Email Protection
   (`[email protected]`). **Nenhum e-mail foi gravado** — todos `null`.

4. **Paróquia São Sebastião (Pouso Alegre)** — a fonte só publica e-mail (ofuscado); ficou
   **sem telefone**. É a paróquia mais nova (2023).

5. **Duas páginas individuais estavam quebradas**, mas os dados vieram da lista oficial:
   - `paroquia-sao-francisco-e-santa-clara-pouso-alegre-2` — a página mostra a **biografia de
     um padre** no lugar dos dados da paróquia;
   - `paroquia-sao-jose-operario-pouso-alegre-2` — a página não tem nenhum campo preenchido.

6. **Rótulo com erro de digitação na fonte**: a Paróquia Nossa Senhora Aparecida (Tocos do
   Mogi) usa `Emdereço:` em vez de `Endereço:`; e a cidade aparece como "Tocos do Moji" no
   corpo (grafia oficial: **Tocos do Moji**). Foi gravado `Tocos do Mogi` (grafia do título da
   página). **Conferir a grafia correta.**

7. **`Paróquia Bom Jesus Bueno Brandão`** — o título da lista não separa a cidade com traço.
   Gravado como `Paróquia Bom Jesus` / cidade `Bueno Brandão`.

8. **Santuário Nossa Senhora da Agonia (Itajubá)** — sem ano de criação e com CEP `37550-970`,
   que é o CEP de Pouso Alegre, não de Itajubá. **Provável erro da fonte.**

9. **Duas comunidades homônimas** na Paróquia São Cristóvão (Pouso Alegre): "Comunidade Nossa
   Senhora Aparecida" aparece duas vezes (bairros Algodão e Limeira). Mantidas as duas — são
   comunidades distintas — mas o importador pode colidir por nome.

## O que ficou sem

- **Horários de missa: 100% da circunscrição** (a arquidiocese não publica).
- Comunidades de 64 das 71 paróquias.
- E-mails de todas as paróquias (ofuscados).
- Confissões, adoração e terço.
