# Arquidiocese de Maceió (AL) — relatório de pesquisa

Data da coleta: 2026-09-11

## O site oficial não serve

`arqdemaceio.com.br` está no ar e é o site oficial (WordPress), mas **não publica a lista de paróquias**:

- `https://arqdemaceio.com.br/paroquias/` existe no `wp-sitemap-posts-page-1.xml`, mas o corpo da página é literalmente
  `[cool-timeline layout="compact" ... show-posts="99" skin="default"]` — o shortcode do plugin não renderiza.
- A API REST (`/wp-json/wp/v2/types`) só tem `post`, `page`, `elementor_library` e `event_listing`. **Não há custom post type de paróquia.**
- `divisaodaigreja.com/arquidiocese-de-maceio/` tem a seção "Paróquias subordinadas" **vazia**.
- O CNBB NE2 traz só os dados da cúria.

## Fontes usadas

| Fonte | Uso |
|---|---|
| **Receita Federal via `minhareceita.org` — CNPJ 12.155.388 (Arquidiocese de Maceió)** | **lista completa**. Varredura das filiais 0001→0109 (parou após 30 falhas seguidas): 109 estabelecimentos ativos, com razão social/nome fantasia, logradouro, número, complemento, bairro, município, CEP e data de abertura. |
| `http://horadamissa.com` (Hora da Missa — Alagoas) | **horários**. Agregador dedicado às igrejas católicas de Alagoas, com 65 fichas de Maceió. Cada ficha tem padroeiro, pároco, endereço, CEP, telefone, e-mail, Instagram e as grades completas de **missa e confissão** por dia da semana. |
| `https://buscamissa.com.br/missas/al/maceio` | corroboração. 8 igrejas de Maceió, 6 com selo "Confirmado" (Catedral, N. Sra. do Rosário, São Pedro Apóstolo, N. Sra. da Assunção, N. Sra. de Fátima, N. Sra. Virgem dos Pobres) — todas batem com a ficha do horadamissa. |
| `https://gcatholic.org/dioceses/diocese/mace0` | número esperado: **102 paróquias (2022)**; arcebispo Dom Carlos Alberto Breis Pereira, O.F.M. (desde 03/04/2024). |
| `http://cnbbne2.org.br/arquidiocese-de-maceio/` | cúria: Av. Dom Antônio Brandão, 559-A – Farol, (82) 3223-2732. |

## Cobertura

- **114 entradas** no JSON:
  - **98 paróquias/quase-paróquias** (inclui a paróquia pessoal universitária de Santa Teresinha de Lisieux e 2 quase-paróquias criadas em 2026) — `confidence: media`;
  - **15 igrejas não paroquiais com missa publicada** (`status: nao-paroquial` + `loadAsParish: true`): Reitoria Bom Jesus dos Martírios, Santuário Virgem dos Pobres, Igreja N. Sra. do Rosário dos Pretos, Igreja N. Sra. do Livramento, Igreja de São Benedito, Igreja de São Gonçalo, Igreja do Convento dos Capuchinhos, Capela São Vicente de Paulo da Santa Casa, Capela Santa Luiza de Marillac, Capelania Militar Santo Inácio de Loyola, Seminário Provincial N. Sra. da Assunção, Carmelo Santa Teresinha, Casa Dom Bosco, Comunidade Doce Mãe de Deus, Igreja Sagrado Coração de Jesus (Poço);
  - **1 não paroquial sem missa** (Igreja Sagrado Coração de Jesus da Usina Utinga Leão, Rio Largo) — fica fora da carga;
  - **1 paróquia só do agregador** (`confidence: baixa`): Paróquia Nossa Senhora das Dores, bairro Santa Lúcia — tem ficha completa no horadamissa (Pe. Sérgio Toledo, Facebook próprio) mas **não** é filial do CNPJ da mitra.
- **Cobertura estimada: 98/102 (96%)**. A diferença se explica por paróquias com CNPJ próprio (o caso da N. Sra. das Dores/Santa Lúcia) e pelo fato de o número do GCatholic ser de 2022, enquanto 7 paróquias novas aparecem no CNPJ em 2025/2026.
- **35 municípios**.
- **7 comunidades** (só as que o agregador publica com grade própria).
- **460 horários fixos** (371 missas + 89 confissões), 440 `media` e 20 `baixa`.

### Por que os horários ficaram `media`

`horadamissa.com` é um agregador (fonte secundária), portanto sozinho seria `baixa`. Foram usados dois sinais de corroboração:
1. **buscamissa.com.br** confirma 6 fichas com selo "Confirmado" e horários idênticos;
2. os metadados das fichas batem com a realidade atual — por exemplo, a Catedral aparece sob **Cônego Walfran Fonseca (Administrador Paroquial)**, que é de fato o reitor atual, e quase toda ficha tem o Instagram oficial ativo da paróquia.
O site **não publica data de última atualização**; essa é a principal fragilidade e está registrada abaixo.

Horários com recorrência mensal/condicional ("1ª sexta-feira do mês", "todo dia 13", "Missa dos Condomínios", "votiva") foram rebaixados para `baixa` — 20 registros — conforme a decisão já adotada no dataset.

## Pontos que precisam de validação humana

1. **Data dos horários.** `horadamissa.com` não mostra "última atualização". É a maior incerteza deste arquivo: 440 horários `media` dependem dele. Prioridade nº 1 do enxame de validação em Maceió.
2. **Nenhum horário no interior.** As 40+ paróquias fora da capital (Rio Largo, União dos Palmares, Viçosa, Marechal Deodoro, Atalaia, Maragogi, Porto Calvo, Capela etc.) entram **sem nenhum horário**: nem o horadamissa nem o buscamissa cobrem o interior de Alagoas.
3. **Endereços/CEP do cadastro da Receita com ruído**: sete estabelecimentos usam o CEP genérico **57036-540** (0004, 0005, 0007, 0016, 0018, 0043, 0056) e três têm telefone-placeholder **(82) 1111-1111** (descartado). Vários `numero` vêm como "S/N" e alguns `complemento` estão truncados ("RUA MAJOR CICERO DE GOES MO" + "NTEIRO").
4. **`foundedYear` está `null` em todas.** A `data_inicio_atividade` do CNPJ é data de registro fiscal em lote (20+ paróquias com 1978-09-08, 5 com 2003-11-16, 4 com 2026-03-25), não fundação — regra do README aplicada.
5. **Conflitos de endereço entre Receita e agregador** (ficou o da Receita, com o horário do agregador anexado):
   - *N. Sra. do Bom Parto*: Receita = Rua General Hermes, Bom Parto; horadamissa = Rua José de Alencar, 410, Farol.
   - *Sagrada Família*: Receita = Rua Ouvidor Mendonça, Cruz das Almas; horadamissa = Rua Amanda de Medeiros Carlos, Jacarecica.
   - *Menino Jesus do Jardim das Acácias*: Receita = Alameda São Sebastião, Farol; horadamissa = "Menino Jesus de Praga", Rua Prof. Mário Marroquim, 168, Pinheiro. **O casamento dessas duas fichas é uma inferência** (mesmo orago, Jardim das Acácias fica no Pinheiro) — conferir.
   - *São José Operário (0011)*: Receita = Av. Siqueira Campos, Prado; horadamissa = "São José", Av. Siqueira Campos, 1700, Trapiche da Barra, com "Padres Claretianos". Provavelmente a mesma, mas o nome popular é **Paróquia São José do Trapiche**.
   - *São Paulo Apóstolo*: Receita = Conj. José Maria de Melo, Tabuleiro Novo; horadamissa = Rua João Farias Filho, Salvador Lira.
   - *Santo Antônio de Pádua*: mesmo logradouro, bairro divergente (Santa Amélia na Receita, Bebedouro no agregador).
6. **Três igrejas do Centro registradas pela própria arquidiocese SEM o prefixo "Paróquia"** (0002 N. Sra. do Livramento, 0004 N. Sra. do Rosário, 0006 São Benedito). Foram classificadas como `nao-paroquial` + `loadAsParish` por causa disso — confirmar se alguma delas é paróquia de fato.
7. **Comunidades inferidas** (3 casos, por coincidência de pároco, telefone e Instagram): Igreja N. Sra. de Fátima (Pajuçara) e Igreja da Santa Cruz (Jaraguá) como comunidades da Paróquia N. Sra. Mãe do Povo; Igreja N. Sra. de Nazaré (Pinheiro) como comunidade da Paróquia Menino Jesus do Jardim das Acácias; Capela São Domingos Sávio como comunidade da Paróquia do Imaculado Coração de Maria (Antares). Conferir.
8. **Paróquia N. Sra. das Dores (Santa Lúcia)** — `baixa`, não entra na carga. Confirmar se é paróquia da arquidiocese.
9. **`priestName` de "Paróquia Sagrado Coração de Jesus" (Cruz das Almas)** veio como "Luiz Antônio Nascimento" (sem tratamento) e "Cônego Everaldo" / "Padre Júnior" / "Padre Alex Sandro" estão incompletos na fonte.
10. Entradas descartadas por não serem lugar de culto: Cúria (0001), Instituto Teológico Pastoral (0046), Pastoral da Criança (0047), Tribunal Eclesiástico (0081) e o Centro Comunitário São Miguel de Viçosa (0028, situação **BAIXADA**).
