# Relatório — Prelazia de Itacoatiara (AM)

Pesquisa: 2026-09-17 · Arquivo: `itacoatiara.json`
**É prelazia territorial, não diocese** (`type: "Prelazia"`). Regional Norte 1 da CNBB. Seis
municípios: Itacoatiara, Itapiranga, Silves, São Sebastião do Uatumã, Urucará e Urucurituba.

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **13** (13 `alta`) |
| Comunidades/capelas | **13** (só as matrizes — nenhuma fonte publica as comunidades rurais) |
| Horários fixos | **38** (38 `alta`), nas 13 paróquias |
| Cobertura | 13 encontradas / 13 esperadas |

## Fontes principais

1. **`https://prelaziadeitacoatiara.org.br/paroquias`** — site oficial na plataforma *Cúria Online do
   Brasil*, ativo (última notícia de 09/09/2026). Lista 13 paróquias; cada ficha
   (`/paroquias/<id>/<slug>`) traz endereço, expediente da secretaria, telefone, e-mail, redes
   sociais, **grade de missas por dia da semana** e o clero.
2. **`/horariosmissa`** — a mesma grade agregada por dia da semana; conferi as 38 linhas contra as
   fichas e batem uma a uma.
3. **Receita Federal via `minhareceita.org`** — filiais do CNPJ **04.319.703**, varridas de 0001 a
   0040: 17 estabelecimentos, dos quais **exatamente 13 paróquias ativas** (0004–0013 e 0015–0017).
   Os outros são a cúria (0001), uma filial sem nome (0002), o Instituto N. Sra. do Rosário de
   Fátima (0003) e as Obras Sociais da Prelazia (0014).
4. gcatholic.org (13 paróquias em 31/12/2022) e Wikipédia (13 paróquias em seis municípios).

## Prova de completude

Site (13) = Receita (13 filiais de paróquia) = gcatholic (13) = Wikipédia (13). Oito paróquias ficam
no município de Itacoatiara e uma em cada um dos outros cinco.

## Sinal de atualidade

A ficha da Catedral dá como pároco o Pe. José Acácio Rocha da Silva, e a notícia de **09/09/2026**
(inauguração da nova secretaria paroquial) cita "o pároco, Pe. José Acácio Rocha". As fichas estão em
dia; por isso os horários entraram como `alta`.

## Decisões

- **Catedral Nossa Senhora do Rosário**: o site a lista como "Paróquia Nossa Senhora do Rosário";
  é a catedral prelatícia (a Receita a registra como "Catedral Nossa Senhora do Rosário" e o perfil
  oficial é `facebook.com/catedralnsrosario`). Gravei com o prefixo "Catedral".
- **Paróquia Menino Jesus fica na Vila de Novo Remanso**, distrito de Itacoatiara a cerca de 200 km
  da sede — o site só diz "Rua Enock Reis, nº 117, Centro, Itacoatiara". A Receita (filial 0016,
  "Vila Novo Remanso") e o nome da página oficial no Facebook ("Paróquia Menino Jesus – Novo
  Remanso – Itacoatiara/AM") confirmam. `neighborhood: "Vila de Novo Remanso"`.
- CEP: gravei o CEP geral nos cinco municípios de CEP único e o CEP da Receita só para Cristo Rei
  (69104-216). Nas demais paróquias de Itacoatiara a Receita repete "69100-003" para todas — não é
  CEP de logradouro e ficou `null`.
- `website`: o perfil oficial no Facebook indicado na ficha (nenhuma paróquia tem site próprio).

## Precisa de validação humana

1. **Comunidades**: zero. A prelazia tem dezenas de comunidades ribeirinhas por paróquia (o site fala
   em visitas ao rio Arari, ao lago do Babaçu etc.), mas não publica lista. Procurar nas redes
   sociais das paróquias ou pedir à cúria.
2. **Paróquia Divino Espírito Santo**: a ficha lista só um **vigário** (Frei Regivaldo Silva do
   Nascimento, OFMCap) e nenhum pároco → `priestName: null`. O cadastro do clero tem um 13º pároco
   sem paróquia indicada, o Pe. Alex Mota da Costa — é provável que seja o pároco do Divino;
   confirmar.
3. **Campos trocados no site**: em N. Sra. de Nazaré (Itapiranga) e São José (Itacoatiara) o campo
   de telefone traz um segundo endereço ("Rua Antonio de Almeida Santos, Bairro Caracaraí" e "Rua
   David Pereira Braga, 123 – Conjunto Sham – Iracy", provavelmente as secretarias) → `phone: null`.
   O endereço de Nazaré vem sem número ("Avenida Presidente Getúlio Vargas, , Itapiranga"); a
   Receita registra Rua Antônio de Almeida Santos, 435, Centro.
4. **E-mail de N. Sra. da Conceição (Silves)** publicado com acento
   (`paróquiansc.silves@yahoo.com`) — inválido como está → `null`. Silves e Menino Jesus não
   publicam telefone.
5. **Sede da cúria**: a página "Dados da Cúria" dá Rua Monsenhor Joaquim Pereira, 126, Centro; o
   rodapé do site, o `dioceses.json` e a Receita (matriz do CNPJ) dão Rua Barão do Rio Branco, 251.
   Gravei o da página da cúria.
6. **Grade enxuta**: fora a Catedral (diária), quase todas as paróquias publicam só a missa de
   quinta-feira e as de domingo; Santa Ana (Urucará) e Menino Jesus, só a de domingo à noite. É o que
   a fonte oficial publica — missas em comunidades não aparecem.
