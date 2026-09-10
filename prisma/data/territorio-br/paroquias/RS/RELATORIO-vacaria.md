# RELATÓRIO — Diocese de Vacaria (RS)

- **Arquivo**: `paroquias/RS/vacaria.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 28 (todas paróquias) |
| Paróquias com confiança **alta** | 27 |
| Paróquias com confiança **media** | 0 |
| Paróquias com confiança **baixa** | 1 (São Sebastião, André da Rocha) |
| Comunidades/capelas | **510** (todas `alta`, matriz marcada em 27 paróquias) |
| Horários fixos | 39 (29 `alta`, 8 `media`, 2 `baixa`) |
| Paróquias com horário publicado | 10 de 27 |
| Cobertura | 28 / 28 (100 %) |

> **O melhor cenário de comunidades das dioceses do RS pesquisadas até aqui.** O achado decisivo
> foi o **Guia Diocesano de Pastoral 2026**, PDF oficial de 71 páginas hospedado no site da diocese,
> cujas páginas 14–28 são um diretório completo com data de criação, endereço, CEP, telefone,
> e-mail, pároco e a **lista numerada de capelas de cada paróquia**.

## Método

1. **`https://www.diocesevacaria.com.br/paroquias/`** — o índice é montado por JavaScript (filtro
   por forania) e o HTML estático só expõe 2 links. A lista real foi obtida pela **API REST do
   WordPress**: `wp-json/wp/v2/pages?parent=631` devolveu as **27 páginas-filhas** de paróquia.
   O conteúdo de cada uma foi lido por `wp-json/wp/v2/pages/<id>` (pároco, contatos, endereço,
   comunidades, horários de missa, histórico e data da última modificação).
2. **`GUIA-DE-PASTORAL-ATUALIZADO-EM-26-DE-MARCO-DE-2025.pdf`** (em `/wp-content/uploads/2026/03/`)
   — Guia Diocesano de Pastoral **2026**, extraído com `pypdf`. Páginas 7 (municípios), 8 (foranias),
   9 (governo) e **14–28 (diretório de paróquias e comunidades)**.
3. **`.../diocese/curia-diocesana/`** — endereço, CEP, telefone e e-mails da Cúria.
4. Corroboração de cobertura: catholic-hierarchy.org, **gcatholic.org** e Wikipédia (pt).

## Cobertura — 27 oficiais + 1 só do gcatholic

| Fonte | Paróquias |
|---|---|
| Site oficial (fichas) | 27 |
| Guia Diocesano de Pastoral 2026 (p. 14–28) | **27** |
| catholic-hierarchy.org (est. 2022) | 28 |
| gcatholic.org (atualizado 01/01/2026) | **28** |

As duas fontes oficiais listam exatamente as **mesmas 27 paróquias**, em 5 foranias:

| Forania | Paróquias |
|---|---|
| **Vacaria** (7) | Catedral N. Sra. da Oliveira, N. Sra. da Glória, N. Sra. de Fátima (todas em Vacaria); São José (S. José dos Ausentes); Senhor Bom Jesus (Bom Jesus); São João Batista (Esmeralda/Pinhal da Serra); Santo Antônio de Pádua (Muitos Capões) |
| **Ipê** (4) | São Luiz Rei (Ipê); N. Sra. Auxiliadora (Campestre da Serra); São Pedro Apóstolo (Vila Segredo/Ipê); São Paulo Apóstolo (Vila São Paulo/Ipê) |
| **Lagoa Vermelha** (4) | São Paulo Apóstolo e Santo Antônio (Lagoa Vermelha); São José (Ibiraiaras); N. Sra. da Imaculada Conceição (Caseiros) |
| **Sananduva** (7) | São João Batista e São José Operário (Sananduva); N. Sra. Consoladora dos Aflitos (Ibiaçá); São Sebastião (Maximiliano de Almeida); Cristo Rei (São João da Urtiga); Santuário N. Sra. de Caravaggio (Paim Filho); N. Sra. do Rosário (Machadinho) |
| **São José do Ouro** (5) | São José (S. José do Ouro); N. Sra. das Dores (Barracão); N. Sra. de Lourdes (Cacique Doble); N. Sra. da Saúde (Tupanci do Sul); Santo Expedito (Santo Expedito do Sul) |

### A 28ª paróquia — precisa de validação humana

O **gcatholic.org** lista `André da Rocha | São Sebastião (Parish)` como uma das 28 igrejas da
diocese, e o catholic-hierarchy também conta 28 paróquias. Porém:

- **não há ficha** dessa paróquia no site da diocese;
- **não há verbete** dela no Guia de Pastoral 2026 (que só chega a 27);
- **André da Rocha CONSTA** da tabela oficial "Municípios da Diocese" (p. 7 do Guia, 331,208 km²,
  1.156 habitantes) — logo o município é mesmo de Vacaria, não de Caxias do Sul;
- existe registro histórico da "Igreja Matriz São Sebastião, em André da Rocha (RS)";
- o Guia cita ainda uma casa das Irmãs do Imaculado Coração de Maria em André da Rocha.

Gravada como **`Paróquia São Sebastião` (André da Rocha), `confidence: "baixa"`, todos os demais
campos nulos**, para fechar as 28 dos anuários. **Confirmar com a diocese** se é paróquia, capela
curada ou comunidade de outra paróquia.

> Nota: o decreto de criação de foranias (2019), citado pela Wikipédia, lista 23 municípios e
> **não** inclui André da Rocha nem Monte Alegre dos Campos; a tabela de municípios do Guia 2026
> lista **25**, incluindo os dois. Monte Alegre dos Campos é atendido pela Paróquia N. Sra. de
> Fátima (Vacaria), que tem 12 comunidades lá.

## Comunidades — 510

Todas as 27 paróquias com ficha têm lista oficial de capelas, em **duas** fontes (Guia e site).
Quando as listas divergiam em quantidade, adotou-se **a mais completa**, com a grafia mais legível
(o Guia abrevia muito: "N. Sra.", "S." para São/Santa/Santo). A matriz foi marcada com
`isMatriz: true` em todas as 27.

Divergências de contagem resolvidas a favor da lista maior:

| Paróquia | Guia | Site | Gravado |
|---|---|---|---|
| Santo Antônio de Pádua (Muitos Capões) | 17 | 13 | 17 (Guia) |
| São José (Ibiraiaras) | 24 | 19 | 24 (Guia) |
| N. Sra. das Dores (Barracão) | 25 | 24 | **27** (união das duas) |
| São Paulo Apóstolo (Lagoa Vermelha) | 18 | 20 | 20 (site) |
| São José Operário (Sananduva) | 22 | 24 | 24 (site) |
| São Pedro Apóstolo (Ipê) | 10 | 11 | 11 (site) |
| N. Sra. Auxiliadora (Campestre da Serra) | 11 | 12 | 12 (site) |
| N. Sra. do Rosário (Machadinho) | 22 | 23 | 23 (site) |

A ficha da Paróquia N. Sra. da Glória (Vacaria) no Guia está **truncada e com itens repetidos**
(itens 7–10 duplicam 7–8); usou-se a lista do site (11 comunidades).

## Horários — só 10 paróquias publicam

Com horário fixo publicado: Catedral (Vacaria), Senhor Bom Jesus (Bom Jesus), Santo Antônio de
Pádua (Muitos Capões), São Luiz Rei (Ipê), São João Batista (Sananduva), N. Sra. Consoladora dos
Aflitos (Ibiaçá), Cristo Rei (São João da Urtiga), São José (São José do Ouro), N. Sra. de Lourdes
(Cacique Doble) e N. Sra. da Saúde (Tupanci do Sul).

**As outras 17 fichas não têm a seção "Horários de Missa"** — nenhum horário foi inventado.

- 8 horários ficaram **`media`**: vêm de fichas cuja última modificação passou de 12 meses
  (Bom Jesus, Muitos Capões e Ibiaçá — todas atualizadas em **agosto/2025**), o que não satisfaz
  o critério de "sinal de atualidade" do README.
- 2 horários ficaram **`baixa`**: recorrência **mensal** (1ª sexta-feira do mês em Bom Jesus e em
  Cacique Doble).
- `horariodemissa.com.br` tem **1 única igreja em toda a diocese** (Catedral, dados de
  **10/05/2013**) e seus horários **contradizem** os oficiais atuais (domingo 08:00/10:00/18:00
  contra 10h15/18h da ficha de 09/06/2026). **Descartado.**

## Pontos para o enxame de validação

1. **André da Rocha** — ver seção "A 28ª paróquia". É o item mais importante.
2. **Slug de página trocado no site**: a página `/paroquias/nossa-senhora-das-dores-barracao/`
   (id 1587) contém, na verdade, a **Paróquia Santo Expedito, de Santo Expedito do Sul**; a
   Paróquia N. Sra. das Dores de Barracão está em
   `/paroquias/paroquia-nossa-senhora-das-dores-barracao/` (id 1762). A Paróquia Senhor Bom Jesus
   está no slug genérico `/paroquias/1509-2/`. As `sources` do JSON apontam para as URLs corretas
   de cada conteúdo.
3. **Data de criação contraditória — Paróquia Santo Expedito**: o Guia 2026 diz **04/12/1994**;
   o histórico da própria ficha do site diz **04/12/1999**. `foundedYear` ficou **`null`**.
4. **Endereço contraditório — Paróquia Santuário N. Sra. de Caravaggio (Paim Filho)**:
   Guia = `R. Getúlio Vargas, 77 – Centro`; site = `R. Santiago, 139 – Centro`. Adotado o do Guia
   (diretório mais recente).
5. **CEP contraditório — Paróquia Santo Expedito**: Guia = `99895-000`; site = `99985-000`.
   Adotado **99895-000** (o do município).
6. **CEP contraditório — Catedral**: Guia = `95200-055`; site e horariodemissa = `95200-000`
   (CEP genérico do município). Adotado **95200-055**.
7. **Número contraditório — São João Batista (Sananduva)**: Guia = `Av. Fiorentino Bacchi, 723`;
   site = `791`. Adotado 723 (Guia).
8. **E-mails divergentes entre Guia e site** (adotado o do Guia, mais recente, salvo indicação):
   - Santo Antônio (Lagoa Vermelha): `psantoantoniolv@gmail.com` (Guia) × `ps.antoniolv@gmail.com` (site)
   - Santo Antônio de Pádua (Muitos Capões): `paroquiasantoantoniomc13@gmail.com` × `psantoniodepaduamc@gmail.com`
   - N. Sra. Auxiliadora (Campestre da Serra): `paroquiaauxiliadora2019@gmail.com` × `pauxiliadora@outlook.com`
   - N. Sra. de Lourdes (Cacique Doble): `nslourdes@diocesevacaria.com.br` × `paroquiacacique@gmail.com`
   - São José Operário (Sananduva): adotado o do **site** (`sjopparoquia@gmail.com`, e-mail da
     secretaria) — o Guia só traz o e-mail pessoal do pároco.
   - São Paulo Apóstolo (Lagoa Vermelha): o Guia grafa `paroquia_saopaulo@homail.com` (**typo**);
     adotado `paroquia_saopaulo@hotmail.com`, do site.
9. **E-mails malformados no site** (não usados): `p.bomjesus2022@gmail` (sem `.com`), nas fichas de
   Bom Jesus e de São José dos Ausentes. Corrigidos pelo Guia
   (`p.bomjesus2022@gmail.com` e `paroquiasaojoseausentes@gmail.com`).
10. **Telefones divergentes**: Ibiraiaras `(54) 99695-7688` (Guia) × `(54) 3355-1320` (site);
    Machadinho `(54) 98446-7738` (Guia) × `(54) 3551-1114` (site — adotado, é o fixo da paróquia);
    Esmeralda `(54) 98122-9884` × `(54) 3354-1324`; Cacique Doble `(54) 3552-1176` (Guia) ×
    WhatsApp `(54) 99607-9280` (site). Telefone de Sananduva grafado `(54) 93300-2918` nas duas
    fontes (formato incomum).
11. **Nome do pároco de São José dos Ausentes/Bom Jesus**: o site atribui a **Pe. Nelson Ribeiro
    Lemos, FC** a paróquia de S. José dos Ausentes e a **Pe. Edson do Espírito Santo Menezes, FC**
    a de Bom Jesus, mas as duas fichas compartilham o mesmo e-mail (`p.bomjesus2022@gmail`).
    Confirmar se são paróquias em administração conjunta.
12. **Paróquia São Paulo Apóstolo (Ipê)**: a localidade é grafada de três formas —
    "Vila São Paulo" (Guia), "Vila São Paulino/Ipê" (título da ficha), "São Paulino" (gcatholic) —
    e a própria ficha do site erra dizendo "Vila Segredo". Gravado `neighborhood: "Vila São Paulo"`
    e `address: null`.
13. **Duas paróquias São Paulo Apóstolo** (Ipê e Lagoa Vermelha), **duas São João Batista**
    (Esmeralda e Sananduva), **três São José** (Ibiraiaras, São José do Ouro, São José dos
    Ausentes) e **duas Santo Antônio** (Lagoa Vermelha e Muitos Capões — esta última gravada como
    "Santo Antônio de Pádua", conforme o site). Slugs diferenciados por cidade.
14. **Ibiaçá é santuário diocesano** ("Santuário N. Sra. Consoladora dos Aflitos", com Reitor e
    romaria anual de 100 mil romeiros), mas as duas fontes oficiais o registram no diretório como
    **"Paróquia"** — foi assim que ficou gravado. Sua "Novena mensal" (último domingo, 14h30) não
    foi registrada: não há tipo correspondente no schema.
15. **Esmeralda abrange dois municípios** (Esmeralda e Pinhal da Serra); `city` = Esmeralda.
    **Caseiros** tem capelas em Muliterno, Ibiraiaras e Ibiaçá; **São Paulo Apóstolo (Lagoa
    Vermelha)** tem capelas em Capão Bonito do Sul; **N. Sra. de Fátima (Vacaria)** tem 12 capelas
    em Monte Alegre dos Campos. As comunidades ficam sob a paróquia, não sob o município.
16. **Missa da Catedral na quinta-feira** é celebrada "no Santuário" (registrado em `notes`) —
    confirmar de que santuário se trata.
