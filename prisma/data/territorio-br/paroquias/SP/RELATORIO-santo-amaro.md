# Relatório de pesquisa — Diocese de Santo Amaro (SP)

- **Arquivo**: `paroquias/SP/santo-amaro.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: enxame de pesquisa do território (`PROMPT-pesquisa.md`)

> A Diocese de Santo Amaro é uma das circunscrições da **capital paulista**: cobre só a
> zona sul do município de São Paulo (distritos Santo Amaro, Campo Belo, Campo Grande,
> Cidade Ademar, Pedreira, Socorro, Grajaú, Cidade Dutra, Parelheiros e Marsilac).
> Todas as 108 paróquias têm `city = "São Paulo"`.

## Resumo

| Métrica | Valor |
|---|---|
| Entradas de "paróquia" no JSON | **108** |
| — paróquias | 102 |
| — catedral | 1 (Catedral Santo Amaro) |
| — santuários paroquiais | 5 |
| Comunidades/capelas | **222** (108 matrizes + 114 comunidades) |
| Horários fixos | **971** |
| — `MASS` | 713 |
| — `CONFESSION` | 185 |
| — `ADORATION` | 70 |
| — `ROSARY` | 3 |
| Confiança das paróquias | 108 `alta` |
| Confiança dos horários | 0 `alta` / **918 `media`** / 53 `baixa` |

## Fontes principais

Toda a carga veio do **site oficial da diocese**. Cada paróquia tem página própria com
forania (setor), data de fundação, pároco e vigários, endereço com CEP, telefones, e-mail,
horários de missas, de confissões e de adoração ao Santíssimo — e, em 50 delas, a lista
de comunidades/capelas.

| URL | Uso |
|---|---|
| https://diocesedesantoamaro.org.br/ | Portal oficial, menu dos 11 setores pastorais |
| https://diocesedesantoamaro.org.br/paroquias-da-diocese-de-santo-amaro/ | Índice das 108 igrejas agrupadas por setor |
| https://diocesedesantoamaro.org.br/curia-diocesana/ | Dom José Negri, PIME (bispo diocesano), Dom Marcelo Antonio da Silva (auxiliar) e os 11 vigários forâneos |
| https://diocesedesantoamaro.org.br/dpo-lgpd/ | Sede da Mitra: Av. Mascote, 1171, Vila Mascote, CEP 04363-001 |
| https://diocesedesantoamaro.org.br/paroquias-da-diocese-de-santo-amaro/&lt;slug&gt;/ | 108 páginas individuais — origem de todos os dados |
| https://www.catholic-hierarchy.org/diocese/dsnam.html | Ereção 15/03/1989; 111 paróquias (2023); 563 km² |
| https://pt.wikipedia.org/wiki/Diocese_de_Santo_Amaro | 112 paróquias em 11 setores; distritos abrangidos |

## Por que TODOS os horários ficaram `media` (e nenhum `alta`)

O README exige, para horário de missa `alta`, "publicação oficial **com sinal de
atualidade**". O site de Santo Amaro **não oferece nenhum**:

- nenhuma das 108 páginas tem `dateModified`/`article:modified_time` (tema WordPress antigo,
  sem Yoast — ao contrário do site de Santo André, onde 107/108 páginas datam de 2026);
- o rodapé de todas as páginas ainda diz `© 2018 Cúria Diocesana de Santo Amaro`;
- há conteúdo comprovadamente velho: a Paróquia Santa Barbara ainda publica
  "Quinta-feira: 20h (**suspensa no período de Pandemia**)".

Por isso os 918 horários que o parser leu sem ambiguidade entraram como `media`
(fonte oficial sem sinal de atualidade) e os 53 restantes como `baixa`. **Nenhum é `alta`.**
Uma revisão por amostragem contra as redes sociais das paróquias promoveria boa parte a `alta`.

## Cobertura

- **108 encontradas** / **111 esperadas** (catholic-hierarchy 2023; a Wikipédia diz 112).
  Faltam de 3 a 4 paróquias que o próprio site diocesano não lista — a lista oficial
  "Todas as paróquias" foi percorrida por inteiro, setor a setor, e fecha em 108.
- Distribuição por setor: Pedreira 14, Grajaú 13, Varginha 13, Santo Amaro 10,
  Interlagos 9, Jordanópolis 9, Sabará 9, Veleiros 9, Cupecê 8, Parelheiros 8,
  Santa Catarina 6.
- Os setores/foranias não têm campo no formato do dataset e não foram gravados.

### Preenchimento dos campos

| Campo | Preenchido |
|---|---|
| `priestName` / `foundedYear` | 108/108 (100%) |
| `phone` | 107/108 (99%) |
| `address` | 106/108 (98%) |
| `email` | 106/108 (98%) |
| `zipCode` | 103/108 (95%) |
| `neighborhood` | 102/108 (94%) |
| `website` | 10/108 (9%) |

50 das 108 paróquias têm comunidades além da matriz.

## Pontos para o enxame de validação

1. **Contato da Cúria não publicado.** O site não divulga telefone nem e-mail geral da
   Cúria — só o endereço da Mitra (no aviso de privacidade) e o e-mail do encarregado de
   dados (`lgpd@santoamaro.org.br`), que não serve como contato pastoral. `phone` e `email`
   da diocese ficaram `null` de propósito.

2. **19 paróquias sem nenhum horário de missa publicado** (campo `schedules` vazio) —
   precisam de pesquisa complementar em rede social/agregador:
   N. Sra. da Assunção (Cupecê), São Carlos Borromeu (Grajaú), São Bernardo (Interlagos),
   Santa Inês (Jordanópolis), Santa Cruz (Parelheiros), N. Sra. Aparecida (Pedreira),
   N. Sra. da Medalha Milagrosa (Pedreira), Santa Amélia e São Francisco (Pedreira),
   Santa Clara e São Francisco de Assis (Pedreira), Santa Paulina (Pedreira),
   Santa Terezinha do Menino Jesus (Pedreira), São Joaquim e Santana (Pedreira),
   São Raimundo Nonato (Pedreira), Cristo Rei (Santa Catarina),
   Santo Antonio de Santana Galvão (Santa Catarina),
   São Benedito e N. Sra. de Fátima (Santa Catarina), N. Sra. dos Navegantes (Varginha),
   Santuário Jesus Misericordioso (Varginha) e Santa Rita de Cássia (Veleiros).
   O setor **Pedreira é o pior**: 8 das 14 paróquias sem horário.
   O Santuário Jesus Misericordioso avisa explicitamente que "dias e horários de Missas
   são divulgados semanalmente nas redes sociais do santuário".

3. **2 paróquias sem endereço**: `Paróquia Santa Cruz` e `Paróquia Santo Afonso` (ambas do
   setor Cupecê) — a página não tem seção "Endereço". Como consequência, `city` foi
   assumida como "São Paulo" (a diocese é toda dentro do município) e `neighborhood`,
   `address` e `zipCode` ficaram `null`. Outras 4 páginas trazem endereço sem separar o
   bairro (N. Sra. de Fátima, Mãe do Salvador, São Raimundo Nonato, Menino Jesus de Praga).

4. **53 horários `baixa`** — três causas, sempre com o texto original preservado em `notes`:
   - **recorrência mensal** ("1ª Sexta-feira do mês", "3° Sábado do mês", "toda primeira
     terça e sexta-feira de cada mês") — não cabe em `MassSchedule`;
   - **horário relativo** em seções de confissão ("após a missa das 8h", "uma hora antes"),
     em que o parser guardou a hora citada como aproximação;
   - **descritor livre não reconhecido** ao lado da hora (ex.: "12h em espanhol",
     "20h (suspensa no período de Pandemia)", "8h30 (Sagraodo Coração de Jesus)" —
     erro de digitação no próprio site).
   As paróquias com mais `baixa`: Divino Espírito Santo (7), N. Sra. Aparecida/Cupecê (5),
   Mãe do Salvador (4), N. Sra. do Perpétuo Socorro e Sta. Rosalia (4), Santa Barbara (4).

5. **Horários de confissão que não têm hora fixa** (28 linhas descartadas, nenhum registro
   criado) — a maioria é texto do tipo "Antes das Missas", "Uma hora antes das missas",
   "Somente com horário marcado", "Mediante agendamento", "Ligar na secretaria e agendar".
   O Santuário N. Sra. Mãe de Deus é explícito: "Não temos datas e horários fixos para
   confissões". **Isso é dado ausente na fonte, não falha de parse.**

6. **Janelas de atendimento viraram hora de início.** Confissões e adoração são publicadas
   como intervalo ("das 17h às 19h", "Sábado: 11h às 12h"). O `MassSchedule` só tem um
   horário, então foi gravado o **início** da janela e o texto completo foi para `notes`.

7. **Telefone**: gravado só o primeiro número; muitas paróquias publicam fixo + WhatsApp
   em campos separados. Um caso ficou `null`: **Paróquia São João de Brito**, cujo telefone
   está publicado sem DDD (`97546-0117`) — provavelmente `(11) 97546-0117`, mas não foi
   inventado. A mesma paróquia é a única também sem e-mail (a seção de confissões da
   página está tomada por links de rede social).

8. **`Paróquia Sagrado Coração de Jesus`** (setor Santo Amaro) é a outra sem e-mail.

9. **Nomes com prefixo acrescentado.** O site nomeia as páginas sem o prefixo em vários
   casos (ex.: "Nossa Senhora Refúgio dos Pecadores"); o dataset gravou
   "Paróquia Nossa Senhora Refúgio dos Pecadores". A Catedral e os 5 santuários mantiveram
   o próprio prefixo.
   - **URLs enganosas no setor Sabará** (conferido, os dados estão certos): a página
     `santuario-nossa-senhora-mae-dos-aflitos/` é do **Santuário Nossa Senhora Mãe de Deus**
     (Av. Interlagos, 3.823 — o do Pe. Marcelo Rossi) e a página
     `santuario-nossa-senhora-mae-dos-aflitos-2/` é do **Santuário Nossa Senhora Mãe dos
     Aflitos** (Rua Aristeu Dias Leme, 59). Nome, endereço e pároco de cada uma conferem;
     só o slug da URL está trocado na origem.
   - O Santuário Mãe dos Aflitos compartilha pároco, vigários, telefone e e-mail
     (`santagertrudes@santoamaro.org.br`) com a **Paróquia Santa Gertrudes** — é a mesma
     unidade pastoral, não é erro de extração.

10. **Abreviações de nome preservadas.** Várias paróquias são publicadas abreviadas
    ("N. Sra. do Rócio e São Vicente de Paulo", "N. Sra. da Salette e São João Batista",
    "Com. Sagrado Coração de Jesus"). Foi mantido o nome da fonte oficial; a expansão para
    "Nossa Senhora …" fica para a validação.

## Método

1. Baixa da página índice `paroquias-da-diocese-de-santo-amaro/` e extração dos 108 links
   de paróquia agrupados pelos 11 setores (descartados os 11 links de índice de setor).
2. Download das 108 páginas e parse do padrão `<h3>rótulo</h3><h2>valor</h2>` (112 rótulos
   distintos foram mapeados para os campos canônicos — `Pároco`, `Adm. Paroquial`,
   `Telefone|WhatsApp`, `Horário das Missas`, `Confissões`, `Adoração ao Santíssimo`, etc.).
3. Normalização dos horários em português, com classificação de tipo por palavra-chave
   (missa / confissão / adoração / terço), detecção de janelas "das X às Y", de recorrência
   mensal e descarte de itens que não são celebração fixa (grupo de oração, catequese,
   bazar, ensaio, secretaria).
4. Conferência do total com catholic-hierarchy e Wikipédia.

Restaram 28 linhas sem hora fixa (item 5) e 15 com descritor ambíguo (rebaixadas a `baixa`,
item 4). 10 horários duplicados na origem foram removidos.
