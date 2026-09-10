# RELATÓRIO — Arquidiocese de Pelotas (RS)

- **Arquivo**: `paroquias/RS/pelotas.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 27 (26 paróquias + 1 santuário/reitoria não paroquial) |
| Paróquias com confiança **alta** | 26 |
| Paróquias com confiança **media** / **baixa** | 0 / 0 |
| Comunidades/capelas | 317 |
| Horários fixos | 140 (113 `alta`, 5 `media`, 22 `baixa`) |
| Cobertura | 26 / 26 (100 %) |

## Fontes principais

Todo o núcleo do dataset veio do **site oficial da Arquidiocese**, que publica, por área
pastoral, a ficha completa de cada paróquia (endereço, CEP, telefone, e-mail, pároco, data de
fundação) **e a lista numerada de todas as comunidades com endereço**:

1. https://www.arquidiocesedepelotas.org/pelotas — Área Pastoral **Pelotas** (13 paróquias,
   4 capelanias, 2 santuários)
2. https://www.arquidiocesedepelotas.org/jaguarao — Área Pastoral **Jaguarão** (7 paróquias)
3. https://www.arquidiocesedepelotas.org/cangucu — Área Pastoral **Canguçu** (6 paróquias)
4. https://www.arquidiocesedepelotas.org/locais-e-horarios-missas — **Locais e Horários de
   Missas e Celebrações** (fonte de praticamente todos os horários)
5. https://www.arquidiocesedepelotas.org/ — rodapé com endereço e telefone da Mitra

Fontes de corroboração de cobertura:

6. https://pt.wikipedia.org/wiki/Arquidiocese_de_Pelotas — 26 paróquias, 3 áreas pastorais,
   13 municípios
7. https://gcatholic.org/dioceses/diocese/pelo0.htm — 26 paróquias + 2 missões (31/12/2022)
8. https://www.catholic-hierarchy.org/diocese/dpelo.html — arcebispo Jacinto Bergmann

## Cobertura

**26 paróquias encontradas / 26 esperadas.** O total do site oficial (13 + 7 + 6) bate
exatamente com a Wikipédia e com o gcatholic.org.

> ⚠️ **Divergência**: o catholic-hierarchy.org informa **47 paróquias** (dados de 2023). Esse
> número não é corroborado por nenhuma outra fonte (nem pela própria estrutura publicada pela
> Arquidiocese) e foi **desconsiderado**. Vale conferir no enxame de validação.

Municípios cobertos: Pelotas, Capão do Leão, São Lourenço do Sul, Canguçu, Turuçu, Morro
Redondo, Piratini, Pedro Osório, Cerrito, Jaguarão, Herval e Arroio Grande (12 dos 13
municípios da arquidiocese — **Arroio do Padre** não tem paróquia própria; suas duas
comunidades, Sagrada Família e São Luiz, pertencem à Paróquia Nossa Senhora Medianeira, de
Turuçu).

## Decisões de modelagem

- **Registro não paroquial incluído**: `nossa-senhora-de-guadalupe-pelotas` —
  *Santuário Nossa Senhora de Guadalupe* (BR 392, km 88, Cascata, 5º Distrito de Pelotas),
  reitoria com reitor próprio (Pe. Augusto Carriconde Marques Júnior) e horários fixos
  (domingo 15h, quinta 19h). **Não é paróquia**; entra como 27ª entrada de `parishes`.
- O **Santuário de Adoração Perpétua** (Rua Sete de Setembro, 145) *não* virou entrada
  separada: o próprio site o lista como a comunidade nº 8 da Paróquia Catedral. Seus horários
  (terça, quinta e sábado às 16h) estão sob a Catedral.
- **Nomes de comunidades duplicados dentro da mesma paróquia** foram desambiguados com o
  local entre parênteses — ex.: em Piratini, `Nossa Senhora de Fátima (Terceiro Distrito)` vs
  `Nossa Senhora de Fátima (Assentamento Ferraria)`; em Canguçu, `Nossa Senhora Aparecida
  (Trapeira)` vs `Nossa Senhora Aparecida (Remanso)`.
- **Recorrências mensais** ("1ª sexta do mês", "3º domingo", "2ª quarta") entraram como
  `dayOfWeek` + `time` com a recorrência descrita em `notes` e **confiança `baixa`**, seguindo
  a convenção usada no Paraná.
- **Celebrações fora do escopo** (Grupo de Oração, novenas, festas) não foram incluídas.

## Horários — o que ficou de fora e por quê

O site publica os horários de missa apenas de **três blocos**: Pelotas (cidade), São Lourenço
do Sul e Pedro Osório. As demais 17 paróquias ficaram com `schedules: []`.

Sem horários publicados (precisam de nova rodada, redes sociais das paróquias):

| Paróquia | Cidade |
|---|---|
| Paróquia Senhor Ressuscitado | Pelotas |
| Paróquia Santa Tecla | Capão do Leão |
| Paróquia Nossa Senhora da Conceição | Piratini |
| Paróquia Nossa Senhora do Rosário | Cerrito |
| Paróquia Divino Espírito Santo | Jaguarão |
| Paróquia Imaculada Conceição | Jaguarão |
| Paróquia São João Batista | Herval |
| Paróquia Nossa Senhora da Graça | Arroio Grande |
| Paróquia Nossa Senhora Medianeira | Turuçu |
| Paróquia Sant'Ana | Pelotas (Colônia Maciel) |
| Paróquia Nosso Senhor do Bonfim | Morro Redondo |
| Paróquia Nossa Senhora da Conceição | Canguçu (55 comunidades!) |
Com cobertura **parcial** de horários (só a matriz, nenhuma comunidade):

| Paróquia | Cidade | Horários |
|---|---|---|
| Paróquia Operários de Cristo | Pelotas | 1 (domingo 9h) |
| Paróquia Santa Teresinha | Pelotas | 3 (matriz) |
| Paróquia São José Operário | Pelotas / Fragata | 4 (matriz) |

Missas listadas na página de horários que **não** foram mapeadas (não pertencem a nenhuma
comunidade paroquial listada) e por isso foram omitidas:

- **Capela do Carmelo Coração Eucarístico de Jesus** — segunda a sábado 7h e domingo 7h.
  É o mosteiro carmelita (Capelania Carmelo Sagrado Coração de Jesus, Av. Alfredo Assumpção,
  60, Laranjal, capelão Pe. César Augusto D. Garcia). Não consta como comunidade de nenhuma
  paróquia.
- **Capela do Hospital São Francisco de Paula** — segunda, quarta e sexta às 10h. É capelania
  hospitalar (Rua Marechal Deodoro, 1123, capelão Pe. Edson Francisco dos Santos), não
  comunidade paroquial.
- **Pedro Osório, "todo dia 19"** — adoração à tarde + missa de São José às 19h. Recorrência
  mensal por dia do mês, que o formato (`dayOfWeek`) não representa.

## ⚠️ Pontos para o enxame de validação

1. **Divergência de cobertura**: catholic-hierarchy.org diz 47 paróquias; site oficial,
   Wikipédia e gcatholic.org dizem 26. Confirmar.
2. **Atribuição de horários em São Lourenço do Sul** (5 registros marcados `media`): a página
   de horários renderiza São Lourenço e Reserva em duas colunas, e o bloco de domingo
   (8h Com. São José, 9h30 Com. Matriz, 19h Com. N. Sra. dos Navegantes, 19h30 Com. Santa
   Rita de Cássia) veio sem cabeçalho. Foi atribuído à **Paróquia São Lourenço** porque
   Navegantes, Santa Rita de Cássia e "Católica São José" são comunidades dela e porque o
   bloco dela era o único sem missa dominical. **Confirmar com a paróquia.**
3. **Horário contraditório** — Paróquia Nossa Senhora de Fátima (Pelotas), comunidade
   `Nossa Senhora Aparecida`: a página lista missa de **sábado às 17h30 e às 18h**. Pode ser
   erro de digitação da fonte. Ambos foram mantidos.
4. **Telefones malformados** (reproduzidos do site oficial, sem correção):
   - Paróquia Imaculada Conceição (Jaguarão): `(53) 8469-3248` — 8 dígitos com prefixo 8,
     provavelmente celular sem o nono dígito.
   - Paróquia Nossa Senhora de Fátima (Pelotas): a ficha traz `(53) 9927.0955`, mas a lista de
     comunidades traz `3227.0955` para a mesma matriz. Foi gravado **(53) 3227-0955**.
   - Paróquia Nossa Senhora Aparecida, Sagrado Coração de Jesus e Santa Teresinha têm
     WhatsApp com 8 dígitos (`99959.3110` está correto; `9703.3999`, `9174.7860` e `9983.3222`
     estão truncados). Só o telefone fixo foi gravado.
5. **E-mails com erro de digitação na fonte** — gravados como estão, para não inventar:
   - `nsradagraca@arquiocesedepelotas.org.br` (Arroio Grande) — falta o "d" de *arquidiocese*.
   - `santuario.guadalupe@arquidiocesdepelotas.org.br` (Santuário de Guadalupe) — falta o "e".
   - `paróquiaaparecida12@gmail.com` aparece com acento na lista de comunidades; foi usada a
     forma sem acento (`paroquiaaparecida12@gmail.com`), que consta da ficha da paróquia.
6. **Paróquia Operários de Cristo** não tem data de fundação publicada → `foundedYear: null`.
7. **Paróquia Santíssima Trindade** foi renomeada em 24/05/2024 (era *Paróquia Santo Cura
   d'Ars*, fundada em 02/09/1977). `foundedYear` = 1977; o e-mail ainda é `curadars@…`.
8. **Comunidade em transição**: `São José Operário` (Vila dos Municipários), da Paróquia Santa
   Teresinha, está marcada no site como "em transição".
9. **Paróquia Sant'Ana** fica em Colônia Maciel, **8º distrito de Pelotas** (não é município
   próprio) — `city: "Pelotas"`, `neighborhood: "Colônia Maciel"`. Idem Paróquia Santo Antônio
   (Laranjal) e Paróquia São José Operário (Fragata).
10. **Capelanias não incluídas** (UCPel, Santa Casa, Hospital São Francisco de Paula, Carmelo
    Sagrado Coração de Jesus) — o site as lista separadamente das paróquias.
