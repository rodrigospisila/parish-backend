# RELATÓRIO — Diocese de Osório (RS)

- **Arquivo**: `paroquias/RS/osorio.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 23 (todas paróquias) |
| Paróquias com confiança **alta** | 21 |
| Paróquias com confiança **media** | 2 |
| Paróquias com confiança **baixa** | 0 |
| Comunidades/capelas | 259 |
| Horários fixos | 301 (79 `alta`, 3 `media`, 219 `baixa`) |
| Cobertura | 23 / 23 (100 %) |

> **De longe a melhor fonte das três dioceses.** Cada uma das 23 paróquias tem **site oficial
> próprio**, hospedado em subdomínio da diocese (`<paroquia>.diocesedeosorio.org`), com relação
> de comunidades e quadro de horários de missas. Quase todos com `Copyright © 2026`.

## Fontes principais

1. https://www.diocesedeosorio.org/acesse-o-site-e-as-redes-sociais-da-sua-paroquia-no-litoral-norte-gaucho.html
   — notícia diocesana de **14/01/2026** com a **relação das 23 paróquias** e o site de cada uma
2. https://www.diocesedeosorio.org/areas-pastorais — as **6 áreas pastorais** e sua composição
3. https://www.diocesedeosorio.org/curia — endereço, telefones, e-mail e o bispo
   **Dom Jaime Pedro Kohl, PSDP**
4. https://www.diocesedeosorio.org/bispo-da-diocese-de-osorio-divulga-novas-transferencias-de-padres-para-2026.html
   — **transferências para 2026** (28/10/2025)
5. https://www.diocesedeosorio.org/diocese-de-osorio-divulga-as-nomeacoes-e-transferencias-de-padres.html
   — nomeações de 2019 (usada só como referência histórica; **não** foi gravada)
6. **Os 23 sites paroquiais** — página inicial (endereço + "Nossas Comunidades"),
   `/horarios-de-missas` (ou `/missas-2`, `/horario-das-missas`), `/secretaria` e `/clero`
7. https://www.catholic-hierarchy.org/diocese/dosor.html — ereção em 10/11/1999; **23 paróquias**;
   bispo desde 15/11/2006

## Cobertura

**23 paróquias / 23 esperadas.** Confere com a notícia diocesana de 14/01/2026, com a página
"Áreas pastorais" e com o catholic-hierarchy.org. Uma fonte secundária fala em **24 paróquias**;
não há a 24ª em nenhuma lista oficial — provavelmente é a Paróquia Bom Pastor (Imbé), criada por
desmembramento de Tramandaí e já contada nas 23.

| Área pastoral | Paróquias |
|---|---|
| Osório | Catedral N. Sra. da Conceição; N. Sra. de Caravaggio; N. Sra. da Saúde (Cidreira); Santo Antônio de Pádua (Bal. Pinhal); São José (Palmares do Sul) |
| Capão da Canoa/Tramandaí | N. Sra. de Lourdes (Capão da Canoa); N. Sra. dos Navegantes (Tramandaí); Bom Pastor (Imbé); São Pedro (Xangri-lá) |
| Santo Antônio | Santo Antônio; N. Sra. da Boa Viagem; Santa Teresinha *(as três em Sto. Antônio da Patrulha)*; São Cristóvão (Caraá) |
| Terra de Areia | São Pedro (Terra de Areia); N. Sra. da Piedade (Maquiné/Barra do Ouro); Santo André Avelino (Maquiné); Imaculada Conceição (Três Forquilhas e Itati) |
| Torres | São Domingos; São José Operário *(ambas em Torres)*; N. Sra. de Lourdes (Arroio do Sal) |
| Três Cachoeiras | São José (Três Cachoeiras); N. Sra. do Amparo (Dom Pedro de Alcântara); Senhor Bom Jesus (Morrinhos do Sul e Mampituba) |

## Os dois sites fora do ar (confiança `media`)

Em 10/09/2026 dois subdomínios respondem **HTTP 500**:

| Paróquia | Host | Recuperação |
|---|---|---|
| São Pedro — Terra de Areia | `paroquiata.diocesedeosorio.org` | Arquivo da Internet, cópia com `© 2025` |
| N. Sra. dos Navegantes — Tramandaí | `paroquianavegantes.diocesedeosorio.org` | Arquivo da Internet, cópia com `© 2025` |

Ambas ficaram com **`confidence: "media"`** na paróquia e nas comunidades. Os horários de
Tramandaí ficaram **todos em `baixa`**: o quadro se intitula literalmente
**"Horários de Missas (Janeiro/2025)"** e traz datas fixas (05/01, 13/01, 26/01…). Os semanais de
Terra de Areia ficaram em `media`.

## Párocos: levantados nas páginas `/clero` de cada paróquia

Foram baixadas as 21 páginas `/clero` disponíveis (as duas paróquias fora do ar não têm),
e não a lista de 2019 — que estava muito defasada.

| Paróquia | Pároco gravado | Origem |
|---|---|---|
| Catedral (Osório) | Pe. Ildomar Ambos Danelon | `/clero` (rótulo "Pároco") |
| N. Sra. da Boa Viagem (SAP) | Pe. Hilário Sozo | `/clero` |
| Santo Antônio (SAP) | Pe. Adalberto Lumertz Borges | `/clero` |
| Santa Teresinha (SAP) | Pe. Fabiano Glaeser dos Santos | `/clero` + posse em 2025 |
| Santo André Avelino (Maquiné) | Pe. José Marcelino Willrich | `/clero` (pároco desde 15/12/2024) |
| Santo Antônio de Pádua (Bal. Pinhal) | Pe. Gilberto Silva de Fraga | `/clero` (pároco desde 16/11/2023) |
| N. Sra. do Amparo (D. P. de Alcântara) | Pe. Edivan Machado de Oliveira | `/clero` |
| N. Sra. da Saúde (Cidreira) | Pe. André Audibert | `/clero` + transferências 2026 (**administrador paroquial**) |
| N. Sra. de Lourdes (Capão da Canoa) | Pe. Jair Peres de Pinho | `/clero` |
| São Cristóvão (Caraá) | Pe. Jackson dos Santos | `/clero` |
| São Domingos (Torres) | Pe. Leonir Alves | `/clero` |
| São José Operário (Torres) | Pe. Ozéias Vieira dos Santos | `/clero` |
| São José (Palmares do Sul) | Pe. Celito Manganelli | `/clero` |
| São José (Três Cachoeiras) | Pe. Marlon Ramos Lopes | `/clero` |
| N. Sra. de Lourdes (Arroio do Sal) | Pe. Nilso Ricardo Zanella | transferências 2026 |
| Bom Pastor (Imbé) | Pe. Edson Luiz Bataglin | transferências 2026 |
| Imaculada Conceição (Três Forquilhas) | Pe. Ceverino Craco | transferências 2026 |

**Seis paróquias ficaram com `priestName: null`** — ver o item 1 dos pontos de validação.

## Comunidades

**259 comunidades**, todas da relação "Nossas Comunidades" publicada por cada paróquia (ou, em
alguns casos, dos próprios quadros de horário, que nomeiam a comunidade e o bairro). As maiores:

| Paróquia | Comunidades |
|---|---|
| Senhor Bom Jesus (Morrinhos do Sul e Mampituba) | 22 |
| Santo Antônio (Sto. Antônio da Patrulha) | 22 |
| São Cristóvão (Caraá) | 20 |
| São Domingos (Torres) | 17 |
| N. Sra. da Boa Viagem (SAP) | 16 |
| N. Sra. dos Navegantes (Tramandaí) | 16 |
| São José (Três Cachoeiras) | 14 |
| Catedral (Osório) | 13 |
| Imaculada Conceição (Três Forquilhas) | 13 |

Dois **santuários diocesanos** aparecem como comunidades, e não como paróquias autônomas —
como a própria diocese os lista:
**Santuário Diocesano N. Sra. das Lágrimas** (Alto Caraá, na Paróquia São Cristóvão) e
**Santuário Diocesano N. Sra. de Lourdes** (a Gruta, na Paróquia N. Sra. do Amparo).

## Horários

**301 horários.** A distribuição por confiança conta a história do litoral norte gaúcho:

- **79 `alta`** — semanais fixos, de página oficial ativa. Concentram-se nas matrizes e nas
  comunidades urbanas.
- **219 `baixa`** — a esmagadora maioria das comunidades do interior celebra **uma vez por mês**
  ("1º e 3º sábado", "4ª quinta-feira", "2º domingo"). O campo `dayOfWeek`/`time` guarda o dia da
  semana e a hora, e `notes` guarda a regra de recorrência, que o esquema atual não representa.
- **3 `media`** — os semanais de Terra de Areia (site fora do ar).

### Sazonalidade — o problema específico desta diocese

Quase todas as paróquias de praia publicam **dois quadros**: "baixa temporada" e "veraneio". A
regra aplicada foi gravar o quadro de **baixa temporada** como `alta` (é o que vale em setembro)
e o de veraneio como `baixa`, sempre com a janela no `notes`.

| Paróquia | Situação |
|---|---|
| Santo Antônio de Pádua (Bal. Pinhal) | Dois quadros explícitos; veraneio **27/12 a 01/03/2026** |
| São Pedro (Xangri-lá) | "Horários de celebrações (**atualizado em 08.04.2026**)" — **Programação de Inverno, 02/03 a 23/12/2026**. É o quadro vigente hoje: todos `alta` |
| N. Sra. de Lourdes (Capão da Canoa) | "HORÁRIOS DE MISSAS (**Março a Dezembro 2026**)" — vigente: `alta` |
| N. Sra. da Saúde (Cidreira) | Só publica "**Horários de Verão 2025/2026**" e um bloco de fim de ano — **temporada encerrada**; todos gravados em `baixa` |
| São Pedro (Terra de Areia) | Nota "no verão, sábados às 19h30" na comunidade Praia Santa Rita |

## ⚠️ Pontos para o enxame de validação

1. **Seis paróquias sem pároco gravado**, e dois **conflitos reais** entre sites oficiais:
   - **Pe. Ildomar Ambos Danelon** aparece como "Pároco" na página `/clero` da **Catedral** e é
     também o único padre da página `/clero` da **Rede de Comunidades Senhor Bom Jesus**
     (Morrinhos do Sul). Gravado na Catedral (lá o rótulo é explícito); Morrinhos ficou `null`.
   - **Pe. Marlon Ramos Lopes** encabeça o `/clero` de **São José (Três Cachoeiras)** — com
     vigário e diácono, formato de escala paroquial — e também tem biografia no `/clero` de
     **São Pedro (Xangri-lá)**. Gravado em Três Cachoeiras; Xangri-lá ficou `null`.
   - **N. Sra. de Caravaggio (Osório)**: a página `/clero` traz só a palavra "Pároco", sem nome.
     Em 2019 a paróquia era confiada à **Congregação dos Pobres Servos da Divina Providência**.
   - **N. Sra. da Piedade (Maquiné/Barra do Ouro)**: `/clero` diz "Em breve…".
   - **São Pedro (Terra de Areia)**: Pe. Ceverino Craco saiu em 2026 para Três Forquilhas; o
     sucessor não foi anunciado e o site está fora do ar.
   - **N. Sra. dos Navegantes (Tramandaí)**: em 2019 era da **Ordem dos Frades Menores
     Capuchinhos**; site fora do ar.
2. **Dois sites em HTTP 500** (`paroquiata`, `paroquianavegantes`) — checar se voltaram e
   reconfirmar horários e endereços. O de Tramandaí é o mais urgente: 25 horários de **janeiro de
   2025**, todos `baixa`, vários com datas fixas que foram descartadas.
3. **CEP da Cúria divergente**. A página `/curia` diz *Rua Santos Dumont, 2355 – Albatroz –
   **94662-120** – Osório/RS*, mas **94662-120 é de Alvorada/RS**; Osório é 95520-xxx. Ainda:
   - a página inicial da diocese dá *Rua Major João Marques, 430 – 95520-000*;
   - o catholic-hierarchy dá *Rua Dr. Mario Santo Dani, 218 – 95520-000*.
   Foi gravado o endereço da `/curia` **com `zipCode: null`**. **Três endereços diferentes para a
   mesma cúria — resolver.**
4. **Horários de Cidreira estão vencidos.** A Paróquia N. Sra. da Saúde só publica o quadro de
   verão 2025/2026. Os 11 horários estão em `baixa`. Buscar o quadro de inverno
   (Instagram `@pnssaude_cidreira`).
5. **Paróquias sem nenhum horário publicado** (`schedules: []`):
   - **N. Sra. de Caravaggio (Osório)** — a página remete à secretaria, (51) 98410-1369;
   - **São Cristóvão (Caraá)** — publica **programação datada** (setembro), não quadro fixo; foi
     descartada. As 20 comunidades da paróquia aparecem nela e valeria remontar o rodízio;
   - **N. Sra. da Piedade (Maquiné)** — "Em breve …"; também sem comunidades;
   - **N. Sra. de Lourdes (Arroio do Sal)** — não tem página de horários, só `/calendario`, vazia.
6. **Paróquia São José (Três Cachoeiras)**: a tabela de horários tem as 14 comunidades e os
   bairros, mas **a coluna "Horário de Missa" está em branco** em 13 delas. Só a comunidade
   Sagrado Coração (Mesquitas) tem horário. Vale um novo acesso.
7. **Divergência interna em São José Operário (Torres)**: a página `/horarios-de-missas` diz
   *domingos 19h30, quartas 19h*; o widget "Horário de Missas" da barra lateral **do mesmo site**
   diz *quartas 19h, sextas 19h30, domingos 08h e 19h*. Gravada a página dedicada; o domingo
   ficou em `baixa` por causa da divergência.
8. **Duas comunidades sem nome** na Paróquia Santo Antônio (SAP): "Bairro Assis Brasil –
   Comunidade _______" (2º sábado, 15h) e "Bairro Saibreira – Comunidade __________" (2º domingo,
   9h30), além de "Bairro Léo Seidel – Comunidade __________" (3º domingo, 10h). **Foram
   omitidas** — nome e horário existem, falta a dedicação.
9. **Endereços incompletos**: São Pedro (Terra de Areia) — o site escreve literalmente *"Rua
   Osvaldo Bastos, nº __"*. São José Operário (Torres) e Senhor Bom Jesus (Morrinhos do Sul) não
   publicam endereço; N. Sra. do Amparo idem. Nenhuma paróquia da diocese publica CEP.
10. **Telefones no padrão (51) 98410-xxxx** — a diocese distribuiu uma faixa de celulares
    corporativos. Onde a página trazia só o número solto, foi normalizado com o DDD 51.
11. **Nomes de comunidade heterogêneos entre paróquias**: "Comunidade X – Bairro Y" (maioria),
    "Igreja X – Bairro Y" (Bom Pastor/Imbé), "Comunidade-Igreja X/Bairro" (Terra de Areia),
    "COMUNIDADE X" em caixa alta (Santa Teresinha/SAP). Foram mantidos **verbatim** para casar
    com o que os quadros de horário referenciam. Uma normalização posterior é desejável.
12. **Bom Pastor (Imbé)**: a matriz foi assumida como *Igreja N. Sra. Aparecida – Bairro Mariluz*,
    porque é o endereço da paróquia (Av. Paraguassú, 6900 – Mariluz). O site não marca a matriz.
    Confirmar. Ainda: o quadro chama a comunidade Menino Jesus de Praga de "(ASA BRANCA)" e a
    lista de comunidades a põe no "Bairro Ipiranga".
13. **Sagrada Família – Atlântida Sul** está na Paróquia São Pedro de **Xangri-lá**, mas o próprio
    quadro escreve "Atlântida Sul – **Osório**". Comunidade em município vizinho ao da paróquia.
