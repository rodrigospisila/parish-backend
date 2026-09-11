# Arquidiocese de São Salvador da Bahia — relatório de pesquisa

- **Slug**: `sao-salvador-da-bahia` · **UF**: BA · **Sede**: Salvador
- **Pesquisa**: 11/09/2026
- **Território**: 5 municípios — Salvador, Lauro de Freitas, Itaparica, Vera Cruz e Salinas da Margarida
  (o próprio site informa essa composição em `/paroquia/`).

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias (entradas oficiais) | **101** |
| Igrejas não paroquiais com missa publicada (`status: nao-paroquial`, `loadAsParish: true`) | 17 |
| Total de entradas no JSON | 118 |
| Confiança das paróquias | 95 `alta` · 6 `media` |
| Comunidades/capelas | **743** |
| Horários fixos | 844 (776 MASS · 68 CONFESSION) — 156 `media`, 688 `baixa` |
| Paróquias com pelo menos um horário | 82 de 101 |
| Paróquias com horário **carregável** (`alta`/`media`) | **10** de 101 |

**Cobertura: 101/101.** O catholic-hierarchy.org registra 101 paróquias (estatística de 2023) e foi
exatamente o número obtido.

> **Alerta de horários.** A Arquidiocese **não publica horário nenhum** — o campo "Informações do
> horário" existe em toda ficha e está **vazio nas 95**. A base do `horariodemissa.com.br` cobre bem
> Salvador (121 igrejas), mas **148 das 151 fichas consultadas foram atualizadas pela última vez
> entre 2013 e 2018**, antes da pandemia. Pela regra do README esses **688 horários entram como
> `baixa`** e não carregam. O que sobra de atual são **10 paróquias + 1 igreja conventual** vindas do
> `buscamissa.com.br` (156 horários `media`).

## Fontes principais

1. **Site oficial — `arquidiocesesalvador.org.br`** (fonte primária de nomes, endereços, CEP, telefone,
   e-mail, site/redes, data de criação e **lista de comunidades eclesiais**).
   O portal foi refeito em 2026 com o plugin `wp-parresia-register`: cada paróquia tem ficha em
   `https://arquidiocesesalvador.org.br/paroquia/<slug>/`. **95 fichas** foram lidas diretamente
   (confiança `alta`).
2. **Arquivo da Internet (capturas de 01/06/2025 do site anterior)** para **6 paróquias que ainda não
   têm ficha no CMS novo** (confiança `media`):
   Catedral Basílica do Santíssimo Salvador, Basílica Santuário Senhor Bom Jesus do Bonfim,
   Basílica Santuário Arquidiocesano Nossa Senhora da Conceição da Praia, Paróquia Ceia do Senhor e
   Santo André Apóstolo, Paróquia Conversão de São Paulo e Paróquia Ascensão do Senhor.
3. **`horariodemissa.com.br`** (`search.php?opcoes=cidade_opcoes&uf=BA&cidade=<cidade>`) — principal
   fonte de **horários**: 121 igrejas das 5 cidades, 100 com grade publicada. Cada horário foi lido do
   HTML da própria página (não de snippet de busca) e casado à paróquia **à mão**, por chave
   `igreja.php?k=…`. A ficha individual (`igreja.php?k=…`) também informa a **data da última
   atualização**, usada para aplicar a regra pré-2020 (ver alerta acima) — só
   `Paróquia Nossa Senhora da Luz` (27/12/2021), `Santuário Nossa Senhora de Fátima` (09/05/2022) e
   `Paróquia Santo Antônio de Portão` (14/02/2023) escaparam.
4. **`buscamissa.com.br`** — 11 fichas de Salvador, todas marcadas "Confirmado" e com aparência de
   2026. Deu 156 horários `media` para Conceição da Praia, Bonfim, Catedral, Nossa Senhora da
   Assunção, Esperança, Luz, Brotas, Santa Rosa de Lima, São José de Amaralina e a Igreja e Convento
   de São Francisco (Ordem Primeira, não paroquial).
5. `catholic-hierarchy.org/diocese/dsasb.html` — número esperado de paróquias, arcebispo e auxiliares.

## Como a lista completa foi reconstruída (vale para quem revalidar)

- A página `/paroquias/` **está quebrada hoje**: o widget de listagem devolve
  "Nenhum registro foi encontrado" para qualquer filtro/paginação, embora as fichas individuais
  funcionem. A REST do plugin (`/wp-json/wp-parresia-dashboard/register/institutions`) responde **401**.
- A lista foi remontada em três passos:
  1. **Categorias de forania do site antigo** (`/categoria/paroquias/foranias/forania-{1,2a,2b,3,4,5,6,7a,7b,8,9,10}/`)
     recuperadas do Arquivo da Internet (captura de 01/06/2025) → 96 nomes/slugs.
  2. **CDX do Arquivo da Internet** sobre o domínio inteiro (`matchType=domain`, 60 mil URLs) filtrando
     slugs raiz com prefixo `paroquia-/santuario-/basilica-/catedral-` → 122 candidatos.
  3. **Sonda no site vivo**: `GET /paroquia/<slug>/` devolve **200 para qualquer slug**; o teste de
     existência é a `og:title` — ficha real traz `"<Nome> - Paróquia"`, slug inexistente cai no template
     genérico `"Paróquia — Arquidiocese de São Salvador da Bahia"`. 95 acertos.
- Uma captura de 12/03/2026 de `/paroquias/` (quando o widget ainda funcionava) mostra **9 páginas de 12
  itens**, compatível com ~100 instituições cadastradas.

## Pontos que precisam de validação humana

1. **As 6 paróquias vindas do Arquivo da Internet** (`media`): contatos e comunidades são de 06/2025.
   Assim que a Arquidiocese publicar as fichas novas, reler de `/paroquia/<slug>/`.
2. **19 paróquias sem telefone** e **1 sem endereço** (Paróquia Jesus Cristo Ressuscitado, Plataforma) —
   a própria ficha oficial está incompleta.
3. **19 paróquias sem nenhum horário** (nem o site nem o agregador publicam). As mais relevantes:
   Espírito Santo (Tancredo Neves), Nossa Senhora das Candeias (Pituaçu), Santa Dulce dos Pobres
   (Saboeiro), São Tiago Maior (Boca da Mata), Santo Agostinho (Lauro de Freitas), São Marcos e
   Santa Mônica (Cajazeiras), Santo Antônio Além do Carmo, Nossa Senhora das Dores (Lobato),
   Nossa Senhora da Saúde e Glória, São Gonçalo do Retiro, São João Batista (Vasco da Gama),
   Nossa Senhora Mãe da Igreja, Nossa Senhora do Ó (Paripe), Nossa Senhora do Perpétuo Socorro,
   Sagrado Coração de Jesus (Alto do Cabrito e Vera Cruz), Santo Amaro (Jiribatuba),
   Nossa Senhora da Conceição (Tororó e Valéria), São Caetano, São Daniel Comboni, São José Operário,
   Nossa Senhora de Guadalupe, Santa Cruz, Deus Menino, Nossa Senhora da Paz, Divino Espírito Santo
   (Federação e Vale dos Lagos), São Brás (Federação), Santo Antônio (Fazenda Coutos),
   São João Evangelista (Mussurunga e Vilas do Atlântico), Nossa Senhora Aparecida (Itinga),
   Santíssima Virgem Maria de Nazaré.
4. **Nenhum horário é oficial.** O site da Arquidiocese tem o campo "Informações do horário" em toda
   ficha, mas **ele está vazio em todas as 95** — o cadastro de horários do plugin nunca foi preenchido.
   **688 dos 844 horários vêm do `horariodemissa.com.br` com ficha atualizada entre 2013 e 2018** e
   por isso entram como `baixa` (a regra pré-pandemia do README), inclusive os de recorrência mensal
   ("Primeiro Sábado", "Primeira Sexta-feira"). Os 156 `media` vêm do `buscamissa.com.br`.
   **Prioridade máxima para o enxame de validação: Salvador é a maior cidade do dataset e hoje entra
   em produção com horário de apenas 10 paróquias.**
4b. **Registro suspeito no BuscaMissa, descartado**: o site tem duas fichas de catedral —
   *Catedral Basílica Primacial* (Praça da Sé, usada) e *Catedral Basílica do Santíssimo Salvador*
   com endereço na **Av. Leovigildo Filgueiras, Garcia** (que é o da Cúria Metropolitana) e um único
   horário. A segunda parece registro errado e **não** entrou.
5. **Endereço divergente entre as duas fontes** em 3 casos — mantive o da ficha oficial e o horário
   do agregador; confirmar se são o mesmo templo:
   - *Paróquia Teresa D'Ávila*: oficial "Rua Ibirajuba, 447, Jardim Santa Teresa" × agregador
     "Rua Luís Anselmo, 99, Luís Anselmo".
   - *Paróquia São Lucas Evangelista*: oficial "Estrada Velha de Campinas, Km 5, Campinas de Pirajá" ×
     agregador "Rua Diamante, 15, Marechal Rondon" (o slug de 2010 era `…-marechal-rondon`).
   - *Paróquia Nossa Senhora da Conceição (Valéria)*: oficial "Rua da Matriz, 28, Valéria/Palestina" ×
     agregador registra o mesmo endereço sob o bairro "Fazenda Coutos".
6. **Entradas `nao-paroquial` cuja paróquia de vínculo não foi confirmada** (entram só pelo horário):
   Igreja Nossa Senhora do Rosário (Av. Sete de Setembro, Dois de Julho), Igreja Nossa Senhora do
   Santíssimo Sacramento (Garcia, nº 211) e Igreja Imaculada Conceição de Maria (Stiep).
   As demais são claramente não paroquiais (Mosteiro de São Bento, Igreja e Convento de São Francisco
   — Ordem Primeira, Santuário Santa Dulce dos Pobres, Convento da Palma, Convento da Lapa,
   Santuário Mãe Rainha/Schoenstatt, capelas de colégio e de shopping, capela da Cúria).
7. **Fora da jurisdição latina local** (não entraram): Paróquia Nossa Senhora do Loreto (Vila Militar
   da Aeronáutica, Itapuã), Capelania Militar Nossa Senhora dos Mares da Lagoa e Paróquia Sagrada
   Família da Vila Naval — são do **Ordinariado Militar do Brasil**.
8. **Duas igrejas históricas sem vínculo esclarecido e sem horário**: Igreja Santíssimo Sacramento do
   Passo (era paróquia até ~2010) e "Paróquia Nossa Senhora da Piedade" registrada pelo agregador na
   Av. Dendezeiros (provável duplicata da matriz da Massaranduba).
9. **Ano de fundação**: veio do texto "Criada em …" da própria ficha (não de data de CMS), mas 2 fichas
   trazem só o ano (ex.: Conceição da Praia, 1623). Nenhuma data repetida em massa foi observada.

## Estrutura das foranias (para conferência futura)

A Arquidiocese divide as paróquias em 12 foranias: 1, 2A, 2B, 3, 4, 5, 6, 7A, 7B, 8, 9 e 10
(a 10 é a Ilha de Itaparica). O JSON **não** grava a forania — o formato do dataset não tem o campo —
mas a associação está nas capturas citadas acima, caso o Parish passe a modelar decanatos.
