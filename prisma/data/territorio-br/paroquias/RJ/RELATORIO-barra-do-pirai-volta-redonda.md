# Diocese de Barra do Piraí-Volta Redonda (RJ) — relatório de pesquisa

- Data da coleta: **2026-09-11**
- Arquivo: `paroquias/RJ/barra-do-pirai-volta-redonda.json`
- Resultado: **40 entradas** (38 paróquias/santuário + 2 capelanias `nao-paroquial`),
  **393 comunidades**, **127 horários fixos**

## Fontes

O site `https://www.diocesevr.com.br` estava no ar e é **a melhor fonte desta rodada do RJ para
comunidades**: publica uma ficha por paróquia *e* uma ficha por comunidade.

| Fonte | Uso |
|---|---|
| `https://www.diocesevr.com.br/paroquia` | Listagem canônica — 40 fichas, sem paginação |
| `https://www.diocesevr.com.br/paroquia/<id>` | Nome, vicariato, endereço com bairro, cidade, telefone/WhatsApp, e-mail, **clero completo**, lista de comunidades com link, e a grade de missas |
| `https://www.diocesevr.com.br/missa` | Grade de missas de todas as paróquias numa página só, agrupada pelos 4 vicariatos |
| `https://www.diocesevr.com.br/comunidade` + `/comunidade/<id>` | 353 comunidades, cada uma com endereço, bairro, cidade, paróquia-mãe, telefone e e-mail |
| `https://www.catholic-hierarchy.org/diocese/dbrdp.html` | 31 paróquias em 2023 |

## Cobertura

| Métrica | Valor |
|---|---|
| Entradas na listagem oficial | 40 |
| Paróquias + santuário | 38 |
| Capelanias (`status: "nao-paroquial"`) | 2 — Militar Nossa Senhora das Graças (AMAN) e Pessoal Nossa Senhora do Perpétuo Socorro |
| Paróquias esperadas (catholic-hierarchy, 2023) | 31 |
| Comunidades/capelas | 393 (38 matrizes + 353 comunidades + 2 fichas de capelania) |
| Comunidades **com endereço** | 292 de 353 (83 %) |
| Horários | 127, todos MASS |
| Paróquias sem nenhum horário publicado | 17 de 38 (45 %) |

38 paróquias contra 31 esperadas em 2023 — a diferença é compatível com paróquias criadas
depois (a Paróquia Santa Clara de Assis, id 64, e a Paróquia Nossa Senhora de Lourdes e São
Jorge, id 57, têm os ids mais altos e ainda não publicam telefone/e-mail).

Cidades: Volta Redonda (11), Barra Mansa (6), Resende (6), Barra do Piraí (4), Piraí (3),
Rio Claro (2), Itatiaia (2), Engenheiro Paulo de Frontin (2), Mendes, Quatis, Porto Real,
Pinheiral.

## A diocese publica missa só no nível da paróquia

As 353 fichas de comunidade trazem, no lugar do horário, a frase
**"Para informações sobre os horários das missas na comunidade, entre em contato com a
Secretaria Paroquial."** Só **uma** comunidade tem grade própria — Sagrado Coração de Jesus
(id 209, Itapuca, da Paróquia Sagrada Família de Resende), cujos 3 horários entraram.

Por isso os 124 horários restantes estão todos na matriz. Não é falha de coleta: é o que a
diocese publica. Nenhuma confissão, adoração ou terço é publicada.

### As 17 paróquias sem horário

Nossa Senhora da Piedade (Rio Claro), Santo Antônio (Lídice/Rio Claro), Nossa Senhora das Dores
(Porto Real), Nossa Senhora da Conceição (Resende), São José (Itatiaia), São Benedito (Barra do
Piraí), São Paulo Apóstolo (Volta Redonda), Santo Antônio (Barra Mansa), São João Batista
(Eng. Paulo de Frontin), São Sebastião (Volta Redonda), São João Batista (Arrozal/Piraí),
Nossa Senhora das Dores (Dorândia/Barra do Piraí), Nossa Senhora da Conceição (Sacra
Família/Eng. Paulo de Frontin), Nossa Senhora de Lourdes e São Jorge (Volta Redonda), Santa
Clara de Assis (Barra Mansa) — além das 2 capelanias.

## Problema de coleta: bloqueio por rate limit

Baixei as 353 fichas de comunidade em paralelo. **Depois de ~252 requisições o servidor passou a
responder "One moment, please… Please wait while your request is being verified"** e, em
seguida, a recusar conexão do meu IP (timeout, inclusive resolvendo o IP por DNS-over-HTTPS —
`149.28.103.206` — para descartar filtro de rede local). Tentei de novo mais tarde, sem sucesso.

Resultado: **101 das 353 comunidades ficaram com `address: null`**. Os **nomes** das 101 estão
completos e corretos (vieram da ficha da paróquia, não da ficha da comunidade), e a ligação
paróquia↔comunidade está inteira. Só faltam endereço e bairro.

**Para o enxame de validação**: bastam ~101 GETs em
`https://www.diocesevr.com.br/comunidade/<id>` — **com intervalo entre as requisições** — para
fechar. Os ids que faltam são os das comunidades cujo campo `address` está `null` no JSON
(intervalo aproximado 353–470, com lacunas). **Não paralelize.**

## Decisões tomadas

- **Sufixo de cidade removido do nome**: a diocese publica "Paróquia São Sebastião - Barra
  Mansa". O README manda a cidade ir em `city`, então o nome gravado é "Paróquia São Sebastião".
  O nome publicado com a cidade continua no `title` das `sources`.
- **Comunidades homônimas na mesma paróquia** (muito frequente aqui: "Santo Antônio" duas vezes,
  "São Judas Tadeu" duas vezes etc.) foram desambiguadas com o bairro entre parênteses, vindo da
  ficha da comunidade. Onde o endereço não foi baixado, usei um índice numérico — esses casos
  precisam de revisão.
- **Campos extras** fora do formato do README, úteis e sem custo: `vicariate` (um dos 4
  vicariatos) e `clergy` (lista completa de padres e diáconos da ficha). `priestName` recebeu o
  primeiro nome da lista.
- **`foundedYear` é sempre `null`** — a diocese não publica ano de criação.

## Precisa de validação humana

1. **101 comunidades sem endereço** (ver acima). É o item nº 1.
2. **Comunidades homônimas desambiguadas por índice** (e não por bairro) são exatamente as que
   caíram no bloqueio — revisar junto com o item 1.
3. **Paróquia Coração Eucarístico de Jesus (id 44)**: a ficha diz vicariato de Resende, mas o
   endereço é "Praça Ludovico Egalon – Floriano, Barra Mansa/RJ". Gravei `city: "Barra Mansa"`
   (endereço) e `vicariate: "Vicariato de Resende"` (ficha). **Divergência da fonte.**
4. **Paróquia de Sant'Ana – Piraí (id 33)**: o endereço publicado é
   "Rua Pio XII, 236 - Piraí, 236 - Piraí" e a cidade "Piraí - RJ" — repetição e sufixo no
   original. Normalizei para cidade "Piraí"; o logradouro ficou com a repetição da fonte.
5. **Paróquia São Sebastião e área pastoral de Penedo – Serra de Mauá (id 24)**: o nome
   publicado descreve duas realidades pastorais numa entrada só; endereço em Resende. Mantido
   como uma paróquia, conforme a fonte.
6. **Santuário Nossa Senhora das Graças e da Medalha Milagrosa (id 2)**: a diocese o publica na
   lista de paróquias, com 1 comunidade e 15 horários. Tratado como paróquia (prefixo
   "Santuário"), sem `status`.
7. **Capelania Militar da AMAN (id 45) e Capelania Pessoal N. Sra. do Perpétuo Socorro (id 47)**:
   marcadas `nao-paroquial`. Nenhuma das duas publica telefone, e-mail, comunidade ou horário. Se
   a capelania da AMAN publicar missa em outra fonte, ela passa a caber pela regra de
   `loadAsParish`.
8. **Telefones**: muitos são celular/WhatsApp e vários estão fora do padrão (ex.: "(24)
   92000-9437" para a Paróquia Santo Antônio de Lídice, com 5 dígitos começando em 9-2). Gravei
   como publicado.
9. **E-mails suspeitos publicados pela diocese**: `paroquiansp@gmail.com.br` (Pinheiral) e
   `contatoparoquiasaoluisgonzaga@gmail.com.br` (São Luís Gonzaga/VR) — **`gmail.com.br` não
   existe**. Gravados como publicados; provavelmente erro de digitação da diocese.
10. **Nenhum CEP** é publicado pelo site — `zipCode` é `null` em todas as 40 entradas.
