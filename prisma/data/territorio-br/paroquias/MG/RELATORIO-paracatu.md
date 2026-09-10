# Diocese de Paracatu (MG) — relatório de pesquisa

**Arquivo:** `paroquias/MG/paracatu.json` · **Pesquisa:** 10/09/2026 · **Slug:** `paracatu`

## Resumo

| Item | Quantidade |
|---|---|
| Paróquias no arquivo | **34** (33 paróquias + 1 seminário marcado `nao-paroquial`) |
| Esperado (Anuário Pontifício 2024, dados de 2023) | 32 |
| Comunidades/capelas | **254** |
| Horários fixos | **426** (420 missas, 6 adorações) |
| Confiança das paróquias | 34 `alta` |
| Confiança dos horários | 280 `alta` / 0 `media` / 146 `baixa` |
| Municípios cobertos | 14 |
| Foranias | 6 |

Foranias: São Pedro Apóstolo — Paracatu (7), São Lucas Evangelista — João Pinheiro (6),
São Marcos Evangelista — Unaí e Cabeceira Grande (6), São Mateus Evangelista — Bonfinópolis,
Dom Bosco, Natalândia e Brasilândia (5), São Paulo Apóstolo — Formoso, Buritis, Arinos e Uruana (5),
São João Evangelista — Guarda-Mor e Vazante (3). Gravadas no campo `forania`.

## Fontes

1. **Site oficial — <https://dioceseparacatu.org.br>** (WordPress). Foi de longe a melhor fonte
   das quatro dioceses desta rodada:
   - `paroquia-sitemap.xml` — **34 fichas** do custom post type `paroquia`, com `lastmod` (de
     03/06/2025 a 14/08/2026). Cada ficha traz nome, endereço completo com CEP, pároco, vigário,
     diáconos, secretária, festa do padroeiro, telefone, WhatsApp, e-mail, site, redes sociais e a
     data de criação ("Criada em dd/mm/aaaa"). **Não** traz comunidades nem horários.
   - **6 páginas "Horários de Missas e Celebrações", uma por forania**, atualizadas em **jan/2026**
     (`lastmod` 22 a 27/01/2026): `horarios-sao-pedro-apostolo`, `horarios-sao-marcos-evangelista`,
     `horarios-sao-lucas-evangelista`, `horarios-sao-mateus-evangelista`,
     `horarios-sao-joao-evangelista`, `horarios-sao-paulo-apostolo`. São escalas completas por
     paróquia, por dia da semana, **com o nome da comunidade em cada horário** — daí vieram
     as 254 comunidades e os 426 horários.
     (`horarios-de-missas-e-celebracoes` é a página-índice que reúne as seis; mesmo conteúdo.)
   - **6 páginas de forania** (`sao-pedro-apostolo-paracatu` etc., de 2022) — listam nominalmente as
     paróquias de cada forania: **exatamente 32**.
2. **catholic-hierarchy.org — <https://www.catholic-hierarchy.org/diocese/dprtu.html>** (acesso
   10/09/2026): **32 paróquias em 2023**, 54.387 km² (a maior das quatro), província de Montes
   Claros, região CNBB Leste 2, prelazia erigida em 01/03/1929 e elevada a diocese em 14/04/1962,
   bispo Dom Jorge Alves Bezerra, S.S.S.

`robots.txt` devolve 403 no nginx do site, mas todo o resto abre normalmente com `curl` + UA de Chrome.

## Cobertura

**As 6 páginas de forania somam exatamente as 32 paróquias do Anuário — cobertura 100%.**
As 34 fichas do sitemap incluem duas unidades a mais:

- **Seminário Maior São João XXIII (Paracatu)** — casa de formação, não paróquia. Gravado com
  `"status": "nao-paroquial"` + `jurisdictionNote`; sem missa fixa publicada, então **sem**
  `loadAsParish`.
- **Paróquia Nossa Senhora de Fátima — bairro Água Branca, Unaí** (Rua dos Pardais, 390,
  CEP 38610-000). Tem ficha completa (pároco Pe. Geraldo Martins da Mota, WhatsApp e e-mail),
  **mas não aparece em nenhuma das 6 páginas de forania nem tem horário publicado**.
  Mantida como paróquia (`confidence: alta`, `forania: null`) — ver "validação humana".

**10 paróquias sem horário publicado** (não constam das páginas de horários):
São João Bosco (Dom Bosco), Nossa Senhora D’Abadia (Formoso), Nossa Senhora de Fátima (Unaí/Água
Branca), Sagrada Família (Canabrava, João Pinheiro), Santa Luzia (Buritis), Santuário Santa Rita de
Cássia (Guarda-Mor), Santa Rita de Cássia (Paracatu), São Cristóvão (João Pinheiro),
São João Maria Vianney e Nossa Senhora Aparecida (João Pinheiro), São José (Cabeceira Grande).

## Regras aplicadas ao gravar

- **Nomes** como na fonte, com prefixo padronizado. Um ajuste: `Par. São João Maria Vianney e Nossa
  Senhora Aparecida` → `Paróquia São João Maria Vianney e Nossa Senhora Aparecida`.
  Duas paróquias são publicadas com o prefixo "Santuário" (Nossa Senhora da Lapa, em Vazante, e
  Santa Rita de Cássia, em Guarda-Mor) mas aparecem como **paróquia** nas páginas de forania;
  mantive o nome da fonte, que o importador não filtra.
- **Cidades**: extraídas do endereço publicado. Dois casos de distrito, gravados com o município em
  `city` e o distrito em `neighborhood`, exatamente como a fonte escreve:
  **Palmital de Minas → Cabeceira Grande** (São Sebastião) e
  **Luizlândia do Oeste → João Pinheiro** (Nossa Senhora Aparecida). Canabrava e Água Limpa também
  são bairros/distritos de João Pinheiro.
- **Comunidades (254)**: **todas deduzidas do nome do local em cada horário** (`confidence: media`,
  sem endereço) — a diocese não publica uma lista de capelas separada. A matriz aparece nomeada
  ("Matriz Nossa Senhora de Fátima", "Matriz São José Operário"…) na maioria das paróquias; onde não
  aparece, o importador cria a matriz.
- **Horários = `alta`** (280): as páginas de horário foram atualizadas em janeiro de 2026, dentro dos
  12 meses.
- **Recorrência mensal → `baixa`** (146): "1º domingo", "2ª quarta-feira", "Toda 1ª e 3ª sexta-feira
  do mês", "1º, 3º e 5º domingos". A regra literal fica em `notes`. O caso extremo é a
  **Paróquia Nossa Senhora Aparecida (Arinos)**, cuja escala é quase toda mensal, dividida em
  "Áreas Urbanas" e "Áreas Rurais" — 93 horários, a maioria `baixa`.
- **Celebração da Palavra não entrou como missa**: a Paróquia Imaculada Conceição (João Pinheiro)
  publica explicitamente "Celebração da Palavra São Paulo Apóstolo (2º e 4º)",
  "Celebração da Palavra Nossa Senhora da Guia (1º e 3º)", "Celebração da Palavra São Geraldo",
  "Celebração da Palavra Nossa Senhora Aparecida — Olaria" — todas descartadas.
- **Recorrência por dia do mês descartada**: "Todo dia 12 de cada mês" (Imaculada Conceição/João
  Pinheiro, Santuário Nossa Senhora Aparecida — Serra da Coenge).
- **Adoração** gravada como `ADORATION` (6 registros), ex.: "18h – Adoração ao Santíssimo – Matriz
  Nossa Senhora de Fátima" (Paracatu) e "18h – Adoração ao Santíssimo Sacramento" (Natalândia).
- Campo não encontrado = `null`. Nenhum dado foi inferido.

## Precisa de validação humana

1. **Paróquia Nossa Senhora de Fátima (Água Branca, Unaí)** — tem ficha própria mas não está em
   nenhuma página de forania nem nas páginas de horário. Confirmar se é paróquia mesmo (e de qual
   forania) ou se é comunidade da Paróquia Nossa Senhora da Conceição / São João Batista de Unaí.
2. **10 paróquias sem horário** (lista acima) — o maior buraco desta diocese.
3. **Comunidades sem endereço** (254 de 254) e com o nome exatamente como a paróquia escreve na
   escala. Alguns são ambíguos e precisam de revisão antes de aparecer no app:
   - **"São Luís ou São Sebastião"**, **"São Sebastião ou São Luís"**, **"Santa Luzia ou São
     Lourenço"** (N. Sra. de Fátima/Paracatu) e **"São Miguel e São Lucas"**, **"São Mateus e São
     Leopoldo"**, **"Santa Cristina e São Gabriel"** (Senhor Bom Jesus/Paracatu) — a fonte junta
     duas comunidades numa linha só, indicando missa alternada ou concelebrada.
   - Nomes genéricos de local, não de comunidade: **"Abrigo Frei Pio"**, **"Terra Park"**,
     **"Centro de Convivência Senhor do Bonfim"**, **"Igrejinha Nossa Senhora da Lapa"**.
4. **5 paróquias sem ano de criação** na ficha: Santuário Nossa Senhora da Lapa (Vazante),
   Nossa Senhora de Fátima (Unaí), Nossa Senhora do Carmo (Unaí), São José (Unaí),
   São Sebastião (Cabeceira Grande).
5. **Paróquia Santa Rita de Cássia (Paracatu)** — sem telefone na ficha; o CEP vinha escrito
   "CEP: CEP: 38.608-040" (duplicado) e foi normalizado para `38608-040`.
6. **5 paróquias sem e-mail** na ficha.
7. **Divergência de forania na fonte** — a Paróquia Imaculada Conceição (Uruana de Minas) está na
   página da **Forania São Paulo Apóstolo**, mas sua escala de horários foi publicada na página da
   **Forania São Marcos Evangelista**. Gravei `Forania São Paulo Apóstolo` (página de forania como
   autoridade).
8. **Santuário Nossa Senhora Aparecida — Serra da Coenge** (na escala da Paróquia Imaculada
   Conceição, João Pinheiro): só tem missa "todo dia 12 de cada mês", que foi descartada; o
   santuário não virou registro próprio.
