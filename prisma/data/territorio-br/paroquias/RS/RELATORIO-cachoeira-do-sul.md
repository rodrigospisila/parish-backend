# RELATÓRIO — Diocese de Cachoeira do Sul (RS)

- **Arquivo**: `paroquias/RS/cachoeira-do-sul.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 14 (todas paróquias) |
| Paróquias com confiança **alta** | 14 |
| Paróquias com confiança **media** | 0 |
| Paróquias com confiança **baixa** | 0 |
| Comunidades/capelas | 88 (de 5 paróquias) |
| Horários fixos | 7 (todos `baixa`, uma só paróquia) |
| Cobertura | 14 / 15 |

> **A diocese mais rica em comunidades e a mais pobre em horários.** O site oficial saiu do ar
> entre março e setembro de 2026; todo o conteúdo veio do Arquivo da Internet, com cópias
> recentes (2025–2026).

## O site oficial: qual é e onde ele está

O `dioceses.json` registra `https://congelado.k8.com.br` como site da diocese. **Não é.** É o
que se acha ao seguir o redirecionamento: o domínio oficial `www.diocesenet.com.br` responde
**301 → `congelado.k8.com.br`**, e esse endereço devolve a página *"este site está
temporariamente fora do ar"* da hospedagem **Hostnet** (o próprio subdomínio, "congelado",
denuncia conta suspensa). Não há site substituto:

- A CNBB Regional Sul 3 aponta `www.diocesecachoeiradosul.com` — **não resolve em DNS**.
- O gcatholic.org e a Wikipédia apontam `www.diocesenet.com.br` — o domínio certo, fora do ar.

**O site oficial é, portanto, `https://www.diocesenet.com.br`** (foi o que gravei em
`diocese.website`), e ele estava **no ar até pelo menos 17/03/2026**, data da cópia mais recente
da home no Arquivo da Internet.

Todo o conteúdo deste arquivo foi recuperado do **Arquivo da Internet**, sempre pela cópia mais
nova de cada página. As cópias usadas vão de **27/04/2025** a **12/06/2026** — recentes o
bastante para manter a confiança `alta`. Cada paróquia tem **duas** `sources`: a URL canônica
(para reconferir se o site voltar) e a URL da cópia arquivada efetivamente lida.

## Cobertura

A categoria "Paróquias" do site lista **15 posts**, dos quais **14 são paróquias** — o 15º é o
**"Parque da Romaria"**, que não é paróquia e ficou de fora.

Os números externos divergem entre si:

| Fonte | Paróquias | Data |
|---|---|---|
| gcatholic.org | 13 | 31/12/2022 |
| catholic-hierarchy.org / Wikipédia | 15 | atual |
| Site oficial (posts de paróquia) | **14** | 2025–2026 |

As 14 encontradas ficam **dentro da faixa**, mas **pode existir 1 paróquia sem página no site**.
Vale notar que uma das 14 é nova na diocese: a **Paróquia São João Batista, de Lagoão**, veio
da **Diocese de Cruz Alta** em 2025 (post publicado em 18/03/2025; a página de Lagoão no site de
Cruz Alta responde 404). Ou seja, se o "15" do catholic-hierarchy é anterior à transferência, a
conta pode fechar de outro jeito — **o número da diocese precisa de confirmação humana**.

Municípios cobertos pelas 14: Cachoeira do Sul (4 paróquias), Caçapava do Sul, Santana da Boa
Vista, Agudo, Cerro Branco, Novo Cabrais, Sobradinho, Segredo, Arroio do Tigre, Ibarama e
Lagoão — **11 municípios**, contra os **14** que a Wikipédia atribui à diocese. As fichas de
comunidades mostram atendimento também em **Candelária** e **Paraíso do Sul** (comunidades da
Paróquia Santo Antônio de Cerro Branco), o que sugere que faltam paróquias/atendimentos no
levantamento.

## Fontes principais

1. https://www.diocesenet.com.br/home/category/paroquias/ (cópia de **16/03/2026**) e
   `.../page/2/` (cópia de **17/12/2025**) — **índice das paróquias**
2. As 14 fichas `https://www.diocesenet.com.br/home/<slug>/` — endereço, telefone, e-mail,
   pároco, vigário, diáconos, data de fundação, histórico e **lista de comunidades eclesiais**
3. https://www.diocesenet.com.br/home/curia-diocesana/ (cópia de 19/03/2025) — bispo,
   coordenador de pastoral, ecônomo/chanceler, conselhos
4. https://www.diocesenet.com.br/home/sacerdotes/ (cópia de 05/08/2025) — 21 presbíteros
   diocesanos + 4 religiosos
5. https://cnbbsul3.org.br/diocese-de-cachoeira-do-sul/ — endereço, telefone e **e-mail**
   (`mitracachoeira@outlook.com.br`) da Cúria; bispo Dom Edson Batista de Mello
6. https://www.catholic-hierarchy.org/diocese/dcads.html, https://gcatholic.org/dioceses/diocese/cach0.htm,
   https://pt.wikipedia.org/wiki/Diocese_de_Cachoeira_do_Sul
7. https://divisaodaigreja.com/paroquias/diocese-de-cachoeira-do-sul/ — agregador que corrobora
   endereços/telefones de 10 paróquias
8. https://www.horariodemissa.com.br/ — únicos horários encontrados (uma paróquia)

## Comunidades

**88 comunidades** de 5 paróquias, todas de lista oficial publicada na ficha da paróquia:

| Paróquia | Comunidades |
|---|---|
| Sagrada Família — Arroio do Tigre | 30 |
| Santo Antônio — Cerro Branco | 18 |
| São Bonifácio — Agudo | 15 (7 comunidades + 7 centros comunitários + matriz) |
| São José — Cachoeira do Sul | 13 |
| Nossa Senhora da Penha — Cachoeira do Sul | 12 |

As outras **9 fichas não trazem lista de comunidades** e ficaram com `communities: []`.

## Pontos para o enxame de validação

1. **Existe uma 15ª paróquia?** Ver a seção "Cobertura". É a dúvida principal deste arquivo.
2. **Horários (7 registros `baixa`)** — só a **Paróquia Santo Antônio (Cachoeira do Sul)** tem
   horários publicados, e a fonte é
   https://www.horariodemissa.com.br/igreja.php?k=4fE2y, com **última atualização 17/08/2014**:
   domingo 09:00 e 18:00; terça 18:00; quarta 17:00; quinta 18:00; sexta 18:00; sábado 18:00.
   **As fichas da Catedral e da Paróquia São José no horariodemissa.com.br não têm horário
   nenhum** (última atualização 29/05/2013). As outras 13 paróquias ficaram com
   `schedules: []`.
3. **Ano de fundação divergente entre o cabeçalho e o corpo da própria ficha**:
   - **São Bonifácio (Agudo)**: cabeçalho "Fundada em **09.08.1898**"; o texto diz que a lei
     provincial é de 1885 e a **ereção canônica foi em 09/08/1889**. Gravei **1898**.
   - **São Paulo Apóstolo (Ibarama)**: cabeçalho "Fundada em **20.11.26**"; o texto diz decreto
     de criação em **20/11/1925** e posse do 1º pároco em **12/12/1926**. Gravei **1926**.
   - **Sagrada Família (Arroio do Tigre)**: cabeçalho "20.11.1917"; o texto diz criação em
     **17/02/1917**. Ano igual, dia divergente. Gravei **1917**.
   - **Catedral**: cabeçalho "27.07.1779"; o texto diz ereção em **10/07/1779**. Gravei **1779**.
4. **Nome do pároco divergente entre duas páginas oficiais**: a ficha da Paróquia Sant'Ana
   (Santana da Boa Vista) diz **"Pe. Grégori Lopes Siqueira"**; a página "Sacerdotes" diz
   **"Pe. Grégori Lopes Silveira"**. Gravei o da ficha da paróquia.
5. **E-mails ofuscados pelo WordPress** (aparecem como `[email protected]` na página e não são
   recuperáveis): São Bonifácio (Agudo), Santo Antônio (Cerro Branco) e São Marcos (Segredo)
   ficaram com `email: null`.
6. **E-mail que parece pessoal, não institucional**: a Paróquia Sant'Ana publica
   `clari_mari.viana@hotmail.com`, que é o e-mail da secretária (Clari Mari Viana). Gravado
   como está, mas confirmar.
7. **CEP divergente da Paróquia São José (Cachoeira do Sul)**: o site oficial dá **96503-759**;
   o horariodemissa.com.br dá **96503-491**. Gravei o oficial.
8. **Telefone da Paróquia São José**: o site oficial **não publica telefone**. O
   **(51) 3722-2769** gravado veio do horariodemissa.com.br (ficha de 2013).
9. **Número divergente do endereço da Paróquia São Paulo Apóstolo (Ibarama)**: o cabeçalho da
   ficha diz "Rua Virgílio da Cás, **95**" e, mais abaixo, a mesma página diz "Rua Vergílio da
   Cás nº **55**". Gravei 95.
10. **Paróquia São João Batista (Lagoão)** — a ficha é a mais pobre: **sem data de fundação e
    sem CEP**. O endereço oficial é "Rua Thomas Costa, 470"; fontes não oficiais (dados de
    CNPJ) dão **"Avenida Thomaz Costa, 740 — Centro, 99340-000"**. Gravei o oficial e deixei o
    CEP `null`.
11. **CEP 96700-970 da Catedral** é CEP de agência/caixa postal, não de logradouro — o mesmo
    valor aparece no horariodemissa.com.br. Provável erro de origem.
12. **Endereço da Paróquia São Cláudio (Novo Cabrais)** não tem número: "Estrada de Cortado —
    Casa Paroquial, Cortado". É o que a ficha publica.
13. **Comunidades que são escolas**: a Paróquia Santo Antônio (Cerro Branco) lista
    "Escola Otto Sabin", "Escola Augusto Schultz", "Escola Coelho Neto" e "Escola Dom Pedro I"
    entre as 18 comunidades — são pontos de celebração, não capelas. Estão gravadas porque a
    própria diocese as lista.
14. **Duas paróquias chamadas "Paróquia Santo Antônio"**, uma em Cachoeira do Sul e outra em
    Cerro Branco (slugs distintos porque incluem a cidade).
15. **`dioceses.json` precisa de correção**: `website` está `https://congelado.k8.com.br`
    (placeholder de site suspenso) e `email` está `null`. O correto é
    `https://www.diocesenet.com.br` e `mitracachoeira@outlook.com.br`. **Não alterei o
    `dioceses.json`** — está fora do escopo desta tarefa.
