# Diocese de Sobral (CE) — relatório de pesquisa

Pesquisa em 11/09/2026. Arquivo gerado: `sobral.json`.

## Resultado

| | |
|---|---|
| Entradas | **52** — 45 paróquias + 5 áreas pastorais/missionárias + 2 santuários diocesanos sem paróquia |
| Confiança `alta` (paróquia) | 52 (todas — lista integral do site oficial) |
| Comunidades/capelas | 58 (52 matrizes + 6 capelas/santuários nominados) |
| Horários fixos | 98 — 88 MASS, 10 CONFESSION |
| Horários `alta` / `media` / `baixa` | 6 / 82 / 10 |
| Paróquias com horário | **12 de 52** (todas na cidade de Sobral, + Cariré e Massapê) |
| Paróquias com endereço + CEP | 51 de 52 · pároco: 44 · telefone: 26 · ano de criação: 45 |
| Municípios cobertos | 29 (bate com os "29 municípios" que a diocese declara) |

## Fontes

### Lista de paróquias — `https://diocesedesobral.com.br/` (oficial, `alta`)

As **páginas das regiões episcopais** são a melhor fonte: nome, endereço, CEP, cidade/distrito, data de
criação e os perfis de Instagram/Facebook/YouTube de cada paróquia.

- `/regioes-episcopais/sede/` — 12 paróquias + 2 áreas pastorais
- `/regioes-episcopais/acarau/` — 12 paróquias + 2 áreas missionárias
- `/regioes-episcopais/araras/` — 9 paróquias
- `/regioes-episcopais/coreau/` — 12 paróquias + 1 área pastoral
- `/regioes-episcopais/santuarios/` — 5 santuários diocesanos
- `/dados-gerais/` — texto que confere os totais e descreve cada região
- `/curia-diocesana/` — endereço, CNPJ, telefone e e-mail da Cúria
- `/dom-jose-luiz-gomes-de-vasconcelos-2/clero/incardinados-residentes/` — **mapeia pároco → paróquia**
  (fonte do campo `priestName`; 44 das 52 entradas)
- `/paroquias-a-e/`, `/paroquias-f-j/`, `/k-o/` — listagem alfabética, **incompleta e quebrada**
  (só existem A–E, F–J e uma página "K–O" com uma única paróquia; não há P–Z). As páginas das regiões
  cobrem tudo e foram preferidas.

O site é WordPress simples (sem CPT de paróquias na REST API); tudo é página estática. A ficha da
paróquia **não traz telefone, e-mail nem horário de missa**.

### Horários

A diocese **não publica horários de missa**. O que existe:

1. **`https://santaluziasobral.com/locais-e-horarios-de-missas-em-sobral/`** — página da Paróquia Santa
   Luzia com a grade da **cidade inteira de Sobral**, dia a dia, com 20+ igrejas. Marca
   "atualizado em 31/01/2025" → fonte oficial de paróquia, **sem sinal de atualidade** (20 meses) →
   `media`. É a origem de 82 dos 98 horários.
2. **`https://santaluziasobral.com/`** — grade da própria Santa Luzia, incluindo capelas → `alta`.
3. **`https://www.horariodemissa.com.br/`** (agregador) — corrobora integralmente o Santuário São
   Francisco de Assis e parcialmente Cristo Ressuscitado e N. Sra. de Fátima; é a **única** fonte de
   grade para **Cariré** e **Massapê** (→ `baixa`, fonte única não oficial). Também forneceu os
   **telefones** de 26 paróquias (a diocese não publica nenhum).
4. **`horariosmissa.com.br` / `missahora.com.br`** — descartado: tem 4 igrejas de Sobral, grade da
   Catedral **sem missa de domingo** e endereço errado ("Rua Galdino Goldin" em vez da Praça da Sé).
5. `acaocatolica.blogspot.com` — descartado: sem data, grades divergentes das duas fontes acima.

## Cobertura

- **45 paróquias encontradas = 45 esperadas** (catholic-hierarchy e o próprio texto da diocese:
  "29 municípios com 45 Paróquias, 5 Áreas Pastorais e 04 Santuários Diocesanos e 03 lugares de
  peregrinação"). As 5 áreas pastorais/missionárias também foram todas encontradas: N. Sra. da Saúde
  (Jordão), Divina Misericórdia (Sobral), São Francisco (Rafael Arruda), São Francisco de Assis
  (Parapuí) e São Pedro (Cauassu).
- **Horários: 12 de 52 (23%).** As 40 paróquias do interior entram **sem nenhum horário** — não há
  fonte publicada. É a lacuna principal desta diocese.
- Comunidades: praticamente inexistentes como dado publicado. A diocese declara **791 "missões"**
  (catholic-hierarchy) e não lista nenhuma. Só entraram 6 capelas/santuários nominados.

## Decisões de dados

- **Distritos viraram `neighborhood`, não `city`.** Aracatiaçu, Taperuaba, Jaibaras, Jordão e Rafael
  Arruda são distritos de **Sobral**; Sítio Alegre é de **Morrinhos**; Panacuí de **Marco**; Aranaú,
  Celsolândia e Cauassu de **Acaraú**; Caiçara de **Cruz**; Padre Linhares de **Massapê**; Parapuí de
  **Santana do Acaraú**. Assim o total de municípios fecha em 29.
- **Áreas Pastorais / Áreas Missionárias** ficaram com o nome oficial. A página do clero as chama de
  "Quase Paróquia" (Jordão, Rafael Arruda) — são quase-paróquias.
- **Santuários diocesanos**: 3 dos 5 pertencem a paróquias e entraram como **comunidade** delas —
  Sagrado Coração de Jesus (Paróquia São Manuel, Marco), N. Sra. de Fátima (Paróquia Santo Antônio,
  Aracatiaçu) e Tabor da Mãe Rainha (Paróquia do Cristo Ressuscitado, Sobral). Os outros dois viraram
  entrada própria com `status: "nao-paroquial"`:
  - **Santuário São Francisco de Assis** (Sobral, Centro) — `loadAsParish: true`: publica grade completa
    (23 horários, missa todos os dias às 6h e 17h30, 5 missas no domingo) e é a igreja mais movimentada
    da cidade depois da Sé.
  - **Santuário Diocesano São Bento** (Fazenda da Esperança, Sobral) — sem horário publicado, **não carrega**.
- Horários mensais ficaram `baixa`: as duas capelas da Paróquia Santa Luzia celebram em sábados
  alternados (1º/3º e 2º/4º).

## Precisa de validação humana

1. **40 paróquias sem nenhum horário** (todo o interior da diocese: Acaraú, Bela Cruz, Morrinhos,
   Marco, Cruz, Jijoca, Santana do Acaraú, Ipu, Santa Quitéria, Hidrolândia, Reriutaba, Varjota,
   Groaíras, Catunda, Pires Ferreira, Coreaú, Frecheirinha, Meruoca, Moraújo, Martinópole, Uruoca,
   Alcântaras, Mucambo, Pacujá, Senador Sá, Forquilha, e os distritos). **Todas têm perfil de
   Instagram/Facebook/YouTube registrado no site da diocese** (o campo está no JSON quando havia URL
   navegável) — é por aí que a validação humana deve começar.
2. **Grade da cidade de Sobral é de 31/01/2025.** Precisa de conferência: já há divergência entre as
   duas fontes para o Cristo Ressuscitado (Santa Luzia: ter–sex 18h30 e domingo 10h e 19h;
   horariodemissa: seg–sex 17h30 e domingo só 10h) e para N. Sra. de Fátima no sábado (18h15 × 17h).
3. **Telefones vieram do horariodemissa.com.br**, não da diocese — 26 números sem data de verificação.
4. **Capelas de Sobral com missa publicada e paróquia-mãe desconhecida** — ficaram **fora** do JSON
   para não inventar vínculo. A lista, com os horários da página da Santa Luzia, para quem for validar:
   Capela do Menino Deus (seg–sáb e dom 17h), Capela N. Sra. das Graças/Abrigo (seg–sáb 6h30, sáb 18h,
   dom 8h), Capela Cristo Rei/Junco (sáb 19h, dom 8h), Capela São João Batista/Padre Palhano (qua 19h,
   dom 17h), Capela N. Sra. do Perpétuo Socorro/Dom José (ter 17h, qui 19h, dom 17h), Capela da Sagrada
   Família (dom 17h30), Capela da Santíssima Trindade/Pedrinhas (dom 19h), Capela do Preciosíssimo
   Sangue/UVA (ter–qui 7h30), Capela N. Sra. do Rosário (qua e sáb 12h), Capela de Sant'Ana/Colégio
   Sant'Ana (ter e sex 17h15), Capela de São José (qua 19h), Capela São Pedro/Dom Expedito (sáb 19h),
   Capela Santo Antônio (sáb 19h15), Capela Jesus o Bom Pastor/Expectativa (sáb 19h30), Capela do
   Espírito Santo/COHAB III (sáb 19h30). **Comunidade Shalom** e **Comunidade Rainha da Paz** também
   têm missa publicada, mas são comunidades novas, não capelas paroquiais.
5. **791 "missões"** no Anuário Pontifício × 6 comunidades no dataset. Nenhuma diocese do CE pesquisada
   até aqui publica a lista de capelas rurais; é um levantamento para fazer paróquia a paróquia.
6. **Párocos sem correspondência**: Groaíras, Catunda, Caiçara/Preá e Sagrado Coração de Jesus (Sobral)
   ficaram com `priestName: null` — a página do clero não nomeia pároco para elas (só cita "Vigário
   Paroquial do Sagrado Coração de Jesus: Pe. José Bonifácio Fonseca Matos", que na página "K–O"
   aparece como pároco de **Catunda**; contradição não resolvida).
