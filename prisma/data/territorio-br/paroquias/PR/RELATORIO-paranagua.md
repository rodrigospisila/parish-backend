# Relatório — Diocese de Paranaguá (PR)

Data da pesquisa: 2026-09-09. Arquivo de dados: `paranagua.json`.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://diocesedeparanagua.org.br/paroquias/ | Lista oficial: 25 unidades em 4 regiões pastorais (Serra, Marumbi, Litoral, Paranaguá) | alta |
| https://diocesedeparanagua.org.br/<slug-da-paróquia>/ (25 páginas) | Nome, endereço, CEP, telefone, e-mail, pároco/vigário, comunidades e horários de missa | alta |
| https://diocesedeparanagua.org.br/bispodiocesano/ | Dom Paulo Alves Romão, 5º bispo (nomeado 20/08/2025, posse 27/09/2025) | alta |
| https://diocesedeparanagua.org.br/ (rodapé) | Endereço/telefone/e-mail da Cúria | alta |
| https://www.catholic-hierarchy.org/diocese/dprua.html | 20 paróquias (2023); série histórica | media |
| https://gcatholic.org/dioceses/diocese/para5.htm e /churches/local/para5.htm | 20 paróquias (2016); 28 igrejas por cidade | media |
| https://pt.wikipedia.org/wiki/Diocese_de_Paranagu%C3%A1 | 21 paróquias, 13 municípios, criação 21/07/1962 | media |

Não consultados/indisponíveis: CNBB Regional Sul 2 (HTTP 403), Anuário Católico (domínio não resolve), portal antigo `diocesedeparanagua.eparoquia.com` (fora do ar).

## Cobertura

- **Encontradas: 25** (24 paróquias/santuários paroquiais + 1 Reitoria/Área Pastoral Nossa Senhora da Saúde).
- **Esperadas: 21** (Wikipédia) / 20 (catholic-hierarchy 2023). A lista oficial é mais recente e completa; adotada integralmente.
- Municípios cobertos: Adrianópolis, Antonina, Bocaiúva do Sul, Campina Grande do Sul (3 unidades), Cerro Azul, Doutor Ulysses, Guaraqueçaba, Guaratuba (2), Matinhos (2), Morretes, Paranaguá (8), Pontal do Paraná (2), Tunas do Paraná — os 13 municípios da diocese.
- Confiança dos registros de paróquia: **25 alta**, 0 media, 0 baixa (todos vêm de página oficial ativa, com pároco atual).
- Comunidades: 59 (só as listadas nas páginas oficiais). 11 paróquias sem lista de comunidades na página oficial ficaram com `communities: []` (o importador cria a matriz).
- Horários: 151 (todos MASS, confiança alta). Nenhuma página oficial publica horário de confissão/adoração/terço.

## Decisões de nomenclatura

- `Catedral Nossa Senhora do Rosário` — a página oficial chama "Paróquia Catedral Nossa Senhora do Rosário".
- `Reitoria Nossa Senhora da Saúde` (Campina Grande do Sul, Araçatuba) — a lista oficial chama "Seminário Diocesano Senhora do Rocio e Reitoria Nossa Senhora da Saúde"; o cabeçalho da página chama "Área Pastoral Nossa Senhora da Saúde" (administrador Pe. Eliel de Oliveira Venâncio). Não é paróquia canônica.
- `Paróquia Santuário São José` (Praia de Leste) — a lista oficial chama "São José"; a URL e o e-mail usam "São José e São Sebastião". Adotado o nome do cabeçalho da página.
- `Santuário Estadual Nossa Senhora do Rocio` e `Santuário São Francisco das Chagas` — listados pela diocese entre as paróquias da Região Paranaguá; nomes mantidos como na página (reitores: Pe. Dirson Ferreira Gonçalves, C.Ss.R e Pe. Mateus Rafael da Silva, IMCIM).
- Padres de "administrador paroquial" foram gravados em `priestName` (São Pedro e São Paulo – Pe. Emerson Sandro de Azevedo; São João Batista/Paranaguá – Pe. Osvaldo Cabianchi Garcia; N. Sra. da Paz – Pe. Thiago Moisés da Silva).

## Horários não importados (não são fixos semanais)

- Bocaiúva do Sul: dia 13 de cada mês (missa e novena de Santo Antônio).
- Tunas do Paraná: todas as 11 comunidades têm missa mensal (1º/2º/3º/4º sábado ou domingo). Não há horário da matriz na página.
- Campina Grande do Sul – São João Batista: 1ª sexta 06:00; 3ª quinta 19:00. Santuário N. Sra. de Fátima: 1ª sexta 19:00 (matriz), 1ª sexta 19:30 (São José), 2ª sexta 19:30 (N. Sra. da Luz). Reitoria N. Sra. da Saúde: 2ª e 4ª quarta 19:30 (N. Sra. da Guia), 2ª sexta 19:30 (Divina Misericórdia).
- Cerro Azul: 1ª sexta 19:30. Antonina: última sexta 15:00. Guaratuba – São Francisco: 1ª sexta 15:00; segunda 06:30 é Celebração da Palavra (excluída).
- Pontal do Paraná – São Pedro e São Paulo: Gruta 3ª sexta 19:30; Ilha do Mel – Encantadas 2ª terça 19:00; Ilha do Mel – Nova Brasília 3ª terça 19:00.
- Matinhos – São Pedro Apóstolo: comunidades Albatroz, Perequê, Riviera e Cohapar II "seguem calendário mensal".

## Dúvidas / validação humana

1. Adrianópolis (N. Sra. do Perpétuo Socorro): página oficial diz "Sem informação" para missas — sem horários.
2. Bocaiúva do Sul: a página descreve as missas de sábado/domingo "no Centro Pastoral" (matriz possivelmente em obras). Gravado em `notes`.
3. Cerro Azul: e-mail grafado na página como `paroquiacierroazul@gmail.com` (possível erro de digitação de "cerro"); mantido como publicado.
4. Nenhuma página informa ano de criação da paróquia (`foundedYear` = null em todas). gcatholic tem fichas por igreja que podem trazer a data — não consultadas por orçamento.
5. Websites paroquiais: os e-mails sugerem domínios próprios (paroquiaguaratuba.com.br, santuariodorocio.com, saojoaobatista.org.br) que não foram verificados; `website` ficou null.
6. Os pároco(s) refletem a página no dia da consulta; a diocese publicou nomeações em 2025 (Dom Paulo tomou posse em 27/09/2025) — o enxame de validação deve reconferir transferências de 2026.
