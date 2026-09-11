# Relatório — Diocese de Itumbiara (GO)

Pesquisa em 11/09/2026. Arquivo: `itumbiara.json`.

## Resultado

| Item | Qtd |
|---|---|
| Paróquias (confiança alta) | 27 |
| Paróquias (media / baixa) | 0 / 0 |
| Entradas `status: nao-paroquial` | 0 |
| Comunidades/capelas | 90 |
| Horários fixos | 236 (225 alta, 1 media, 10 baixa) — 196 missas, 37 confissões, 3 adorações |
| Cobertura | **27 / 27 (100%)** |

## Fontes principais

1. **https://diocesedeitumbiara.com.br/paroquias/** — a melhor fonte das quatro dioceses desta
   rodada. Uma única página com o catálogo completo por forania (Santa Rita de Cássia 9,
   Nossa Senhora d'Abadia 8, Divino Pai Eterno 9), trazendo para cada paróquia: forania, vigário
   forâneo, ereção canônica, endereço com CEP, telefone, e-mail, pároco/vigários/diáconos, horário
   da secretaria, horário de confissão e **a grade completa de missas por capela**, separada em
   "Missa Dominical" e "Missa Semanal". `lastmod` declarado no `page-sitemap.xml`: **02/09/2026** —
   por isso tudo entrou como `alta`. E-mails vinham ofuscados pelo Cloudflare e foram decodificados
   de `data-cfemail`.
2. **https://diocesedeitumbiara.com.br/clero-diocesano/** (lastmod 02/09/2026) — foi o que revelou
   a **27ª circunscrição**, a **Quase-paróquia São José de Porteirão**, que não aparece na página de
   paróquias. Também preencheu o pároco de N. Sra. do Carmo (Morrinhos), que a página de paróquias
   deixa em branco, e confirmou que o Santuário de Panamá é "Paróquia Santuário".
3. **catholic-hierarchy.org/diocese/ditum.html** — 27 paróquias (2023). Bate exatamente:
   26 na página de paróquias (25 paróquias + o Santuário-Paróquia de Panamá) + Porteirão.

O agregador `missahora.com.br` só tem 2 fichas desta diocese (Catedral e São Pedro e São Paulo) e
ambas divergem da fonte oficial — foram **descartadas**, não usadas nem para corroborar (ver abaixo).

## Precisa de validação humana

1. **Quase-paróquia São José — Porteirão** — entra só com nome, cidade e administrador
   (Pe. Valdir José Barcelos). Não há endereço, telefone, e-mail nem horário em nenhuma fonte
   pública; a diocese não a publica na página de paróquias. Vale pedir os dados à cúria.
2. **Pároco da Paróquia Senhor Bom Jesus (Bom Jesus de Goiás)** — divergência **entre duas páginas
   do mesmo site, ambas com lastmod 02/09/2026**: a página de paróquias diz Pe. Marcos Antônio Alves
   Marins (que o clero registra como pároco de Edéia) e a do clero diz Pe. Pablo Henrique de Faria.
   Gravei o da página de paróquias.
3. **Vigário de N. Sra. d'Abadia (Piracanjuba)** — paróquias: Frei Reinaldo dos Santos Pereira,
   OFMCap; clero: Pe. Lenilson Oliveira Paula Silva. Gravei o da página de paróquias em `notes`.
4. **Paróquia São Sebastião de Goiatuba** — a ficha na página de paróquias **termina no meio**:
   tem endereço, contatos e clero, e depois o rótulo "Atendimento Secretaria" sem conteúdo, emendando
   direto no rodapé. Nenhum horário publicado. Provável corte de conteúdo no CMS.
5. **Paróquia N. Sra. da Abadia (Buriti Alegre)** — a diocese **não publica nenhuma missa na igreja
   matriz**: todas as celebrações estão nas igrejas São Sebastião e Nossa Senhora do Rosário.
   Provável que a matriz seja uma dessas duas (a de N. Sra. do Rosário concentra 4 missas
   dominicais). Gravei uma matriz nominal "Matriz Nossa Senhora da Abadia" só para ancorar as
   confissões; confirmar qual é o templo matriz.
6. **Horários publicados sem local nomeado — não gravados** (3 casos):
   - Santo Antônio de Pádua/Itumbiara: quinta 19h30, "Zonas Rurais"
   - São Pedro e São Paulo/Itumbiara: terça 19h, "(setores)"
   - N. Sra. da Abadia/Buriti Alegre: 1ª segunda 19h, "Setores"
7. **Celebração da Palavra, não missa** — Pontalina, segunda 19h30 na Capela N. Sra. Aparecida: a
   própria diocese marca "(CELEBRAÇÃO DA PALAVRA)". Não gravei como `MASS`; o Parish não tem tipo
   para isso.
8. **Missa de terça da Paróquia Cristo Rei** (19h, Novena de Santo Expedito) — a fonte não indica o
   local e a paróquia tem uma capela dedicada a Santo Expedito; gravei na matriz com `media`, pela
   regra do README. É o **único horário `media` da diocese**.
9. **10 horários `baixa`** por recorrência mensal: 2º sábado na Catedral (Unção dos Enfermos),
   1º sábado em Santo Antônio de Pádua, 1ª quinta em São Sebastião e São Benedito, 1º/3º domingo na
   Capela Divino Pai Eterno de Piracanjuba, 1ª sexta em Pontalina, 1ª quinta e 1ª/3ª sexta em Buriti
   Alegre, 1º sábado em Guarilândia (Joviânia), 1º domingo em Goiatuba (missa com as crianças). Há
   ainda um caso especial: **"todo dia 28 há missa na Capela São Judas Tadeu – 19h30"** (São
   Sebastião e São Benedito), recorrência por **data fixa do mês**, que não cabe em `MassSchedule`
   de jeito nenhum — gravei em domingo/19:30 com `baixa` e nota explícita; se o Parish modelar
   recorrência mensal, esse registro precisa ser refeito.
10. **Agregador divergente (descartado)** — `missahora.com.br` publica para a Catedral "domingo 07,
    09:30, 18:00, 19:30" contra "07h, 10h, 18h e 19h30" da diocese, e para São Pedro e São Paulo uma
    grade inteiramente diferente (terça 19h30, quinta 19h30, sábado 18h). Preferi sempre a fonte
    oficial.
11. **Telefones repetidos entre paróquias diferentes** — (64) 3419-1155 serve Cromínia e
    Mairipotaba (a própria diocese avisa) e (64) 99335-3458 serve Professor Jamil e Aloândia.
    Não é erro de transcrição.
12. **Endereço da cúria** — o rodapé do site diz Rua 9, nº 172, Village Beira Rio, CEP 75524-050;
    o `dioceses.json` do dataset registra Rua Francisco Andrade Ribeiro 79, CEP 75503-100. Divergência
    a resolver no arquivo de dioceses.
13. **Nome de município** — a diocese escreve "Bom Jesus-GO"; gravei **Bom Jesus de Goiás**, que é o
    nome oficial do município do CEP 75570-000.
14. **Grafias divergentes de diáconos entre as duas páginas do site**: "Marcos Cândido de Souza" ×
    "Marcos Cândido de Oliveira" (Goiatuba/Trindade) e "Ney José do Amaral" × "Ney José Cardoso"
    (Goiatuba/São Sebastião). Ficaram em `notes`.
