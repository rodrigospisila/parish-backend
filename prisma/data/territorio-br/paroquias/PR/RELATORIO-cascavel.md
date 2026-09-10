# Relatório — Arquidiocese de Cascavel (PR)

Agente de pesquisa, 2026-09-10. Arquivo de dados: `cascavel.json`.

## Resumo

| Item | Quantidade |
|---|---|
| Registros de paróquia | **42** (41 alta / 1 media / 0 baixa) — 40 da arquidiocese + 2 de outras circunscrições listadas no site (ver abaixo) |
| Comunidades/capelas | 243 (30 paróquias com lista oficial de capelas; 12 sem lista → `communities: []`) |
| Horários fixos | 82 (39 alta — Catedral, São Cristóvão, São Francisco de Assis; 43 baixa — agregadores) |
| Cobertura | 40 / 40 esperadas (catholic-hierarchy 2023 e gcatholic 31/12/2022) — **100 %** da lista; horários oficiais só para 3 paróquias |

## Fontes principais e método

1. **Site oficial `https://arquicascavel.org.br`** (plataforma "AD3 Comunicação", hospedado na
   Vercel). A listagem `/paroquias`, a home, `sitemap.xml` e `robots.txt` respondem **HTTP 429
   "Vercel Security Checkpoint"** para clientes automatizados; as páginas individuais
   `/paroquias/<slug>` respondem 200 (com falhas intermitentes). Estratégia:
   - Índice CDX do Wayback Machine (`web.archive.org/cdx/search/cdx?url=arquicascavel.org.br/paroquias*`)
     → revelou 21 páginas de paróquia arquivadas entre 2025-11 e 2026-05 (lidas via snapshot,
     marcadas nas `sources`) e as **páginas de decanato do site de 2020** (ids 546–551, snapshots
     de set/out 2020) com a tabela completa "Paróquia / Cidade / Bairro" — 41 registros.
   - As demais 19 páginas foram obtidas ao vivo deduzindo o slug pelo padrão do site (acentos
     removidos: `parquia-so-joo-batista`, `parquia-nossa-senhora-do-perptuo-socorro`…).
   - Cada página traz: endereço com CEP, região/decanato, pároco (ou administrador/capelão),
     telefone, e-mail, redes sociais e, em 30 delas, a lista "Quantas Capelas e seus respectivos
     padroeiros". Horários de missa só aparecem na Catedral e em São Francisco de Assis (Guarujá).
2. **Sites paroquiais oficiais:** `https://paroquiasaocristovao.org/missas/` (horários, alta);
   `https://ac-nscaravaggio.org.br` (contato, histórico — paróquia instalada em 17/10/1982; página
   de capelas e de horários vazias).
3. **Referências:** catholic-hierarchy `dcasc.html` (40 paróquias, 2023; arcebispo Dom José Mário
   Scalon Angonese desde 02/05/2024); gcatholic `casc0.htm` (40, 2022); Wikipédia pt (17
   municípios). CNBB Regional Sul 2 (`cnbbs2.org.br`) respondeu 403 — não consultado.
4. **Agregadores (só para horários, confiança baixa):** horariodemissa.com.br (busca por cidade;
   29 igrejas da arquidiocese cadastradas, quase todas "atualizadas em 2013/2014" e sem horários),
   missahora.com.br (4 paróquias de Cascavel, sem data), horariomissa.org (colaborativo, sem data).
   A ficha da Catedral no missahora coincide com a página oficial (usada como corroboração).

## Estrutura pastoral (não há campo no schema; fica só aqui)

Regiões/decanatos conforme o site atual: **Cascavel – Centro** (Catedral N. Sra. Aparecida, Santo
Antônio, N. Sra. de Fátima – Cancelli, N. Sra. do Perpétuo Socorro (Neva), São Cristóvão, São João
Batista, São Paulo Apóstolo, N. Sra. das Graças (Coqueiral), N. Sra. do Caravaggio, Paróquia Militar
Santo Inácio de Loyola, N. Sra. do Perpétuo Socorro – Rito Ucraniano); **Cascavel – Norte**
(Imaculado Coração de Maria, N. Sra. Consolata (Brasília), Santa Rita de Cássia, Santo Agostinho,
Santo Inácio de Loyola (Brasmadeira), Santa Terezinha do Menino Jesus); **Cascavel – Oeste** (N.
Sra. de Fátima – Santa Felicidade, Santa Luzia, N. Sra. Rainha dos Apóstolos, Santa Cruz, São
Francisco de Assis, São José Operário, São Pedro Apóstolo, Santa Tereza de Ávila – Santa Tereza do
Oeste); **Decanato Guaraniaçu** (Guaraniaçu, Ibema, Campo Bonito, Catanduvas, Três Barras do
Paraná, Diamante do Sul); **Decanato Corbélia** (Corbélia ×2, Cafelândia ×2, Iguatu, Anahy,
Braganey); **Decanato Capitão Leônidas Marques** (Capitão, Lindoeste, Boa Vista da Aparecida,
Santa Lúcia). Em 2020 "Cascavel – Norte" ainda não existia (era "Cascavel – Leste").

## Registros que precisam de validação humana

1. **Duas paróquias de outras circunscrições** estão no site e foram mantidas no arquivo:
   `militar-santo-inacio-de-loyola-cascavel` (Ordinariato Militar do Brasil; erigida em
   22/09/2009 como Paróquia Militar Nosso Senhor dos Milagres, renomeada em 15/10/2014) e
   `nossa-senhora-do-perpetuo-socorro-rito-ucraniano-cascavel` (Eparquia São João Batista, rito
   ucraniano). Decidir se devem ser carregadas sob a arquidiocese ou movidas.
2. **Santa Terezinha do Menino Jesus (Jd. Clarito)** — `confidence: media`: consta na lista
   oficial de 2020 e tem página no Facebook, mas não foi encontrada página no site atual (slugs
   testados: `parquia-santa-terezinha`, `…-do-menino-jesus`, `…-teresinha…`). Endereço/CEP (Rua
   Pintassilgo, 1127, CEP 85814-770) vêm do cadastro CNPJ 17.083.371/0001-87; telefone e pároco
   não gravados.
3. **N. Sra. do Caravaggio (Maria Luiza)** — sem página no site atual (slugs `…-do-caravaggio`,
   `…-de-caravaggio` → 404); dados do site paroquial oficial `ac-nscaravaggio.org.br` e da lista
   oficial de 2020. CEP não consta (ViaCEP: nº 1192 → 85819-680, Maria Luiza) → `null`.
4. **Santo Antônio (Centro)** — o site tem duas páginas: `parquia-santo-antnio` (endereço igual ao
   da Catedral, Rua Rio Grande do Sul, 590, e telefone (45) 3226-5405) e `parquia-santo-antnio-3`
   (Av. Brasil, 7875, Pe. Ronald Lobo, SVD, sem telefone). Gravado Av. Brasil, 7875 (confirmado por
   3 agregadores) com o telefone 3226-5405. Ano de fundação 1962 deduzido de "Em 2022 … celebra 60
   anos" (página oficial). Horários: missahora (dom 10h/17h30/19h, seg–sáb 19h) diverge de
   horariodemissa 2014 (dom 8h30, qua/sáb 19h30) → baixa, com nota.
5. **São Paulo Apóstolo** — a página oficial mostra o e-mail `paroquia@ac-nspsocorro.org.br`
   (que é o da Paróquia N. Sra. do Perpétuo Socorro) → `email: null`.
6. **E-mails genéricos** `email@arquidiocesecascavel.org` (placeholder do site) em Imaculado
   Coração de Maria, N. Sra. de Fátima – Santa Felicidade, Santa Luzia, N. Sra. Rainha dos
   Apóstolos e Santo Inácio de Loyola → `null`.
7. **São João Batista** — página oficial sem telefone (`null`); agregadores divergem
   ((45) 3038-6516 vs 3223-6516). Horários de horariomissa.org (colaborativo) → baixa. O site
   `paroquiasjbatista.com.br` que aparece em buscas é de outra paróquia (Diocese de Colatina/ES) e
   foi descartado.
8. **N. Sra. da Salette (Braganey)** — a lista de 2020 chama de "Santuário Nossa Senhora da
   Salette" e o Facebook oficial também; a página atual usa "Paróquia". Gravado como Paróquia, com a
   matriz nomeada "Santuário Nossa Senhora da Salette (matriz)".
9. **Cúria Metropolitana — CEP:** o rodapé do site oficial traz "Rua Maranhão, 1595 – Centro, CEP
   85805-051"; catholic-hierarchy/`dioceses.json` trazem 85801-051; ViaCEP indica que o nº 1595
   (ímpar, faixa 1087–2701) é **85802-225, bairro Neva** (a página "Mitra Diocesana" de 2020 também
   dá bairro Neva). Gravado o valor do site oficial; conferir. E-mail da cúria não publicado (o
   rodapé traz só `jornalismoalice@gmail.com`, do jornalismo) → `null`.
10. **N. Sra. das Graças (Coqueiral)** — não consta na lista de 2020; e-mail sugere criação em 2022
    (`paroquiansgracas2022@…`), mas o ano não está explícito → `foundedYear: null`.
11. **Párocos**: onde a página mostra "Administrador" (Diamante do Sul, Anahy, Santa Rita de
    Cássia), "Capelão Militar" ou "Vigário Paroquial" (São Francisco de Assis – Guarujá), a função
    foi anotada entre parênteses em `priestName`. Páginas sem pároco: Imaculado Coração de Maria,
    Santo Inácio de Loyola (Brasmadeira), N. Sra. de Fátima (Guaraniaçu), São José Operário, São
    Pedro Apóstolo (Cafelândia), Perpétuo Socorro (Ucraniano), Caravaggio, Santa Terezinha.
12. **Capelas**: listas oficiais trazem só o padroeiro (às vezes a localidade). Nomes repetidos
    dentro da mesma paróquia (ex.: 3× "Nossa Senhora Aparecida" em Diamante do Sul, Guaraniaçu,
    Boa Vista da Aparecida, Campo Bonito) foram deduplicados — a contagem oficial é maior que a
    gravada (Diamante do Sul 14→11, Guaraniaçu 40→28, Boa Vista 17→15, Campo Bonito 17→15,
    Braganey 8→6, Iguatu 3→2). Endereços das capelas não são publicados.
13. **Horários ausentes (fonte oficial)** em 39 das 42 paróquias; os 43 horários "baixa" vêm de
    agregadores datados de 2014–2018 ou sem data (Santo Antônio, N. Sra. de Fátima – Cancelli, São
    Paulo Apóstolo, São João Batista, N. Sra. Rainha dos Apóstolos, São Sebastião – Catanduvas).
    Instagram/Facebook das paróquias (listados nas páginas oficiais) não puderam ser lidos.
14. **Slugs desambiguados** por haver homônimas em Cascavel: `nossa-senhora-de-fatima-cancelli-cascavel`
    / `nossa-senhora-de-fatima-santa-felicidade-cascavel`; `santo-inacio-de-loyola-cascavel` /
    `militar-santo-inacio-de-loyola-cascavel`; `nossa-senhora-do-perpetuo-socorro-cascavel` /
    `…-rito-ucraniano-cascavel`.
