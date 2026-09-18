# Relatório — Arquidiocese de Porto Velho (RO)

Pesquisa: 2026-09-18. Agente de pesquisa do território (enxame Parish).

## Resumo

| Item | Valor |
|---|---|
| Unidades gravadas | **36** (31 paróquias/catedral/santuários + 5 áreas missionárias) |
| Confiança das unidades | 36 `alta`, 0 `media`, 0 `baixa` |
| Comunidades nomeadas | **353** |
| Horários fixos | **213** (186 `alta`, 27 `baixa`) |
| Cobertura | 36/36 da lista oficial — a arquidiocese publica as 36 e a Receita não revela nenhuma além |
| Bispo | **Dom Roque Paloschi**, arcebispo metropolitano (desde 14/10/2015) — confirmado |

## Fontes principais

1. **Site oficial — <https://arquidiocesedeportovelho.org.br>** (WordPress, tema próprio
   `arquidioceseportovelho`). **Ativo e atual**: a home carimba a data do dia
   ("Porto Velho, sexta, 18 de setembro de 2026") e a última nota oficial é de 01/07/2026.
2. **`/paroquias/`** — a lista oficial completa, agrupada em **Região Pastoral Porto Velho**
   (Setores 1 a 6; os Setores 7 e 8 aparecem na página **sem nenhuma unidade**) e
   **Região Pastoral Ariquemes** (Setores 1 a 3). 36 links para fichas `/paroquia/<slug>/`.
3. **As 36 fichas individuais**, lidas uma a uma. Cada ficha traz: pároco, vigários e diáconos,
   endereço da igreja matriz, telefone/WhatsApp, site, e-mail, nome da secretária, expediente da
   secretaria, um bloco **"HORÁRIO DAS CELEBRAÇÕES"** e, em 28 delas, a **lista nominal das
   comunidades com endereço** (o Santuário Arquidiocesano publica até o horário de missa de cada
   uma das 14 comunidades).
4. **Receita Federal via Mapa das OSC/IPEA** — CNPJ raiz **05.902.606** ("ARQUIDIOCESE DE PORTO
   VELHO"), **42 estabelecimentos**. Usado como prova de completude e para recuperar CEP/endereço
   que a ficha não publica (Santa Luzia, São Roque).
5. **gcatholic.org** (`pvel0.htm`) — 29 paróquias em 31/12/2022; arcebispo Dom Roque Paloschi.
6. **ViaCEP** — conferência dos CEPs suspeitos.

A REST do WordPress **não** expõe o tipo `paroquia` (`/wp-json/wp/v2/paroquia` devolve
`rest_no_route`); o caminho foi raspar as 36 páginas com `curl` + UA de Chrome.

## Cobertura e prova de completude

- A própria página `/paroquias/` tem um **texto de abertura defasado**: diz "As 26 Paróquias e 04
  Áreas Missionárias (Alto e Baixo Madeira, São João Batista, Vista Alegre do Abunã e N. Sra
  Aparecida da Vila DNIT) compreendem mais de 900 comunidades", mas a **lista que ele encabeça tem
  36 unidades**. Gravei as 36. (O texto também não bate com os nomes: hoje as áreas missionárias
  publicadas são Alto Rio Madeira, Vila DNIT, Santa Dulce dos Pobres, São Roque e Campo Novo.)
- **Receita**: cruzei os 42 estabelecimentos do CNPJ 05.902.606 com as 36 fichas. **Todo endereço de
  paróquia da Receita casa com uma ficha do site, e nenhum endereço de paróquia da Receita falta no
  site.** Os estabelecimentos excedentes são a sede (Av. Carlos Gomes 964) e obras/escolas/seminário:
  Rua Gonçalves Dias 284 e 288, Rua Rafael Vaz e Silva 2085, Rua Aquariquara s/n, Av. Tancredo Neves
  1300 (Ariquemes) e um segundo registro na Av. Nações Unidas 605. As três áreas missionárias mais
  novas (Vila DNIT, Santa Dulce dos Pobres e Campo Novo) **não têm estabelecimento próprio**, o que é
  esperado. Aparece ainda um CNPJ diferente, 05.044.255/0001-70 (Rua Gonçalves Dias 288), que também
  é obra, não paróquia.
- gcatholic contava 29 paróquias em 2022; 31 paróquias + 5 áreas missionárias em 2026 é compatível.

## Regras aplicadas aos horários

- Só virou `MASS` o que a fonte rotula como missa/celebração eucarística. **Não entraram**:
  "Terça-feira – às 19:30h - Preparação para Liturgia" (Santa Dulce dos Pobres), a catequese, os
  expedientes de secretaria e as celebrações anunciadas sem hora.
- **Terço** virou `ROSARY` (Terço da Misericórdia e Terço Mariano da Catedral; terço de quinta em
  União Bandeirantes). **Adoração** virou `ADORATION` (Santa Clara, Sagrada Família).
- **Confissão**: só a Paróquia N. Sra. do Perpétuo Socorro de Vista Alegre do Abunã publica
  ("todas as sextas de 8h às 17h") → `CONFESSION` sexta 08:00 com a faixa em `notes`.
- **27 horários ficaram `baixa`**, todos por recorrência mensal, com a regra literal em `notes`:
  "1ª sexta-feira do mês" (Catedral, N. Sra. das Graças, N. Sra. do Rosário, Sagrada Família,
  Santa Clara, São Francisco de Assis/Ariquemes, São José/Monte Negro), "1ª segunda-feira"
  (São Luiz Gonzaga), "3º sábado – Missa Inclusiva" (São Cristóvão), "3ª terça – Missa da Saúde"
  (Rainha dos Apóstolos), "2º sábado – Missa dos Idosos" (Sagrada Família), "última terça"
  (Comunidade São José, Fátima), "1ª quinta – Missa pelas Famílias" e "4º domingo – missa com as
  crianças" (Vista Alegre do Abunã), "1º sábado – missa do desagravo" (N. Sra. de Nazaré) — e as de
  **data fixa do mês**, gravadas com `dayOfWeek: null`: dia 7 (N. Sra. do Rosário), dia 8
  (N. Sra. de Nazaré), dia 10 e dia 27 (N. Sra. das Graças), dia 12 (Santuário Arquidiocesano),
  dia 13 às 6h/9h/12h/18h (Santuário de Fátima).
- **Não há capelania militar** na lista da arquidiocese (nada do Ordinariado Militar apareceu).

## Pontos que precisam de validação humana

1. **Área Missionária Alto Rio Madeira (Jaci-Paraná / Nova Mutum) — rótulo trocado no site.**
   É a única ficha das 36 **sem bloco "HORÁRIO DAS CELEBRAÇÕES"**. As linhas "Sexta feira as 19 h" e
   "Domingos as 07h30" aparecem sob o rótulo **"EXPEDIENTE NA SECRETARIA"** do setor Nova Mutum
   Paraná — e secretaria nenhuma abre sexta às 19h e domingo às 7h30. Gravei as duas como missa em
   Nova Mutum com confiança `baixa`. **Confirmar com a área missionária.**
2. **Telefones malformados** (gravados como `null` ou substituídos pelo da secretaria, com a string
   publicada em `notes`):
   - N. Sra. dos Migrantes (União Bandeirantes): "69 99758194" — 8 dígitos depois do DDD → `phone: null`.
   - N. Sra. Auxiliadora (Alto Paraíso): "(69 9288-3765" → `phone: null`.
   - Santa Clara: "(69) 9 2000-3342" → gravei o da secretaria, (69) 99285-1676.
   - Sagrada Família: "(69) 9216-4530" → gravei o da secretaria, (69) 99343-1415.
   - N. Sra. do Carmo (Cacaulândia): "69 9362-0705" (8 dígitos) — **gravado como está**, conferir.
   - São Luiz Gonzaga: cabeçalho "(69) 9810-6328" vs. corpo "(69) 98100-6328".
3. **E-mails com defeito**:
   - Área Missionária São Roque: `paroquia.sroque2.gmail.com` — **sem arroba** → `email: null`.
   - Paróquia São João Batista de **Calama**: a ficha publica
     `adminstrativo@paroquiasjbcujubim.org` — erro de digitação **e** domínio da paróquia de
     **Cujubim**. Provável cópia indevida no site → `email: null`.
   - N. Sra. do Rosário: a Pascom sai como `pascom@paroquiansdorosario,org` (vírgula) — não gravado.
4. **CEPs**:
   - **Catedral** e as duas paróquias do Baixo Madeira publicam "76800-970 / 76801-974" e
     "76.801-974" — o primeiro **não existe** no ViaCEP e o segundo é o da **AC Central de Porto
     Velho** (caixa postal). Deixei `zipCode: null` nas três.
   - **Alto Paraíso**: a ficha publica "6862-000"; corrigi para **76862-000** (ViaCEP + Receita).
   - **São Francisco de Assis (Ariquemes)**: a ficha publica "776870-152"; corrigi para
     **76870-152** (ViaCEP confirma Av. Canaã 2712, Setor 01).
5. **Endereço divergente entre site e Receita** (gravei o do site): N. Sra. da Conceição
   (Candeias do Jamari) — site "Rua Dom Bosco, 97, Satélite", Receita "Rua Jerônimo Santana, s/n,
   Centro". Também divergem, por serem numerações antigas: N. Sra. do Amparo (4050 vs. 3988),
   Cristo Rei (Rua Cardeal vs. Rua Seis), São José/Monte Negro (Av. Francisco Prestes vs. RO-421 km 50)
   e Vista Alegre do Abunã (CEP 76846-000 vs. 76847-000).
6. **Área Missionária N. Sra. Aparecida (Campo Novo)** — a própria ficha diz **"pertence a paróquia
   São José - Monte Negro"**, e a ficha de São José publica as 12 comunidades do "Núcleo Campo Novo".
   Marquei `status: "nao-paroquial"` + `loadAsParish: true` (a arquidiocese a lista como unidade do
   Setor 2 e ela publica missa fixa). Decidir se deve ficar como unidade separada no app.
7. **Comunidade fora do território**: a Paróquia N. Sra. do Perpétuo Socorro de Vista Alegre do
   Abunã lista a **Comunidade São Jorge na Vila Curuquetê, município de Lábrea/AM** — território da
   **Prelazia de Lábrea**, atendido a partir de Rondônia. Gravada como a fonte publica, com nota.
8. **Comunidades declaradas mas não nomeadas** (ficaram só com a matriz, por decisão consciente):
   - **Santa Marta (Buritis)**: "a paróquia hoje é formada por 90 comunidades"; a ficha lista apenas
     as **16 áreas missionárias** e o total de cada uma (81 rurais somadas). As áreas são
     agrupamentos, não capelas — registrei os 16 nomes e os totais em `notes`.
   - **N. Sra. Aparecida (Machadinho d'Oeste)**: "Há na paróquia, atualmente, 58 Comunidades;
     destas, 7 estão na área urbana" — nenhuma nomeada.
   - Sem bloco de comunidades: Sagrada Família, N. Sra. Auxiliadora (Alto Paraíso), Santa Dulce dos
     Pobres, Vila DNIT, São Carlos (Baixo Madeira) e Calama (Baixo Madeira).
   - Área Missionária São Roque lista 16 comunidades mas declara ao fim **"17 Comunidades de base"** —
     uma ficou sem nome.
9. **Duplicatas dentro da própria ficha**, resolvidas para uma entrada só e anotadas:
   N. Sra. do Rosário repete "Comunidade Nossa Senhora Rainha" (Nacional); São José Operário repete
   "Bom Pastor" e "São João Batista"; N. Sra. de Nazaré tem dois estabelecimentos na Receita no
   mesmo endereço.
10. **Homônimas desambiguadas** com sufixo entre parênteses, para o importador não as fundir
    (regra do README): seis "Nossa Senhora Aparecida" em Cujubim, três em União Bandeirantes,
    três "São José" em Cacaulândia, dois "São Sebastião" e duas "Nossa Senhora da Penha" em
    São Francisco de Assis/Ariquemes, dois "Nossa Senhora do Rosário" em Monte Negro, etc.
11. **Nomes gravados sem o tratamento "Pe."** porque a ficha os publica assim:
    "Miguel Fernandes Ramos de Moura" (Alto Rio Madeira) e "Paulo Francisco Weschenfelder"
    (N. Sra. do Carmo, Cacaulândia).

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

Nenhuma correção necessária: nome, `type`, cidade, endereço (Av. Carlos Gomes 964), CEP
(76801-147), telefone ((69) 3221-2270), site e `bishopName` (Dom Roque Paloschi) conferem com o
site oficial e com o gcatholic.

Duas observações, **sem pedido de alteração**:
- O **e-mail** continua `null` no `dioceses.json`; o rodapé do site publica
  `coord.pastoral@arquidiocesedeportovelho.org.com` — note o `.org.com` final, **domínio
  inexistente**; é erro do próprio site, por isso não sugiro gravá-lo.
- `foundedYear: 1925` é o ano da **erecção da Prelazia de Porto Velho** (elevada a arquidiocese
  metropolitana em 04/10/1982) — está certo pela convenção do dataset.
