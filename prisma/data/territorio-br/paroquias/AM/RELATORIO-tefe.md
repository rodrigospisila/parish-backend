# Relatório — Prelazia de Tefé (AM)

Pesquisa: 2026-09-18. Arquivo: `paroquias/AM/tefe.json`.

## Resultado

| Métrica | Valor |
|---|---|
| Entradas de paróquia | **16** (14 paróquias + 2 áreas missionárias) |
| Confiança das entradas | 16 `alta` |
| Comunidades/capelas | 200 |
| Horários fixos | 86 — 35 `alta`, 47 `media`, 4 `baixa` |
| Cobertura | 16/16 publicadas pela Prelazia (100%); 14 paróquias = o número da Wikipédia |

## Fonte principal — uma só, e excelente

`https://prelaziadetefe.org.br` (WordPress com o tema **Parresia**) tem um **tipo de conteúdo próprio
`paroquia`**, exposto pela REST em `/wp-json/wp/v2/paroquia?per_page=100` — **16 fichas**,
classificadas na taxonomia `local_paroquia` em 5 regiões pastorais (RP01: 6, RP02: 2, RP03: 4,
RP04: 2, RP05: 2).

A ficha renderizada (não o `content` da API, que só traz a história) publica, em campos ACF:
**ano de criação, telefone, e-mail (ofuscado pelo Cloudflare, decodificado via `data-cfemail`),
horário de atendimento da secretaria, endereço com CEP, bloco de clero com a função de cada padre
e uma tabela "Horários de Missas"** com dia da semana, tipo, horário e observação (local).

Datas de modificação por ficha (sinal de atualidade, via `modified` da REST):

| ≤ 12 meses → horário `alta` | > 12 meses → horário `media` |
|---|---|
| São Benedito–Itamarati (08/08/2026), Santa Teresa–Tefé (21/06/2026), N. Sra. do Perpétuo Socorro–Tefé (11/06/2026), São José–Jutaí, São Joaquim–Alvarães, Divino Espírito Santo–Uarini, Divino Espírito Santo–Missão (todas 13/11/2025) | Santo Antônio–Tefé, Bom Jesus–Tefé, Á. M. São Sebastião, Á. M. São Francisco, N. Sra. Imaculada Conceição–Maraã, N. Sra. Aparecida–Japurá, N. Sra. de Fátima–Juruá, N. Sra. da Imaculada Conceição–Carauari (24/09/2024), N. Sra. de Guadalupe–Fonte Boa (25/09/2024) |

Outras fontes:
- `/wp-json/wp/v2/clero` — 36 fichas de clero (usadas só para conferir grafia dos nomes).
- **Receita Federal (`minhareceita.org`)**: o CNPJ da Prelazia (**04.626.545**, obtido pelo Mapa
  das OSC/IPEA, ficha 399901) tem **só 3 estabelecimentos ativos** — sede, Paróquia Santa Teresa e
  Paróquia N. Sra. da Imaculada Conceição de Carauari (0004 a 0030 são 404). **Aqui a varredura de
  filiais não serve de prova de completude**: as demais paróquias têm CNPJ próprio. Serviu para
  confirmar o CEP de Carauari (69500-000), que a ficha oficial não publica.
- `buscamissa.com.br` tem 4 fichas de Tefé (Perpétuo Socorro, Santa Teresa, Bom Jesus, Divino
  Espírito Santo); **não foram usadas** — a fonte oficial é mais completa e mais recente.

## Comunidades — o retrato amazônico

Seis fichas publicam a lista nominal das comunidades e foi de onde saíram as 200 entradas:

| Paróquia | Comunidades registradas |
|---|---|
| N. Sra. de Guadalupe – Fonte Boa | 64 (10 urbanas + 54 ribeirinhas em 8 setores) |
| N. Sra. de Fátima – Juruá | 42 (3 urbanas + 30 ribeirinhas + **9 aldeias indígenas Madija Kulina**) |
| São Joaquim – Alvarães | 38 (6 urbanas + 32 ribeirinhas em 5 setores) |
| Á. M. São Sebastião (Caiambé) | 16 (com população estimada de cada uma; 2 indígenas) |
| Santo Antônio – Tefé | 8 (com endereço de cada uma) |
| São José – Jutaí | 10 nomeadas de 31 declaradas |

Cinco fichas **declaram o total mas não nomeiam**: Á. M. São Francisco (22), Divino Espírito Santo
de Uarini (32 em 4 setores), Divino Espírito Santo da Missão (cerca de 60 antes do desmembramento
de 2018), São José de Jutaí (24 rurais além das nomeadas) e Santa Teresa (só cita "os rios Tefé,
Curumitá e Bauana e as comunidades do Lago de Tefé").

Divergências de contagem anotadas em `notes`: Fonte Boa diz 53 ribeirinhas e nomeia 54; Alvarães
diz 37 comunidades e nomeia 38. Nomes repetidos entre zona urbana e rural (Santa Teresa e São
Pedro em Fonte Boa; N. Sra. de Fátima em Alvarães) foram desambiguados com o setor no nome.

## Horários — decisões tomadas

- **4 `baixa`, todos por recorrência mensal**, com a frase literal da fonte em `notes`:
  Santa Teresa ("Na primeira sexta-feira de cada mês", 18h), Divino Espírito Santo da Missão
  ("Somente na primeira sexta-feira do mês", 19h30) e São Benedito de Itamarati (duas: "Primeira
  sexta-feira do mês – Solenidade do Sagrado Coração de Jesus" e **"19 de cada mês"**, esta com
  `dayOfWeek: null`).
- **Não entraram**, por não serem missa ou não terem hora:
  - *Celebração da Palavra*: Jutaí ("Domingo, 08 horas, em todas as comunidades") e Alvarães
    ("Sábado, 19h30, comunidades N. Sra. de Fátima e Santa Luzia"). O tipo não existe no enum
    `MASS/CONFESSION/ADORATION/ROSARY`.
  - Fonte Boa: as linhas de terça (N. Sra. do Perpétuo Socorro) e sexta (Sagrado Coração de Jesus)
    têm a palavra "Missa" no lugar da hora — **a fonte não publica o horário**.
  - Bom Jesus: "Domingo, 08 horas, nas demais comunidades — de acordo com a escala feita pelo
    pároco acontece Missa ou Celebração da Palavra" (nem nomeia as comunidades nem garante missa).
  - Á. M. São Francisco de Tamanicuá: "As celebrações nas comunidades ocorrem aos domingos", sem
    hora → **a única entrada do arquivo sem nenhum horário**. Não há padre residente.
- Adorações registradas: Maraã (sexta, 19h, antes da missa) e Itamarati (terça, 18h30, novena e
  bênção do Santíssimo antes da missa das 19h).

## Precisa de validação humana

1. **Paróquia Santa Teresa vs. "Catedral Santa Teresa"** — o site chama a ficha de "Paróquia Santa
   Teresa – Tefé", mas a igreja é a **Catedral de Santa Teresa**, sé da Prelazia (a própria ficha
   diz "Catedral de Santa Teresa"). Gravei como `Catedral Santa Teresa`.
2. **E-mail de Japurá**: a ficha publica `paroquia.japurá@hotmail.com`, **com acento**, o que não é
   endereço válido. Gravado sem o acento; precisa de conferência.
3. **Número da matriz de Santo Antônio (Tefé)**: campo de endereço diz 582, texto histórico da
   mesma ficha diz 572.
4. **Pároco de Alvarães**: o texto histórico diz Pe. Kleython Cabral de Moura (pároco desde abril
   de 2024); o bloco de clero, atualizado em 13/11/2025, diz Pe. Sidiomar Patrício Nunes,
   administrador paroquial. Adotei o bloco de clero.
5. **Pároco de Uarini**: o bloco de clero traz Pe. Sean Deegan como pároco; o texto histórico fala
   de "Padre João" da Sociedade de São Patrício. Adotei o bloco de clero.
6. **Comunidades não nomeadas** (~140 pela declaração das próprias fichas): Uarini (32), Jutaí (24
   rurais), Á. M. São Francisco (22), Divino Espírito Santo da Missão (~60) e todo o interior de
   Santa Teresa. É o maior buraco do arquivo e só a secretaria da Prelazia pode fechar.
7. **9 fichas com horário `media`** (as de setembro de 2024) — vale conferir se a grade mudou em
   dois anos, sobretudo Fonte Boa, Juruá e Japurá.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

Registro atual: `website: null`, `email: null`, `address: "Curia Prelaticia, Rua Duque de Caxias 438"`,
`zipCode: "69550-013"`, `phone: "(97) 3343-2563"`, `bishopName: "Dom José Altevir da Silva, C.S.Sp."`.

- **`website`**: hoje está `null`. O portal oficial existe e está ativo: **https://prelaziadetefe.org.br**.
- **`email`**: hoje está `null`. O rodapé do site publica **comunicacao@prelaziadetefe.org.br**.
- **`phone`**: além do (97) 3343-2563 registrado, o rodapé publica o celular **(97) 98449-5914**,
  e a Receita registra **(92) 7432-2563** para a sede (número antigo, com DDD 92).
- Endereço, CEP, cidade, UF e bispo conferem com o rodapé do site e com a Receita.
