# Relatório de pesquisa — Arquidiocese de Londrina (PR)

Data da pesquisa: 2026-09-10. Arquivo de dados: `londrina.json`.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://siteantigo.arquidioceselondrina.com.br/paroquias/ | Listagem oficial: 84 paróquias com decanato e pároco (filtro por 11 decanatos) | alta |
| https://siteantigo.arquidioceselondrina.com.br/paroquias/?paroquia=<id> (84 páginas) | Nome, decanato, cidade, pároco, vigários/diáconos, telefone, site, Facebook, e-mail, endereço com CEP; 1 página com capela (Catedral) e 1 com horários (Mãe da Divina Providência) | alta |
| https://siteantigo.arquidioceselondrina.com.br/horarios-de-missas/ | Horários de Missa de 69 paróquias em 9 decanatos (Rolândia e Porecatu ausentes); sem data de atualização | media |
| https://siteantigo.arquidioceselondrina.com.br/curia-arquidiocesana/ | Endereço, CEP, telefone e e-mails da Cúria; vigário geral e chanceler | alta |
| Sites paroquiais oficiais (ver abaixo) | Horários de 8 paróquias, com sinal de atualidade em 6 | alta / media |
| https://divisaodaigreja.com/paroquias/arquidiocese-de-londrina/ (83 fichas, datadas de 17/06/2023) | Espelho do site arquidiocesano em 2023: capelas nomeadas e horários por capela; horários de paróquias ausentes da página oficial | media (comunidades) / baixa (horários) |
| https://www.horariodemissa.com.br/igreja.php?k=iSlQr e ?k=xa5be | Horários de 2 paróquias de Rolândia (atualizados em 27/04/2014) | baixa |
| Páginas oficiais no Facebook (via resumo do buscador): Jaguapitã, São Paulo Apóstolo/Rolândia, Lupionópolis, Florestópolis | Horários citados no resumo de busca; páginas não acessíveis ao agente | media (corroborado) / baixa |
| https://www.catholic-hierarchy.org/diocese/dlona.html · https://gcatholic.org/dioceses/diocese/lond1.htm | Nº esperado (83 em 2023 / 83 + 260 missões em 31/12/2022), arcebispo, sufragâneas, Cúria | media |
| https://pt.wikipedia.org/wiki/Arquidiocese_de_Londrina | 84 paróquias, 16 municípios, 11 decanatos; ano de criação de cada paróquia (`foundedYear`) | media |

**Site oficial atual bloqueado.** https://arquidioceselondrina.com.br (páginas `/paroquias` e `/paroquias/<slug>`,
que os resumos de busca mostram com horários) responde HTTP 429 com "Vercel Security Checkpoint" a toda requisição
(WebFetch e curl com User-Agent de navegador, em vários momentos). Os sites santaritalondrina.com.br e
piedadelondrina.com.br estão na mesma infraestrutura e também bloqueiam. web.archive.org não é acessível ao agente.
Usou-se o **site antigo oficial** (siteantigo.…), que continua mantido: o menu cita "Dom Marcos José, Bispo de CP" (posse
em 2022), a listagem inclui as paróquias mais novas (ids até 96) e os párocos batem com os sites paroquiais de 2026
(ex.: São José/Rolândia — Pe. Romão Antonio Martini Martins). CNBB Regional Sul 2 retorna 403.

Sites paroquiais consultados: catedrallondrina.com.br (posts até 12/2024 → media), rainhadosapostolos.com.br (© 2026 →
alta), cordemaria.com.br/horarios (© 2026 → alta), paroquiasagradoscoracoes.com.br/horarios-de-missas (© 2025 → media),
auxiliadoraonline.com.br/horarios (notícias de 06/2026 → alta), mdprovidencia.com.br (notícia de 08/09/2026 → alta),
saojoserolandia.com.br/horarios (© 2026 → alta), nossasenhoraporecatu.com.br/pagina/horarios-de-missa (© 2026 → alta).
Sem dados: santuariolondrina.com.br (página só com imagem), imaculadalondrina.com.br (horários em imagem PNG).
Fora do ar (DNS não resolve; `website` ficou `null`): nossasenhoradapaz.com.br, rosariorecreio.com.br, pncarmo.com.br,
pallottilondrina.com.br, paroquiafatimacambe.com.br, paroquiasenhoradapaz.com.br, paroquiacristobompastor.com.br,
saovicentedepaulolondrina.com.br, rainhadouniverso.com.br.

## Cobertura

- **Paróquias encontradas: 84 — esperadas: 84** (Wikipédia; Catholic-Hierarchy/GCatholic dão 83 em 2022/2023 — a
  diferença é a Paróquia Mãe da Divina Providência, Londrina, presente na listagem oficial e com site ativo em 09/2026).
  16 municípios. Por decanato (campo `deanery`, extra ao esquema): Centro 12, Leste 10, Oeste 9, Norte 10, Sul 6,
  Tamarana 6, Cambé 8, Rolândia 7, Sertanópolis 5, Ibiporã 5, Porecatu 6.
- Confiança das paróquias: **84 alta**, 0 media, 0 baixa.
- Comunidades: **145** (84 matrizes + 61 capelas/comunidades em 27 paróquias): **88 alta** (matrizes, as 3 capelas de
  Sertanópolis listadas na página oficial de horários e a capela anexa à Catedral) e **57 media** (nomeadas só no espelho
  de 06/2023 do site arquidiocesano). 57 paróquias ficaram só com a matriz.
- Horários: **588 registros** (574 MASS, 7 CONFESSION, 6 ADORATION, 1 ROSARY): **73 alta** (sites paroquiais com sinal
  de 2026), **421 media** (página oficial de horários, sem data; Catedral e Sagrados Corações via site paroquial sem
  sinal ≤ 12 meses; Jaguapitã e São Paulo Apóstolo via Facebook corroborado), **94 baixa** (horários de capelas e das
  paróquias de Rolândia/Porecatu que só constam no espelho de 2023, agregadores de 2014 e resumos de busca não
  corroborados).
- **2 paróquias sem nenhum horário**: São Martinho (Rolândia) e Nossa Senhora das Graças (Centenário do Sul).
  Só têm horários `baixa`: N. S. Aparecida/Rolândia, São Pedro Apóstolo e N. S. de Fátima/Rolândia, Ressurreição/Rolândia,
  Cristo Rei/Lupionópolis, São João Batista/Florestópolis, São José Bento Cotolengo/Miraselva, São João Batista/Prado
  Ferreira.

## Regras aplicadas

- Nome: título da página de detalhe (em caixa alta) normalizado; bairro entre parênteses foi para `neighborhood`.
  "CATEDRAL - PARÓQUIA SAGRADO CORAÇÃO DE JESUS" → "Catedral Metropolitana Sagrado Coração de Jesus"; "PARÓQUIA PESSOAL
  NIPO-BRASILEIRA (Imaculada Conceição - Centro)" → "Paróquia Pessoal Nipo-Brasileira Imaculada Conceição"; "Paróquia
  Santa Izabel (Lerroville)" → "Paróquia Santa Isabel" (forma da página de horários, da Wikipédia e do Facebook
  "santaisabeldahungria"); "Paróquia Sant'ana" → "Paróquia Sant'Ana"; "QUASE-PARÓQUIA NOSSA SENHORA DE FÁTIMA" →
  "Quase-paróquia Nossa Senhora de Fátima"; "Paróquia Da Ressurreição" → "Paróquia da Ressurreição".
- `slug`: `<nome-sem-prefixo>-<cidade>`, sem artigo inicial ("sagrados-coracoes-londrina", "ressurreicao-rolandia");
  homônimas na mesma cidade receberam o bairro: `nossa-senhora-aparecida-igapo-londrina` / `…-km9-londrina`,
  `nossa-senhora-do-carmo-shangri-la-londrina` / `…-ouro-branco-londrina`, `santo-antonio-cafezal-londrina` /
  `…-warta-londrina`, `sao-jose-irere-londrina` / `sao-jose-paiquere-londrina`, `sao-luiz-gonzaga-londrina` /
  `sao-luiz-gonzaga-sao-luiz-londrina`, `sao-joao-batista-guaravera-londrina`, `nossa-senhora-de-fatima-sabara-londrina`.
- `city` = município: distritos de Londrina (Warta, Irerê, Paiquerê, Guaravera, Lerroville, São Luiz) e de Rolândia
  (São Martinho) foram para `neighborhood` como "Distrito de …". Cristo Bom Pastor (Cj. Lindóia) é em Londrina, embora
  esteja no Decanato Ibiporã.
- `address`/`neighborhood`/`zipCode`: parse da linha "Rua, nº - Bairro – CEP – Cidade/Paraná" da página de detalhe.
  Primeiro de Maio traz CEP incompleto ("86140") → `null`. Ressurreição: "Av. Francisco Serpeloni" sem número.
  Porecatu: o site antigo diz "R. Urbano Lunardelli, 336" e o site paroquial (2026) e o agregador dizem "Praça Padre
  Calógero Gaziano, 336" — ficou o do site paroquial.
- `phone`: telefone da página de detalhe; Porecatu e Mãe da Divina Providência ganharam o WhatsApp/fixo do site
  paroquial; São Vicente Pallotti/Cambé não tem telefone no site antigo — usado o do espelho de 2023 ((43) 3154-9077).
  `email`: e-mail da página (Catedral e Porecatu com o segundo e-mail do site paroquial). `website`: site quando vivo;
  senão a página oficial no Facebook.
- `priestName`: "Pároco" da página de detalhe (site antigo, listagem atual). Sem pároco e com "Administrador
  Paroquial" → nome + "(administrador paroquial)" (Quase-paróquia N. S. de Fátima; São José/Irerê e /Paiquerê; São
  Rafael/Ibiporã). Vigários e diáconos ficaram na chave extra `vicars`. Sem pároco na fonte: N. S. da Piedade e São
  José/Jaguapitã.
- `foundedYear`: Wikipédia (lista por município com ano). Nas homônimas o ano foi atribuído assim: N. S. do Carmo
  1976 → Pq. Ouro Branco (e-mail "pcarmo1975") e 1981 → Jd. Shangri-lá; Santo Antônio 1957 → Warta e 2002 → Cj.
  Cafezal; N. S. Aparecida 2000 → Jd. Igapó e 2015 → Km 9; São Luiz Gonzaga 2002 para ambas. Sem ano na Wikipédia:
  Quase-paróquia N. S. de Fátima, Santo Antônio de Pádua, São Sebastião, São João Batista/Guaravera, Mãe da Divina
  Providência.
- Horários: (a) página oficial de horários → `media`, comunidade "Matriz …" salvo quando a página nomeia a capela
  (Sertanópolis: matriz "fechada para reforma", 3 capelas com horário próprio); intervalos ("Segunda a Sexta", "Seg |
  Ter | Qui | Sex") expandidos; "(em latim)" e "(Nipo-brasileira)" viraram `notes`; "Terça – 19h (celebração da
  Palavra)" da Rainha do Universo não foi registrada; a Missa "Domingo 8h30 (Nipo-brasileira)" listada sob Imaculada
  Conceição foi atribuída à Paróquia Pessoal Nipo-Brasileira, com nota do local; "Segunda Sexta -19h" (Rocio) lido como
  segunda a sexta (espelho de 2023 confirma), com nota. (b) Site paroquial oficial substitui a página arquidiocesana
  (Catedral, Rainha dos Apóstolos, Coração de Maria, Sagrados Corações, Auxiliadora, Mãe da Divina Providência, São
  José/Rolândia, Porecatu); confissões e adoração vêm só desses sites. (c) Espelho de 2023: horários de capelas e das
  paróquias ausentes da página oficial → `baixa` com a nota "Só no espelho de 06/2023"; onde a página oficial e o
  espelho divergem na matriz, valeu a página oficial. Eventos só mensais (1ª sexta, 3ª terça etc.) não foram gravados
  como horário — ficaram em `notes` da comunidade correspondente (Cristo Rei/Cambé, São Pedro e São Paulo/Cambé,
  Miraselva, Prado Ferreira, Warta/Fazenda Piza, Pallotti/Cambé).
- Capelas sem nome na fonte não foram cadastradas: "Capela" de N. S. do Carmo/Shangri-lá (qui 19h30, sáb 17h30, dom
  8h e 19h em 2023), capela do Jardim Hedy da Rainha do Universo (Rua José Linhares, 66; dom 8h), os dois endereços
  extras de Sant'Ana (Rua São Pedro, 60 – Distrito Espírito Santo; Rod. Mábio Gonçalves Palhano – Patrimônio Regina),
  "Sábado 19h30 (Matriz e Capela)" de São Tiago Apóstolo (gravado só na matriz), Capela Mãe da Divina Providência de
  São Vicente de Paulo (hoje paróquia própria, id 85).
- Chaves extras ao esquema do README: `deanery`, `vicars` (paróquia) e `notes` (comunidade); o importador as ignora.

## Registros que precisam de validação humana

1. **Site oficial atual inacessível** — quando o bloqueio Vercel for contornado (ou por operador humano), reprocessar
   `/paroquias/<slug>` para atualizar párocos e horários das 84 paróquias; os resumos de busca indicam que as páginas
   novas têm "Horários de Missa" por paróquia.
2. **69 paróquias com horário só da página oficial sem data** (`media`) — o espelho de 2023 diverge em ~15 delas
   (ex.: Km 9 dom 7h30 vs 8h; Primeiro de Maio seg/qua 19h30 vs 19h; N. S. da Luz; Santa Rita; Sant'Ana; São Tiago;
   São Sebastião; Boa Viagem; São Luiz Gonzaga; Warta; São Roque; Cristo Rei/Cambé), sinal de que a página muda com o
   tempo.
3. **Decanatos Rolândia e Porecatu (13 paróquias)** — ausentes da página oficial de horários; só São José/Rolândia e
   N. S. Aparecida/Porecatu têm fonte oficial atual (`alta`). Os demais: espelho de 2023 (Ressurreição, Miraselva,
   Prado Ferreira — `baixa`), agregador de 2014 (N. S. Aparecida/Rolândia, São Pedro Apóstolo — `baixa`), Facebook via
   busca (Jaguapitã `media` por coincidir com 2023; São Paulo Apóstolo `media` — diverge do espelho de 2023 em 15 min e
   nos domingos; Lupionópolis e Florestópolis `baixa`). Lupionópolis "quarta 7h30" pode ser 19h30. São Martinho e
   Centenário do Sul sem nada.
4. **Párocos** — a listagem do site antigo é a fonte; o espelho de 2023 e os resumos de busca trazem outros nomes em
   várias paróquias (ex.: Porecatu — listagem: Pe. Edivan Pedro dos Santos; 2023: Pe. Isaac Aguiar Luz; agregador:
   Pe. Jorge Guillermo Arias Santisteban). Catedral: listagem atual diz Pe. Joel Ribeiro Medeiros; o espelho de 2023
   dava Pe. José Rafael Solano Durán, que a página da Cúria hoje lista como vigário geral e a listagem como pároco de
   Jesus Cristo Libertador. Jaguapitã sem pároco na listagem (2023: Pe. Jaime Alonso Botero Gallo, hoje em Florestópolis).
5. **Catedral** — página oficial de horários diz "Sexta – 5h | 12h | 15h" (provável erro de digitação); o site da
   Catedral (12/2024) distingue Capela (seg–sáb 7h) e Catedral (seg–qui 12h; sex 12h e 15h; sáb 18h; dom 8h, 10h30,
   18h) — usada a versão do site (`media`).
6. **Sertanópolis** — "Igreja Matriz fechada para reforma" (nota na comunidade matriz); os horários são das 3 capelas.
7. **Km 9** — e-mail "quasepar.n.sra.aparecidakm9" sugere que foi quase-paróquia; listagem e Wikipédia (2015) a tratam
   como paróquia.
8. **Endereços incompletos** na fonte: Ressurreição (sem número), N. S. das Graças/Ibiporã ("R. Francisco de Assis
   Alves, 0"), N. S. do Carmo/Ouro Branco ("Rua Verônica", sem número), Coração de Maria (sem número; site diz 1073),
   Primeiro de Maio (CEP "86140").
9. **Cúria** — e-mail registrado é o da chancelaria (chancelaria@mitralondrina.com.br); o "contato@" do rodapé do
   site antigo está corrompido pela migração ("contato@siteantigo.siteantigo…").
10. **Anos de criação** vêm da Wikipédia (`media`); a atribuição entre homônimas (item "Regras") é inferência.
11. **Comunidades do espelho de 2023 (57, `media`)** — confirmar existência e nomes; várias vêm de linhas de horário
    ("Sábado: 18h Capela São Clemente") e não de uma lista de capelas.

## Dúvidas abertas

- A Paróquia Pessoal Nipo-Brasileira tem sede administrativa própria (Rua Belo Horizonte, 795) e celebra na Igreja
  Imaculada Conceição; a Missa dominical 8h30 foi registrada nela, com nota — decidir no Parish se deve aparecer nas
  duas paróquias.
- O site antigo lista 93 slots (ids 1–96 com lacunas: 4, 5, 6, 40, 57, 74, 78, 79, 81, 83, 89, 94) — ids removidos
  provavelmente correspondem a fusões/renomeações antigas; não há sinal de paróquia faltante (84 = Wikipédia).
- Confissões só constam nos sites paroquiais (Catedral, Rainha dos Apóstolos, Sagrados Corações); adoração em
  Rainha dos Apóstolos, Coração de Maria, Sagrados Corações, São José/Rolândia, São Paulo Apóstolo e Prado Ferreira.
