# Relatório de pesquisa — Diocese de Limeira (SP)

- **Arquivo**: `paroquias/SP/limeira.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território BR — lote centro-leste paulista

## Fonte principal

O portal oficial **diocesedelimeira.com.br** tem um catálogo completo e estruturado de paróquias,
com página de detalhe por paróquia contendo endereço, CEP, telefone, e-mail, pároco, datas de
criação/instalação, **horários de missa por comunidade** e a relação de comunidades urbanas e rurais.
Foi a melhor fonte deste lote.

| Fonte | URL | Uso |
|---|---|---|
| Buscador de paróquias (AJAX) | `https://diocesedelimeira.com.br/paroquias_lista_pesq.php?tipo_publicacao=paroquias&razao=` | lista canônica (99 registros com forania e cidade) |
| Página pública de paróquias | `https://diocesedelimeira.com.br/cons_list_paroquias.php` | página que consome o AJAX acima |
| Detalhe de cada paróquia | `https://diocesedelimeira.com.br/paroquia.php?id=<N>` | endereço, contato, pároco, horários, comunidades |
| Cúria Diocesana | `https://diocesedelimeira.com.br/an_detalhe.php?tabela=diocese&id=8&ambiente=site&coluna=reduzido` | endereço/telefone da diocese |
| Wikipédia — Diocese de Limeira | `https://pt.wikipedia.org/wiki/Diocese_de_Limeira` | corroboração (criação 19/05/1976, 16 municípios) |

> **Nota técnica**: `WebFetch` recebeu HTTP 403 no domínio. Resolvido com `curl` enviando
> User-Agent de navegador. Os e-mails vêm ofuscados pelo Cloudflare (`data-cfemail` em `<span>`
> **e** em `<a>`) e foram decodificados.

## Cobertura

| Métrica | Valor |
|---|---|
| Registros de paróquia | **99** (89 paróquias/basílicas/santuários + 9 quase-paróquias + 1 santuário-paróquia) |
| Esperado | 86 paróquias declaradas pelo próprio site + quase-paróquias → cobertura considerada **100%** |
| Confiança das paróquias | 99 `alta` / 0 `media` / 0 `baixa` |
| Comunidades | **576** |
| Horários fixos | **673** (582 `alta`, 91 `baixa`) |
| Tipos de horário | 663 `MASS`, 10 `ADORATION` |
| Paróquias sem nenhum horário | 7 |

Distribuição por cidade: Limeira 24, Americana 22, Araras 10, Leme 8, Pirassununga 6,
Nova Odessa 5, Cosmópolis 4, Porto Ferreira 4, Conchal 3, Cordeirópolis 3, Descalvado 3,
Artur Nogueira 2, Iracemápolis 2, Analândia 1, Engenheiro Coelho 1, Santa Cruz da Conceição 1.

Foranias: Nossa Senhora das Dores 29, Santo Antônio de Pádua 27, Nossa Senhora do Patrocínio 19,
Nossa Senhora do Belém 14, Santa Gertrudes 10. (A forania foi gravada em campo extra `forania`
de cada paróquia; o importador a ignora.)

Campos preenchidos: endereço 99/99, telefone 96/99, e-mail 97/99, pároco 68/99, ano de
criação 57/99.

## Decisões de modelagem

- **`Paróquia Nossa Senhora das Dores Catedral`** (nome literal do site) foi normalizada para
  **`Catedral Nossa Senhora das Dores`**, seguindo a regra de prefixo do README.
- **`Quase Paróquia X`** normalizada para **`Quase-paróquia X`** (9 registros).
- As duas basílicas (`Basílica Santuário de Santo Antônio de Pádua`, Americana, e
  `Basílica de Nossa Senhora do Patrocínio`, Araras) e os três santuários
  (`Santuário São Manoel`/Leme, `Santuário Senhor Bom Jesus dos Aflitos`/Pirassununga,
  `Santuário São Sebastião`/Porto Ferreira) **são paroquiais** no site — entraram como paróquias
  normais, sem `status`.
- Comunidades duplicadas entre o bloco "Comunidades Urbanas/Rurais" e os cabeçalhos do bloco de
  horários foram fundidas por chave normalizada (ignorando os prefixos "Comunidade", "Capela",
  "Igreja").
- `foundedYear` veio do campo "Data da Criação da Paróquia" do próprio site — datas plausíveis e
  variadas (1824 a 2010s), **não** é data de cadastro no CMS.

## Pontos para validação humana

1. **91 horários com `confidence: "baixa"` = recorrência mensal.** O site publica coisas como
   *"Toda primeira sexta do mês, missa do Sagrado Coração às 19h30"*, *"Missa, 1º e 3 sábado às
   17h"*, *"Toda segunda sexta-feira do mês às 19h30"*. Não cabem em `MassSchedule` (que só tem
   dia da semana); a regra literal está copiada em `notes`. É a mesma pendência de produto já
   registrada no README.
2. **7 paróquias sem horário publicado** — o bloco "Horários de Missa" está vazio na página
   oficial: São Domingos Sávio (Americana), São Francisco de Assis (Americana),
   Nossa Senhora Aparecida (Araras), Nossa Senhora de Fátima (Araras), Santa Luzia
   (Cordeirópolis), Menino Jesus (Limeira), Nossa Senhora da Assunção (Porto Ferreira).
3. **Horário 07:18 na Paróquia São Vito (Americana)** — parece erro de digitação na fonte
   (provavelmente 7h ou 18h). Deixado como publicado.
4. **Pároco ausente em 31 paróquias** — o site simplesmente não preenche o campo nessas páginas.
5. **Nomes com grafia do site preservada**: "Paróquia Nossa Senhora da Assuncão" (sem cedilha),
   "Paróquia São Cristovão" (sem acento), "Paróquia São Jeronimo", "Paróquia Nossa Senhora da
   Rosa Mistica", "Paróquia N. S. Imaculada Conceição" (Santa Cruz da Conceição, abreviado),
   "Quase-paróquia Divino Espirito Santo". São erros de digitação da fonte oficial — não foram
   "corrigidos" para não inventar dado, mas merecem revisão.
6. **Algumas "comunidades" são capelas de instituições** (Hospital da UNIMED, Lar dos Velhinhos
   São Vicente de Paulo, Colégio São José das Irmãs Dominicanas). Estão no dataset porque a
   paróquia publica missa nelas.
7. O site tem **injeção de spam SEO** no rodapé ("Sponsorlar / dershane fiyatları"), filtrada no
   parser — sinal de que o portal pode ter sido comprometido em algum momento; não afetou os
   dados extraídos.
