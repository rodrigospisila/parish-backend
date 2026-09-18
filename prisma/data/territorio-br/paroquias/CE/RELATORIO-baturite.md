# Diocese de Baturité (CE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-18
- **Arquivo**: `paroquias/CE/baturite.json`
- **Cobertura**: **20 paróquias** + **1 santuário-basílica** + **1 área pastoral** = **22 unidades**
  nos 14 municípios. A Wikipédia declara **21 paróquias** — a diferença é o Santuário-Basílica de
  Canindé (ver abaixo).
- **Comunidades**: **59**
- **Horários fixos**: **110 — 84 `alta`, 25 `media`, 1 `baixa`**, em todas as 22 unidades. É a única
  das seis dioceses desta rodada em que **toda** unidade publica horário.

## Contexto: a diocese mais nova do Brasil

Criada por **Leão XIV em 1º de janeiro de 2026**, desmembrada da Arquidiocese de Fortaleza — a
primeira circunscrição criada no Brasil por este pontificado. Bispo: **Dom Luís Gonzaga Silva Pepeu,
O.F.M. Cap.** Catedral: **Nossa Senhora da Palma**, em Baturité. 14 municípios: Acarape, Aracoiaba,
Aratuba, Barreira, Baturité, Canindé, Caridade, Guaramiranga, Mulungu, Ocara, Pacoti, Palmácia,
Paramoti e Redenção.

**A diocese ainda não tem portal próprio**: `diocesedebaturite.org.br`, `.com.br` e `.org` não
resolvem no DNS. Em setembro de 2026, nove meses depois da criação, as fichas das paróquias
**continuam publicadas no site da Arquidiocese de Fortaleza**, nas regiões *Serra Nossa Senhora da
Palma* e *Sertão São Francisco das Chagas*, e com `dateModified` de **19/08/2026** — ou seja, vivas
e mantidas. É de lá que vem tudo: endereço, CEP, telefone, e-mail, pároco, expediente da secretaria,
grade de missas, confissões e comunidades.

## Como o arquivo foi montado

1. **21 unidades vieram de `paroquias/CE/fortaleza.json`** (arquivo desta mesma pasta, lido em modo
   somente-leitura e **não modificado**), filtrando pelos 14 municípios. As fontes originais — as
   fichas oficiais da ARQFOR — foram preservadas registro a registro, junto com comunidades e
   horários.
2. **A 22ª foi achada nesta rodada**: a **Paróquia Sagrada Família, de Ocara**. Ocara era o único
   dos 14 municípios sem nenhuma paróquia no arquivo de Fortaleza. A busca do WordPress do próprio
   site arquidiocesano (`/wp-json/wp/v2/search?search=Ocara`) devolveu a ficha oficial, que foi lida
   e transcrita aqui: Av. Coronel João Felipe, 325, Centro, CEP 62755-000, (85) 99247-6721, pároco
   Pe. Francisco Daniel de Freitas Muniz, colaborador Pe. Carlos Vinicios Moreira Rodrigues, criada
   em **01/11/1999 por Dom José Antonio Aparecido Tosi Marques**, missa dominical às 7h e 19h,
   confissão às sextas de 8h às 11h30, e missa "todo dia 13 de cada mês ao meio-dia".
3. Cada paróquia recebeu uma nota registrando a transferência de território e a origem do dado.

## Fontes principais

| Fonte | O que deu |
|---|---|
| Fichas de paróquia da ARQFOR (`/arquidiocese/regioes/…/paroquias-da-regiao/…`) | endereço, bairro, CEP, celular/fixo, e-mail, redes, **grade de missas por dia da semana**, expediente da secretaria, confissões, pároco, colaborador, diácono, secretária e data de criação |
| `/wp-json/wp/v2/search?search=Ocara` | a ficha da Paróquia Sagrada Família, ausente do arquivo de Fortaleza |
| CNBB e ARQFOR (notícias de 01/01/2026) | criação da diocese, bispo, território |
| Wikipédia — Diocese de Baturité | 21 paróquias, 14 municípios, catedral, Canindé com 4 paróquias |
| catholic-hierarchy `/diocese/dbatu.html` | erigida em 01/01/2026, e a lista dos 14 municípios desmembrados |
| Lírio Católico (`CE.json`) | 24 fichas nos 14 municípios — usado só para conferência e para tabular as igrejas sem vínculo |

## As 22 unidades

| Município | Unidades |
|---|---|
| Acarape | São João Batista |
| Aracoiaba | N. Sra. da Conceição; N. Sra. das Graças (Distrito de Ideal) |
| Aratuba | São Francisco de Paula |
| Barreira | São Pedro |
| **Baturité** | **N. Sra. da Palma (Catedral)**; Cristo Rei (Putiú) |
| **Canindé (5)** | São Francisco das Chagas (matriz: Igreja N. Sra. das Dores); São José (Bela Vista); Santo Antônio de Pádua (Caiçara); **Santuário-Basílica de São Francisco das Chagas**; Área Pastoral São Pedro (Alto Guaramiranga) |
| Caridade | Santo Antônio; N. Sra. das Dores (Campos Belos) |
| Guaramiranga | N. Sra. da Conceição |
| Mulungu | São Sebastião |
| **Ocara** | **Sagrada Família** ← achada nesta rodada |
| Pacoti | N. Sra. da Conceição |
| Palmácia | São Francisco de Assis |
| Paramoti | Senhora Santana |
| Redenção | N. Sra. da Conceição; N. Sra. de Lourdes (Distrito de Antônio Diogo) |

Canindé com 5 unidades (4 paroquiais + 1 área pastoral) confere com a Wikipédia, que diz "Canindé
concentra o maior número: 4 paróquias".

## O caso do Santuário-Basílica de Canindé

O **Santuário-Basílica de São Francisco das Chagas** é o maior santuário franciscano do Brasil e
publica **22 horários** (missa todos os dias, várias por dia). Há divergência de classificação:

- A ficha da **ARQFOR** o trata como santuário/reitoria **distinto** da Paróquia São Francisco das
  Chagas, cuja matriz é a **Igreja de Nossa Senhora das Dores** — e o arquivo de Fortaleza já o
  marcava como `nao-paroquial`.
- O **site do próprio santuário** (`santuariodecaninde.com`) e a **Wikipédia** o chamam de
  **"Paróquia-Santuário de São Francisco das Chagas de Canindé"**.

Foi mantida a classificação da ARQFOR (`status: nao-paroquial` + `loadAsParish: true`, porque
publica missa), e por isso `parishesFound` = **20** contra `parishesExpected` = **21**. Se a
Wikipédia estiver certa, a contagem fecha em 21 e basta remover o `status` desse registro.
**É o primeiro ponto a validar.**

## Horários

110 no total, herdados das fichas oficiais: **84 `alta`** (fichas com sinal de atualidade),
**25 `media`** e **1 `baixa`** — a missa do dia 13 de cada mês, ao meio-dia, em Ocara
(`dayOfWeek: null`, com a regra literal em `notes`).

Todas as 22 unidades têm pelo menos um horário. Os `media` vieram já assim do arquivo de Fortaleza.

## Fora do JSON (missa publicada, vínculo não confirmado)

O Lírio Católico lista, nos 14 municípios, oito igrejas que nenhuma ficha oficial liga a uma
paróquia. Em Baturité, Guaramiranga e Caridade há mais de uma unidade, então adivinhar o vínculo
seria inventar:

| Município | Igreja | Missas publicadas |
|---|---|---|
| Baturité | Capela de N. Sra. Auxiliadora (Av. Dom Bosco, 440) | dom. 10:00; qui. 19:00 |
| Baturité | Santuário dos Arcanjos (Av. Dom Bosco, 453) | dom. 17:00 |
| Baturité | Mosteiro dos Jesuítas (Sítio Olho d'Água) | dom. 10:00 (`@mosteirodosjesuitas`) |
| Baturité | Capela de N. Sra. do Perpétuo Socorro (Jucá do Zé Vilar) | sem horário |
| Canindé | Convento Santo Antônio (Praça Frei Aurélio, 914) | ter. 18:00 |
| Caridade | Igreja de São Domingos de Gusmão (bairro São Domingos) | sáb. 19:00 (`@igrejadesaodomingos`) |
| Guaramiranga | Igreja Senhor do Bonfim | dom. 17:00 |
| Guaramiranga | Igreja da Gruta de Guaramiranga | dom. 11:00 |
| Redenção | N. Sra. das Graças (Gurguri) | sem horário |

## Precisa de validação humana

1. **Classificação do Santuário-Basílica de Canindé** (ver acima): paróquia-santuário ou
   reitoria? Decide se a diocese tem 20 ou 21 paróquias.
2. **A Paróquia Sagrada Família de Ocara falta em `paroquias/CE/fortaleza.json`.** Ela existe e tem
   ficha oficial na ARQFOR. Como o território passou a Baturité em 01/01/2026, ela vai sair do
   arquivo de Fortaleza de qualquer forma — mas **vale conferir se há outras paróquias faltando ali
   pelo mesmo motivo**, fora dos 14 municípios de Baturité. (Este relatório não alterou
   `fortaleza.json`.)
3. **Toda a diocese depende hoje do site de outra circunscrição.** Assim que a Diocese de Baturité
   publicar portal próprio, este arquivo precisa ser refeito: endereço da cúria, telefone, e-mail e
   `website` da diocese estão todos `null`, e os párocos podem mudar com as primeiras provisões de
   Dom Luís Pepeu.
4. **Nenhuma data de criação de paróquia**, exceto Ocara (01/11/1999): as fichas da ARQFOR herdadas
   trazem `foundedYear: null` em 21 das 22 unidades.
5. **E-mail de Ocara ofuscado** pelo WordPress (`[email protected]`) — não pôde ser lido.
6. **Área Pastoral São Pedro (Alto Guaramiranga, Canindé)** — no arquivo de Fortaleza ela contava
   como paróquia; aqui foi marcada `nao-paroquial` + `loadAsParish`, como as demais áreas pastorais
   do dataset. Publica 1 horário.
7. **Endereço da Paróquia São Francisco das Chagas de Canindé** está gravado como "Av. Francisco
   Cordeiro Campos, S/N – Igreja Matriz Nossa Senhora das Dores" — o nome da igreja veio grudado no
   campo de endereço na ficha de origem. Vale separar.
8. **Duas dedicações a São Pedro em Canindé** (Área Pastoral São Pedro) e **duas a São Francisco**
   (a paróquia e a basílica): confirmar que não há duplicidade.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `foundedYear`: está **2026** — **correto** (01/01/2026), e é o único registro do dataset com ano
  de fundação no ano corrente.
- `address`, `zipCode`, `phone`, `email`, `website`: todos `null`. **Correto por enquanto** — a
  cúria de Baturité ainda não publicou endereço nem portal. Quando publicar, o endereço provável é
  o da Catedral N. Sra. da Palma: Avenida 7 de Setembro, 994, Centro, Baturité/CE, 62760-000.
- `bishopName` (Dom Luis Gonzaga Silva Pepeu, O.S.F. Cap.): a grafia usual é **O.F.M. Cap.**
  (Ordem dos Frades Menores Capuchinhos) — o registro atual escreve "O.F.M. Cap." e está certo;
  confira só o acento em "Luís".
