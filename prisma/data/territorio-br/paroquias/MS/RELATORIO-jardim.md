# Relatório — Diocese de Jardim (MS)

**Pesquisa:** 2026-09-11 · **Arquivo:** `paroquias/MS/jardim.json`

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **13** (13 alta) |
| Comunidades/capelas | **0** |
| Horários fixos | **4** (0 alta, 4 media) |
| Cobertura | 13/13 (100%) |

Erigida por João Paulo II em **30/01/1981**, sufragânea de Campo Grande, 12 municípios,
**2 foranias** (Jardim e Pantaneira). Bispo: **Dom Pedro Cesário Palma, O.F.M. Cap.**

## O portal é um SPA — o conteúdo está só na API

`diocesedejardim.com.br` é um **aplicativo base44** (React/Supabase): o HTML servido tem
**1,9 KB**, só o shell, e todo o conteúdo é carregado por JavaScript. Raspar a página não
devolve nada.

**Caminho que funcionou** — ler o bundle JS (`/assets/index-*.js`) e extrair os `appId`, depois
chamar a API de entidades do base44 diretamente:

```
GET https://base44.app/api/apps/<appId>/entities/Paroquia
```

Existem **dois apps** com o mesmo conteúdo — `69eef4b6802ecfaf363a4b18` (o que a página em
produção referencia) e `699a9316fa75f477839407da` (uma cópia). **A cópia é a que tem os dados
completos**: nome, cidade, forania, endereço, telefone, padroeiro, `is_catedral` e o campo de
horários. A do app em produção tem quase tudo nulo. Usei a cópia, registrada em `sources`.

Entidades disponíveis: `Paroquia`, `Evento`, `Noticia`, `Bispo`, `Clero`. **Não há entidade de
comunidade nem de horário** — o horário é um campo de texto livre dentro de `Paroquia`.

## Três fontes fechando em 13

1. **Portal oficial** (API acima) — 13 registros.
2. **GCatholic** — 13 igrejas, nas mesmas 12 cidades, nas mesmas 2 foranias (atualizado
   2026-01-01).
3. **Cadastro de filiais do CNPJ da mitra** — raiz **15.462.021 = MITRA DIOCESANA DE JARDIM**,
   no `minhareceita.org`: **15 filiais ATIVAS e nada além da 0015** — a mitra (0001), as **13
   paróquias** e o Colégio Diocesano Dom Bosco (0015, situação BAIXADA). Prova de completude,
   e a origem dos **CEPs**, que o portal não publica.

## Horários: só a catedral, e em texto livre

Das 13 fichas, **só a Catedral Nossa Senhora de Fátima** tem o campo `horarios_missas`
preenchido: `"Domingo: 8h e 19h | Quarta e Sexta: 19h"` → 4 registros. Marquei **`media`**, não
`alta`: o portal é novíssimo (registros criados em 2026) e o fato de 12 das 13 fichas estarem
vazias sugere carga de dados ainda em andamento. As outras 12 paróquias entram sem horário.

## Pontos para o enxame de validação

1. **Levantar os horários das outras 12 paróquias** e confirmar os 4 da catedral.
2. **Divergência de endereço entre o portal e a Receita Federal em 5 paróquias** — gravei o do
   portal e registrei o da Receita em `notes` de cada uma:

   | Paróquia | Portal | Receita Federal |
   |---|---|---|
   | N. Sra. de Lourdes (Anastácio) | Rua Municipal, 913 | Rua João Leite Ribeiro, s/n - Centro |
   | N. Sra. do Perpétuo Socorro (Bodoquena) | Av. Manoel Rodrigues Oliveira, 211 | Rua Irmãs Pastorinhas, s/n - Centro |
   | São Pedro Apóstolo (Bonito) | Rua Cel. Nelson Felício, 767 | Praça da Liberdade, 84 |
   | **Catedral N. Sra. de Fátima (Jardim)** | Av. Mato Grosso, 42A - Vila Angélica | Avenida Onze de Dezembro, s/n - Vila Angélica |
   | Santo Antônio de Pádua (Jardim) | Rua Cel. Juvêncio, 92 - Centro | Avenida Duque de Caxias, s/n |
   | Sagrado Coração de Jesus (Porto Murtinho) | Rua Treze de Maio, 385 | Rua Quinze de Novembro, 401 |

3. **Conteúdo possivelmente gerado por IA no portal.** O app tem uma rota `/AdminIA`, e os
   campos `historia_curta` das fichas têm cara de resumo de LLM — o de Aquidauana, por exemplo,
   diz "*texto turístico menciona edificação ligada a missionários redentoristas*". **Não
   importei nenhum campo de história**; nome, cidade, forania, endereço e telefone são
   específicos e batem com a Receita/GCatholic, por isso ficaram `alta`. Ainda assim, vale
   confirmar o horário da catedral com a paróquia antes de exibir.
4. **Caracol aparece no cadastro federal como "MITRA DIOCESANA DE JARDIM"** (filial 0014), sem
   nome de fantasia. O portal e o GCatholic identificam a paróquia como **Nossa Senhora do
   Perpétuo Socorro**; foi o que gravei.
5. **Telefone de cúria repetido**: o cadastro federal registra `(67) 3251-1101` ou
   `(67) 3251-1110` — os números da **cúria** — em todas as 13 filiais. Os telefones que gravei
   são os **do portal**, específicos por paróquia; 2 paróquias (Bela Vista e Caracol) ficaram
   sem telefone porque o portal não publica.
6. **Sem e-mail em 12 das 13** (só Bonito publica) e **sem pároco em todas as 13** — o portal
   tem entidade `Clero` separada, que não relaciona padre a paróquia.
7. **Website da diocese desatualizado no `dioceses.json`**: lá consta
   `http://diocesejardim.blogspot.com`; o portal oficial atual é `https://diocesedejardim.com.br`.
   **Não alterei o `dioceses.json`** (fora do escopo desta tarefa) — fica a correção sugerida,
   como foi feito com Cachoeira do Sul na 2ª rodada.
8. **Duas paróquias homônimas** "Nossa Senhora do Perpétuo Socorro" (Bodoquena e Caracol) —
   desambiguadas pelo slug com a cidade.
