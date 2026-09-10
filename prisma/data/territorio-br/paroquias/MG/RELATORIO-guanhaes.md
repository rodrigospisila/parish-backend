# Relatório de pesquisa — Diocese de Guanhães (MG)

**Agente:** pesquisa de território (Vale do Jequitinhonha / Alto Jequitinhonha)
**Data da pesquisa:** 2026-09-10
**Arquivo gerado:** `paroquias/MG/guanhaes.json`

## Resumo numérico

| Métrica | Valor |
|---|---|
| Paróquias no arquivo | **27** (1 delas é a Catedral) |
| Paróquias esperadas | 27 (catholic-hierarchy 2019/2021) · 25 (Annuario Pontificio 2024) |
| Confiança das paróquias | 27 `alta` |
| Comunidades/capelas | **520** (508 `alta`, 12 `media`) |
| Horários fixos | **6** (todos missa) — 3 `alta` e 3 `baixa` |
| Paróquias com horário | **2 de 27** |
| Áreas pastorais | 4 |
| Municípios | 24 |
| Bispo | Dom Otacílio Francisco Ferreira de Lacerda |

## Fontes principais

1. **https://diocesedeguanhaes.com.br/paroquias/** — diretório oficial: 27 paróquias, cada uma com
   padroeiro e cidade ("Sant'Ana – Água Boa", "São Miguel e Almas – Guanhães" …). *Acessado 10/09/2026.*
2. **https://diocesedeguanhaes.com.br/paroquias/&lt;slug&gt;/** — 27 páginas individuais, com
   *pároco/administrador · vigário · LISTA NOMINAL DE COMUNIDADES · pastorais e movimentos ·
   histórico · Contato (endereço, CEP, telefone/WhatsApp e às vezes e-mail)*. *Acessadas 10/09/2026.*
3. **https://diocesedeguanhaes.com.br/wp-json/wp/v2/paroquias?per_page=100** — REST API do WordPress
   (custom post type `paroquias`). `X-WP-Total: 27` — confirma o total canônico.
4. **https://diocesedeguanhaes.com.br/areas-pastorais/** — as 4 Áreas Pastorais e as paróquias de
   cada uma; página atualizada em **01/09/2026**.
5. **https://www.catholic-hierarchy.org/diocese/dguah.html** — diocese erigida em 1985, sufragânea de
   Diamantina; 27 paróquias (2019 e 2021), 25 (AP 2024); 222.800 católicos (81,4%), 29 presbíteros.
   *Atenção: o código da diocese no catholic-hierarchy é `dguah`, não `dguan` (esse é Guantánamo).*

### Sinal de atualidade

As 27 páginas de paróquia foram modificadas entre **21/04/2026 e 19/05/2026** (a maioria em
26/04/2026), e a página de Áreas Pastorais em **01/09/2026**. Portanto pároco, comunidades e contato
têm boa atualidade. Os históricos, porém, são textos antigos herdados do site anterior (alguns citam
párocos de 2012 como "atuais").

## Cobertura: encontrado vs. esperado

**27 de 27 — lista completa.** O REST API fecha a contagem e o diretório público lista exatamente as
mesmas 27. O AP 2024 registra 25, provavelmente por contar de forma diferente as duas paróquias
distritais de Conceição do Mato Dentro (Córregos e Tapera).

Distribuição por Área Pastoral (fonte: /areas-pastorais/, 01/09/2026):
- **Área 1 – São João Evangelista** (9): São João Evangelista, Paulistas, Peçanha, São Pedro do
  Suaçuí, São José do Jacuri, Coluna, São Sebastião do Maranhão, Água Boa e Santa Maria do Suaçuí.
- **Área 2 – Nossa Senhora do Patrocínio** (4): Joanésia, Braúnas, Virginópolis e Divinolândia de Minas.
- **Área 3 – Nossa Senhora da Conceição** (6): Morro do Pilar, Santo Antônio do Rio Abaixo,
  Dom Joaquim, Conceição do Mato Dentro, Córregos e Tapera.
- **Área 4 – São Miguel** (8): Guanhães (São Miguel e Nossa Senhora Aparecida), Rio Vermelho,
  Materlândia, Sabinópolis, Senhora do Porto, Dores de Guanhães e Ferros.

## O grande buraco: HORÁRIOS DE MISSA

**A diocese não publica horários de missa.** Só 2 das 27 paróquias trazem horário em fonte oficial:

| Paróquia | Horários gravados |
|---|---|
| Nossa Senhora Aparecida (Pito, Guanhães) | sábado 17h; domingo 9h (missa com as crianças) e 18h30 — `alta`. 1ª sexta-feira 19h (Sagrado Coração) — `baixa` (mensal). |
| Nossa Senhora do Porto (Senhora do Porto) | domingo 9h (1º e 4º) e 19h (2º, 3º e 4º) — `baixa` (a fonte publica só a regra mensal). |

O que **não** foi possível gravar, e por quê:
- Senhora do Porto publica também **"Toda 2ª e 4ª quintas-feiras"** e **"Missa na Capela do Rosário:
  1º sábado do mês"** — **sem horário**, então não há o que gravar. E "Missas nas Comunidades: 1 vez
  ao mês", sem detalhe.
- Pito publica ainda RCC (quinta 19h30), batizados (2º domingo 11h) e casamentos — **não são missa**,
  e por isso ficaram de fora. E "Missa nas comunidades: uma vez ao mês, seguindo a agenda do pároco".
- **Agregadores não ajudaram.** `horariodemissa.com.br` tem ficha (endereço e telefone) para Guanhães
  ("Catedral Diocesana São Miguel e Almas"), Conceição do Mato Dentro (duas igrejas), Santo Antônio
  do Rio Abaixo e São José do Jacuri, mas **o campo "Missas:" está vazio em todas**; o site está
  congelado desde 2019 (o aviso de Natal do próprio site ainda diz "Feliz 2019"). `missas.com.br`
  devolve **404** para as cidades da diocese. As 24 cidades da diocese foram consultadas uma a uma.
- Para fechar os horários das outras 25 paróquias seria preciso ir às páginas de Facebook/Instagram
  de cada paróquia (a diocese tem redes, as paróquias em geral não têm site) ou telefonar.

**Contexto que explica a escassez:** são **29 presbíteros para 27 paróquias e 520 comunidades**. Duas
paróquias declaram por escrito que a missa nas comunidades acontece **1 vez por mês**, "seguindo a
agenda do pároco" — ou seja, a maior parte das comunidades desta diocese não tem missa semanal, e
sim Celebração da Palavra conduzida por leigos. Um horário fixo semanal, aqui, só existe na sede.

## Precisa de validação humana

1. **Divergência de nome — Paróquia do Pito (Guanhães).** O diretório diocesano diz
   *"Nossa Senhora da Conceição Aparecida – Guanhães/Pito"*; a página da própria paróquia usa
   *"Paróquia Nossa Senhora Aparecida"* do começo ao fim. **Adotado o nome da página da paróquia.**
2. **Divergência de nome — Paróquia de Córregos.** O diretório diz
   *"Nossa Senhora da Conceição Aparecida – Córregos"*; o corpo da página diz só
   *"Paróquia: Nossa Senhora Aparecida"*. **Adotado o nome do diretório.**
3. **Pároco contraditório em Peçanha.** O cabeçalho diz "Pároco: Pe. José Aparecido de Pinho"; o
   histórico termina com "padre Marcello Romano, que é o atual pároco". Dom Marcello Romano é hoje
   bispo emérito de Araçuaí e a própria diocese o registra como **pároco de São João Evangelista**.
   Adotado o cabeçalho (Pe. José Aparecido de Pinho).
4. **Bispo emérito como pároco.** A Paróquia São João Evangelista tem como pároco **"Dom Marcello
   Romano"** (bispo emérito de Araçuaí). Gravado como está.
5. **Paróquia Senhor Bom Jesus de Matozinhos, em Conceição do Mato Dentro** — aparece no
   horariodemissa.com.br como paróquia autônoma, mas **não consta do diretório diocesano**. A sede da
   Paróquia Nossa Senhora da Conceição fica justamente na "Praça do Santuário" (Santuário do Senhor
   Bom Jesus de Matosinhos, de 1750, tombado). **Não foi gravada** como paróquia separada — confirmar
   se o santuário tem estatuto próprio.
6. **Paróquia de Sete Cachoeiras** — a página de Ferros diz que Sete Cachoeiras "atualmente se
   encontra agregada à paróquia de Ferros" e que ambas estão "temporariamente entregues aos cuidados
   pastorais de dois sacerdotes". Não consta do diretório e **não foi gravada** separadamente;
   "Sete Cachoeiras" ficou como comunidade de Ferros.
7. **Comunidades de outra jurisdição** (marcadas `media`, com a ressalva da fonte no nome):
   - Conceição do Mato Dentro: *Campo Redondo* (pertence à Paróquia Sant'Ana do Riacho, **Diocese de
     Sete Lagoas**), *Brejaúba* (atendida por Ferros), *Capitão Felizardo*, *Costa Sena* e
     *Cemitério do Peixe* (atendidas pela **Arquidiocese de Diamantina** — e de fato as três aparecem
     na lista de comunidades da Paróquia Santo Antônio de Gouveia, no arquivo `diamantina.json`).
   - Materlândia: *Bufão* (pertence a Materlândia, atendida por Paulistas) e *Almeidas* (pertence a
     Sabinópolis, atendida por Materlândia).
   - São Sebastião do Maranhão: *Queiroz* e *São Felinho* (atendidas por Água Boa e Santa Maria do Suaçuí).
   - Paulistas: comunidades em municípios de outras paróquias (Baguari e Rodrigues em São João
     Evangelista; Valérios e Bufão em Materlândia; Suaçuí em Coluna; Salema em Rio Vermelho).
8. **Contagens que a fonte declara e não cumpre** (a lista nominal é menor que o número declarado):
   - Braúnas: declara 41 comunidades de base, nomeia 13.
   - Peçanha: fala em "cerca de 40 comunidades rurais e 9 setores urbanos", nomeia 19 + 3 setores.
   - Ferros: fala em 20→30 comunidades, nomeia 21.
   - São Pedro do Suaçuí: declara 14, nomeia 15.
   - Guanhães (Catedral): declara 21, nomeia 21 no total (rurais + urbanas), o que bate.
9. **Duas paróquias sem lista de comunidades**: Córregos e Santo Antônio do Rio Abaixo (páginas quase
   vazias — só pároco, endereço e, no caso de Córregos, telefone). Ficaram só com a matriz.
10. **Telefones malformados / ausentes**:
    - São Pedro do Suaçuí: `(33) 9990-9088` (8 dígitos, sem o nono).
    - São José do Jacuri: `(33) 9 99301441`.
    - Virginópolis: `(33) 3416 1154` (sem hífen).
    - Rio Vermelho: `(33)3436-1222` (sem espaço).
    - **Sem telefone nenhum**: Morro do Pilar e Santo Antônio do Rio Abaixo.
11. **E-mail com acento no local-part**: a Catedral publica `paroquiaguanhães@gmail.com` — endereço
    provavelmente inválido (o correto deve ser `paroquiaguanhaes@gmail.com`). Gravado como publicado.
    Só 5 das 27 paróquias publicam e-mail.
12. **Ano de criação**: só 12 das 27 têm data segura no texto (extraídas dos históricos:
    Água Boa 1882, Braúnas 1851, Divinolândia 1891, Ferros 1832, Guanhães 1832, Joanésia 1862,
    Peçanha 1822, Sabinópolis 1840, São João Evangelista 1882, São Sebastião do Maranhão 1943,
    Tapera 1858, Pito 2012). As demais ficaram `null`.
13. **Nomes de comunidade com ruído da fonte** (o site escreve as listas em texto corrido, muitas
    vezes sem separador consistente): sobraram alguns casos em que duas comunidades ficaram no mesmo
    registro — *"Santo Antônio e Santa Terezinha"* (Senhora do Porto), *"Camelos e Santa Rita"*
    (Divinolândia), *"Sant'Ana da Limeira e São Cristóvão (bairro Salvador)"* e *"Queiroz e São
    Felinho"* (São Sebastião do Maranhão), *"Santo Antônio (Tapera) e Santo Antônio do Cruzeiro"*
    (Tapera), *"Lavrinha e Sucavão"* (Virginópolis), *"Rosa Mística I e II"* (Paulistas),
    *"Sant'Ana e São Joaquim (São Joaquim)"* (Coluna). Não foram quebrados porque em alguns casos a
    fonte realmente designa uma única comunidade com dois padroeiros.
14. **Setores tratados como comunidades**: Peçanha ("Setor Alvorada", "Setor Funda", "Setor Taquaral")
    e Paulistas (os 9 setores da Comunidade da Matriz) entram na lista de comunidades porque a fonte
    os apresenta assim. Rever se o Parish deve modelá-los como comunidade ou como subdivisão.
15. **Morro do Pilar** atende **aldeias indígenas** (Imbiriçu, Retirinho e Guarani), gravadas como
    comunidades, e comunidades no município de **Carmésia** — que a Área Pastoral 4 atribui a Dores
    de Guanhães. Possível sobreposição.

## Observações de método

- Site em WordPress (tema Kadence) com custom post type `paroquias` — o REST API deu tudo o que o
  site publica, sem precisar baixar as páginas HTML (ao contrário de Diamantina, aqui não há widget
  de horários fora do `content`). Foi checado: das 62 páginas do site, nenhuma é de horários.
- As listas de comunidades estão em **texto corrido**, com separadores inconsistentes (vírgula,
  ponto e vírgula, ponto final, ou nada). A extração precisou de várias heurísticas e o resultado
  ficou bom, mas não é perfeito — ver item 13.
