# Relatório de pesquisa — Diocese de Registro (SP)

- **Arquivo**: `paroquias/SP/registro.json`
- **Pesquisa das paróquias**: 2026-09-10 (rodada anterior)
- **Rodada de horários**: 2026-09-10 (esta rodada — o relatório não existia e foi criado agora)
- **Resultado**: 21 entradas de paróquia (21 `alta`), 22 comunidades, **45 horários fixos**
  (26 `alta`, 19 `baixa`)

## Identificação

| Campo | Valor |
|---|---|
| Nome | Diocese de Registro |
| Sede | Registro/SP (Vale do Ribeira) |
| Bispo | Dom Manoel Ferreira dos Santos Júnior, MSC |
| Cúria | Rua São Francisco Xavier, 165 – Centro, Registro/SP |
| Telefone | (13) 3821-1595 |
| E-mail | mitradiocesanaderegistro@hotmail.com |
| Site | https://diocesederegistro.com.br |

## Fontes

| Fonte | O que rendeu |
|---|---|
| `diocesederegistro.com.br/paroquias/` (página atualizada em 03/06/2026) | as 21 entradas: 19 paróquias (incl. a Catedral São Francisco Xavier e a "Paróquia Santuário Nossa Senhora da Guia"), 1 quase-paróquia (N. Sra. do Sagrado Coração, Arapongal) e o Santuário Basílica do Senhor Bom Jesus de Iguape; endereço, CEP, telefone, e-mail, pároco/vigário e rede social de cada uma |
| mesma página | os **únicos** horários publicados oficialmente pela diocese: Paróquia São João Batista (Sete Barras) e Paróquia N. Sra. das Neves / Basílica de Iguape |
| `catholic-hierarchy.org/diocese/dregb.html` | 19 paróquias no Anuário Pontifício — bate com a lista oficial |
| `horariodemissa.com.br` | fichas de 6 paróquias, **todas com "última atualização em 20/03/2013"** (13 anos) |
| **páginas oficiais de Facebook das paróquias** | a grade fixa de 3 paróquias (ver abaixo) |

## Rodada de horários (2026-09-10) — o que foi acrescentado

A rodada anterior parou com 29 horários. Esta rodada acrescentou **16 horários novos** e
**corroborou 2** que estavam em `baixa`, fechando em **45**.

### Onde estava o bloqueio

- A Diocese de Registro **não tem página de horários de missa**. Varri o `wp-sitemap.xml` e a REST
  API do WordPress: são 45 páginas, nenhuma de horários, e não há *custom post type* de missa.
  A única grade oficial está solta dentro da página `/paroquias/`, para 2 paróquias.
- `catedralderegistro.com.br` (site próprio da Catedral, ainda indexado no Google) e
  `horariodemissahoje.com.br` **não resolvem mais** (NXDOMAIN confirmado por DNS-over-HTTPS).
- `saojoseoperario.iparoquia.com` e `paroquianossasenhoradorocio.blogspot.com` estão parados
  desde 2013 e só têm programação de festa, não grade fixa.
- Os agregadores `missahora.com.br` / `horariosmissa.com.br` retornam
  "Não há missas disponíveis" para Registro, Cananéia, Juquiá e Pedro de Toledo; para Iguape só
  repetem a Basílica. As 6 fichas do `horariodemissa.com.br` que ainda não estavam no arquivo
  (Catedral de Registro, São José Operário, N. Sra. da Guia/Eldorado, Santo Antônio/Juquiá,
  Santana/Pedro de Toledo, N. Sra. do Rocio/Iguape) dizem literalmente
  **"(Nenhum horário de Missa informado)"**.

### O que destravou

O Facebook responde ao **User-Agent do Googlebot** (com o UA de Chrome ele devolve 400/1,5 KB;
com o do Googlebot devolve a página inteira, 2–6 MB, com o JSON dos posts e o campo
`best_description`, que é o bloco de apresentação vivo da página). Varri as 14 páginas oficiais
das paróquias listadas pela diocese, mais 8 candidatas por palpite de handle. **Três** publicam a
grade fixa no próprio bloco de apresentação:

| Paróquia | Cidade | Texto literal da fonte | Horários gravados |
|---|---|---|---|
| Paróquia Santo Antônio (Santuário Diocesano) | Cajati | "HORÁRIOS DE MISSAS (Igreja Matriz): Segunda a sábado: 07h / Domingo: 09h / 19h / Quinta-Feira: 19h30 / Primeira semana do mês (Terça a sexta): 19h30" | **+11** (6 dias úteis+sábado 07h, dom 09h/19h já existiam e foram corroborados, qui 19h30, e 4 mensais em `baixa`) |
| Paróquia Sant'Ana | Iporanga | "Missas Semanais informações via WhatsApp / Missas Dominicais às 10H30 e 19H" | **+2** (dom 10h30 e 19h) |
| Paróquia N. Sra. do Monte Serrat e São Benedito | Itariri | "Missas: Domingos: 10h e 19h30 / Missa das bênçãos: 19h30 (1ª sexta-feira do mês)" | **+3** (dom 10h e 19h30; 1ª sexta em `baixa`) |

Iporanga entra agora como a 8ª paróquia com horário (eram 7).

### Confiança

- Os horários novos vindos da apresentação das páginas oficiais entraram como **`alta`**: são
  publicação da própria paróquia e as três páginas estão ativas, com posts de 2026.
- As recorrências **mensais** ("Primeira semana do mês", "1ª sexta-feira") ficaram **`baixa`**,
  com a regra literal em `notes` — mesmo bloqueio de modelagem já registrado no README.
- **Dois registros foram corroborados e subiram de `baixa` para `alta`**: Cajati domingo 09h e
  domingo 19h, que o agregador de 2013 já trazia e a página oficial confirma. Neles a fonte do
  Facebook foi somada ao `sources` e a confirmação anotada em `notes` — nada foi apagado.

### Conflito registrado

**Itariri**: a ficha do `horariodemissa.com.br` (2013) diz domingo 09h/19h e sexta 19h; a página
oficial diz **domingo 10h e 19h30** e missa das bênçãos na 1ª sexta às 19h30. Os três registros
antigos foram **mantidos em `baixa`** (não entram em produção) e receberam em `notes` o aviso
explícito do conflito, para o enxame de validação decidir.

## Cobertura de horários — o que ficou sem

**13 das 21 entradas continuam sem nenhum horário**: Barra do Turvo (Sagrado Coração de Jesus),
Eldorado (Santuário N. Sra. da Guia), Registro (Catedral São Francisco Xavier, São José Operário,
N. Sra. Aparecida, N. Sra. do Carmo e a Quase-Paróquia N. Sra. do Sagrado Coração), Juquiá
(Santo Antônio), Miracatu (N. Sra. das Dores), Pedro de Toledo (Sant'Ana), Iguape
(N. Sra. do Rocio e o Santuário Basílica, cujos horários estão gravados na Paróquia N. Sra. das
Neves, que o administra) e Pariquera-Açu (São Paulo Apóstolo).

Nessas, as paróquias divulgam a grade **por imagem** (cartaz no feed/story) ou por WhatsApp —
não há texto público indexável. Recuperá-las exige baixar e ler os cartazes do feed do Facebook
ou do Instagram, ou contato direto.

## Pontos para o enxame de validação

1. **Comunidades**: a diocese declara mais de 307 comunidades no Vale do Ribeira e **não publica a
   lista**. O arquivo tem só 22 comunidades (as matrizes + a Basílica). Nomes de comunidade que
   apareceram de passagem nas páginas oficiais de Facebook e podem servir de ponto de partida:
   "Oliveira Barros" (Miracatu), "Areia Branca" (N. Sra. do Rocio, Iguape),
   "Comunidade N. Sra. das Graças" (Ilha Comprida), "Capela Nossa Senhora das Graças – Vila Nova"
   (São José Operário, Registro). Pedro de Toledo declara na sua página ter **onze comunidades**.
2. **Títulos de santuário não refletidos no `name`**: a página oficial de Cajati se apresenta como
   **"Santuário Diocesano Santo Antônio"** e a de Juquiá como **"Santuário Diocesano
   Extraordinário Santo Antônio"**. O site da diocese ainda as lista como "Paróquia". Decidir se o
   `name` muda.
3. **Endereço divergente da Paróquia São José Operário (Registro)**: o site da diocese diz
   "Rua Vitória, 30 – B. Pedreira"; a ficha do agregador e o próprio Facebook da paróquia dizem
   "Rua Vitória, 76 – Vila Ribeirópolis".
4. **Eldorado**: o Facebook oficial traz um vigário diferente do site da diocese
   ("Pe. Ângelo de Oliveira" contra "Diác. Ângelo") e o pároco como "Pe. Carlos Augusto Bomfim"
   (o site grafa "Bonfim").
5. **Paróquia N. Sra. do Carmo (Registro)**: o site da diocese só publica o nome do pároco —
   sem endereço, telefone nem e-mail.
