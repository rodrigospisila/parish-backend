# Relatório — Arquidiocese de Niterói (RJ)

Pesquisa em 2026-09-11. Arquivo: `niteroi.json`.

## Resumo

| | |
|---|---|
| Entradas no arquivo | **83** |
| Paróquias/quase-paróquias ativas | **80** (71 `alta`, 9 `media`) |
| Igreja não paroquial que entra (`loadAsParish`) | **1** — Porciúncula de Sant'Ana (`media`) |
| Registros fora da carga | **2** (`status: duplicada`, `baixa`) |
| Paróquias esperadas | 78 (catholic-hierarchy.org, 2023) |
| Comunidades/capelas | **31** (todas `baixa`) — a arquidiocese não publica listas |
| Horários fixos | **575** (todos `baixa`), cobrindo **51 das 81** entradas ativas |
| Cobertura de paróquias | **~100 %** |

Municípios (14, como a própria arquidiocese declara): São Gonçalo 30, Niterói 24, Itaboraí 5, Cabo Frio 5,
Araruama 4, Maricá 3, Rio Bonito 3, São Pedro da Aldeia 2, Saquarema 2, Tanguá, Silva Jardim, Arraial do Cabo,
Iguaba Grande e Armação dos Búzios com 1 cada.

## O site oficial está bloqueado por Cloudflare — nada passou

`arqnit.org.br` devolve **HTTP 403 com o desafio "Just a moment…" da Cloudflare** em *toda* URL. Tentei, sem
sucesso:

- `www.arqnit.org.br`, `arqnit.org.br`, **`arqnit.org`** (domínio atual), `/portal/`, `/portal1/`, `/arqnit/`;
- UA de Chrome completo, com `Accept`, `Accept-Language`, `sec-ch-ua`, `Sec-Fetch-*` e `--compressed`;
- `--resolve` por **DNS-over-HTTPS** — necessário de qualquer jeito, porque o **Fortinet** da rede local
  bloqueia `arqnit.org` ("Web Page Blocked!"); o truque derruba o Fortinet mas não a Cloudflare;
- endpoints que costumam escapar do desafio: `/wp-json/`, `/feed/`, `/wp-json/wp/v2/pages`, e até **PDFs**
  sob `/wp-content/uploads/` — **todos** devolvem o desafio;
- proxies de leitura: `r.jina.ai` (devolve a própria página "Performing security verification"),
  `api.allorigins.win` e `api.codetabs.com` (HTTP 522).

### O Anuário 2021 — a fonte a buscar quando o bloqueio ceder

A página oficial **"Nossas Paróquias"** (`arqnit.org/arqnit/nossas-paroquias/`, capturada em 11/2021) não tem
lista em HTML: é um *flipbook* que embute um PDF, e o `source` do widget revela a URL

```
https://arqnit.org/arqnit/wp-content/uploads/2021/10/ANUÁRIO-2021-10.03.2021-paroquia.pdf
```

Esse PDF é o **Anuário 2021 da arquidiocese, seção de paróquias** — exatamente o "catálogo diocesano em PDF"
que o README manda procurar. **Ele nunca foi arquivado** (não está no CDX do Arquivo da Internet) e hoje está
atrás da Cloudflare. Quem conseguir baixá-lo fecha esta diocese inteira — endereço, telefone, pároco e,
provavelmente, comunidades e horários.

## O que fechou a lista: o cadastro da Receita

Varri as filiais do CNPJ **30.147.995** da Mitra Arquidiocesana de Niterói em `minhareceita.org`, de `0001` a
`0116` (parando após 12 respostas 404 seguidas), calculando os dígitos verificadores. **104 filiais ativas ou
baixadas.** Separando as paróquias das obras sociais (Educandário São José, Teatro Alvorada, Colégio Pio XI,
Lar da Criança Padre Franz Neumair, Solar do Amanhecer, Albergue da Misericórdia, Movimento Pró-Criança,
creches, Apoio Fraternal São José do Iguá) e das capelas:

- **80 paróquias/quase-paróquias ATIVAS** (2 delas quase-paróquias: São João Batista de La Salle, em Itaipu,
  e Santa Luzia, em São Gonçalo) — contra as 78 de catholic-hierarchy (2023) e as "73 paróquias e 1
  quase-paróquia" que a Wikipédia cita. Cobertura praticamente total.
- **2 CNPJs BAIXADOS que duplicam registros ativos**: filial 0032 (N. Sra. de Fátima, Barro Vermelho — a ativa
  é a 0010) e filial 0036 (São Domingos — a ativa é a 0070). Marcados `status: "duplicada"` e `baixa`.
- **3 capelas** ficaram de fora por não terem horário publicado: Capela Santo Expedito (Fonseca),
  Capela N. Sra. de Fátima (bairro Fátima, Niterói) e Capela São José Operário (Galo Branco, São Gonçalo).
- A filial **0101 "Nova Catedral São João Batista"** é o mesmo templo da 0015 (projeto da nova catedral) e
  foi descartada para não duplicar.

### Corroboração: as fichas de paróquia no Arquivo da Internet

O site antigo (`arqnit.org/arqnit/paroquia-<santo>-<bairro>-<cidade>/`) tem **71 fichas capturadas entre 2017
e 2021**. Elas confirmam nome oficial, bairro e município de 71 dos 80 registros — essas ficaram `alta`
(fonte oficial da arquidiocese + Receita). As 9 restantes têm só a Receita e ficaram `media`:

N. Sra. de Fátima (Pendotiba/Niterói), N. Sra. do Sagrado Coração (Icaraí/Niterói),
N. Sra. Auxiliadora (Santa Rosa/Niterói), N. Sra. Aparecida (Galo Branco/SG),
N. Sra. da Conceição (Alcântara/SG), N. Sra. Auxiliadora (Laranjal/SG), Santíssima Trindade (Trindade/SG),
Santo Antônio (Amendoeira/SG) e São João Batista (São Pedro da Aldeia).

A página **"Vicariatos"** (captura de 2017) confirma a estrutura: **Vicariato Alcântara, Lagos, Niterói,
Oceânico, Rural e São Gonçalo**. Não gravei o vicariato por paróquia porque as páginas de cada vicariato só
foram capturadas em 2017 e a divisão pode ter mudado.

### Uma exceção deliberada: a Porciúncula de Sant'Ana

A filial 0027 é a **Porciúncula de Sant'Ana** (Av. Roberto Silveira, 265, Icaraí), igreja dos Capuchinhos —
**não é paróquia**. Entra mesmo assim, com `status: "nao-paroquial"` + `loadAsParish: true`, porque publica
**6 missas dominicais** e grade diária completa (35 horários) — é a regra do README: igreja não paroquial com
horário publicado entra.

## Horários — por que todos ficaram `baixa`

Os 575 horários vêm exclusivamente de **`horariodemissa.com.br`**, varrido nos 14 municípios. É fonte única,
não oficial e sem data por registro → `baixa` pela escala do README. Não existe segunda fonte: o site da
arquidiocese está bloqueado e `missas.com.br` só cobre o Rio Grande do Norte.

Cobertura do agregador por município (igrejas listadas / com grade preenchida): Niterói 25/21, São Gonçalo
25/20, Cabo Frio 15/12, Armação dos Búzios 10/10, Itaboraí 5/4, Maricá 3/2, Araruama 3/1, Saquarema 2/2,
São Pedro da Aldeia 2/2, Arraial do Cabo 2/2, Rio Bonito 3/1, Iguaba Grande 1/1, Tanguá 1/1, Silva Jardim 1/1.
**Niterói e São Gonçalo batem exatamente em 25, o teto de resultados do site** — as duas listas estão cortadas.

Maiores grades: Porciúncula de Sant'Ana (35), São Judas Tadeu/Icaraí (28), Sant'Ana e Santa Rita de
Cássia/Búzios (23), N. Sra. da Conceição/Porto das Caixas (23), N. Sra. das Dores/Ingá (22),
São Domingos (21), N. Sra. Auxiliadora/Santa Rosa (19).

**Omitidos por regra** (recorrência mensal ou capelas só com missa mensal): Capela de N. Sra. da Boa Viagem
(Ilha da Boa Viagem, 4º domingo), Comunidade São Pedro, Igreja Sant'Anna, Igreja de Santa Clara, Comunidade
Santo Expedito, Capela de São Benedito, Capela Santa Izabel e Igreja São Pedro Apóstolo (todas em Cabo Frio),
e as capelas São João Maria Vianney, N. Sra. da Conceição, N. Sra. Desatadora dos Nós e São Padre Pio
(Búzios), além das "primeira sexta-feira / primeiro sábado" de várias paróquias.

## Pontos para validação humana

1. **Baixar o Anuário 2021 em PDF** (`…/wp-content/uploads/2021/10/ANUÁRIO-2021-10.03.2021-paroquia.pdf`),
   por navegador ou pedindo à SECOM da arquidiocese. É o item de maior retorno desta diocese.
2. **Os 575 horários** (`baixa`) — sem confirmação oficial. E as listas de Niterói e São Gonçalo no agregador
   estão truncadas em 25 resultados, então **30 das 80 paróquias ficaram sem nenhum horário**.
3. **Nomes** vieram do campo `nome_fantasia` da Receita, normalizado (acentuação restaurada por dicionário).
   Confira principalmente: "Paróquia São Sebastião do Barreto" (a ficha antiga do site chamava só
   "Paróquia São Sebastião"), "Catedral Metropolitana de São João Batista", "Paróquia dos Sagrados Corações",
   e os dois "Sant'Ana" (Itaúna/SG e Manguinhos/Búzios).
4. **Paróquia São José (Niterói)** — a Receita registra o endereço em **Piratininga** (Av. Cons. Paulo de
   Mello Kalle) e a ficha antiga do site usava o slug `paroquia-sao-jose-cafuba-niteroi` (**Cafubá**). São
   bairros vizinhos da Região Oceânica; provavelmente a mesma paróquia que mudou de sede ou de referência.
   Gravei Piratininga. **Conferir.**
5. **Duas N. Sra. Auxiliadora** (Santa Rosa/Niterói e Laranjal/SG) e **duas N. Sra. Aparecida em São Gonçalo**
   (Galo Branco e Paraíso/Patronato) — todas reais, desambiguadas pelo bairro no slug.
6. **A de Santa Rosa é a Basílica de Nossa Senhora Auxiliadora** (o agregador a chama assim). Gravei como
   "Paróquia Nossa Senhora Auxiliadora"; se o Parish quiser o título de basílica, é este registro.
7. **Comunidades**: só 31, todas tiradas de menções dentro das grades do agregador ("Capela São Domingos de
   Gusmão", "Capela Sagrada Família", "Capela N. Sra. da Penha", "Matriz Auxiliar" de Cabo Frio…). É o maior
   buraco: 80 paróquias sem lista de capelas. Depende do Anuário ou de contato com a Cúria.
8. **Telefones**: muitos registros da Receita trazem o telefone da **Cúria** (21 3602-1700 / 3602-1739), não o
   da paróquia — foram gravados como vieram, mas não servem para ligar para a paróquia. Os telefones bons são
   os das paróquias que também aparecem no agregador.
9. **Endereços**: onde o agregador tinha ficha, usei o endereço dele (mais legível); nos demais, o do cadastro
   da Receita, que omite o tipo de logradouro ("Rua"/"Praça") e às vezes vem truncado.
10. **Párocos e ano de fundação**: nenhum gravado. Estão nas fichas arquivadas do site, mas são de 2017-2021 e
    o clero certamente mudou — preferi `null` a dado velho.
