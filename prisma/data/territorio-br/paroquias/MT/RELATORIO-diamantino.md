# Relatório — Diocese de Diamantino (MT)

Pesquisa: 2026-09-11 · Arquivo: `diamantino.json`

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **21** (21 `alta`) |
| Comunidades/capelas | **14** |
| Horários fixos | **36** (13 `alta`, 6 `media`, 17 `baixa`) |
| Cobertura | 21 encontradas / 21 esperadas (fonte oficial de 10/02/2026) |

## Fontes principais

1. **`https://diocesedtno.com.br/paroquias/`** (página modificada em **10/02/2026**) — o ponto alto
   desta diocese. As 21 paróquias são publicadas como **21 cartões em imagem PNG**
   (`/wp-content/uploads/2026/02/1-1..21-scaled.png`, 2560×848), cada um com **nome, endereço,
   bairro, CEP, telefone, e-mail, cidade, pároco e vigários**. O HTML não traz nada disso — só as
   `<img>`. Baixei as 21, recortei o painel de texto (que alterna entre a esquerda e a direita,
   detectado pelo brilho médio de cada metade) e li os cartões. É o mesmo truque que resolveu
   Araçatuba, agora aplicado à **lista de paróquias inteira**, não só a horário.
2. **`http://www.paroquiadelucas.com.br`** — Paróquia N. Sra. do Rosário de Fátima (Lucas do Rio
   Verde). O site é um CMS antigo (ceicom) em que os horários são carregados por AJAX. Achei os
   endpoints lendo `js/pages/horarios.min.js` → `js/template/comunidade.min.js`:
   - `/modulos/handlers/comunidade.ashx` → JSON com as **12 comunidades**
   - `/modulos/handlers/horarios.ashx?nome=<comunidade>` → JSON com a grade de cada uma
   **Vale guardar este padrão**: o CMS ceicom é usado por outras paróquias brasileiras.
3. **`https://nossasenhoraaparecidatga.com.br`** — site da Paróquia N. Sra. Aparecida de Tangará da
   Serra (home modificada em 28/08/2024) com a grade da matriz.
4. `horariodemissa.com.br` para a Paróquia Santa Terezinha de Tangará da Serra.
5. gcatholic.org (`diam1.htm`) e catholic-hierarchy.org (`ddiao.html`).

## Foranias (não vão para o JSON, mas orientam a validação)

Pela ordem dos cartões na página oficial:

| Forania | Paróquias |
|---|---|
| Diamantino | Imaculada Conceição (Diamantino), São José (São José do Rio Claro), N. Sra. Aparecida (Nova Maringá) |
| Arenápolis | São Sebastião (Arenápolis), São José (Alto Paraguai), Sagrado Coração de Jesus (Denise), Sant'Ana (Nortelândia), N. Sra. Mãe dos Homens (Santo Afonso), N. Sra. de Fátima (Nova Marilândia) |
| Tangará da Serra | N. Sra. Aparecida e Santa Terezinha (Tangará da Serra), São Cristóvão (Campo Novo do Parecis), N. Sra. de Fátima (Sapezal) |
| Nova Mutum | Sagrada Família e Santa Teresinha (Nova Mutum), Santa Rita de Cássia (Santa Rita do Trivelato) |
| Lucas do Rio Verde | N. Sra. do Rosário de Fátima e N. Sra. da Rosa Mística (Lucas do Rio Verde), N. Sra. Aparecida (Tapurah), Santíssima Trindade (Itanhangá), N. Sra. Aparecida (Ipiranga do Norte) |

## Cobertura e divergências

- **21 paróquias na fonte oficial de fev/2026**, contra **19** no gcatholic e **18** na Wikipédia
  (ambos com dados de 2022). Adotei 21.
- **A diocese não publica horário de missa em lugar nenhum.** Esta é a maior lacuna: **18 das 21
  paróquias entram sem nenhum horário**. As três com grade são Lucas do Rio Verde (N. Sra. do
  Rosário de Fátima, 21 horários), Tangará da Serra/N. Sra. Aparecida (5) e Tangará da Serra/Santa
  Terezinha (10, todos `baixa`).
- **Comunidades**: só Lucas do Rio Verde publica a lista (12). As outras 20 paróquias entram com
  `communities: []` e o importador cria só a matriz.

## Precisa de validação humana

1. **Nome do registro `imaculada-conceicao-diamantino`.** O cartão oficial diz "Paróquia Imaculada
   Conceição"; gcatholic identifica a igreja como **Catedral Imaculada Conceição**. Adotei o prefixo
   "Catedral". Conferir.
2. **CEP da Paróquia N. Sra. da Rosa Mística (Lucas do Rio Verde)** — o cartão traz `784462-081`,
   que tem 7 dígitos e é inválido. Gravei `zipCode: null`. Lucas do Rio Verde usa a faixa 78455-xxx.
3. **Endereço da Paróquia N. Sra. do Rosário de Fátima (Lucas do Rio Verde)** — o cartão da diocese
   diz "Avenida Paraná, 1045-E, Pioneiro, 78460-065"; o rodapé do site da própria paróquia diz
   "Rua Guarapuava, 189 E, Bairro Pioneiro, CEP 78455-000". Gravei o da diocese. Divergência aberta.
4. **"TRIVELATO/MT" no cartão 16** é o município de **Santa Rita do Trivelato** (CEP 78445-000).
   Gravei o nome completo do município; conferir.
5. **CEP 78420-000 repetido** em Arenápolis (São Sebastião) e Santo Afonso (N. Sra. Mãe dos Homens).
   78420-000 é Arenápolis; Santo Afonso tem CEP próprio. Provável erro do cartão.
6. **Pároco de Tangará da Serra/Santa Terezinha**: o cartão de 2026 diz "Padre Arlindo Adriano"; o
   agregador (2018) dizia "Pe. Ronaldo Vicente" — e "Padre Ronaldo de Oliveira Vicente" é hoje o
   pároco de Denise. Usei o cartão.
7. **Endereço de Tangará da Serra/Santa Terezinha**: cartão = "Rua Seis, 1546 S, Vila Alta";
   agregador = "Rua 13, Jardim Rio Preto". Usei o cartão.
8. **`paroquiasantaterezinhatga.com.br` está com erro crítico do WordPress** (HTTP 500 e página de
   erro). Gravei o domínio como `website` mesmo assim; se continuar fora do ar, apagar.
9. **Os 10 horários de Tangará da Serra/Santa Terezinha são de 11/08/2018** — anteriores à pandemia,
   portanto `baixa` pela regra do README e **não carregam**. Se a paróquia voltar a publicar, é a
   primeira a refazer.
10. **17 horários `baixa` por recorrência mensal** em Lucas do Rio Verde ("2ª e 4ª sexta-feira",
    "4ª sexta-feira do mês", "3º domingo"). Regra literal em `notes`.
11. **Atenção a uma armadilha**: uma leitura automática do site de Lucas do Rio Verde devolveu uma
    grade inventada (comunidade "Sagrado Coração de Jesus – Tarumã", adoração às 22h) que **não
    existe no HTML nem na API**. Todos os horários gravados vieram do JSON dos handlers.
12. **Endereço da cúria**: `dioceses.json` registra "Rua das Camelias 75, Bairro Jardim Eldorado";
    o site hoje publica "Av. Irmão Miguel Abib, 614, Jardim Eldorado". Gravei o do site no bloco
    `diocese` deste arquivo — **`dioceses.json` não foi alterado** (fora do escopo desta tarefa).
