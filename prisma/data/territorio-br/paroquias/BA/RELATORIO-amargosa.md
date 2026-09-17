# Diocese de Amargosa — relatório de pesquisa

- **Slug**: `amargosa` · **UF**: BA · **Sede**: Amargosa · **Província**: São Salvador da Bahia
- **Pesquisa**: 17/09/2026
- **Bispo**: Dom Juraci Gomes de Oliveira (5º bispo) · **Site**: **perdido em 2026** (ver abaixo)
- **Cúria**: Av. Lomanto Júnior, nº 11, Centro · (75) 3634-1176 · dioceseamargosa@gmail.com
- **Território**: 27 municípios — Amargosa, Aratuípe, Cairu, Castro Alves, Conceição do Almeida, Dom
  Macedo Costa, Elísio Medrado, Iaçu, Itatim, Jaguaripe, Jiquiriçá, Laje, Milagres, Muniz Ferreira,
  Mutuípe, Nazaré, Nilo Peçanha, Presidente Tancredo Neves, Rafael Jambeiro, Santa Terezinha, Santo
  Antônio de Jesus, São Felipe, São Miguel das Matas, Taperoá, Ubaíra, Valença e Varzedo.

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **38** — todas `alta` |
| Foranias | 6 (São Mateus 5 · São Marcos 6 · São Lucas 6 · São João 7 · São Pedro 8 · São Paulo 6), campo `forania` |
| Comunidades/capelas | 44 = 38 matrizes + 6 (1 `alta`, 5 `baixa`) |
| Horários fixos | **80** (66 MASS · 13 ADORATION · 1 CONFESSION) — 1 `alta`, 0 `media`, 79 `baixa` |
| Paróquias com algum horário | 19 de 38 |
| Paróquias com horário **carregável** | **1** (N. Sra. do Rosário/Cairu — a missa de sábado em Boipeba) |

**Cobertura: 38 de 38**, fechada por três contagens que casam uma a uma.

## O domínio da diocese foi perdido em 2026

`diocesedeamargosa.com.br` hoje devolve 114 bytes: `window.location.href="/lander"` — é a **página de
estacionamento de domínio** (os IPs 3.33.130.190 / 15.197.148.33 são os do estacionamento da GoDaddy).
O site era um Wix e estava vivo em **18/05/2026** (última captura boa no Arquivo da Internet); em
**31/08/2026** a captura já é a página de estacionamento. Não virou site de apostas (ainda), mas é o
mesmo roteiro de Botucatu/Tocantinópolis/Palmares — **vale avisar a diocese**. `diocese.website` ficou `null`.

Todo o conteúdo oficial veio das capturas de 04–05/2026:

1. **`/paróquias` (18/05/2026)** — os 38 cartões, por forania, com pároco, **ano de criação**, data da
   festa, endereço, CEP, telefone/WhatsApp da secretaria, e-mail e horário da secretaria; no fim, o
   quadro "Configuração das foranias e paróquias" com os vigários forâneos.
2. `/cúria-1` (12/04/2026) — endereço, telefone e e-mail da cúria; `/bispos` — bispo atual.

**Por que `alta` mesmo com o site fora do ar**: a captura tem 4 meses e foi conferida contra **10 perfis
oficiais vivos** no Instagram (posts de 08–09/2026), que repetem os mesmos párocos e telefones:
`@diocesedeamargosa`, `@paroquiasajesus`, `@paroquia.saobenedito.saj`, `@paroquiansps_saj`,
`@paroquiasjdoa`, `@paroquiabomjesus__`, `@paroquia.n_rosario`, `@catolicosdeitatim`, `@paroquiadeiacu`,
`@pascom_mutuipe`. É o oposto de Jequié, onde a lista estava congelada havia anos.

> **Armadilha do Wix nesta página**: cada cartão vem precedido de **três** títulos — o verdadeiro e dois
> rótulos de aba escondidos, que repetem o nome de *outra* paróquia. O título certo é sempre o **primeiro**
> dos três (conferido pelo e-mail e pelo município de cada cartão). Quem ler só o texto corrido vai
> atribuir dados à paróquia errada.

## Prova de completude — filiais do CNPJ (truque do README, funcionou)

Aqui as paróquias **são filiais** do CNPJ **13.562.038** da diocese. Varredura em `minhareceita.org` de
`/0001` a `/0050`: `/0001` é a diocese, **`/0002` a `/0039` são 38 paróquias, todas ATIVAS**, e de
`/0040` a `/0050` **não existe nada**. Os 38 nomes fantasia casam um a um com os 38 cartões do site
(CNPJ de cada uma gravado em `cnpj`). A mais nova é a filial `/0039`, Santo Antônio de Pádua de Mutuípe,
aberta em 06/11/2024 (a paróquia é de 2018). Wikipédia: 38 paróquias / 27 municípios;
`catholic-hierarchy`: 38 em 2022. O telefone de todas as filiais na Receita é o da cúria — inútil para
as paróquias; os telefones gravados são os do site.

## Horários — a diocese não publica nenhum

O site nunca teve página de horários, e nenhuma das 10 bios oficiais lidas traz grade (duas guardam os
horários num destaque "Horários", que o leitor automático não abre). O que existe:

1. **Oficial, `alta` (1)**: `@igrejadodivinoboipeba` — "SANTA MISSA TODO SÁBADO ÀS 19H" (lido duas vezes).
2. **Oficial, mas da época da pandemia → `baixa` (2)**: site Webnode da paróquia de Nazaré — "Missas
   Dominicais às 07h da manhã e 19h da noite". O texto é de **2020** (rodapé "2009-2020", avisos de COVID-19, e
   a mesma página manda "acompanhar as missas nas redes sociais" — ou seja, igreja fechada). Tecnicamente não é
   *anterior* a 2020, mas é exatamente o tipo de grade que a regra do README quer barrar ("toda paróquia
   reorganizou missa depois da pandemia"); a coincidência do domingo 07h com a ficha de 2013 do horariodemissa
   não ajuda, porque as duas são antigas. **Fácil de promover**: basta alguém confirmar com a secretaria.
3. **`liriocatolico.com.br`, `baixa` (66)**: 21 fichas no território. Os telefones e perfis de Instagram
   dessas fichas **batem com a lista oficial de 05/2026**, sinal de base recente — mas a data
   `2026-09-02` é de carga em massa e **achei um erro comprovado**: o Lírio dá *domingo* 19h para a igreja
   de Boipeba, e a bio oficial diz *sábado* 19h. Fonte única não oficial → `baixa`. Gravei os dois, o do
   Lírio com nota.
4. **`horariodemissa.com.br`, `baixa` (11)**: 26 fichas, **todas de 10/02/2013 a 10/01/2015**; só 4 com
   grade (Aratuípe, Conceição do Almeida, Mutuípe, Nazaré).
5. **`buscamissa.com.br`**: uma única ficha em Santo Antônio de Jesus, e é **erro de cadastro** — "Paróquia
   Cristo Operário – Castelo Branco" é de Salvador (bairro Castelo Branco). Descartada.

Recorrência mensal (tudo `baixa`, frase em `notes`): domingos ordinais de Aratuípe ("1º, 3º e 4º domingos
19h", "2º domingo 07h30" — ficha de 2013) e "1ª sexta-feira do mês, 09:00" em São Felipe e em Sagrado
Coração de Jesus/Rafael Jambeiro.

## Comunidades

Nenhuma lista oficial de capelas. Além das 38 matrizes (nome por convenção minha; a da sede leva
"Catedral"), entraram 6 locais de missa:

- `alta`: **Comunidade Divino Espírito Santo (Boipeba)** — o perfil oficial se declara comunidade da
  Paróquia N. Sra. do Rosário de Cairu (igreja de 1610). Lugar turístico: é dos horários mais úteis do app.
- `baixa` (só no Lírio): Convento Santo Antônio, Igreja N. Sra. da Luz (Gamboa) e Igrejinha de São
  Francisco (Morro de São Paulo) — todas em Cairu; Igreja N. Sra. do Amparo (Valença); e Igreja de São
  Gonçalo (Aratuípe, ficha de 2013).

## Pontos que precisam de validação humana

1. **Avisar a diocese de que o domínio caiu** e pedir o site novo, se houver.
2. **Igreja N. Sra. do Amparo (Valença)**: o Lírio não diz a paróquia; vinculei à do Centro (Sagrado
   Coração de Jesus) **por presunção**. É `baixa`, não carrega — mas conferir.
3. **Santa Terezinha**: o título é "Nossa Senhora da Conceição", mas a festa publicada é 01/10 (dia de
   Santa Teresinha). Conferir o padroeiro. (IBGE grafa o município "Santa Terezinha"; a Receita,
   "Santa Teresinha".)
4. **Aratuípe e Jaguaripe** aparecem com o **mesmo pároco, telefone e e-mail** (`santanaparoquia@…`).
   Gravei como publicado — parece atendimento conjunto, não erro.
5. **CEPs errados na fonte**, substituídos pelo da Receita (nota em cada paróquia): N. Sra. das Graças/SAJ
   ("44444-088"), N. Sra. do Perpétuo Socorro/SAJ ("44.430-622"), N. Sra. das Mercês/SAJ ("454.570-990"),
   Conceição do Almeida ("44590-970", que é de Santa Terezinha), São Benedito/SAJ e São Roque/Mutuípe
   (genérico/caixa postal), Argoim (44520-000 → 44525-000). **São Benedito de Serra Grande ficou sem CEP**
   (o site não publica e a Receita repete o genérico de Valença).
6. **Endereço de cartão × endereço da Receita** divergem em 6 paróquias (Elísio Medrado, Tancredo Neves,
   Castro Alves, Conceição do Almeida, Nazaré/Purificação, Mercês/SAJ). Fiquei com o do site; a divergência
   está em `notes`.
7. **Nomes normalizados por mim**: "Paróquia Santo Antônio de Jesus - SAJ" → **Paróquia Santo Antônio**
   (como no quadro de foranias); "Santo Antônio de Pádua de Paraíso - E. Medrado" → **Santo Antônio de
   Pádua** ("Paraíso" é o nome antigo do município); "Santo Antônio do Argoim" → **Santo Antônio**, com
   Argoim em `neighborhood`; "São São Brás" (erro de digitação) → **São Brás**; "N. Sra. D'Ajuda"/"da Ajuda"
   → **Nossa Senhora d'Ajuda**; a da sede → **Catedral Nossa Senhora do Bom Conselho**. **São José do
   Andaiá** ficou inteiro: o bairro faz parte do nome oficial.
8. **"Pe." acrescentado** a 8 párocos que o site publica sem o título (Castro Alves, Bom Jesus/Valença,
   São Felipe, Rainha dos Anjos, Aratuípe/Jaguaripe, São Roque e Santo Antônio de Mutuípe, Laje).
9. **São Benedito de Serra Grande** fica no município de **Valença**, mas pertence à Forania São Paulo
   (Ubaíra/Jiquiriçá/Mutuípe/Laje), não à de Valença. `city: "Valença"`, distrito em `neighborhood`.
10. **Dom Macedo Costa** é a única paróquia sem telefone publicado.
11. **Horários mais fáceis de recuperar à mão**: destaques "Horários" de `@paroquiasjdoa` (São José do
    Andaiá) e a página Canva da N. Sra. do Perpétuo Socorro/SAJ
    (`paroquia-nossa-senhora-do-perpetuo.my.canva.site/informacoes`) — existem, mas não são legíveis por
    leitor automático.
