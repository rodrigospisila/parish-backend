# Diocese de Pinheiro (MA) — relatório de pesquisa

Data da coleta: **2026-09-18**. Agente de pesquisa (rodada MA — fechamento do Maranhão).

## Resumo

| Item | Valor |
|---|---|
| Paróquias no JSON | **25** (23 paróquias + 2 quase-paróquias) |
| Confiança das paróquias | 25 `alta` / 0 `media` / 0 `baixa` |
| Comunidades | 0 (a diocese não publica) |
| Horários fixos | 31, **todos `baixa`** (agregador Lírio Católico) |
| Cobertura | 25 encontradas × 25 esperadas (catholic-hierarchy 2023) |

## Fontes principais

1. **Site oficial `https://diocesedepinheiro.com.br` — ATIVO e atualizado.** A melhor fonte
   desta rodada depois de Carolina. O WordPress tem um **tipo de conteúdo próprio `locais`**
   (visível em `/wp-json/wp/v2/types`), e `/wp-json/wp/v2/locais?per_page=100` devolve as 25
   fichas de uma vez (`X-WP-Total: 25`). O `content.rendered` da REST vem vazio (Elementor),
   mas as páginas HTML (`/locais/<slug>/`) trazem, por paróquia: **data de ereção, festa
   paroquial, endereço da matriz, endereço da casa paroquial, CEP, e-mail, telefone com o nome
   da secretária, pároco, vigário e diácono**. As fichas foram modificadas entre 02/2025 e
   08/2026 (`modified` da REST) — sinal de atualidade forte.
2. `/curiadiocesana/` — endereço, telefone e **e-mail** da cúria (o `dioceses.json` está com
   `email: null`).
3. `gcatholic.org/churches/local/pinh0` (28 igrejas, 22 marcadas "Parish", atualizada em
   01/01/2026) e `catholic-hierarchy.org/diocese/dpinh.html` (25 paróquias em 2023).
4. `liriocatolico.com.br/horario_missa/dados/uf/MA.json` — única fonte de horário encontrada.

## Método e decisões

- **A varredura da Receita não serve para Pinheiro.** A busca do Mapa das OSC/IPEA por razão
  social "DIOCESE DE PINHEIRO" devolve só 2 inscrições no MA: a sede
  (CNPJ 06.201.917/0001-30) e a "Ação Social da Diocese de Pinheiro" (06.201.438/0001-14).
  As paróquias desta diocese têm **CNPJ próprio**, então o truque das filiais da mitra (que
  fechou Balsas, Brejo, Carolina, Coroatá, Grajaú e Zé Doca) não se aplica aqui. Como o site
  oficial está completo e atualizado, não foi necessário insistir.
- **Nomes e cidades.** As duas quase-paróquias foram erigidas em **30/05/2026**; o slug da
  página ainda diz "area-pastoral", mas o título oficial já é "Quase-Paroquia da
  Bem-Aventurada Virgem Maria …". Oitiua é povoado de **Alcântara** (confirmado na página
  "História" da própria diocese); Porto Santo é povoado de **Turiaçu** (a própria ficha diz
  "Porto Santo, Turiaçu").
- Três paróquias ficam na sede sem que o título diga a cidade: **Nossa Senhora da Conceição –
  Pacas**, **São José – Fomento** e **São Benedito** são todas de **Pinheiro** (bairros Pacas,
  Fomento e São Benedito, CEP 65200-000). Conferem com as quatro entradas de Pinheiro no
  gcatholic (Catedral, N. Sra. da Conceição, São Benedito, São José).
- **Paróquia São Jorge** fica em **Cururupu** (bairro/distrito Areia Branca) — a casa paroquial
  da própria ficha é "Rua da Alegria, 40, Centro, CEP 65268-000, Cururupu – MA".
- Igrejas do gcatholic que **não entraram** por não serem paroquiais e não terem horário
  publicado em fonte oficial: Ruínas da Igreja de São Matias (Alcântara), São Benedito
  (Cururupu), Santa Luzia, São João Batista e São Pedro Apóstolo (Pinheiro).

## Horários — por que todos são `baixa`

A diocese **não publica horário de missa em lugar nenhum** (nem nas fichas de paróquia, nem em
página própria). As 31 entradas do JSON vêm só do `liriocatolico.com.br`, cujo
`ultima_atualizacao` (2026-09-02) é a data de regeneração da base, igual em todas as fichas do
estado — pela regra do README, agregador sozinho e sem data de conferência é `baixa`, e não há
segunda fonte independente e atual para corroborar. Ficam fora da carga, aguardando validação.

Paróquias com horário registrado (`baixa`): Catedral Santo Inácio de Loyola, N. Sra. da
Conceição (Pacas), São Benedito, São José (Fomento), São José (Guimarães) e São Bento dos Peris.

### Igrejas com missa publicada que NÃO foram vinculadas a paróquia

O Lírio lista, em Pinheiro-sede, seis igrejas com missa que **não** são paróquias e cujo vínculo
paroquial não está publicado em nenhuma fonte (a coincidência de telefone com uma paróquia é
inferência, não fonte — não foi usada). Ficam fora do JSON e tabuladas aqui:

| Igreja (Pinheiro) | Endereço no Lírio | Missa | Telefone na ficha |
|---|---|---|---|
| Igreja N. Sra. da Imaculada Conceição | Avenida Getúlio Vargas | Ter/Sáb 06:30, Dom 07:00, Seg 19:30 | (98) 98412-1780 (= Catedral) |
| Igreja N. Sra. do Sagrado Coração | R. Antônio Trindade, 12 | Dom 17:00 | (98) 98410-8598 (= São Benedito) |
| Igreja Sagrado Coração de Jesus | R. Antônio Trindade, 12 | Dom 09:00 | (98) 98409-6494 (= São José/Fomento) |
| Igreja Santa Luzia | R. Maria Pinheiro Paiva | Sáb 19:30 | (98) 98412-1780 |
| Igreja Santa Terezinha do Menino Jesus | Rua Floriano Peixoto | Dom 09:30 | (98) 98412-1780 |
| Igreja São João Batista | Rua Joaquim Távora | Dom 19:00 | (98) 98410-8598 |
| Igreja São Pedro | R. Viriato Costa, 922-836 | Sáb 19:30 | (98) 98410-8598 |
| Igreja de São Raimundo Nonato | R. Raimundo Marcelino Ferreira | Dom 09:00 | (98) 98410-8598 |
| Igreja de São Brás (Santa Helena) | R. João Damásio Pavão, 424 | Dom 17:00; confissão Dom 16:30 | — |

## Para o enxame de validação humana

1. **Horários**: nenhum horário de Pinheiro tem fonte oficial. Confirmar pelo menos a grade da
   Catedral e das paróquias da sede (Instagram `imaculada_pinheiro`, `com.sjb`,
   `paroquia_sao_benedito02`, `saojosedeguimaraes`, `paroquiadesaobentoma` aparecem no Lírio).
2. **Vínculo das 9 igrejas da tabela acima** — se forem comunidades das paróquias da sede,
   entram como `communities` e os horários sobem junto.
3. **Quase-paróquias de 2026** (Oitiua e Porto Santo): confirmar o nome oficial definitivo e se
   já receberam território próprio.
4. **Paróquia São Sebastião de Peri-Mirim**: o e-mail da ficha aparece com o rótulo
   "(Secretário: Myslla Martins dos Inocentes)" grudado — conferir se o e-mail está íntegro.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

| Campo | Valor atual | Valor encontrado | Fonte |
|---|---|---|---|
| `email` | `null` | `diocesepinheiro@bol.com.br` | `https://diocesedepinheiro.com.br/curiadiocesana/` |
| `address` | "Curia Diocesana, Av. Presidente Eurico Dutra 386" | "Av. Presidente Dutra, 386 A - Centro" (a diocese escreve sem o "Eurico" e com o complemento "A") | idem |

`bishopName` (Dom Elio Rama, I.M.C.), `phone` ((98) 3381-1278), `zipCode` (65200-000),
`website` e `foundedYear` (1939, ereção da Prelazia de Pinheiro) conferem — **não mexer**.
