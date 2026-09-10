# Relatório — Arquidiocese de Santa Maria (RS)

**Agente de pesquisa · 10/09/2026 · arquivo `paroquias/RS/santa-maria.json`**

| | |
|---|---|
| Circunscrição | Arquidiocese de Santa Maria (arquidiocese metropolitana) |
| Sede | Santa Maria/RS — Rua Silva Jardim, 2038, Centro — CEP 97010-492 — (55) 3290-6236 / (55) 3290-6237 — ascom@arquism.com.br |
| Arcebispo | Dom Leomar Antônio Brustolin (desde 02/06/2021) |
| Site | https://www.arquism.com.br |
| Sufragâneas | Cachoeira do Sul, Cruz Alta, Santa Cruz do Sul, Santo Ângelo e Uruguaiana |
| Registros no dataset | **42** (39 paróquias + 2 quase-paróquias + 1 área missionária), todos `alta` |
| Municípios cobertos | 26 (todos os do território) |
| Foranias | Santa Maria, São Pedro, São Sepé, Quarta Colônia e Mãe de Deus |
| Comunidades nomeadas | **2** (só a Basílica Medianeira publica a divisão) |
| Horários fixos | **145** (119 `alta`, 18 `media`, 8 `baixa`) — todos `MASS` |

## ⚠️ Nota técnica obrigatória — o site oficial bloqueia leitores automáticos

**https://www.arquism.com.br** (Next.js hospedado na Vercel) responde **HTTP 429 com a página
"Vercel Security Checkpoint"** — *Attack Challenge Mode*, um desafio de JavaScript — a qualquer
requisição sem navegador real, **independentemente do User-Agent** (testado com Chrome, Googlebot e
com o WebFetch). O domínio antigo `www.arquism.com` hoje aponta para a mesma aplicação e responde
igual.

Todo o conteúdo deste dataset foi obtido de **capturas da Wayback Machine**, sempre do próprio site
da Arquidiocese, usando o sufixo `id_` (conteúdo original, sem a barra do archive.org):

| Captura | Origem | O que forneceu |
|---|---|---|
| **14/10/2025** | `arquism.com.br/paroquias` | lista oficial completa: nome, endereço, CEP, bairro, cidade e forania das 42 circunscrições (payload RSC do Next.js, campo por campo) |
| **14/01/2026** | `arquism.com.br/horarios-das-missas` | grade oficial de horários de missa, por igreja |
| **09/08/2025** | `arquism.com/paroquias` (site anterior, Wix) | **pároco/administrador, vigários, telefone, e-mail** e uma segunda grade de horários, organizados por forania |

Quem for revalidar precisa de um navegador headless (ou de acesso pela interface) — abrir a URL
simples devolve só o checkpoint. Os dados de paróquia do site novo vêm do back-end **Unitas**
(`storage.unitas.app.br/33/…`), que não expõe API pública.

## Fontes principais

1. **https://www.arquism.com.br/paroquias** (Wayback 14/10/2025) — a enumeração oficial.
2. **https://www.arquism.com.br/horarios-das-missas** (Wayback 14/01/2026) — horários oficiais.
3. **https://www.arquism.com/paroquias** (Wayback 09/08/2025) — site anterior; único lugar com clero,
   telefone e e-mail por paróquia.
4. **https://cnbbsul3.org.br/arquidiocese-de-santa-maria_/** — cúria (endereço, telefones, e-mail),
   arcebispo, governo, 26 municípios, **"39 paróquias, uma quase-paróquia e uma área missionária;
   totalizando 485 comunidades (capelas)"**, 71 presbíteros e 16 diáconos permanentes.
5. **https://www.catholic-hierarchy.org/diocese/dsmbr.html** — ereção como diocese 15/08/1910,
   elevação a arquidiocese 13/04/2011, 20.263 km², **40 paróquias** e 336.900 católicos em 2023.

## Cobertura

- **42 registros encontrados / 40 paróquias esperadas** (catholic-hierarchy 2023) — ou 41 pela conta
  da CNBB (39 + 1 quase-paróquia + 1 área missionária).
- A lista oficial classifica 39 como `Paróquia` e 3 como `Quase Paróquia`: **São Francisco de Assis**
  (Santa Maria), **São Martinho Thours** (São Martinho da Serra) e a **Área Missionária Nossa Senhora
  de Guadalupe** (Santa Maria). Ou seja, a lista oficial tem **duas** quase-paróquias, uma a mais do
  que a CNBB registra — a diferença de 42 × 40/41 vem daí, não de paróquias faltando.
- Todos os 26 municípios do território têm ao menos uma paróquia. Santa Maria concentra 16 registros.
- **42 de 42** têm e-mail e pároco/administrador; **41** têm CEP; **38** têm telefone.
- `foundedYear` ficou `null` em todas: **nenhuma das fontes publica o ano de ereção das paróquias**.

## Comunidades — o maior débito

A Arquidiocese declara **485 comunidades/capelas**, mas **não publica a lista** em lugar nenhum
(nem o site novo, nem o antigo, nem a CNBB). Por isso `communities: []` em 41 dos 42 registros e todo
horário aponta para `"Matriz"`.

A única exceção é a **Basílica-Santuário Nossa Senhora Medianeira de Todas as Graças**, cuja grade
oficial separa explicitamente as missas "Na Basílica" das missas "Na capela São José". Foram gravadas
duas comunidades — `Basílica Nossa Senhora Medianeira` (`isMatriz: true`) e `Capela São José` — e os
19 horários foram distribuídos entre elas.

## Horários

- **39 das 42** têm horários. Sem nenhum: N. Sra. da Pompéia/Dilermando de Aguiar,
  N. Sra. dos Remédios/Quevedos e a Quase-paróquia São Martinho Thours (nenhuma das duas grades
  oficiais publica horário para elas).
- **119 `alta`**: horários semanais que **coincidem** nas duas publicações oficiais (14/01/2026 e
  09/08/2025), ou que só existem na de 2026 em paróquias cuja grade de 2025 estava vazia.
- **18 `media`**: horários da publicação de **14/01/2026** que **divergem** da grade de 09/08/2025 para
  o mesmo dia. Foi gravado o mais recente e a divergência está registrada no `notes` de cada um.
  Paróquias afetadas (13): São Pedro/Arroio Grande, São Caetano/Boca do Monte, N. Sra. das
  Vitórias/Cacequi, São José/Itaara, N. Sra. da Imaculada Conceição/Jaguari, Santo Antônio/Mata,
  N. Sra. das Dores, Nosso Senhor do Bom Fim, Ressurreição, São José do Patrocínio,
  Quase-paróquia São Francisco de Assis (todas em Santa Maria), São Pedro Apóstolo/São Pedro do Sul e
  São Vicente Ferrer/São Vicente do Sul.
- **8 `baixa`**: recorrência **mensal** ("1ª Sexta do mês", "Última Quarta do mês", "1ª Quarta do
  mês") — o modelo do dataset só representa recorrência semanal.
- **Descartados** (não têm dia da semana): as três missas de data fixa da **Paróquia Nossa Senhora de
  Fátima/Santa Maria** — "No dia 4 do mês: 16h", "No dia 13 do mês: 16h" e "No dia 23 do mês: 16h".
  Estão registradas aqui para o enxame de validação.
- Refinamento aplicado a partir da grade de 2025 (mais precisa que a de 2026):
  - **Nosso Senhor do Bom Fim** — a grade de 2026 diz "Segunda a Sexta: 18h30" *e* "Quarta: 17h"; a de
    2025 detalha "Segunda, terça, quinta e sexta: 18h30" + "Quarta: 17h". A quarta 18h30 ficou `media`.
  - **Basílica Medianeira** — a grade de 2026 conflui tudo em "Segunda a Sábado: 16h e 18h"; a de 2025
    separa a capela São José (terça, quinta e sábado 6h30) da Basílica. Foi usada a de 2025.

## Pontos para validação humana / enxame de validação

1. **Duas capelas com horário oficial e sem paróquia identificada.** A página
   `/horarios-das-missas` (14/01/2026) lista, além das 42 paróquias, duas igrejas em Santa Maria que
   **não constam da lista de paróquias** e cuja paróquia-mãe não é declarada:
   - **Capela São Francisco** — Domingo 18h30 (`slug` do site: `capela-sao-francisco`);
   - **Capela Santa Cecília** — Sábado 18h (`capela-santa-cecilia`).
   Não foram gravadas para não inventar vínculo. Descobrir a que paróquia pertencem e anexá-las como
   `communities` é o item mais valioso de validação desta arquidiocese.
2. **Nomes normalizados / divergências de rótulo:**
   - `nossa-senhora-imaculada-conceicao-santa-maria` — o site chama de "Nossa Senhora Imaculada
     Conceição - Catedral Metropolitana"; gravado como **"Catedral Nossa Senhora Imaculada Conceição"**.
   - `nossa-senhora-medianeira-de-todas-as-gracas-santa-maria` — a lista de paróquias chama de "Nossa
     Senhora Medianeira de Todas as Graças" (com `is_basilica` e `is_sanctuary` = true) e a página de
     horários de "Santuário Basílica Nossa Senhora Medianeira de Todas as Graças". Gravado como
     **"Santuário Nossa Senhora Medianeira de Todas as Graças"** (o prefixo "Basílica" não está na
     lista de prefixos do dataset). É simultaneamente paróquia, basílica e santuário.
   - `nossa-senhora-de-guadalupe-santa-maria` — o site atual chama de **"Área Missionária Nª Sra de
     Guadalupe"** mas classifica o registro como `Quase Paróquia`; o site anterior chamava de
     "Quase-Paróquia Nossa Senhora de Guadalupe" e a CNBB fala em "uma quase-paróquia e uma área
     missionária". Gravado como **"Quase-paróquia Nossa Senhora de Guadalupe"**. **Confirmar o estatuto
     canônico.** O e-mail publicado é o do Instituto São José
     (`institutosaojose.santamariars@gmail.com`), não um endereço `@arquism.com.br`.
   - `ressurreicao-santa-maria` — a página de horários chama de "Paróquia da Ressurreição"; o site
     anterior traz o cabeçalho "Ressurreição" com o subtítulo **"Santuário Nossa Senhora de Lourdes"**.
     Gravado como **"Paróquia Ressurreição"**. Conferir se o santuário é comunidade da paróquia.
3. **Endereços divergentes entre as duas publicações oficiais** (foi gravado o mais recente, 2025-10):
   - **Ressurreição** — 2026: "R. Otávio Alves de Oliveira, 100, N. Sra. de Lourdes, 97050-550";
     2025: "R. Irmão Donato, 150, N. Sra. de Lourdes, 97050-300".
   - **Quase-paróquia N. Sra. de Guadalupe** — 2026: "Rua Antonio Gonçalves do Amaral, 3005, Bairro
     São José, 97110-070"; 2025: Instituto São José, "Rua Aron Fischman – Dom Antônio Reis, 97065-030".
   - **São Roque/Faxinal do Soturno** — 2026: "Tv. Vicente Paloti, 98"; 2025: "Praça, Tv. Vicente
     Paloti, 83".
   - Em 4 registros a lista de 2025-10 traz **só o nome do município** no campo de endereço; o
     logradouro e o CEP foram completados com o site anterior (Cacequi, Itaara, Jaguari e São Pedro
     do Sul) — nesses o `sources` inclui a captura de 09/08/2025.
4. **Campos com erro de digitação na fonte oficial** (gravados como publicados):
   - `nossa-senhora-de-fatima-santa-maria` — na lista oficial o **CEP e o bairro estão trocados**
     ("97015-511" no campo bairro e "Nossa Sra. de Fátima" no campo CEP). Foi corrigido no JSON.
   - `nossa-senhora-do-rosario-santa-maria` — o endereço oficial traz "Rua do Rosário, 401, Rosário 73,
     Nossa Senhora do Rosário"; o fragmento "Rosário 73" foi descartado.
   - `santissima-trindade-nova-palma` — e-mail publicado com "aa": `santissimatrindaade@arquism.com.br`.
   - `sao-jose-nova-esperanca-do-sul` — "R. Garibalde" (grafia oficial da rua é Garibaldi).
   - `sao-jose-do-patrocinio-santa-maria` — o site anterior publica o CEP "9700l-970" (com a letra L);
     foi usado o 97020-140 da lista de 2025-10.
   - `nossa-senhora-da-imaculada-conceicao-jaguari` — CEP 97760-970 (faixa de caixa postal). Conferir.
5. **Municípios:** a lista oficial escreve **"Dilermano de Aguiar"**; a CNBB e o catholic-hierarchy
   escrevem **"Dilermando de Aguiar"** (grafia do IBGE) — foi gravada a forma correta.
   **"Restinga Seca"** foi mantida como publicada pela Arquidiocese e pela CNBB; o IBGE grafa
   "Restinga Sêca".
6. **Pároco publicado sem o tratamento:** `nossa-senhora-mae-de-deus-tupancireta` traz
   "Pároco: Hugo Aparecido Lemes" (sem "Pe."). Gravado como publicado.
7. **Sem telefone (4):** N. Sra. da Pompéia/Dilermando de Aguiar, N. Sra. das Dores/Santa Maria,
   Quase-paróquia São Francisco de Assis/Santa Maria e N. Sra. das Mercês/São Sepé — nenhuma das
   fontes publica número.
8. **Sem CEP (1):** Quase-paróquia São Francisco de Assis/Santa Maria (endereço oficial: "Rua São
   Carlos, 475"; o site anterior dizia apenas "Vila Urlândia").
9. **Idade dos dados de clero e contato.** `priestName`, `phone` e `email` vêm da captura de
   **09/08/2025** do site anterior — 13 meses. As mudanças de pároco no RS costumam sair em janeiro,
   então essa é a informação mais provável de estar desatualizada em todo o arquivo. Vigários e
   diáconos não foram gravados (o schema tem só `priestName`), mas estão na fonte.
10. **Padres que acumulam paróquias** (útil para conferir): Pe. Dalvino Dal Molin aparece como pároco
    de 4 (Arroio Grande, Ivorá, Silveira Martins e — no site antigo — São Pedro da Quarta Colônia);
    Pe. Gildo José Brandt de 3 (São Sepé, Vila Nova do Sul e Formigueiro); Pe. José Carlos Hahn, SAC de
    3 (Dona Francisca, Faxinal do Soturno e Corpo de Deus/Vale Vêneto); Pe. Rodrigo Cabrera de 2
    (Santa Catarina e Itaara); Pe. Edson Salin de 2 (Boca do Monte e São Martinho da Serra);
    Pe. Júnior Lago de 2 (Catedral e N. Sra. do Rosário); Pe. Antônio Tadiello Taschetto de 2
    (Cacequi e Mata — grafado "Tadiello" numa e "Tadielo" na outra); Pe. Jair de Bairros Gomes de 2
    (São Pedro do Sul e Dilermando de Aguiar).
11. **485 comunidades sem lista** — ver a seção "Comunidades". É o débito estrutural desta
    arquidiocese; provavelmente só a Cúria (55 3290-6236) ou as páginas/redes sociais de cada paróquia
    resolvem.
