# Relatório — Diocese do Alto Solimões (AM), sede em Tabatinga

Pesquisa: 2026-09-18. Arquivo: `paroquias/AM/alto-solimoes.json`.

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **8** (todas `alta`) |
| Comunidades/capelas | 14 (8 matrizes + 6 comunidades de São Paulo de Olivença) |
| Horários fixos | 8 — todos `alta`, **todos de uma única paróquia** |
| Cobertura | **8/8, com prova independente da Receita** |

## A diocese não tem site

É o caso clássico do README: circunscrição sem portal. Não existe `diocesealtosolimoes.*`; o
endereço que o gcatholic aponta (`paroquiaspa.com.br/diocese-do-alto-solimoes`) devolve **404 do
IIS** — aquele domínio é da paróquia de São Paulo de Olivença, não da diocese. A única presença
institucional é a página no **Facebook** (`facebook.com/diocesedoalto.solimoes`).

**A lista de paróquias saiu inteira da Receita Federal.** O CNPJ da Mitra (**04.619.821**) apareceu
no rodapé do site da paróquia de São Paulo de Olivença ("CNPJ: 04.619.821/0003-23") — a partir dele,
a varredura em `minhareceita.org` deu **18 estabelecimentos ativos (0001 a 0018; 0019 a 0030 são
404)**:

| Tipo | Filiais |
|---|---|
| Sede (Cúria) | 0001 — Rua Pedro Teixeira, 540, Centro, Tabatinga, (97) 3412-2514 |
| **Paróquias (8)** | 0003 São Paulo Apóstolo (São Paulo de Olivença) · 0004 São Cristóvão (Amaturá) · 0005 São Francisco de Assis (Belém do Solimões/Tabatinga) · 0006 Imaculada Conceição (Benjamin Constant) · 0007 Santos Anjos (Tabatinga) · 0008 São Sebastião (Atalaia do Norte) · 0009 Santo Antônio de Lisboa (Santo Antônio do Içá) · 0010 São Pedro Apóstolo (Tonantins) |
| Obras (9) | 0002 Obras Educacionais e Assistenciais · 0011 Colégio Imaculada Conceição · 0012 Colégio N. Sra. da Assunção · 0013 Centro de Treinamento São Boaventura · 0014 Hospital Santa Izabel · 0015 Olaria São Cristóvão · 0016 Colégio São Cristóvão · 0017 Colégio São Francisco · 0018 Escola São Francisco de Assis |

As 8 paróquias batem exatamente com o número publicado pela **Wikipédia** ("organizado em 8
paróquias") e pelos **Missionários Xaverianos** ("8 paróquias e 252 comunidades urbanas e
ribeirinhas"). Endereço e CEP de cada paróquia vieram da Receita.

## Horários — só uma paróquia publica

**Concatedral São Paulo Apóstolo (São Paulo de Olivença)** é a única paróquia da diocese com site
próprio — `paroquiaspa.com.br` (ASP.NET; e-mail ofuscado pelo Cloudflare, decodificado para
`contato@paroquiaspa.com.br`). A página `Missas.aspx` publica a grade por comunidade:

| Comunidade | Dia | Hora |
|---|---|---|
| Matriz São Paulo Apóstolo | domingo | 07h e 19h |
| Comunidade São João | terça | 19h |
| Comunidade São José | quarta | 19h |
| Comunidade Nossa Senhora de Fátima | quinta | 19h |
| Comunidade Santa Teresinha | sexta | 19h |
| Comunidade São Francisco | sábado | 19h |
| Comunidade São Joaquim | domingo | 10h |

Confiança `alta`: o Instagram oficial (@paroquiaspoam) tem posts de **agosto de 2026** e o
`liriocatolico` confirma independentemente domingo às 07h e 19h e missas de terça e sexta às 19h.

**As outras 7 paróquias entram sem nenhum horário.** O que foi tentado e não deu:
- `horariodemissa.com.br` — a ficha da Catedral de Tabatinga (`igreja.php?k=QJUod`) é de
  **31/03/2013** e **não tem nenhum horário**; cai duas vezes (pré-pandemia e vazia).
- `missahora.com.br` — ficha da Catedral com todos os dias em "-".
- `liriocatolico` — 3 fichas do território; as duas de Tabatinga (Catedral Santos Anjos da Guarda e
  Paróquia São Francisco de Assis) vêm com `missas: {}`.
- Instagram `@paroquiasantosanjostabatinga` — **perfil muito ativo (posts de 1, 2, 8, 10, 11, 12,
  14, 15 e 16 de setembro de 2026)**, mas a bio vem truncada para o leitor automático em todas as
  variantes de URL testadas. **É a melhor pista para o enxame de validação.**
- Não foi encontrado perfil oficial das paróquias de Amaturá, Atalaia do Norte, Santo Antônio do
  Içá, Tonantins nem Belém do Solimões.

## Precisa de validação humana

1. **Horários de 7 das 8 paróquias** — a pendência principal. Caminho mais curto: a bio e os
   destaques do Instagram **@paroquiasantosanjostabatinga** (catedral, perfil ativo) e a página da
   diocese no Facebook.
2. **Título da catedral de Tabatinga** — o gcatholic registra a igreja como **"Catedral Nossa
   Senhora do Perpétuo Socorro / Paróquia Santos Anjos da Guarda"**: o título da catedral seria
   diferente do orago da paróquia. Wikipédia, Receita, liriocatolico e o Instagram só falam em
   "Santos Anjos (da Guarda)". Gravei `Catedral Santos Anjos da Guarda`.
3. **Telefones** — nenhuma paróquia tem telefone em campo de produção, exceto São Paulo de Olivença
   ((97) 98436-9052, do site). Os números da Receita para São Paulo de Olivença, Benjamin Constant
   e Amaturá estão em **numeração antiga de 7 dígitos com DDD 92** (ex.: `0924155307`) e foram para
   `phoneHistoric`. O telefone da Catedral de Tabatinga ((97) 3412-2204) veio da ficha de 2013 do
   `horariodemissa` e também ficou em `phoneHistoric`.
4. **@paroquiaimaculadabnu** — perfil de Instagram com grade de missas na bio (quarta 19h30, sábado
   18h, domingo 9h e 19h) que um buscador associou a Benjamin Constant. **Não foi usado**: o sufixo
   "bnu" e o conteúdo dos posts apontam para outra cidade. Vale checar manualmente.
5. **252 comunidades** — os Xaverianos dão esse número para a diocese; só 6 (as de São Paulo de
   Olivença) estão publicadas em fonte aberta. No Alto Solimões isso inclui comunidades **Ticuna,
   Kokama e Kambeba** ao longo do Solimões e do Javari — buraco grande, sem fonte pública.
6. **Paróquia São Francisco de Assis / Belém do Solimões** — a sede fica na aldeia Ticuna do
   distrito de Belém do Solimões (município de Tabatinga). O `liriocatolico` traz uma ficha
   "Paróquia São Francisco de Assis – Rua Amazonas, n° 07, Tabatinga", que pode ser um escritório
   da paróquia na cidade; não confirmado, por isso não virou comunidade.
7. **Nome da paróquia de Santo Antônio do Içá** — Receita: "Paróquia de Santo Antônio de Lisboa";
   Wikipédia e Xaverianos: "Paróquia de Santo Antônio".

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

Registro atual: `address: "Rua Pedro Teixeira 540, Centro"`, `zipCode: "69640-000"`,
`phone: "(97) 3412-2514"`, `email: null`, `website: null`,
`bishopName: "Dom Adolfo Zon Pereira, S.X."`, `foundedYear: 1910`.

- **Está tudo certo.** Endereço, CEP e telefone conferem exatamente com a filial 0001 da Receita;
  `website: null` e `email: null` estão corretos (a diocese não tem site nem e-mail público — só
  Facebook); `foundedYear` 1910 confere (Prefeitura Apostólica, bula *Cum ex Nimia Diocesis
  Amazonum*, de 23/05/1910; prelazia em 11/08/1950; diocese em 14/08/1991).
- Sugestão opcional: registrar o Facebook `https://www.facebook.com/diocesedoalto.solimoes/` em
  algum campo de rede social, se o schema vier a ter um, já que é a única presença da diocese.
- Aviso: o endereço "Rua Mal. Rondon, 1885, Tabatinga" e o e-mail `dascuria@yahoo.com.br`, que
  circulam em diretórios antigos, **não** foram confirmados por nenhuma fonte atual — não usar.
