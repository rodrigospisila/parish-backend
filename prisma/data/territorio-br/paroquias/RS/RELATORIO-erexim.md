# RELATÓRIO — Diocese de Erexim (RS)

- **Arquivo**: `paroquias/RS/erexim.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 31 (**30 paróquias** + 1 santuário diocesano que **não** é paróquia) |
| Paróquias com confiança **alta** | 31 |
| Paróquias com confiança **media** | 0 |
| Paróquias com confiança **baixa** | 0 |
| Comunidades/capelas | 110 (31 matrizes + 79 comunidades nomeadas) |
| Horários fixos | 125 — 74 `alta`, 15 `media`, 36 `baixa` |
| Paróquias com pelo menos um horário | 26 de 30 (87 %) |
| Cobertura | **30 / 30 paróquias (100 %)** |

> **O melhor cenário de fontes do RS até aqui.** O site oficial mantém uma página por paróquia
> com endereço, CEP, telefone, e-mail, pároco **e horários de missa**, e todas as 30 páginas
> foram atualizadas entre **novembro de 2025 e janeiro de 2026** (verificado pelo `lastmod` do
> sitemap do Yoast) — dentro dos 12 meses exigidos pelo README para confiança `alta`.

## Fontes principais

1. https://diocesedeerexim.org.br/paroquias/ — **lista oficial das 30 paróquias**, agrupada por
   área pastoral (Erechim, Aratiba, Gaurama, Getúlio Vargas, Jacutinga, Severiano de Almeida)
2. As **30 páginas individuais** `diocesedeerexim.org.br/paroquias/<slug>/` — endereço, CEP,
   telefone/WhatsApp, e-mail, pároco, vigários, diáconos, secretárias, horários de missa,
   adoração, terço e, em 6 casos, a **lista completa de comunidades**
3. https://diocesedeerexim.org.br/diocese/ — criação em 27/05/1971 (bula *Cum Christus*), bispo
   Dom Adimir Antonio Mazali (posse em 12/07/2020)
4. https://diocesedeerexim.org.br/santuarios/ e as páginas dos três santuários
5. https://diocesedeerexim.org.br/horarios-de-missa-santuario/ — horários do Santuário de Fátima
6. https://pt.wikipedia.org/wiki/Diocese_de_Erexim — **30 paróquias**, 30 municípios do Alto Uruguai
7. https://gcatholic.org/dioceses/diocese/erex0.htm — **30 paróquias** (dados de 31/12/2022)
8. https://www.catholic-hierarchy.org/diocese/derex.html — sede, bispo, área e população
9. https://www.horariodemissa.com.br/igreja.php?k=Mvvip — corrobora o endereço de Erval Grande
10. https://pt.wikipedia.org/wiki/Capo-Er%C3%AA e https://www.pmaratiba.rs.gov.br/ — para resolver
    os dois distritos usados como “cidade” pelo site da diocese

## Cobertura: 30 / 30 — e a divergência do catholic-hierarchy

O site oficial publica exatamente **30 páginas de paróquia** (confirmado tanto pela página
`/paroquias/` quanto pelos sitemaps `post-sitemap.xml`/`post-sitemap2.xml`). A **Wikipédia** e o
**gcatholic.org** também informam **30 paróquias**.

O **catholic-hierarchy.org informa 66 paróquias** (dado de 2023). Esse número **não bate com
nenhuma outra fonte** e é implausível para uma diocese com 46 padres diocesanos e 232 mil
habitantes — provavelmente conta comunidades/capelas, não paróquias. **Foi descartado**, e a
divergência está registrada em `sources` da diocese.

### Distribuição por área pastoral (como o site organiza)

| Área pastoral | Paróquias |
|---|---|
| Erechim | 7 — Catedral São José, N. Sra. Aparecida, N. Sra. da Salette, Santa Luzia, São Cristóvão, São Francisco de Assis, São Pedro |
| Aratiba | 4 — N. Sra. Medianeira (Barra do Rio Azul), São Pedro (Sede Dourado), São Roque (Itatiba do Sul), São Tiago (Aratiba) |
| Gaurama | 5 — N. Sra. do Monte Claro (Áurea), Sagrado Coração (Viadutos), Santa Ana (Carlos Gomes), São João Batista (Marcelino Ramos), São Luiz Gonzaga (Gaurama) |
| Getúlio Vargas | 3 — Imaculada Conceição (Getúlio Vargas), N. Sra. das Dores (Capo-Erê), Santa Teresinha (Estação) |
| Jacutinga | 1 — Sagrado Coração de Jesus (Paulo Bento) |
| Severiano de Almeida | 1 — São Francisco de Assis (Mariano Moro) |
| “Paróquias” (sem área) | 9 — São Caetano (Severiano de Almeida), Santa Isabel da Hungria (Três Arroios), São Roque (Benjamin Constant do Sul), N. Sra. da Glória (Erval Grande), São Valentim, N. Sra. do Rosário (Barão de Cotegipe), N. Sra. de Fátima (Entre Rios do Sul), N. Sra. dos Navegantes (Campinas do Sul), Santo Antônio (Jacutinga) |

## Comunidades

Seis paróquias publicam a **lista nominal completa** das suas comunidades no site oficial — é daí
que vêm as 79 comunidades nomeadas:

| Paróquia | Comunidades |
|---|---|
| São Caetano (Severiano de Almeida) | 20 (17 capelas + 3 “linhas”), várias com ano de fundação |
| São Valentim | 15 (13 comunidades + 2 oratórios), com ano de fundação e nº de famílias |
| N. Sra. da Salette (Erechim) | 14 capelas (6 rurais + 8 urbanas) |
| São João Batista (Marcelino Ramos) | 14 comunidades |
| São Cristóvão (Erechim) | 8 comunidades, com o bairro/localidade de cada uma |
| Santa Teresinha (Estação) | 2 (São Sebastião/Erebango e N. Sra. das Dores/Ipiranga do Sul) — **com horários próprios** |

Mais quatro comunidades isoladas vieram de menções pontuais nas páginas oficiais:
Santuário N. Sra. da Santa Cruz (Catedral), N. Sra. da Salette/Faxinalzinho (São Roque, Benjamin
Constant), Gruta N. Sra. de Lourdes (Paulo Bento) e as três comunidades de bairro de Getúlio
Vargas. **As outras 20 paróquias ficaram só com a matriz** — o site não lista as capelas delas.

## Horários

Os horários vieram todos da página oficial da própria paróquia. Critério de confiança adotado:

- **`alta`** — horário **semanal fixo** ("Sábados, às 18h", "Domingos, às 09h", "Quartas-feiras,
  às 19h"): 74 registros.
- **`media`** — os 15 horários do **Santuário de Fátima**: a página `/horarios-de-missa-santuario/`
  é oficial, mas seu `lastmod` é **03/03/2025** (18 meses), fora da janela de 12 meses do README.
- **`baixa`** — 36 registros de **recorrência mensal**, que o schema (`dayOfWeek` + `time`) não
  consegue representar: "primeira sexta-feira do mês", "dia 12 de cada mês", "quarto domingo do
  mês". Estão no arquivo com o dia da semana plausível e a regra real descrita em `notes`, mas
  **não devem ser carregadas como horário semanal**.

Quatro paróquias ficaram com `schedules: []` porque a página oficial não publica horário algum:
**Santa Isabel da Hungria** (Três Arroios), **Sagrado Coração de Jesus** (Viadutos), **N. Sra. das
Dores** (Capo-Erê) e **São Francisco de Assis** (Mariano Moro).

## ⚠️ Pontos para o enxame de validação

1. **Duas “cidades” do site oficial são, na verdade, distritos.** O site escreve o distrito no
   lugar do município; foi corrigido para o município e o distrito foi para `neighborhood`:
   - **Paróquia São Pedro — “Sede Dourado”** → `city: "Aratiba"`, `neighborhood: "Sede Dourado"`,
     `slug: sao-pedro-aratiba`. Sede Dourado é distrito de Aratiba (CEP 99775-000, confirmado
     pela Prefeitura de Aratiba). **Atenção**: a diocese tem duas paróquias em Aratiba (São Tiago
     na sede e São Pedro em Sede Dourado), ambas com o mesmo pároco, Pe. Dirceu Balestrin.
   - **Paróquia Nossa Senhora das Dores — “Capo-Erê”** → `city: "Erechim"`,
     `neighborhood: "Capo-Erê"`, `slug: nossa-senhora-das-dores-erechim`. Capo-Erê é distrito de
     Erechim (CEP 99717-974, confirmado pela Wikipédia e pelo repositório da UFFS).
   Confirmar se o Parish deve mesmo agrupar essas duas paróquias sob o município.

2. **Entrada que NÃO é paróquia** (segue o precedente do dataset do PR, que também incluiu
   igrejas não paroquiais):
   - **Santuário Nossa Senhora do Rosário de Fátima** (Erechim, Av. Sete de Setembro 1305,
     reitor Pe. José Carlos Sala) — santuário diocesano, com 15 horários próprios. **Não conta
     nas 30 paróquias**; decidir se entra na carga.
   - Os outros dois santuários **não** viraram entrada própria, de propósito:
     **Santuário N. Sra. da Salette** é a própria Paróquia da Salette (Erechim), e
     **Santuário N. Sra. da Santa Cruz** foi registrado como *comunidade da Catedral* (confiança
     `media`) — o vínculo veio de a página da Catedral chamar o Pe. Gladir Pedro Giacomel de
     "Vigário Paroquial **e Capelão do Santuário Santa Cruz**". Confirmar o vínculo.

3. **Horário do Santuário de Fátima está a 18 meses sem atualização** (página de 03/03/2025),
   por isso os 15 registros ficaram `media`. Confirmar, em especial: a missa diária das 18h30
   (gravada de segunda a sábado) e as quartas às 14h30 **e** 18h.

4. **36 horários de recorrência mensal marcados `baixa`.** O padrão da diocese é forte e se
   repete em quase todas as paróquias: *Missa do Apostolado da Oração na 1ª sexta-feira do mês* e
   *Adoração num dia fixo do mês* (dia 6 em Severiano de Almeida, 10 em Jacutinga, 12 em São
   Cristóvão, 14 em São Valentim, 23 na Salette, 24 em Marcelino Ramos, 30 em Barra do Rio Azul).
   Se o Parish ganhar suporte a recorrência mensal, esses registros devem ser reprocessados —
   hoje o `dayOfWeek` deles é apenas indicativo.

5. **Mudança de horário já ocorrida na Paróquia São Caetano** (Severiano de Almeida): a página
   diz "Domingos, às 08h. **A partir do dia 12 de abril de 2026, às 09h**". Como hoje é
   10/09/2026, foi gravado **09:00** e a transição ficou em `notes`. Confirmar que a mudança
   realmente aconteceu.

6. **Paróquias sem pároco titular nomeado na fonte** — três estão como *Administrador Paroquial*
   (gravado no campo `priestName`, sem distinção de cargo): **Santa Luzia/Erechim** (Pe. Wolney
   Toigo), **São Francisco de Assis/Erechim** (Pe. Antônio Miro Serraglio) e **N. Sra. das
   Dores/Capo-Erê** (Pe. Felipe Fioravante Filippini). O schema não tem campo para o tipo de
   provimento.

7. **Telefones majoritariamente celulares/WhatsApp.** 22 das 30 paróquias só divulgam celular;
   todas com DDD **(54)**, coerente com a região. Onde a página traz fixo **e** celular, foi
   gravado o **fixo**. Os números adicionais não foram preservados — o schema tem um só campo
   `phone`. Casos com dois números: Getúlio Vargas, Barão de Cotegipe, Campinas do Sul (só
   celular), Salette, Santa Luzia, São Cristóvão, São Francisco de Assis/Erechim, São Pedro,
   Aratiba, Áurea, Três Arroios, N. Sra. Aparecida/Erechim.

8. **`communities: []` em 20 das 30 paróquias.** Não é erro de coleta: o site oficial simplesmente
   não lista as capelas dessas paróquias. É a maior lacuna do arquivo. O importador criará apenas
   a igreja-matriz. Fontes alternativas prováveis: os **informativos paroquiais** em PDF que a
   diocese publica em `/informativos-paroquiais/` (Jacutinga e Severiano de Almeida têm edições
   semanais recentes — a de São Caetano é de **05/09/2026**).

9. **Grupos de oração não mapeáveis nos 4 tipos do schema** foram omitidos, e não perdidos por
   engano: "Mães que Oram pelos Filhos" (São Caetano, quartas 18h; Santuário de Fátima, sábados
   17h — este último foi gravado como `ROSARY` com `notes`), Pastoral da Saúde, Cáritas, RCC, CLJ
   e encontro de coroinhas (São Cristóvão têm horários fixos publicados).

10. **CEPs gravados sem os pontos.** O site escreve "99.700-012"; foi normalizado para
    "99700-012". Nenhuma divergência de CEP foi encontrada entre fontes nesta diocese.

11. **Nome oficial "Erexim" (com x) × cidade "Erechim" (com ch)** — está correto no arquivo
    (`diocese.name` = "Diocese de Erexim", `diocese.city` = "Erechim") e não deve ser
    "corrigido" por nenhum validador automático.
