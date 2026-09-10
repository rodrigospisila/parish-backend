# Relatório de pesquisa — Diocese de Blumenau (SC)

- **Arquivo gerado:** `paroquias/SC/blumenau.json`
- **Data da pesquisa:** 10/09/2026
- **Circunscrição:** Diocese de Blumenau (ereção 19/04/2000), sufragânea de Florianópolis
- **Bispo:** Dom Rafael Biernaski

## Resumo

| Item | Quantidade |
|---|---|
| Paróquias | **41** (41 `alta`, 0 `media`, 0 `baixa`) |
| Comunidades/capelas | **263** (todas `alta`) |
| Horários fixos | **83** (52 `alta`, 25 `media`, 6 `baixa`) |
| Paróquias com horários | **6 de 41 (15%)** |
| Cobertura de paróquias | **41/41 = 100%** |

O cadastro de **paróquias e comunidades está completo e de altíssima qualidade**: o site diocesano
mantém uma página por paróquia com endereço, CEP, telefone, e-mail, site, pároco, vigários,
diáconos, data de criação e a lista de comunidades. O ponto fraco é **horários de missa**: a
diocese **não publica** uma página de horários fixos (só programações de Finados e Semana Santa,
que o prompt manda excluir), e a maioria das paróquias não tem site próprio.

## Fontes principais

| Fonte | Uso |
|---|---|
| https://diocesedeblumenau.org.br/pagina-paroquias/ | Lista oficial de paróquias (paginada na tela) |
| `https://diocesedeblumenau.org.br/wp-json/wp/v2/paroquias?per_page=100` | **API pública do WordPress** — devolveu as 41 unidades cadastradas com o conteúdo completo de cada página; foi assim que a lista foi fechada sem depender da paginação |
| https://diocesedeblumenau.org.br/pagina-comarcas/ + `/comarca/<slug>/` | Comarcas: Blumenau/Norte (8), Blumenau/Sul (9), Gaspar, Navegantes, Timbó |
| https://diocesedeblumenau.org.br/pagina-bispos/ | Dom Rafael Biernaski (bispo atual) |
| https://diocesedeblumenau.org.br/pagina-santuarios/ | N. Sra. Aparecida (Itoupava Norte) e N. Sra. dos Navegantes |
| https://www.catholic-hierarchy.org/diocese/dblum.html | Nº esperado de paróquias (41, dados de 2023), ereção, bispo |
| http://www.catedraldeblumenau.org.br/ | Horários da Catedral São Paulo Apóstolo |
| https://santuariodenavegantes.com.br/horarios/ | Horários do Santuário e de 5 comunidades |
| https://www.paroquiagaspar.com.br/horarios-de-missa | Horários e confissões da Paróquia São Pedro Apóstolo (Gaspar) |
| https://www.cristoreiblumenau.com.br/ | Horários, adoração e terço da Paróquia Cristo Rei (Velha) |
| https://www.santainesindaial.com.br/ | Programação semanal da Paróquia Santa Inês (Indaial) |
| https://www.horariodemissa.com.br/ (busca por cidade) | Único achado útil: Paróquia São Pio X (Ilhota) |

## Cobertura

- **catholic-hierarchy: 41 paróquias (2023) — encontradas 41.** Cobertura de 100%.
- Os **dois santuários** (N. Sra. Aparecida, Itoupava Norte; N. Sra. dos Navegantes, Navegantes)
  são também paróquias e constam do JSON com o prefixo `Santuário`.
- **Municípios cobertos (14):** Blumenau (17 paróquias), Navegantes (4), Gaspar (4), Indaial (3),
  Ilhota (2), Timbó (2), Benedito Novo (2), Balneário Piçarras (2), Penha, Pomerode,
  Rio dos Cedros, Doutor Pedrinho, Luiz Alves.
- **Horários: apenas 6 paróquias.** As 35 restantes não têm horário fixo publicado em nenhuma
  fonte acessível — a maioria só divulga celebrações por Facebook/Instagram, que não são
  legíveis por fetch. **Este é o maior débito desta circunscrição.**

### Paróquias com horários carregados

| Paróquia | Fonte | Confiança |
|---|---|---|
| Catedral São Paulo Apóstolo (Blumenau) | site oficial da paróquia | `media` (ver ponto 3) |
| Paróquia Cristo Rei (Blumenau, Velha) | site oficial da paróquia (conteúdo de 2026) | `alta` |
| Santuário N. Sra. dos Navegantes | site oficial do santuário | `alta` (3 horários `baixa`, ver ponto 2) |
| Paróquia São Pedro Apóstolo (Gaspar) | site oficial da paróquia (© 2026) | `alta` (1 `media`, ver ponto 4) |
| Paróquia Santa Inês (Indaial) | site oficial da paróquia (post de 02/09/2026) | `alta` |
| Paróquia São Pio X (Ilhota) | agregador horariodemissa.com.br (fonte única) | `baixa` |

## Horários NÃO carregados

- **Datas especiais** (excluídas pelo prompt): as únicas listagens diocesanas de horários são as
  de **Finados** (`/horarios-de-missas-nas-paroquias-capelas-e-cemiterios-.../`,
  `/locais-e-horarios-de-missas-no-dia-de-finados/` e o PDF de 2021) e as de Semana Santa.
  **Observação para o enxame de validação:** esses documentos de Finados listam capelas e
  cemitérios de praticamente todas as paróquias e podem servir para conferir a lista de
  comunidades, ainda que não sirvam para horários fixos.
- **Recorrência mensal / por dia do mês** (o dataset só comporta `dayOfWeek`):
  - Cristo Rei (Velha): 1ª sexta 8h (Sagrado Coração); dia 19 às 19h30 (São José e N. Sra. da
    Salete); dia 29 às 19h30 (São Miguel Arcanjo).
  - Catedral: missa do dízimo no 2º fim de semana do mês.
  - Santuário dos Navegantes: todo dia 02 às 19h30; 1º sábado 15h (com batizados);
    3º sábado 14h (encontro de batismo).
  - Gaspar/São Pedro: missa com os jovens no 4º domingo às 19h; missa da catequese no
    3º domingo às 9h45.
  - Santa Inês (Indaial): 1ª sexta 19h (Sagrado Coração); penúltima sexta 19h (Cura e
    Libertação); última sexta 19h (Missa da Saúde).
  - São Pio X (Ilhota): 1ª sexta 19h30 (segundo o agregador).
- **Encontros que não são celebração litúrgica:** Grupo de Oração RCC das terças em Santa Inês
  (Indaial) e o Grupo Ruah das terças em Cristo Rei; Legião de Maria e "Mães que oram" em
  Cristo Rei. Não carregados.
- **Terços sem horário fixo:** "Terço dos Homens e Mulheres — segunda-feira, após a Missa das
  19h" (Catedral) e "Terço Mariano — 30 minutos antes das missas do fim de semana" (Cristo Rei).
  Sem hora determinada, não foram carregados.

## Pontos que precisam de validação humana

1. **35 paróquias sem horário de missa.** Prioridade máxima para o enxame de validação. A
   diocese não centraliza horários e a maior parte das paróquias divulga apenas por rede social.
2. **Divergência entre duas fontes oficiais — Santuário N. Sra. dos Navegantes.**
   - Página da diocese (modificada em 06/02/2025): "Terças, quartas e quintas, **às 15h**".
   - Site do próprio santuário (`/horarios/`, conteúdo de 2026): terça **19h30**, quarta
     **19h30**, quinta **12h15**.
   Foram gravados os horários do site do santuário, mas com `confidence: "baixa"` e `notes`
   explicando a divergência. Segunda, sexta, sábado (19h30) e domingo (8h e 19h30) coincidem nas
   duas fontes ⇒ `alta`.
3. **Catedral São Paulo Apóstolo — fonte oficial sem sinal de atualidade.** O site
   catedraldeblumenau.org.br está no ar e traz a grade completa, mas o post mais recente do blog
   é de **22/08/2024** (> 12 meses). Todos os horários da Catedral entraram como `media`.
   - O agregador horariodemissa.com.br diverge no domingo (**07:30** contra **07:00** do site
     oficial) e nos dias de semana (19h apenas, sem a missa das 12h15). Mantido o site oficial.
   - As **confissões** da Catedral só estão anunciadas para quartas-feiras específicas de janeiro
     (dias 08, 15, 22 e 29) — datas pontuais, não carregadas.
4. **Gaspar/São Pedro — quinta-feira 9h.** Aparece sob o título "Horários de Missas" como
   "Novena Nossa Senhora das Graças", sem a palavra "Missa". Gravado como `MASS` com
   `confidence: "media"`; confirmar se é missa ou apenas novena.
5. **Bairro divergente — Paróquia Santa Cruz (Blumenau).** O título da página diz
   "Velha **Grande**" e o endereço na mesma página diz "Velha **Central**". Gravado
   `neighborhood: "Velha Central"` (o do endereço).
6. **Sites de paróquia que não resolvem / redirecionam** (mantidos no JSON porque são o que a
   diocese publica, mas precisam de correção):
   - **N. Sra. Imaculada Conceição (Vila Nova, Blumenau)** — `https://www.imaculadabnu.org.br/`
     não resolve (DNS NXDOMAIN, com e sem `www`).
   - **São Luiz Gonzaga (Tribess, Blumenau)** — `www.paroquiasaoluizgonzaga.com.br` responde
     301 para `online.fliphtml5.com/ParoquiaSaoLuizGonzaga/RevistaEternidade_Julho/`; o domínio
     não serve mais o site da paróquia.
   - **Santa Terezinha (Timbó)** — `psantaterezinhatimbo.com.br` existe mas está
     "PÁGINA EM CONSTRUÇÃO"; **não** foi gravado como `website`.
7. **E-mail malformado na fonte — São Vicente de Paulo (Luiz Alves).** A página traz
   `p.saovicentedepaulo@gmail.com outlook.com` (dois endereços colados). Gravado apenas o
   `@gmail.com`.
8. **Paróquias com dois e-mails** (gravado o primeiro/mais atual):
   - Santo Antônio (Garcia, Blumenau): `diocese.stoantonio@terra.com.br` e
     `diocese.stoantonio@gmail.com` → gravado o `@gmail.com`.
   - Santuário dos Navegantes: `secretaria@` (gravado) e `financeiro@santuariodenavegantes.com.br`.
9. **Lista de comunidades divergente dentro da própria página** (usada sempre a lista estruturada
   do bloco "Comunidades", não o texto histórico):
   - **São Vicente de Paulo (Luiz Alves):** bloco lista 15 comunidades; o histórico fala em
     "16 comunidades" e cita Santa Ana, São José e Madre Paulina, que não estão no bloco.
   - **São Pio X (Ilhota):** bloco lista 7; o histórico fala em 13 comunidades e cita
     N. Sra. do Rosário, N. Sra. da Glória, Sagrada Família, Imaculada Conceição, Madre Paulina
     e Cristo Rei.
   - **N. Sra. da Paz (Balneário Piçarras):** bloco lista 3; o histórico fala em 15 comunidades.
   - **Santa Terezinha (Timbó):** bloco lista 6; o histórico fala em 7 comunidades + matriz e
     cita N. Sra. Aparecida e São Paulo Apóstolo (Rio Fortuna).
   Os históricos são de 2002–2013 (livro do Pe. Antônio Francisco Bohn) — provavelmente
   desatualizados, mas valem conferência.
10. **"Capitéis" não carregados como comunidades.** Duas paróquias listam capitéis (oratórios)
    além das comunidades:
    - **N. Sra. Imaculada Conceição (Rio dos Cedros):** N. Sra. Aparecida, N. Sra. de Salete,
      N. Sra. das Graças (São Bernardo), Santo Antônio (Rio Assis).
    - **N. Sra. da Glória (Doutor Pedrinho):** Frei Bruno Linden, N. Sra. da Medalha Milagrosa,
      N. Sra. Aparecida.
11. **Paróquia sem comunidades listadas:** N. Sra. de Fátima (Ponta Aguda, Blumenau) —
    `communities: []`, o importador criará a matriz automaticamente.
12. **Paróquia sem telefone publicado:** Santo Estêvão (Salto do Norte, Blumenau) — só e-mail e
    horário de expediente.
13. **Administradores paroquiais em vez de párocos** (gravado com a ressalva entre parênteses no
    `priestName`): São João Batista/Badenfurt, São Roque/Benedito Novo,
    São Francisco de Assis/Fortaleza, N. Sra. Imaculada Conceição/Vila Nova,
    N. Sra. do Perpétuo Socorro/Água Verde, N. Sra. da Glória/Doutor Pedrinho.
14. **Divergência de telefone — São Pio X (Ilhota).** Diocese: `(47) 99741-1772` (celular/whats,
    gravado). Agregador horariodemissa.com.br: `(47) 3343-1140`. Não corroborado.
15. **Pároco em duas paróquias** (registro da fonte oficial, não é erro): Pe. Jairson José Kienen
    consta como pároco de São Luiz Gonzaga (Tribess, Blumenau) **e** de Santa Luzia (Navegantes);
    Pe. Antônio Francisco Bohn consta em N. Sra. do Rosário (Gaspar) **e** N. Sra. de Fátima
    (Ponta Aguda, Blumenau).
16. **Grafias a conferir:** "Rua Henrich Hemmer" (Badenfurt) — o logradouro oficial é
    *Heinrich* Hemmer, gravado corrigido; "Pe. Eugeníusz Klawikoswski" (Indaial) e
    "Pe. Frei Aldolino Bankhardt" (Gaspar) aparentam erro de digitação na fonte.
17. **Paróquia Nossa Senhora da Penha (Penha), criada em 27/03/1839** — a mais antiga da diocese
    (à época pertencia à Arquidiocese de Florianópolis). Data conferida na página oficial.
