# Relatório — Diocese de Coxim (MS)

**Pesquisa:** 2026-09-11 · **Arquivo:** `paroquias/MS/coxim.json`

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **14** (14 alta) |
| Comunidades/capelas | **0** |
| Horários fixos | **0** |
| Cobertura | 14/14 (100%) |

Criada como **prelazia em 03/01/1978**, elevada a **diocese em 2002**. Padroeiro: São José.
11 municípios. Bispo: **Dom Otair Nicoletti** (desde 19/10/2022).

## A diocese não tem site — o CNPJ da mitra fechou a lista

**Não existe site diocesano.** Não há portal, blog ativo nem lista de paróquias publicada. A
diocese existe na web só por páginas de terceiros (CNBB, Wikipédia) e pelo Facebook de algumas
paróquias.

A lista foi fechada pelo truque do README — **o cadastro de filiais do CNPJ da mitra**:

- Raiz **03.680.444 = MITRA DIOCESANA DE COXIM**.
- No `minhareceita.org`, iterando as ordens 0001…0035 (com o dígito verificador calculado):
  **15 filiais ATIVAS e nada além da 0015.**
- A 0001 é a própria mitra; **as 14 seguintes são as 14 paróquias** — exatamente o número que a
  CNBB divulgou na matéria dos 40 anos da diocese.

O cadastro deu **nome, logradouro, número, bairro, CEP, telefone e data de início de atividade**
de cada uma. É simultaneamente a fonte dos dados e a **prova de completude**.

Corroboração cruzada com o **GCatholic** (13 igrejas, atualizado 2026-01-01): as 13 dedicações
e cidades batem uma a uma. A única que o GCatholic não registra é a 14ª.

## As 14 paróquias

| Cidade | Paróquia | Ativa desde |
|---|---|---|
| Coxim | **Catedral São José** | 1980 |
| Coxim | Paróquia São Francisco das Chagas | 1988 |
| Coxim | Paróquia Nossa Senhora do Perpétuo Socorro | 2001 |
| Camapuã | Paróquia São João Batista | 1980 |
| Costa Rica | Paróquia Santo Antônio | 1980 |
| Pedro Gomes | Paróquia São Sebastião | 1980 |
| Rio Negro | Paróquia Nossa Senhora de Fátima | 1980 |
| Rio Verde de Mato Grosso | Paróquia Nossa Senhora Auxiliadora | 1980 |
| São Gabriel do Oeste | Paróquia São Gabriel | 1980 |
| São Gabriel do Oeste | Paróquia Nossa Senhora Aparecida | **2012** |
| Sonora | Paróquia Nossa Senhora Aparecida | 1989 |
| Figueirão | Paróquia Nossa Senhora da Abadia | 1995 |
| Alcinópolis | Paróquia Nossa Senhora Aparecida | 1995 |
| Paraíso das Águas | Paróquia São João Maria Vianney e São Sebastião | 2002 |

## Nenhum horário de missa

- A diocese não publica nada.
- O `horariodemissa.com.br` **tem** duas igrejas de Coxim cadastradas (Catedral São José e
  São Francisco das Chagas) mas com os campos **"Missas:" e "Confissões:" vazios** — só serviu
  para confirmar dois telefones, que gravei com a fonte registrada.

**Coxim entra em produção sem nenhum horário e sem nenhuma comunidade.** É a diocese mais
pobre de dados das nove desta rodada.

## Pontos para o enxame de validação

1. **Levantar horários e comunidades do zero.** Caminhos: o Facebook da Paróquia Catedral
   São José (`facebook.com/ParoquiaCatedralSaoJose`) e o canal dela no YouTube, os perfis das
   demais paróquias, ou contato com a cúria — **(67) 3291-1928**, Rua Viriato Bandeira, 834,
   Centro, Coxim/MS, 79400-000.
2. **Nomes em CAIXA ALTA e sem acento no cadastro da Receita**, normalizados por mim para
   português corrente ("PAROQUIA SAO JOSE" → "Catedral São José"). A grafia final não é a da
   fonte; conferir com a diocese.
3. **Erro de digitação no próprio cadastro federal**: a filial 0006 está registrada como
   "**PAROQUA** NOSSA SENHORA DE FATIMA" (Rio Negro). Gravei "Paróquia Nossa Senhora de Fátima".
4. **Telefone malformado no cadastro** — N. Sra. do Perpétuo Socorro (Coxim): o campo traz
   `672912083`, com **9 dígitos**; faltando um. Gravei como veio.
5. **Divergência de atribuição encontrada em resumo de busca**, descartada: um resultado sugeria
   "Camapuã: N. Sra. Auxiliadora e São João Batista" e "Costa Rica: N. Sra. da Abadia e Santo
   Antônio". O cadastro federal **e** o GCatholic concordam que N. Sra. Auxiliadora é de
   **Rio Verde de Mato Grosso** e N. Sra. da Abadia é de **Figueirão**. Fiquei com as duas
   fontes concordantes.
6. **Três paróquias homônimas** "Nossa Senhora Aparecida" (Sonora, Alcinópolis e São Gabriel do
   Oeste) — desambiguadas pelo slug com a cidade.
7. **Sem e-mail nas 14** e **sem telefone em 5** (São José/Catedral tem o do agregador;
   Camapuã, Rio Negro, Rio Verde, São Gabriel e São Francisco das Chagas não têm no cadastro).
8. **Sem pároco em todas as 14** — o cadastro da Receita não traz e não há outra fonte.
9. **A diocese não tem website**: gravei `website: null` no bloco `diocese`, coerente com o
   `dioceses.json`, que também registra `null`.
