# Relatório — Diocese de São José dos Pinhais (PR)

Data da pesquisa: 2026-09-09. Arquivo de dados: `sao-jose-dos-pinhais.json`.

## Situação da fonte oficial

O site oficial (https://www.diocesesjp.org.br) estava **em manutenção** durante toda a pesquisa
("Estamos em manutenção… temporariamente fora do ar"); todas as rotas (`/paroquias`, `/paroquias/<cidade>/<slug>`,
`/index.php?...`, host sem `www`) devolvem a mesma página, que expõe apenas o endereço e o telefone da Cúria.
Web Archive não é acessível pela ferramenta. A intranet (`diocesesjp.net.br/intranet`) exige login, mas a
listagem pública da Chancelaria mostra 45 pastas de paróquias/unidades.

Estratégia adotada: (1) URLs oficiais de cada paróquia confirmadas pelo índice do buscador
(`site:diocesesjp.org.br/paroquias/...`), cujos resumos preservam endereço, CEP, telefone, pároco, capelas e
horários publicados na página oficial — classificados como **media** (fonte oficial sem sinal de atualidade,
conforme README); (2) sites paroquiais próprios lidos diretamente — **alta**; (3) redes sociais oficiais e
agregadores como complemento — media quando corroborados, baixa quando fonte única.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| diocesesjp.org.br/paroquias/<cidade>/<slug> (41 URLs, via índice de busca) | Lista de paróquias, endereços, párocos, capelas, horários | media |
| https://www.catedralsaojose.com.br (+ /horarios/) | Catedral: horários completos, capela São Domingos | alta |
| https://bomjesussjp.com.br (+ /horarios-diversos/) | Senhor Bom Jesus (SJP): missas, terços, adoração, comunidades | alta |
| http://www.paroquiasantaritadecassia.com.br | Santa Rita de Cássia: pároco, 3 comunidades com endereço, horários, ereção 2019 | alta |
| https://paroquiamonteclaro.org.br | N. Sra. do Monte Claro: endereço, CEP, horários | alta |
| https://santoantoniolapa.com.br (+ horário das celebrações + capelas) | Santo Antônio (Lapa): matriz, Santuário São Benedito, 34 capelas | alta |
| https://www.santuariodosremedios.com.br | Santuário N. Sra. dos Remédios (Araucária): 12 comunidades, e-mail | alta |
| https://paroquiasaogabrielfrg.com.br | São Gabriel (FRG): telefone, e-mail, 2 comunidades | alta |
| https://gcatholic.org/churches/local/zjosD.htm | Lista de 41 igrejas por cidade (cruzamento) | media |
| https://www.catholic-hierarchy.org/diocese/dsjdp.html | 42 paróquias (2023); bispo Dom Celso Antônio Marchiori | media |
| https://cnbbs2.org.br/arquidiocese/sao-jose-dos-pinhais/ | E-mail e endereço da Cúria (página 403; dados do resumo de busca) | media |
| Facebook/Instagram oficiais, horariodemissa.com.br, missahora.com.br, opopularpr.com.br, blog paroquial de Quatro Barras | Horários/párocos complementares | media/baixa |

Indisponíveis: Anuário Católico (domínio não resolve), CNBB Sul 2 (403), missahora.com.br (403),
nsadasdores.com.br, nsgracasfrg.com.br e paroquiansfatimasjp.org.br (DNS), Web Archive.

## Cobertura

- **Encontradas: 41** (40 paróquias + 1 quase-paróquia). **Esperadas: 42** (catholic-hierarchy 2023 / gcatholic 2022).
- Confiança das paróquias: **7 alta, 34 media, 0 baixa**. Comunidades: **135**. Horários: **235** (64 alta, 121 media, 50 baixa).
- Por município: São José dos Pinhais 14 · Araucária 4 · Fazenda Rio Grande 5 · Piraquara 3 · Quatro Barras 1 ·
  Mandirituba 2 · Contenda 2 · Lapa 3 · Campo do Tenente 1 · Quitandinha 1 · Piên 1 · Agudos do Sul 1 ·
  Rio Negro 2 · Tijucas do Sul 1 — os 14 municípios da diocese.
- A 42ª unidade não foi identificada: pode ser uma criação de 2023–2026 ainda não indexada, ou diferença de
  critério (a Chancelaria lista 45 pastas, incluindo provavelmente santuários/reitorias). Não há decanatos/foranias
  publicados; o site agrupa apenas por cidade.

## Decisões de nomenclatura e cidade

- `Paróquia São Sebastião` (slug `sao-sebastiao-contenda`): a URL oficial está na categoria
  `sao-jose-dos-pinhais`, mas o endereço (Rua Cassemiro Leviski, 150; secretaria Travessa Álvaro Pallu, 497)
  e o pároco (Pe. Hélio Forte Claro) são de **Contenda**. gcatholic lista "Contenda – São João Batista"
  (provável confusão com a Capela São João Batista do Rio do Poço). Gravada em Contenda; validar.
- `Paróquia Imaculada Conceição (Catanduvas do Sul)` → cidade Contenda; `Paróquia Imaculada Conceição (Mariental)` → cidade Lapa (distritos).
- Duas paróquias N. Sra. Aparecida em SJP: `(Xingu)` e `(Guatupê)`; a de FRG recebeu `(Jardim Veneza)`. O bairro entre parênteses segue o uso da própria diocese.
- `Paróquia Santuário Nossa Senhora dos Remédios` (Araucária): a diocese lista "Paróquia N. Sra. dos Remédios"; o site paroquial usa "Santuário" (elevado em 30/10/2011).
- `Paróquia Nossa Senhora das Graças` (Piên) também se apresenta como "Santuário Nossa Senhora das Graças" nas redes sociais.
- "Paróquia São José Operário – Vila Maria Antonieta", listada pelo horariodemissa.com.br em SJP, é de **Pinhais** (Arquidiocese de Curitiba) — excluída.

## Horários não importados / conflitos

- Mensais: Guatupê 1ª sexta 19:30; Fátima SJP 1ª quinta 19:30; Bom Jesus dos Passos 1ª quinta 19:30; Perpétuo Socorro
  (Araucária) 1ª sexta 19:00; Quatro Barras 1ª sexta 19:00 e capelas São Pedro/São Luís Orione/N. Sra. da Luz (2º domingo, 1º e 3º sábado);
  Mandirituba 1ª quinta e 1ª sexta 19:00; Catanduvas 1ª sexta 19:00 e capelas "duas vezes por mês"; Santos Reis 1ª sexta 19:00;
  Santa Rita dia 22 (15:00 e 19:30); Bom Jesus (Araucária) última quarta 19:30; Remédios dia 30 19:00 e 1ª sexta 15:00.
- N. Sra. das Dores (Araucária): missa dominical alterna 09:30 (1º/3º/5º domingo) e 08:00 (2º/4º) — não gravada; quarta 14:00 é novena sem indicação de missa.
- Bom Jesus (SJP): segunda 19:00 é "Celebração" (não missa) — gravado só o Terço dos Homens; terça 18:30 "Missa ou Celebração" gravada com nota (media).
- Guatupê: página oficial diz domingo 09:00; agregador diz 08:00 e 19:30 — mantida a oficial, com nota.
- Capelas rurais de Santo Antônio (Lapa) e Cristo Rei (Campo do Tenente): horários dominicais gravados com **baixa** porque a fonte não explicita se são semanais ou por rodízio mensal. Celebrações da Palavra (Pau de Casca, Vila Rural) excluídas.
- Santa Rita de Cássia: confissões "30 min antes de cada missa" (não codificável); direção espiritual sexta 17:00–18:00.
- Xingu: o buscador atribuiu à página o mesmo quadro de horários da Paróquia N. Sra. de Fátima (SJP) e de uma "Capela N. Sra. Aparecida – Rua Duarte da Costa, 492 – Jardim Bela Vista"; por ambiguidade, Xingu ficou sem horários e Fátima recebeu o quadro com media.

## Registros que precisam de validação humana

1. **Xingu**: pároco conflitante (Pe. João da Silva Soares no índice da diocese vs. Pe. Jonathan Antunes no Facebook) → `priestName` null; endereço não encontrado (só CEP 83010-350).
2. **Sagrado Coração de Jesus (Colônia Murici)**: horarios.ninja informa outro endereço (Rua João Lipinski, 921) e telefone 3635-1144 — não gravados; horários com baixa.
3. **Fátima (SJP)**: endereço "Rua Onofre Holthman, 1200" vem de resumo de busca sem página verificável; site paroquial fora do ar.
4. **Rainha da Paz**: horários (qua 20:00, sáb 19:30, dom 08:00) vindos do índice da página oficial; horariomissa.org traz outro quadro (07:00/10:15/19:00), possivelmente de outra cidade.
5. **N. Sra. Auxiliadora (Piraquara)**: telefone e horários só do agregador horariodemissa (baixa); bairro "Jardim Holandês" (diocese) vs "Vila Nova" (agregador).
6. **Quatro Barras**: capelas vêm do blog paroquial de 2013 (media); horários da matriz do Facebook oficial.
7. **Santo Antônio (Lapa)**: CEP no índice aparece como "08750-025" (provável erro; Lapa usa 837xx) → null.
8. **Rio Negro – N. Sra. Aparecida**: telefone diocesano com DDD 47 (3645-0364/3642-6541); outra fonte cita (41) 3035-5104.
9. **Quitandinha**: rua grafada "Alves da Rocha" (diocese) e "Abílio Alves da Rocha" (Waze) — adotada a completa.
10. **Tijucas do Sul**: horários de um Google Site de proveniência incerta (baixa); "Esperança" na sexta 19:30 é comunidade não identificada.
11. Comunidades de Sagrado Coração (Costeira, Roça Velha) e Bom Jesus/Araucária (Jardim D'Ampezzo, Jardim Tupy) foram inferidas de endereços listados na página oficial sem nome de padroeiro → baixa.
12. Sem horário algum: N. Sra. da Luz (FRG), São Gabriel (FRG), Piên, Quase-paróquia São Francisco e Santa Clara, Xingu; São Marcos só com terços.
13. Párocos (Pe. Clayton Scabia, Pe. Valter de Jesus Souza, Pe. Orlando Leal, Pe. Elves Allano Perrony, Pe. Cesar Augusto Cordeiro de Barros SDS etc.) vêm de páginas indexadas sem data; a diocese publicou transferências ("Dom Celso anuncia transferências") — reconferir quando o site voltar.

## Sugestão para o enxame de validação

Quando `diocesesjp.org.br` voltar do ar, reler as 41 páginas `/paroquias/<cidade>/<slug>` (todas as URLs estão em
`sources`) para promover os registros **media → alta**, preencher `foundedYear`, e-mails (protegidos por
JavaScript no índice) e as capelas das paróquias que ficaram com `communities: []`.
