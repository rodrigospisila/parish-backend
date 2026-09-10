# Relatório de pesquisa — Diocese de Caçador (SC)

- **Arquivo gerado:** `paroquias/SC/cacador.json`
- **Data da pesquisa:** 10/09/2026
- **Circunscrição:** Diocese de Caçador (ereção 23/11/1968), sufragânea de Florianópolis
- **Bispo:** Dom Cleocir Bonetti (nomeado 30/06/2021, posse 03/10/2021)

## Resumo

| Item | Quantidade |
|---|---|
| Paróquias | **25** (25 `alta`, 0 `media`, 0 `baixa`) |
| Comunidades/capelas | **485** (todas `alta`) |
| Horários fixos | **106** (todos `alta`) |
| Paróquias com horários | **25 de 25 (100%)** |
| Cobertura | **25/25 = 100%** |

Circunscrição pequena e muito bem documentada: o site oficial mantém uma página por paróquia
(com endereço, CEP, telefone, e-mail, pároco, diáconos, horário de secretaria e a lista completa
de comunidades) **e** uma página diocesana única com os horários de missa de todas as paróquias.
Não foi necessário recorrer a agregadores.

## Fontes principais

| Fonte | Uso |
|---|---|
| https://diocesedecacador.org.br/paroquias-6699/ | Lista oficial: 25 paróquias em 6 microrregiões (Caçador, Videira, Arroio Trinta, Porto União, Canoinhas, Santa Cecília) |
| https://diocesedecacador.org.br/horarios-de-missa-7015/ | Horários de missa de todas as 25 paróquias — página oficial, última modificação **01/10/2025** (dentro dos 12 meses ⇒ `alta`) |
| 25 páginas individuais `https://diocesedecacador.org.br/<slug-da-paroquia>/` | Endereço, CEP, telefone, e-mail, pároco, comunidades, ano de criação |
| https://diocesedecacador.org.br/clero/ | Conferência dos nomes de padres e diáconos (com datas de nascimento/ordenação) |
| https://diocesedecacador.org.br/bispo/ | Dom Cleocir Bonetti |
| https://diocesedecacador.org.br/santuario-diocesano/ | Santuário Diocesano N. Sra. de Fátima, Mãe dos Pobres (Fraiburgo) |
| https://www.catholic-hierarchy.org/diocese/dcaca.html | Nº esperado de paróquias (25, dados de 2023), ereção, bispo |

O site é WordPress com construtor de página: o conteúdo **não** vem pela API REST
(`content.rendered` vazio). As páginas foram lidas em HTML direto.

## Cobertura

- **catholic-hierarchy: 25 paróquias (2023) — encontradas 25.** Cobertura de 100%, sem paróquia
  faltante nem excedente.
- Todas as 25 têm horários fixos de missa publicados oficialmente.
- O **Santuário Diocesano Nossa Senhora de Fátima, Mãe dos Pobres** (Fraiburgo) não é paróquia
  autônoma: está registrado como **comunidade** da Paróquia Imaculada Conceição de Fraiburgo,
  com o horário dominical de 15h. As obras do santuário estão em andamento desde 08/2024.

## Horários NÃO carregados (recorrência mensal ou por dia do mês)

O formato do dataset só comporta recorrência semanal (`dayOfWeek`), então estes ficaram de fora.
São todos oficiais e podem ser úteis ao enxame de validação:

| Paróquia | Horário |
|---|---|
| Imaculada Conceição (Fraiburgo) | 1ª sexta-feira, 15h — Apostolado da Oração |
| Santuário N. Sra. de Fátima (Fraiburgo) | Todo dia 13, 15h |
| N. Sra. das Vitórias (Porto União) | 1ª sexta, 16h na Matriz e 15h na Comunidade Santa Catarina (bairro Santa Rosa) |
| São Pedro e São Paulo (Porto União) | 1ª sexta, 9h — Sagrado Coração de Jesus |
| Santa Cecília | 2º domingo, 18h; batizados no 2º domingo às 8h30 |
| N. Sra. dos Campos – Rainha da Oração (Arroio Trinta) | Última quarta, 13h30; 3º domingo, 19h (missa da família) |
| São Luiz Gonzaga (Iomerê) | 1ª sexta, 14h (Apostolado da Oração); 2ª quinta, 13h45 (Terceira Idade) |
| Santo Antônio (Rio das Antas) | Todo dia 13, 18h30 |
| Santa Isabel (Rio das Antas / Ipoméia) | Todo dia 28, 19h — devotos do Pe. Hermenegildo Bortolatto |
| Divino Espírito Santo (Major Vieira) | 1ª sexta, 19h |
| São José Operário (Monte Castelo) | 1ª sexta, 15h — Sagrado Coração de Jesus |
| São Sebastião (Papanduva) | 1ª terça, 15h na igreja matriz |
| São João Batista (Três Barras) | 1ª terça, 15h |

Também **não** foi carregado o grupo de RCC das terças, 19h30, na Paróquia São Pedro e São Paulo
(Porto União) — é encontro de oração, não missa. Os terços dessa mesma paróquia
(segundas 8h e 19h, quintas 15h) entraram como `ROSARY`.

## Pontos que precisam de validação humana

1. **CEP fora da faixa de SC — Paróquia Santa Cruz (Canoinhas).** A página oficial traz
   `84.460-000`, que pertence ao Paraná; Canoinhas/SC é `89460-000`. Gravado `zipCode: null`
   para não injetar dado errado.
2. **Dois CEPs conflitantes — Paróquia São José Operário (Monte Castelo).** A página traz
   `89.380-000` na linha do endereço e `CEP: 89394-000` logo abaixo. Gravado `89380-000`
   (faixa do município).
3. **Telefones malformados (gravados como `null`).**
   - N. Sra. do Perpétuo Socorro (Treze Tílias): `(49) 9821-8850` — celular em formato de 8
     dígitos, anterior ao 9º dígito.
   - São José (Timbó Grande): `(49) 93380-6655` — 9 dígitos, mas com prefixo inválido.
4. **Matriz com padroeiro diferente do da paróquia** (mantido como está na fonte oficial):
   - **Santa Juliana (Salto Veloso)** — a lista de comunidades identifica a matriz como
     `Santa Ana - Matriz`. Gravada como `Santa Ana (Matriz)` com `isMatriz: true`.
   - **Senhor Bom Jesus (Irineópolis)** — a matriz aparece como `Matriz - São Sebastião`.
     Gravada como `Matriz São Sebastião`.
5. **Grafia do município — Irineópolis.** O título da página escreve "Ireneópolis"; o endereço
   da mesma página escreve "Irineópolis/SC" (grafia oficial do IBGE). Usada a grafia correta.
6. **Divergências de grafia entre a página da paróquia e a página do Clero** (usado o nome da
   página do Clero nos dois primeiros casos, por ser a lista canônica da diocese):
   | Página da paróquia | Página do Clero | Gravado |
   |---|---|---|
   | Pe. Almedo Driedrich | Pe. Almedo Diedrich | Diedrich |
   | Pe. Edi Wilson Heiden | Pe. Edi Wilson Heyden | Heyden |
   | Pe. Marlon Malakoski | Pe. Marlon Malacoski | Malakoski |
   | Pe. Elizeu Osinski | Pe. Elizeu Ozinski | Osinski |
   | Pe. Camilo João Munano | Pe. Camilo João Munaro | (vigário, não gravado) |
   | Pe. Rogério Inácio Esmeraldino | Pe. Rogério Esmeraldino | Rogério Inácio Esmeraldino |
7. **Endereço da Cúria divergente.** Site oficial: `Avenida Santa Catarina, 228 – Centro,
   CEP 89500-121`. catholic-hierarchy: `Av. Santa Catarina 247, C.P. 227, 89500-000`.
   Gravado o do site oficial.
8. **Catedral com dois e-mails.** `paroquiasfassis@diocesedecacador.org.br` (institucional, o
   gravado) e `catedralsfa@hotmail.com` (secretaria paroquial).
9. **Paróquias intermunicipais** (gravada a cidade da sede):
   - São João Batista — sede em **Matos Costa**, atende também **Calmon** (secretaria abre em
     Calmon às quintas; há a comunidade Santa Terezinha – Calmon).
   - N. Sra. dos Campos – Rainha da Oração — sede em **Arroio Trinta**, atende também
     **Macieira** (comunidade Santo Antônio – Macieira).
   - Santa Isabel — sede no **Distrito de Ipoméia**, que pertence ao município de
     **Rio das Antas**; gravado `city: "Rio das Antas"`, `neighborhood: "Distrito de Ipoméia"`.
     Divide o pároco e o e-mail com a Paróquia Santo Antônio de Rio das Antas.
10. **Horários possivelmente incompletos na fonte oficial** (só 1–2 celebrações semanais
    publicadas): São João Batista (Três Barras) — apenas domingo 8h30; Divino Pai Eterno
    (Bela Vista do Toldo) — apenas domingo 8h30 e quinta 19h; Santa Isabel (Ipoméia) — apenas
    domingo 8h. Vale confirmar por telefone.
11. **Paróquia Santa Juliana (Salto Veloso)** não publica endereço de rua, apenas Caixa Postal 03
    e CEP; `address: null`.
12. **Caractere corrompido na fonte.** A página de Papanduva grava `São Pedro - Ǫueimados` e a de
    Monte Castelo `Passa Ǫuatro` (U+01EA no lugar de "Q"). Normalizados para "Queimados" e
    "Passa Quatro".
13. **Padres estrangeiros / de congregação** nas paróquias de Caçador: Pe. Jagannathan Gnanadurai
    e Pe. Merry Benzer George (N. Sra. Rainha) — grafia conferida na página do Clero.
