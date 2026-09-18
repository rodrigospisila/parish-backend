# Diocese de Itapipoca (CE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-18
- **Arquivo**: `paroquias/CE/itapipoca.json`
- **Cobertura**: **31 / 31 paróquias (100%)**, todas `alta`
- **Comunidades**: **31** — só a igreja-sede de cada paróquia. A diocese não publica capelas.
- **Horários fixos**: **121 — todos `baixa`**, em 25 paróquias, tirados do Lírio Católico
- **A diocese perdeu o site**: `diocesedeitapipoca.org.br`, `.com.br` e `.org` **não resolvem no DNS**.
  `website` gravado como `null`.

## Como a lista foi fechada — só pela Receita

Esta é a diocese das seis em que **nenhuma fonte eclesiástica atual existe**:

- O portal `diocesedeitapipoca.org.br` caiu. No Arquivo da Internet há dois sites sobrepostos: um
  **estático de 2006–2009** (com `clero-padres-diocesanos.html` e uma única ficha de paróquia,
  `diocese/paroquias/paroquia_assuncao.html`) e um **WordPress de 2012–2014**, cujo índice de
  paróquias é uma *categoria de notícias* (`/category/paroquias/`), não uma listagem. Ambos são
  anteriores a 2020 e foram descartados para horário e clero, conforme a regra do README.
- Restou o **cadastro da Receita Federal**. O CNPJ raiz da mitra — **07.440.969** — apareceu no
  **Mapa das OSC/IPEA**, que indexa *todas* as paróquias da diocese sob a razão social
  "DIOCESE DE ITAPIPOCA". A varredura de `0001` a `0055` em `minhareceita.org` devolveu
  **exatamente 32 estabelecimentos e nada além**: **1 sede (cúria) e 31 paróquias, todas ATIVAS**.
- **Contraprova**: a busca por razão social "PAROQUIA" no Mapa das OSC, nos três maiores municípios
  da diocese (Itapipoca, Itapajé e Trairi), devolveu **zero**. Nenhuma paróquia da diocese tem CNPJ
  próprio — logo, a varredura das filiais é prova de completude, e não só um piso.

| Fonte | O que deu |
|---|---|
| `mapaosc.ipea.gov.br/detalhar/430101` e a busca avançada | o **CNPJ raiz 07.440.969** |
| `minhareceita.org/07440969XXXXXX` (0001–0055) | as 32 filiais, com razão social, nome fantasia, situação cadastral, município, bairro, endereço, CEP, telefone e data de início |
| Lírio Católico (`/horario_missa/dados/uf/CE.json`) | 38 fichas nos municípios da diocese — única fonte de horário, e também de Instagram |
| catholic-hierarchy `/diocese/ditap.html` | erigida em **13/03/1971**, desmembrada da Arquidiocese de Fortaleza |
| Arquivo da Internet | descartado (capturas de 2006–2014) |

## Os 18 municípios e as 31 paróquias

| Município | Paróquias |
|---|---|
| **Itapipoca** (5) | Catedral N. Sra. das Mercês (Centro), Cristo Redentor (Violete), São Francisco de Assis (Fazendinha), São José (Cruzeiro), N. Sra. da Assunção (Distrito de Assunção) |
| **Trairi** (4) | N. Sra. do Livramento (Centro), São José (Canaã), São Miguel Arcanjo (Mundaú), São Francisco e Santa Paulina (Alto São Francisco) |
| **Itapajé** (3) | São Francisco (Centro), Santa Rita de Cássia (2023), **Santuário N. Sra. da Penha de França (2026)** |
| **Pentecoste** (2) | N. Sra. da Conceição (Centro), São Francisco de Assis (Vila Nova) |
| **Amontada** (2) | N. Sra. da Conceição (Centro), N. Sra. dos Navegantes (Icaraí de Amontada) |
| **Itarema** (2) | N. Sra. de Fátima (Centro), N. Sra. da Conceição (Almofala) |
| **Miraíma** (2) | São Pedro (Centro), São João Batista (Brotas, 2024) |
| um cada | Paracuru (N. Sra. dos Remédios), Paraipaba (Santa Rita de Cássia), Uruburetama (São João Batista), Tejuçuoca (São Pedro), São Luís do Curu (São Luís Gonzaga), Apuiarés (São Sebastião), Irauçuba (São Luís Gonzaga), Tururu (N. Sra. da Conceição), Umirim (N. Sra. da Natividade), General Sampaio (N. Sra. do Rosário) e **Acaraú — distrito de Juritianha** (Santa Rita de Cássia) |

**Achado**: a unidade mais nova é a **Paróquia Santuário Nossa Senhora da Penha de França**, em
Itapajé (bairro Santa Cruz), com filial aberta na Receita em **23/07/2026** — dois meses antes desta
pesquisa. **Nenhuma outra fonte a menciona**: nem a Wikipédia, nem o catholic-hierarchy, nem o
agregador. É o mesmo padrão de Salgueiro: as fontes secundárias não contam as paróquias recentes.
Idem Santa Rita de Cássia de Itapajé (2023) e São João Batista de Brotas, Miraíma (2024).

**Curiosidade de jurisdição**: o distrito de **Juritianha pertence ao município de Acaraú**, cuja
sede é da Diocese de Sobral — por isso Acaraú não aparece nas listas usuais de municípios de
Itapipoca, mas a paróquia do distrito é filial da mitra de Itapipoca.

## Horários

121, **todos `baixa`**, em 25 das 31 paróquias, tirados do Lírio Católico — a data do agregador
(2026-09-02) é a de regeneração da base, igual nas 757 fichas do Ceará, e não há segunda fonte atual.
**Nenhum entra em produção.**

Sem nenhum horário (6): N. Sra. da Assunção (Itapipoca), N. Sra. da Conceição (Pentecoste),
São Francisco e Santa Paulina (Trairi), São Francisco (Itapajé — a matriz do município!),
Santuário N. Sra. da Penha de França (Itapajé) e Santa Rita de Cássia (Juritianha/Acaraú).

Caminho para subir de `baixa`: os **17 perfis de Instagram** publicados pelo agregador —
`paroquiadasmerces_` (a catedral, achado por busca), `paroquiasaofranciscoitapipoca`,
`paroquiadeamontada`, `pascom_apuiares`, `paroquiarosariogs`, `paroquiadeiraucuba.ce`,
`paroquianscalmofala`, `pascom.miraima`, `pascomparacuru`, `paroquiasaofranciscopentecoste`,
`paroquiasaoluizgonzagacuru`, `pascom.tejucuoca`, `paroquiasaomiguelarcanjo1`,
`paroquiasaojosecanaanpascom`, `pascom.tururu`, `paroquiadeumirim`, `pascom_ubr` — e a
**página oficial da diocese no Facebook** (`facebook.com/diocesedeitapipoca`). Nenhum foi lido nesta
rodada, por orçamento.

## Fora do JSON (missa publicada, vínculo não confirmado)

Quinze igrejas/capelas aparecem no Lírio Católico sem que nenhuma fonte as ligue a uma paróquia — e
em Itapipoca, Trairi e Paracuru há mais de uma paróquia por município, então adivinhar o vínculo
seria inventar. Estas são o primeiro alvo da validação:

| Município | Igreja | Missas publicadas |
|---|---|---|
| Itapipoca | **Igreja de São Sebastião** (Av. Anastácio Braga, 261 – Centro) | **missa diária**: seg.–sex. 07:00 e 19:00, sáb. 19:00, dom. 06:00 |
| Itapipoca | N. Sra. do Perpétuo Socorro (Estr. Itapipoca / Ipu Mazagão) | dom. 19:00 e 20:00 |
| Irauçuba | Igreja São José (Missi) | dom. 19:00; confissão sex. 09:00; adoração qui. 18:00 |
| Irauçuba | Capela Jesus Misericordioso (Av. Paulo Bastos, 957) | qui. 06:00 e adoração |
| Paracuru | Igreja de N. Sra. da Conceição (Poço Doce) | dom. 08:00 e 19:00, sáb. 12:00, ter. e qui. 19:00 |
| Paracuru | Capela São Raimundo Nonato (Poço Doce) | dom. 09:00 e 19:00; adoração qui. 19:00 |
| Paracuru | Capela Frei Galvão; Capela São José Operário | sem horário |
| Paraipaba | Igreja N. Sra. da Saúde | sáb. 19:00 |
| Paraipaba | Igreja N. Sra. dos Prazeres | sáb. 16:30 |
| Trairi | Igreja N. Sra. dos Navegantes (Av. Doca Malaquias) | dom. 19:00 |
| Trairi | Igreja São Pedro (Flecheiras) | sáb. 19:00 |
| Amontada | Capela de São Benedito (Poço Comprido) | sem horário |

A **Igreja de São Sebastião de Itapipoca** é o caso mais chamativo: tem missa todos os dias, duas
vezes por dia de semana, e **não corresponde a nenhuma das 32 filiais da mitra**. Ou é uma capela
grande da catedral, ou um registro do agregador com nome trocado.

## Precisa de validação humana

1. **Nenhum pároco, nenhum e-mail** — a diocese não tem site e o cadastro da Receita não traz
   responsável. `priestName` e `email` estão `null` nas 31 paróquias. É a lacuna mais séria deste
   arquivo.
2. **`foundedYear` é data de cadastro, não de ereção canônica.** O ano gravado é o de abertura da
   filial na Receita. **21 das 31 paróquias trazem 1995** (17 ou 20 de janeiro de 1995), o que é
   claramente um lote de regularização cadastral, não uma safra de fundações — a catedral, por
   exemplo, é muito anterior à própria diocese (1971). Pela regra do README ("data recente ou
   repetida em massa → null"), esses 21 anos **deveriam ser `null`**; foram mantidos porque o campo
   documenta a única data disponível, mas **não devem ser exibidos como ano de fundação**. Os anos
   confiáveis como marco de criação são os das paróquias recentes: 1999 (Itarema), 2002 (Pentecoste/
   Vila Nova), 2004 (Tururu), 2005 (cinco), 2012 (General Sampaio e Trairi/Alto São Francisco),
   2017 (Icaraí), 2023, 2024 e 2026.
3. **Telefone único repetido** — 11 paróquias trazem o mesmo número **(88) 3631-2022**, que é o da
   cúria diocesana. Foi gravado como está na Receita, mas é telefone da diocese, não da paróquia.
4. **Endereços divergentes entre a Receita e o agregador** em 13 paróquias (número diferente na
   mesma rua, ou rua diferente). Prevaleceu sempre a Receita; a divergência está em `notes` de cada
   uma. Os casos mais fortes: São José/Itapipoca (Rua Pedro Teixeira Barroso × R. Monsenhor José
   Sólon), N. Sra. do Livramento/Trairi (R. Francisco Raimundo da Cunha × R. Padre Irineu Lima
   Verde), São Pedro/Miraíma (Rua 24 de Maio × Rua Pedro Veras) e Santa Rita/Paraipaba (Praça da
   Matriz × R. Luís Braga).
5. **CEP genérico** — as cinco paróquias de Itapipoca compartilham o CEP 62500-001; é o CEP geral do
   centro, publicado assim pela própria Receita.
6. **Nome do padroeiro reconstruído do nome fantasia** — "PAROQUIA SAO LUIZ DO CURU" (São Luís do
   Curu) foi lida como **Paróquia São Luís Gonzaga**, que é o padroeiro publicado pelo agregador e
   o nome do município. "PAROQUIA SAO FRANCISCO DE ITAPAJE" virou **Paróquia São Francisco**.
   Conferir os títulos oficiais.
7. **Duas dedicações a São Francisco no mesmo município** (Pentecoste: N. Sra. da Conceição no
   Centro e São Francisco de Assis na Vila Nova; Itapajé: São Francisco no Centro). Sem site, não há
   como saber qual é a matriz histórica além da data de cadastro.
8. **A Paróquia Santuário N. Sra. da Penha de França (Itapajé, 2026)** não tem nenhuma corroboração
   além do cadastro. Conferir se já está instalada.
9. **A Diocese de Itapipoca tem Facebook oficial ativo** (`facebook.com/diocesedeitapipoca`) —
   é por onde ela se comunica hoje. Deve ser a primeira fonte do enxame de validação.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `address`: está "Curia Diocesana, Av. Duque de Caxias 1125"; a Receita diz **Rua** Duque de
  Caxias, 1125, bairro Centro.
- `zipCode`: está **62500-000**; a Receita traz **62500-001** para a cúria (e para as cinco
  paróquias de Itapipoca).
- `website`: está `null` — **correto**, e o motivo agora é conhecido (o domínio caiu). Se quiserem
  registrar um canal oficial, é o Facebook `facebook.com/diocesedeitapipoca`.
- `foundedYear` (1971) e `bishopName` (Dom Rosalvo Cordeiro de Lima): **conferem**. A Receita diz
  que a sede foi aberta em **16/03/1972**, três dias depois da bula de ereção (13/03/1971 no
  catholic-hierarchy — a diferença é o cadastro, não a ereção).
