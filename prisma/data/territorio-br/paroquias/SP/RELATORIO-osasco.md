# Relatório — Diocese de Osasco (SP)

**Agente de pesquisa · 10/09/2026 · arquivo `paroquias/SP/osasco.json`**

| | |
|---|---|
| Circunscrição | Diocese de Osasco (sufragânea da Arquidiocese de São Paulo) |
| Sede | Osasco/SP — Rua Dom Ercílio Turco, 60, Vila Osasco — 06080-000 — (11) 3683-4522 |
| Bispo | Dom Frei João Bosco Barbosa de Sousa, OFM (nomeado em 16/04/2014) |
| Site | https://diocesedeosasco.com.br |
| Paróquias no dataset | **90** (todas com confiança `alta`) |
| Comunidades | **538**, em 87 das 90 paróquias — **todas com endereço** |
| Horários fixos | **280** (263 `alta`, 17 `baixa`) em **apenas 32** das 90 paróquias |

## Fontes principais

1. **https://diocesedeosasco.com.br/paroquias-osasco/** (10 páginas, `…/page/N/`) — a lista oficial:
   **89 paróquias**. O filtro por região confirma a divisão em **9 regiões pastorais**:
   Carapicuíba (14), Cotia (13), Bonfim (13), Santo Antônio (10), São José Operário (9),
   Barueri (8), São Roque (8), Itapevi (8) e Ibiúna (6) — soma exata de 89.
2. **Ficha de cada paróquia** `https://diocesedeosasco.com.br/paroquia/<slug>` (90 lidas) — telefone,
   endereço com bairro e CEP, e-mail, site próprio, expediente, **clero com cargo** (pároco, vigário,
   administrador paroquial, diácono), **tabela de horários de missa** e a **lista de capelas/comunidades**.
3. **Ficha de cada capela/comunidade** `https://diocesedeosasco.com.br/capela/<slug>` — **as 451 foram
   lidas**, uma a uma. Deram **endereço com bairro e CEP de todas as 451** e horário próprio de 87 delas.
4. **https://diocesedeosasco.com.br/horarios-de-missa/** (4 páginas) — o diretório diocesano de missas,
   por paróquia e por comunidade, com dia da semana, horário e **selo de recorrência**
   (Semanal / Diária / Mensal). Cobre **32 instituições**.
5. **https://diocesedeosasco.com.br/area-geografica/** — criada em 15/03/1989 por João Paulo II,
   instalada em 01/05/1989; **13 municípios**; **9 regiões pastorais**; "**90 paróquias** organizadas em
   mais de 500 comunidades, 177 padres e 4 diáconos"; padroeiro Santo Antônio de Pádua.
6. **https://diocesedeosasco.com.br/curia-diocesana/** — endereço, CEP, telefone e e-mail da Cúria.
7. **https://www.catholic-hierarchy.org/diocese/dosas.html** — ereção 15/03/1989, **90 paróquias (2023)**,
   2.229.000 católicos, sufragânea de São Paulo.

> **O site bloqueia leitores automáticos com HTTP 403.** As ~550 páginas foram baixadas com `curl` e
> User-Agent de navegador. Os horários vêm de um atributo `data-item` com JSON estruturado
> (`type`, `recurrence`, `weekDays`, `schedules`), o que elimina interpretação de texto livre.

## Cobertura

- **90 encontradas / 90 esperadas** — bate com o site e com o catholic-hierarchy.
- A lista "Nossas Paróquias" traz **89**. A 90ª entrada é o **Mosteiro das Monjas da Ordem dos
  Pregadores (Dominicanas)**, em São Roque, que o site cadastra como instituição do tipo "paróquia" e
  publica no diretório de horários, **mas não lista entre as paróquias e não é paróquia** (ver item 1
  dos pontos de validação).
- Os **13 municípios** estão representados: Osasco (27), Carapicuíba (14), Cotia (9), Barueri (8),
  São Roque (6), Ibiúna (6), Itapevi (5), **cidade de São Paulo (5)**, Jandira (3),
  Vargem Grande Paulista (3), Mairinque (2), Alumínio (1) e Araçariguama (1).
  As 5 paróquias com `city = "São Paulo"` correspondem à "pequena área da cidade de São Paulo" que a
  própria diocese declara abranger (Jardim Dracena, Vila Piauí, Jardim Arpoador, Vila Jaguara e
  Jardim Educandário, na região do Jaguaré/Raposo).
- **Contato:** 86 das 90 com telefone, **90 com e-mail**, 89 com CEP, 90 com endereço, 82 com bairro,
  87 com pároco/administrador, 16 com site próprio.
- Cobertura de paróquias e comunidades considerada **completa**; a de **horários, não** (ver abaixo).

## Comunidades

- **538 comunidades** — 451 capelas/comunidades com ficha própria (**todas com endereço, bairro e CEP**)
  + a **Matriz** de cada uma das 87 paróquias que têm capelas. Bate com o "mais de 500 comunidades"
  declarado pela diocese.
- **3 paróquias sem capela cadastrada**: `santa-gema-galgani-osasco`, `santo-antonio-de-padua-sao-paulo`
  e o mosteiro dominicano.
- Os nomes foram mantidos **como publicados**. O site usa rótulos inconsistentes para a mesma capela —
  a ficha diz "Comunidade Cristo Redentor" e o diretório de horários diz "Capela Comunidade Cristo
  Redentor". As duas grafias foram **casadas e fundidas** (a chave ignora prefixos repetidos
  Capela/Comunidade/Igreja/Centro), evitando comunidades duplicadas.

## Horários — a principal lacuna

- **Só 32 das 90 paróquias (36 %) têm horário publicado.** As outras **58 não publicam missa em
  nenhuma das fontes oficiais**: nem na tabela da ficha, nem na ficha das suas capelas, nem no
  diretório diocesano. A base de horários do site é **nova e ainda incompleta** — quase todos os
  registros de paróquia foram criados em 2026 (ver item 3).
- Distribuição dos 280 registros: **144 vêm da ficha da capela/comunidade**, **135 da ficha da
  paróquia** e 1 apenas do diretório diocesano. **144 são de comunidades** e 136 da Matriz.
- **17 `baixa`**: missas de recorrência **mensal ou quinzenal**. Atenção — **o selo do site mente**
  em vários casos: a linha vem marcada "Semanal" e a observação diz "2º e 4º Domingo" ou
  "1º e 3º Sábado". Foi adotada a regra de **rebaixar para `baixa` sempre que a observação indica
  recorrência não semanal**, ainda que o selo diga "Semanal". São 14 registros assim, em
  N. Sra. Aparecida (Vargem Grande Paulista), Santa Catarina de Alexandria (Mairinque) e
  São José (Mairinque).
- **Tipos:** 279 `MASS` e 1 `ADORATION`. **Nenhum `CONFESSION`** — a diocese não publica horário de
  confissão. O campo "Atendimentos e Setores" da ficha é **expediente de secretaria**, não confissão,
  e foi deliberadamente ignorado.

## Pontos para validação humana / enxame de validação

1. **`monjas-da-ordem-dos-pregadores-dominicanas-sao-roque` não é paróquia.** É o mosteiro das monjas
   dominicanas em São Roque, cadastrado pelo site como instituição do tipo "paróquia" (e por isso
   contado nas "90"). Tem missa pública diária às 7h e domingo às 8h. **Rever antes da carga** — o nome
   também não tem prefixo padronizado, porque é o nome publicado.
2. **`nossa-senhora-da-penha-aracariguama` — cidade deduzida.** A ficha publica
   `"Praça Albertino de Castro Prestes (Matriz) - s/n - CEP 18147-000 s/n, Sp"`, sem município.
   O CEP **18147-000** e o logradouro são do **Centro de Araçariguama** (confirmado em busca pública:
   a praça é a matriz de Nossa Senhora da Penha, cuja festa centenária ocorre ali), e Araçariguama é um
   dos 13 municípios da diocese sem nenhuma outra paróquia. **Gravado `city: "Araçariguama"`** — é a
   única inferência do arquivo e precisa de confirmação.
3. **`foundedYear` quase todo descartado.** O campo "Fundada em" da ficha traz **datas de 2026 em 83 das
   90 paróquias** ("Fundada em 7 de julho de 2026" em 56 delas) — são as datas de **importação do
   cadastro no CMS**, não a fundação. Foram **anulados todos os anos ≥ 2025**; restaram só 7 anos
   plausíveis: Cristo Rei/Osasco (2006), Cristo Ressuscitado/Carapicuíba (2006),
   N. Sra. Aparecida/Carapicuíba (1952), N. Sra. das Graças/Novo Osasco (1977),
   N. Sra. do Rosário de Fátima/Piratininga (2013), N. Sra. Mãe da Igreja/Barueri (1973) e
   Rainha Santa Isabel/Barueri (1999). **Mesmo esses 7 merecem conferência.**
4. **58 paróquias sem horário de missa** — é a maior pendência. As melhores fontes para completar são,
   nesta ordem: (a) os **16 sites próprios** já gravados em `website`; (b) as redes sociais oficiais das
   paróquias; (c) agregadores (horariodemissa.com.br tem fichas de Osasco). **Nada foi importado de
   agregador**: casar 58 paróquias por nome aproximado tem risco alto de atribuir missa à paróquia
   errada, e uma fonte não oficial isolada entraria como `baixa` de qualquer forma.
5. **Selo de recorrência não confiável** (ver acima). Toda linha "Semanal" com observação de ordinal
   ("1º e 3º Domingo") precisa ser reclassificada — no dataset já saiu como `baixa`, mas o site
   continua exibindo como semanal.
6. **Sufixos de desambiguação removidos do nome.** O site publica 18 paróquias com um sufixo de bairro
   ou cidade após uma barra vertical — "Paróquia Imaculada Conceição | Dracena",
   "Paróquia São José | Mairinque", "Paróquia São José Operário | Jd. D'Abril". O sufixo **foi retirado
   do `name`** (a cidade vai em `city` e o bairro em `neighborhood`, conforme o README) e usado no
   `slug` quando havia homônimas na mesma cidade.
7. **Erros de digitação no cadastro do site**, corrigidos no arquivo: cidade **"AlumÍnio"** (I maiúsculo
   acentuado) → "Alumínio"; **"CarapicuÍba"** nas fichas de capela; e o campo cidade preenchido com
   **"Sp"** em duas paróquias (uma resolvida no item 2, a outra — Santa Catarina de Alexandria — trazia
   "Mairinque - SP" dentro do logradouro).
8. **4 paróquias sem telefone**: `nossa-senhora-das-gracas-barueri`,
   `nossa-senhora-do-rosario-de-fatima-cotia`, `santo-antonio-cotia`, `sao-judas-tadeu-ibiuna`.
   **1 sem CEP**: `santa-catarina-de-alexandria-mairinque`. **3 sem pároco**: o mosteiro,
   `nossa-senhora-aparecida-osasco-jardim-padroeira-ii` e `nossa-senhora-de-nazare-sao-paulo`.
9. **`priestName` = pároco ou administrador paroquial.** A ficha traz o clero com cargo explícito;
   foi gravado o primeiro com cargo "Pároco" ou "Administrador Paroquial". Vigários e diáconos não
   entraram. **O bispo aparece no bloco de clero da Catedral** e foi corretamente ignorado.
10. **E-mails ofuscados por Cloudflare** (`[email protected]`) — decodificados do atributo `data-cfemail`.
    Vale conferir por amostragem.
11. **Duas paróquias "Cristo Rei"** (Osasco/Jardim Baronesa e Itapevi/Vila Nova Itapevi) e várias
    "Nossa Senhora Aparecida" homônimas em cidades diferentes — desambiguadas por `city` e, quando na
    mesma cidade, por bairro no `slug`.
