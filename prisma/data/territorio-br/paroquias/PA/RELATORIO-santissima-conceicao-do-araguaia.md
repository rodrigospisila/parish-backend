# Relatório — Diocese da Santíssima Conceição do Araguaia (PA)

Pesquisa: 18/09/2026. Arquivo: `santissima-conceicao-do-araguaia.json`.

## Resultado

| | |
|---|---|
| Entradas | **13** — 12 paróquias (uma delas Catedral) + 1 quase-paróquia |
| Confiança das entradas | 13 `alta` |
| Comunidades | **21** (13 `alta`, 2 `media`, 6 `baixa`) |
| Horários fixos | 32, **todos `baixa`** — a diocese não publica horário de missa |
| Cobertura | 13/13 |

## Fonte principal: o site oficial + a REST do WordPress

`https://diocesedeconceicao.org.br/paroquias/` — site ativo (notícias de agosto de 2026). O tema usa um
**tipo de conteúdo próprio do WordPress**, `_paroquias`, exposto em
`https://diocesedeconceicao.org.br/wp-json/wp/v2/_paroquias?per_page=100`, que devolve **`X-WP-Total: 13`** —
a prova de que a lista está completa. As fichas individuais (`/_paroquias/<slug>/`) estão **vazias**: só têm o
título; todo o conteúdo está na página-índice `/paroquias/`, que traz por paróquia endereço, CEP, cidade,
**data de instalação**, pároco, vigário, colaboradores, congregações religiosas, telefone/WhatsApp e e-mail
institucional (`<nome>@diocesedeconceicao.org.br`).

Outras fontes: `/contato/` (Cúria: Rua Dom Sebastião Tomás 1315, Centro, `curia@diocesedeconceicao.org.br`),
`catholic-hierarchy.org`, `gcatholic.org`, o **Mapa das OSC/IPEA** (achou o CNPJ raiz) e a **Receita Federal**.

## A Receita fechou a lista — e desta vez sem surpresa

CNPJ raiz **05.254.255**. Varri as ordens 0001–0030: existem **18 estabelecimentos**, todos ATIVOS menos um:

- **0001** — a Cúria (DIOCESE DE CONCEICAO DO ARAGUAIA, início 01/09/1976), Praça Frei Gil Vilanova s/n;
- **13 filiais de paróquia**, que são exatamente as 13 fichas do site;
- **0011** Escola Paroquial Nossa Senhora das Graças (Redenção) e **0013** Escola Paroquial Curupira
  (Floresta do Araguaia), ativas;
- **0014** Casa da Alegria (Floresta do Araguaia), ativa;
- **0012** Escola Crescer (Conceição do Araguaia), **BAIXADA em 23/03/2015** — obra social, não paróquia.

**Não há filial-fóssil de paróquia.** Bannach e Cumaru do Norte, que saíram desta diocese para a
**Prelazia do Alto Xingu-Tucumã em 06/11/2019**, não deixaram filial no CNPJ: as paróquias desses municípios
estão em `alto-xingu-tucuma.json` e não foram contadas aqui, conforme combinado.

O catholic-hierarchy registra **13 paróquias em 2022** — e hoje continuam 13, embora o conjunto tenha mudado:
São Pedro Apóstolo (Casa de Tábua, 2022/2023) e Sagrada Família de Nazaré (Pau d'Arco, 2025) são novas, e as
duas do Alto Xingu saíram.

### A paróquia mais nova só existe no site e na Receita

**Paróquia Sagrada Família de Nazaré, Pau d'Arco** — Área Pastoral desde 04/02/2021, **elevada a paróquia em
08/09/2025**, com CNPJ próprio aberto em 05/11/2025 (filial 0018). Não aparece no gcatholic (atualizado em
01/01/2026) nem no catholic-hierarchy. Entrou `alta` porque o site oficial e a Receita concordam.

## Horários: a diocese não publica nenhum

Nem a página de paróquias, nem as fichas, nem qualquer outra página do site trazem horário de missa. Os
**32 horários do arquivo vêm todos do agregador Lírio Católico** (base de 02/09/2026, sem data de conferência
por igreja) e são **todos `baixa`**. Cobrem 6 igrejas em 4 municípios:

- **Conceição do Araguaia**: a Catedral (ficha genérica "Igreja Catolica de Conceição do Araguaia");
- **Redenção**: matriz Cristo Redentor, matriz Nossa Senhora das Graças e a Comunidade São João Batista;
- **Floresta do Araguaia**: matriz Nossa Senhora das Dores (só o domingo, 19h);
- **Xinguara**: matriz São José Carpinteiro.

**Nove das 13 paróquias entram sem nenhum horário**: São Pedro, Senhora Sant'Ana, Nossa Senhora de Guadalupe,
Cristo Libertador, Nossa Senhora Aparecida (Rio Maria), Sagrado Coração de Jesus, São João Batista (Sapucaia),
Sagrada Família de Nazaré e — em parte — as demais fora da matriz.

Dois horários são de **recorrência mensal** e ficaram `baixa` com a regra literal em `notes`: Cristo Redentor,
"1ª sexta-feira do mês, 16:00"; Nossa Senhora das Graças, "1ª sexta-feira do mês, 19:30" (este coincide com a
missa semanal de sexta, então só virou nota).

## Comunidades: a diocese não publica lista

As 21 comunidades são as **13 matrizes** (`alta`) mais **8 igrejas que o gcatholic lista por cidade**,
atribuídas **só quando o município tem uma única paróquia** — a regra de "não inventar vínculo":

- Conceição do Araguaia → Jesus, Mestre das Bem-aventuranças (Fazenda da Esperança) e São Joaquim
  (Fazenda Itaipava);
- Piçarra → Sant'Ana; Floresta do Araguaia → Sagrado Coração de Jesus;
- Xinguara → Nossa Senhora do Perpétuo Socorro e São João Batista;
- São Geraldo do Araguaia → São Geraldo Magela (`media`: é o endereço com que a Receita registra a filial);
- Redenção → São João Batista (`media`: o agregador publica nela o **mesmo telefone da secretaria paroquial**
  de Nossa Senhora das Graças, (94) 99106-3821).

**Ficaram FORA do JSON**, por não ser possível ligá-las a uma paróquia — Redenção tem duas paróquias e
Santa Maria das Barreiras também:

| Cidade (gcatholic) | Igreja |
|---|---|
| Redenção | Nossa Senhora Aparecida |
| Redenção | Nossa Senhora do Perpétuo Socorro |
| Redenção | Santa Clara |
| Redenção | Santa Luzia |
| Redenção | Santo Antônio |
| Redenção | São Raimundo Nonato |
| "São José" (localidade não identificada) | São José Pai Adotivo |
| Vila Barreira dos Campos | Sagrado Coração de Jesus |

## Armadilhas e divergências encontradas

- **CEP com erro de digitação na fonte oficial**: Cristo Libertador (São Geraldo do Araguaia) sai publicado
  como **"60570-000"** — faixa do Ceará. Gravei 68570-000, confirmado na Receita e no ViaCEP.
- **Paróquia com dois nomes.** O site chama a paróquia de São Geraldo do Araguaia de **Cristo Libertador**
  (Av. Dom Pedro I 287); a Receita registra a filial 0009 como **"Paróquia São Geraldo Magela"**, na Rua Mogno
  440. O gcatholic lista as duas igrejas na mesma cidade. Adotei o nome do site e registrei São Geraldo Magela
  como comunidade.
- **CEP genérico do município em vez do CEP da rua**: as duas paróquias de Redenção saem com 68550-000 no
  site; o ViaCEP dá 68553-070 (Av. Jeremias Lunardelli, Núcleo Urbano) e 68552-010 (Av. Juscelino Kubitschek,
  Capuava), iguais aos da Receita. Usei os do ViaCEP/Receita.
- **CEP da Receita que não existe**: Xinguara sai com 68555-010 na Receita e o ViaCEP não reconhece; mantive
  o 68555-000 do site.
- **Paróquia sem cidade na ficha**: Nossa Senhora das Dores traz só "Avenida Sete de Setembro, 1935, Centro –
  68543-000". O CEP e a filial 0006 identificam **Floresta do Araguaia**.
- **E-mails publicados com espaço no meio** (`nossasenhoradeguadalupe @diocesedeconceicao.org.br`,
  `nossasenhoraaparecida @…`, `nossasenhoradasgracas @…`, `nossasenhoradasdores @…`,
  `sagradocoracaodejesus @…`): normalizados no arquivo.
- **Telefone incompleto na fonte**: Senhora Sant'Ana sai como "Fone/WhatsApp: (94)". Campo gravado `null`.
- **Párocos publicados só com o primeiro nome**: "Pe. Joel" (Sapucaia) e "Pe. João Paulo" (Piçarra).
- **Fichas individuais vazias**: `/_paroquias/<slug>/` só renderiza o título e o rodapé da Cúria. O endereço
  que aparece logo abaixo do título de cada paróquia é o da **Cúria**, não o da paróquia — não usar.

## Precisa de validação humana

1. **Todos os 32 horários são `baixa`** e vêm de um único agregador sem data de conferência por igreja.
2. **Endereço da matriz divergente entre o site e o agregador**, em duas paróquias: Cristo Redentor
   (Av. Jeremias Lunardelli 276 × Rua Pioneiro Castro 75) e São José Carpinteiro (Av. Xingu 403 × Rua
   Pau D'Arco 1-163). Conferir qual é a igreja e qual é a casa/secretaria paroquial.
3. **Catedral: número 237 (site) × 247 (Receita)** na Rua Dom Sebastião Tomás. E a ficha do Lírio Católico
   traz "1397, R. Dom Sebastião Tomás, 1315" — 1315 é o número da **Cúria**. Confirmar o número da Catedral.
4. **Nome oficial da paróquia de São Geraldo do Araguaia** (Cristo Libertador × São Geraldo Magela).
5. **Nome oficial da paróquia de Santa Maria das Barreiras (sede)**: o site diz "Paróquia Senhora Sant'Ana";
   a Receita, "Paróquia Santana Santa Maria das Barreiras"; o gcatholic, "Senhora Sant'Ana". Adotei o do site.
6. **Quase-Paróquia São João Batista (Sapucaia)**: confirmar se continua quase-paróquia — a Receita mantém a
   razão social "QUASE PAROQUIA" e o site também, mas o rótulo é o único indício.
7. **Oito igrejas do gcatholic sem paróquia identificada** (tabela acima), sete delas em Redenção.
8. **Municípios da diocese**: as 13 paróquias cobrem Conceição do Araguaia, Redenção (2), Santa Maria das
   Barreiras (2), Santana do Araguaia, Floresta do Araguaia, Xinguara, São Geraldo do Araguaia, Rio Maria,
   Piçarra, Sapucaia e Pau D'Arco. O gcatholic cita ainda "São José" e "Vila Barreira dos Campos", que são
   localidades, não municípios.
9. **Rondon do Pará não é desta diocese** — a pista dizia que o agregador tinha uma paróquia lá sem dono.
   A **Diocese de Bragança do Pará** publica a Paróquia Nossa Senhora Aparecida de Rondon do Pará em
   `novo.diocesedebragancapa.org.br/index.php/paroquias/79-nossa-senhora-aparecida2`. **Pacajá é de Cametá**
   (Paróquia Cristo Rei) — confirmado no Anuário Diocesano de Cametá e na Receita.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `address`: está `"Trav. Frei Andre Blatge 335"`. O site oficial (rodapé e página de contato) publica
  **"Rua Dom Sebastião Tomás, 1315, Centro"**, e a Receita registra a sede em **"Praça Frei Gil Vilanova s/n,
  Sede"**. Três endereços diferentes; o mais atual é o do site.
- `phone`: está `"(94) 3421-1307"` — é o número que a **Receita** ainda publica nas filiais de Piçarra e
  Sapucaia. O site publica hoje **(94) 99160-8519** (Cúria) e **(94) 3421-1712** (rodapé).
- `email`: está `null`; a página de contato publica **`curia@diocesedeconceicao.org.br`** (e ainda
  `secretariadepastoral@diocesedeconceicao.org.br` e `pascom@diocesedeconceicao.org.br`).
- `website` `https://diocesedeconceicao.org.br` e `bishopName` "Dom Dominique Marie Jean Denis You" estão
  corretos. Atenção: o `<title>` do próprio site escreve **"Araguaiá"** com acento — erro deles.
- `zipCode` 68540-000 confere.
- `foundedYear` 1976 está de acordo com a convenção (ereção da prelazia restaurada em 27/03/1976; elevação a
  diocese em 16/10/1979). **Não mexer.**
