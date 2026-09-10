# RELATÓRIO — Diocese de Rio Grande (RS)

- **Arquivo**: `paroquias/RS/rio-grande.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 18 (15 paróquias + 2 "Redes de Comunidades" + 1 capelania militar) |
| Entradas com confiança **alta** | 18 |
| Entradas com confiança **media** / **baixa** | 0 / 0 |
| Comunidades/capelas | 110 |
| Horários fixos | 201 (125 `alta`, 5 `media`, 71 `baixa`) |
| Cobertura | 16 / 16 (100 %) |

## Fontes principais

Praticamente tudo veio do **site oficial da Diocese**, que mantém uma página por unidade
pastoral (`/area/<id>/<Nome>`) com endereço, CEP, telefone, e-mail, Facebook/Instagram,
pároco, vigários, diáconos, expediente da secretaria, **lista de comunidades/capelas com
endereço** e **horários de missas, confissões, adoração e terço**.

| # | URL | Unidade |
|---|---|---|
| 1 | `/area/7/CatedraldeSaoPedro` | Catedral de São Pedro |
| 2 | `/area/4/ParoquiaNossaSenhoradoCarmo` | Paróquia Nossa Senhora do Carmo |
| 3 | `/area/3/ParoquiaNossoSenhordoBomFim` | Paróquia Nosso Senhor do Bom Fim |
| 4 | `/area/11/SantuarioNossaSenhoradeFatima` | Santuário / Paróquia N. Sra. de Fátima |
| 5 | `/area/16/ParoquiaNossaSenhoradaPenha` | Paróquia Nossa Senhora da Penha |
| 6 | `/area/5/ParoquiaSagradaFamiliaCassino` | Paróquia Sagrada Família – Cassino |
| 7 | `/area/23/RededeComunidades…Medianeira…` | Rede de Comunidades N. Sra. Medianeira |
| 8 | `/area/21/ParoquiaSantoAntonio` | Paróquia Santo Antônio (Tavares) |
| 9 | `/area/13/ParoquiaSaoJoseSaoJosedoNorte` | Paróquia São José (São José do Norte) |
| 10 | `/area/14/ParoquiaSaoLuizRei` | Paróquia São Luiz Rei (Mostardas) |
| 11 | `/area/15/ParoquiaSantaVitoria` | Paróquia Santa Vitória |
| 12 | `/area/10/ParoquiaSagradaFamiliaCidade` | Paróquia Sagrada Família – Cidade |
| 13 | `/area/12/ParoquiaSaoJoseOperario` | Paróquia São José Operário |
| 14 | `/area/17/ParoquiaSaoJorge` | Paróquia São Jorge |
| 15 | `/area/18/RededeComunidadesSaoLucas` | Rede de Comunidades São Lucas |
| 16 | `/area/8/ParoquiaSantaTeresa` | Paróquia Santa Teresa |
| 17 | `/area/6/ParoquiaSaoJudasTadeu` | Paróquia São Judas Tadeu |
| 18 | `/area/20/CapelaniadoVDistritoNaval` | Capelania do V Distrito Naval |

(base: `https://www.diocesedoriogrande.com.br`)

Complementares: `/bispado` (endereço/contato da Cúria),
https://www.catholic-hierarchy.org/diocese/drigr.html (16 paróquias em 2022; bispo Jorge
Pierozan, nomeado em 22/06/2024) e https://pt.wikipedia.org/wiki/Diocese_de_Rio_Grande.

## Cobertura

**16 / 16.** O menu do site lista 20 links em 7 áreas pastorais (Centro, BR, Norte, Sul,
Cidade Nova, Junção, Porto). Destes:

- **15 são paróquias propriamente ditas** (a Catedral de São Pedro e o Santuário Nossa Senhora
  de Fátima — que a própria página identifica também como *Paróquia* Nossa Senhora de
  Fátima — incluídos);
- **2 são "Rede de Comunidades"** (São Lucas e Nossa Senhora Medianeira de Todas as Graças);
- **1 é capelania militar** (V Distrito Naval);
- **2 links retornam página vazia**: *Santíssima Trindade* (área Junção) e *Pastoral do Chuí*
  (área Sul).

15 paróquias + 1 das redes = **16**, exatamente o total do catholic-hierarchy.org (2022).

Municípios cobertos: Rio Grande, São José do Norte, Mostardas, Tavares, Santa Vitória do
Palmar e Chuí (este último atendido pela Paróquia Santa Vitória, via Capela Santa Terezinha).

## Decisões de modelagem

- As **duas "Redes de Comunidades"** entraram como entradas de `parishes`, porque funcionam
  como unidades pastorais autônomas: São Lucas tem **pároco** (Pe. Lino Mayer) e Medianeira,
  **administrador paroquial** (Pe. Marlos de Lima Mirapalhete). Não foi possível determinar
  qual das duas é contada como paróquia pelo catholic-hierarchy — ver ponto 1 abaixo.
- A **Capelania do V Distrito Naval** (igreja Nossa Senhora dos Navegantes, Vila Militar)
  entrou como entrada não paroquial, seguindo o precedente do Paraná.
- **Duas paróquias homônimas em Rio Grande** — *Sagrada Família* no Cassino e *Sagrada
  Família* na Cidade Nova. Os nomes oficiais do site (`Paróquia Sagrada Família - Cassino` e
  `Paróquia Sagrada Família - Cidade`) foram mantidos e os slugs desambiguados
  (`sagrada-familia-cassino-rio-grande` / `sagrada-familia-cidade-rio-grande`).
- **Recorrências mensais** ("2º sábado do mês", "3ª quinta-feira") ⇒ `dayOfWeek` + `time` com
  a recorrência em `notes` e confiança **`baixa`**. Elas são a grande maioria dos horários das
  paróquias rurais (São José do Norte, Mostardas, Santa Vitória, Nossa Senhora da Penha), o
  que explica os 71 registros `baixa`.
- **"Celebração" (da Palavra) não é missa** e o enum `type` não a cobre — as dezenas de
  celebrações listadas em São José do Norte e Mostardas foram **omitidas**. Só as missas
  entraram.
- Adorações descritas como "após a missa das 18h" viraram `ADORATION` no horário estimado
  imediatamente posterior, com o texto original em `notes` e confiança **`media`**.

## ⚠️ Pontos para o enxame de validação

1. **Qual das duas "Redes de Comunidades" é paróquia?** 15 paróquias + 1 rede = 16 (número do
   catholic-hierarchy). Ambas estão no arquivo, então há **17 unidades pastorais** — uma a
   mais do que o esperado. Confirmar com a Cúria.
2. **Links vazios no site oficial**:
   - *Santíssima Trindade* (área Junção) — o histórico publicado na página da Paróquia São
     Jorge diz que, em 2020, "a Paróquia São Jorge absorve todas as comunidades da Rede de
     Comunidades Santíssima Trindade". A comunidade *Santíssima Trindade* (Bairro Trevo) está
     registrada sob São Jorge. O link do menu parece resíduo.
   - *Pastoral do Chuí* (área Sul) — o Chuí aparece como Capela Santa Terezinha da Paróquia
     Santa Vitória. Confirmar se é unidade pastoral autônoma.
3. **Rede de Comunidades São Lucas**: a página informa "Número de comunidades: 9" mas **não
   lista nenhuma**, nem horários. Ficou com `communities: []` e `schedules: []`. É a maior
   lacuna do arquivo.
4. **Contagens de comunidades divergentes do que a própria página lista**:
   - Paróquia São José (São José do Norte): diz "Número de Capelas: 25", lista **23**.
   - Paróquia São Luiz Rei (Mostardas): diz "13", lista **12**.
   - Paróquia Santa Vitória: diz "11", lista **9**.
5. **Paróquia São Jorge sem pároco na página** — o campo "Pároco:" está em branco; consta
   apenas "Vigário: Pe. José Zanatta". O histórico da paróquia menciona Pe. Benildo Cerasa,
   PSDP, empossado em 16/02/2020. `priestName: null` para não inventar.
6. **Capela São Cristóvão** (Paróquia São José Operário, Bairro Hidráulica): a página informa
   que "as atividades estão sendo realizadas na Matriz" — sem horários.
7. **Núcleo Jesus Misericordioso** (Paróquia Nosso Senhor do Bom Fim, Bairro Dom Bosquinho):
   missa de sexta às 15h marcada como **"Temporariamente suspensas"** — o horário **não** foi
   incluído.
8. **Capela Nossa Senhora Aparecida** (Capão da Areia, São José do Norte): missa na 4ª
   sexta-feira do mês, **sem horário informado** — comunidade registrada, horário omitido.
9. **Capela São Francisco de Assis** (Praia do Mar Grosso, São José do Norte) e **Capela Nossa
   Senhora dos Navegantes** (Balneário Mostardense, Mostardas): missas só no veraneio. A de
   Mostardas (sábado 20h, janeiro a março) foi incluída com `notes`; a do Mar Grosso não tem
   dia/hora publicados e ficou de fora.
10. **Paróquia Sagrada Família – Cassino** tem dois calendários (verão de 17/12 até a
    Quarta-feira de Cinzas; inverno no resto do ano). Ambos estão no arquivo, distinguidos por
    `notes`; o de verão foi marcado `media`.
11. **Paróquia Santa Teresa**: "Confissões: todas as tardes, exceto quarta-feira" — **sem
    horário**, portanto omitido.
12. **CEP do Bispado divergente**: o rodapé do site traz `96200-970` (Caixa Postal 108) e a
    página `/bispado` traz `96200-550` para a Trav. Monsenhor Eurico de Mello Magalhães, 145.
    Foi gravado o do rodapé (Rua João Alfredo, 532 — Centro de Pastoral / endereço de
    correspondência).
13. **Plano Pastoral do site é 2017–2021** — indício de que partes do portal estão
    desatualizadas, embora o rodapé marque "© 2026" e os dados de párocos pareçam recentes.
