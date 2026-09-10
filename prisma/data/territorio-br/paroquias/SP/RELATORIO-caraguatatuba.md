# Relatório — Diocese de Caraguatatuba (SP)

Pesquisa: 2026-09-10 · Arquivo: `caraguatatuba.json`

## Fontes principais

| Fonte | Uso |
|---|---|
| https://dicaragua.org.br/paroquias/ | Lista canônica das 20 entradas, em 3 setores (Caraguatatuba, Ubatuba, São Sebastião/Ilhabela) |
| https://dicaragua.org.br/&lt;slug-da-paroquia&gt;/ | Ficha de cada paróquia: endereço, telefone/WhatsApp, e-mail, redes, data de criação, festa do padroeiro, clero, expediente da secretaria e **horários de missa da matriz e de cada capela/comunidade** |
| https://dicaragua.org.br/wp-json/wp/v2/posts?slug=… | Campo `modified` de cada ficha, usado para calibrar a confiança dos horários |
| https://www.catholic-hierarchy.org/diocese/dcrgu.html | Nº esperado (20 paróquias, Anuário Pontifício 2023), bispo, endereço da cúria |
| Facebook @matrizsantarosadelimajaragua e Instagram @matrizaparecidailhabela | Desempate de município de duas paróquias (ver abaixo) |

O site é WordPress (Elementor). A página "Horários de Missas" usa o plugin `hmissa`, que só
responde a consultas por dia **e horário exato** — inútil para varredura; as fichas de paróquia
trazem a mesma informação de forma completa e foram usadas no lugar.

## Números

- **20 entradas** — 19 paróquias + o **Santuário Santo Antônio** (matriz histórica de
  Caraguatatuba, com reitor próprio), gravado com `"loadAsParish": true`.
- **Confiança das entradas**: 20 `alta`.
- **Comunidades**: 126 (20 matrizes + 106 capelas/comunidades/setores).
- **Horários**: 263 — 255 `MASS`, 4 `ADORATION`, 2 `ROSARY`, 2 `CONFESSION`.
  Por confiança: 146 `alta`, 75 `media`, 42 `baixa`.
- **Cobertura: 20/20 paróquias (100 %)**, batendo exatamente com o Anuário Pontifício 2023.
  **Todas as 20 publicam horários de missa.**
- Municípios: Caraguatatuba (7), Ubatuba (6), São Sebastião (5), Ilhabela (2) — os quatro do
  Litoral Norte que formam a diocese.

## Calibragem da confiança

`modified` das fichas na REST API: 14 foram atualizadas entre 04/12/2025 e 07/08/2026 (dentro dos
12 meses exigidos pelo README) → horários `alta`. As outras **6 pararam em 20/08/2025**, pouco
mais de 12 meses atrás → horários `media`: Exaltação da Santa Cruz, N. Sra. das Graças/Cristo Rei
e N. Sra. de Fátima (Ubatuba); N. Sra. D'Ajuda e Bonsucesso (Ilhabela); Sagrado Coração de Jesus
(São Sebastião); São José – Morro do Algodão (Caraguatatuba). A data de cada ficha está em
`sourceLastModified`.

## Correções e decisões (para validação humana)

1. **Paróquia Santa Rosa de Lima — município corrigido.** A ficha diz "Rua Guilherme de Almeida,
   274 – Jaraguá, **Caraguatatuba**/SP", mas Jaraguá é bairro de **São Sebastião**: a paróquia
   está no Setor São Sebastião/Ilhabela, o telefone (12) 3861-… é de São Sebastião e o Facebook
   oficial se identifica como "Paróquia Santa Rosa de Lima | São Sebastião SP". Gravado
   `city: "São Sebastião"`.
2. **Paróquia Nossa Senhora Aparecida (Barra Velha) → Ilhabela.** A ficha não nomeia o município;
   Barra Velha, Reino, Portinho e Praia Grande (suas comunidades) são bairros de Ilhabela e o
   Instagram oficial é @matrizaparecidailhabela.
3. **Datas de fundação suspeitas**: N. Sra. Aparecida (Ilhabela) e São Sebastião (São Sebastião)
   trazem **ambas "Criada em 1603"**. 1603 é a data documentada da matriz de São Sebastião;
   a de Ilhabela precisa de conferência (foi gravada como a fonte publica).
   Exaltação da Santa Cruz traz "por volta de 1866" e o Santuário Santo Antônio "por volta do ano
   1600" — gravados 1866 e 1600, com a ressalva anotada.
4. **Celebração da Palavra descartada** (não é missa), em 3 pontos: segunda-feira na Catedral
   ("Celebração com o diácono"); segunda-feira na Capela Divina Providência do Santuário Santo
   Antônio (gravada só a `ADORATION`); 1º e 3º sábado na Capela Imaculada Conceição (Cigarras),
   da Paróquia N. Sra. do Amparo.
   Também ficaram de fora as celebrações ambíguas de São José – Topolândia ("missa ou celebração"
   na quinta e na sexta) e o "Celebração da Palavra ou Missa" do Asilo Vila Vicentina (gravado
   como `MASS` com `baixa` e a ressalva em `notes`).
5. **Missas em dia fixo do mês, sem dia da semana — não gravadas** (não cabem em `dayOfWeek`),
   listadas aqui para eventual modelagem:
   - Catedral: nenhuma.
   - São José – Morro do Algodão: "todo dia 19" (São José, 19h30), "todo dia 13"
     (N. Sra. de Fátima, 19h30) e "todo dia 16" na Capela Santa Edwiges (19h30).
   - São José – Topolândia: "todo dia 19 do mês" (São José, 19h30).
   - Sagrado Coração de Jesus (Boiçucanga): "todo dia 22 do mês às 20h" (Santa Rita de Cássia).
   - São Sebastião: "todo dia 20 do mês" (novena de São Sebastião, 12h e 19h30).
6. **Horários sem hora**: "Missas nas casas" do bairro Porto Grande (Paróquia São Sebastião),
   2ª quarta-feira do mês, "horário conforme agenda local" — só a comunidade foi gravada.
   A Capela Santa Rita de Cássia (Fazenda Serramar, São João Batista) celebra em propriedade
   particular, sem horário público. A Capela Imaculada Conceição (Recanto do Sol, São José –
   Morro do Algodão) está, segundo a fonte, "sem missa no momento".
7. **42 horários `baixa`** são todos de recorrência mensal ("1ª e 3ª terça-feira", "2º e 4º
   sábado", "último domingo do mês"), com a regra literal em `notes`. Concentram-se nas capelas
   de sertão e de ilha (São Maximiliano Maria Kolbe, em Ubatuba, tem 6 setores atendidos assim).
8. **Comunidades sem horário publicado**: 5 capelas insulares da Paróquia N. Sra. D'Ajuda e
   Bonsucesso (Ilha da Serraria, Ilha de Búzios ×3 e Ilha da Vitória), 3 capelas da N. Sra. de
   Fátima (Ubatuba) e a Comunidade N. Sra. das Graças da N. Sra. Aparecida (Ilhabela). Foram
   gravadas como comunidades, sem `schedules`.
9. **Nome com barra**: a diocese registra "Paróquia Nossa Senhora das Graças / Cristo Rei"
   (a matriz é a Igreja Cristo Rei, em Maranduba). O nome foi mantido como a fonte publica.
10. **Alerta de manutenção do site**: o rodapé de todas as páginas contém um texto injetado em
    francês divulgando um cassino on-line ("…les jeux du casino en ligne Win spark"). O conteúdo
    pastoral não parece afetado, mas o site aparenta ter sofrido injeção de SEO spam.

## O que ficou sem cobertura

- CEP das paróquias: **o site não publica nenhum** — todos ficaram `null`.
- Confissões: só São Maximiliano Maria Kolbe publica horário; as demais registram "agendamento
  com a secretaria" (gravado em nenhum campo).
- Vigários paroquiais: registrados na fonte, mas o esquema só tem `priestName` (o pároco).
