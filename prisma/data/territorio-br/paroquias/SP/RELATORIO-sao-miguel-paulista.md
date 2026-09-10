# Relatório — Diocese de São Miguel Paulista (SP)

Data da pesquisa: 2026-09-10. Arquivo de dados: `sao-miguel-paulista.json`.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| http://www.diocesesaomiguel.org.br/index.php/paroquias/lista-de-paroquias | Lista oficial numerada: 104 paróquias (001–104) + 2 áreas pastorais + 2 comunidades | alta |
| http://www.diocesesaomiguel.org.br/index.php/paroquias/lista-de-paroquias/`<id-slug>` (108 páginas) | Nome oficial, ano de criação, pároco/vigários/diáconos, endereço, CEP, telefone, e-mail, comunidades, setor e região episcopal | alta |
| https://www.diocesesaomiguel.org.br/index.php/diocese/informacoes-gerais | Endereço, CEP e telefone da Cúria; bispo diocesano | alta |
| https://www.catholic-hierarchy.org/diocese/dsami.html | Erigida 15/03/1989; **104 paróquias (ref. 2022)**; Dom Algacir Munhak, C.S. (nomeado 21/09/2022); 136 padres | media |
| https://pt.wikipedia.org/wiki/Diocese_de_São_Miguel_Paulista | Confirmação de bispo e data de criação | media |

Todas as 108 páginas paroquiais foram lidas integralmente (raspagem direta do HTML, não amostragem).

## Cobertura

- **Encontradas: 108 entradas** = 104 paróquias (incluindo a Catedral São Miguel Arcanjo) + 2 Áreas Pastorais + 2 Comunidades sem status paroquial.
- **Esperadas: 104** (catholic-hierarchy.org, ref. 2022) — **coincidência exata** com a numeração oficial da diocese.
- Município: **São Paulo** (100%) — a diocese cobre a zona leste da capital. Setores/Regiões Episcopais presentes na fonte: São Miguel, Itaim Paulista, Guaianases, Itaquera, Cidade Líder, Cidade Tiradentes, Jardim Helena, Jardim Brasília, Ermelino Matarazzo, Ponte Rasa, Cangaíba, Penha, Vila Esperança, Artur Alvim, Silva Telles, A. E. Carvalho.
- Confiança dos registros de paróquia: **108 alta**, 0 media, 0 baixa (todos de página oficial ativa).
- Preenchimento: endereço **108/108**, CEP **108/108**, pároco **107/108**, ano de criação **105/108**, telefone **99/108**, e-mail **10/108**, site **1/108**.
- Comunidades: **203** (matrizes + comunidades listadas nominalmente nas páginas oficiais). 41 paróquias não publicam lista de comunidades e ficaram com `communities: []` (o importador cria a matriz).
- Horários: **57** (todos `MASS`; 55 alta, 2 baixa).

## Limitação principal — horários de missa

**O site oficial não publica horário de missa na maioria das páginas.** Apenas **10 das 108** trazem o bloco "HORÁRIOS DAS MISSAS", e todos os 57 horários deste arquivo vêm dessas 10 páginas:

Nossa Senhora Aparecida (Vila Pauabe), Nossa Senhora de Fátima (Jardim Fernandes), Santa Luzia (Vila Cisper), Santa Maria de Nazaré (Jardim Santa Maria), São Benedito (Guaianases), São Paulo Apóstolo (Vila Rui Barbosa), São Pedro Apóstolo (Jardim São Pedro), São João XXIII (Vila Chabilândia), Bom Jesus das Oliveiras (Jardim das Oliveiras), Imaculado Coração de Maria (Jardim Santana).

As outras **98 paróquias ficaram sem horário**. Conforme a regra de orçamento do prompt (circunscrição com mais de 80 paróquias), foi priorizada a lista completa de paróquias com contato/pároco/comunidades; a coleta de horários em agregadores (horariodemissa.com.br, missas.com.br, Google Maps) e nas redes sociais de cada paróquia **não foi feita** e é a maior lacuna deste arquivo.

## Horários não importados (não são recorrência semanal)

- Nossa Senhora Aparecida (Vila Pauabe): "todo dia 12, às 20h00" — sem dia da semana, descartado.
- São Paulo Apóstolo (Vila Rui Barbosa): "1ª sexta-feira de cada mês, às 19h30" — gravado como `baixa`.
- São Pedro Apóstolo (Jardim São Pedro): "1ª sexta-feira do mês, às 15h" — gravado como `baixa`.

## Decisões de nomenclatura

- Mantido o prefixo tal como a diocese publica: "Paróquia de …", "Paróquia da …", "Paróquia do …", "Catedral São Miguel Arcanjo". Não foi normalizado para "Paróquia São José" para não divergir da fonte oficial.
- `slug` = `<nome-sem-prefixo>-<cidade>`. Como toda a diocese está em São Paulo e há muitos homônimos (3 "Sagrada Família", 8 "Nossa Senhora Aparecida", 6 "São José" etc.), **em caso de colisão o bairro foi acrescentado ao slug** (ex.: `sagrada-familia-sao-paulo-vila-minerva`, `sagrada-familia-sao-paulo-jardim-mabel`, `sagrada-familia-sao-paulo-vila-praia`). Todos os 108 slugs são únicos.
- Comunidade-matriz nomeada `Matriz <nome sem prefixo>` apenas quando a paróquia lista outras comunidades.

## Dúvidas / validação humana

1. **Endereço da Cúria divergente na própria fonte.** O rodapé da home traz "Praça Pe. Aleixo Monteiro Mafra, 11 – fundos, CEP 08011-010" (que é o endereço da Catedral); "Informações Gerais" e o catholic-hierarchy trazem "Travessa Guilherme de Aguiar, 57, CEP 08011-030". Adotado o segundo (duas fontes concordam).
2. **4 entradas não são paróquias canônicas** e não devem entrar como paróquia sem decisão: Área Pastoral Nossa Senhora do Perpétuo Socorro (Itaquera), Área Pastoral São Benedito o Negro (Parque Cruzeiro do Sul), Comunidade Santa Terezinha (Jardim Jaú), Comunidade São José do Tabor (Jardim São Gonçalo).
3. **Erros de digitação na fonte, mantidos como publicados**: comunidade "Nosa Senhora do Perpétuo Socorro" (Paróquia do Senhor Santo Cristo) e "Nossa senhora Aparecida - 1º de Outubro" (Paróquia de São João XXIII).
4. **Setor divergente entre a lista e a página** em vários registros — a lista-índice diz, por exemplo, "Setor Cangaíba" e a página diz "Setor Ponte Rasa" (Santa Luzia/Vila Cisper), ou "Setor Jardim Brasília" × "Setor Cidade Líder" (Santa Terezinha, Santa Maria de Nazaré, N. Sra. de Fátima/Jardim Fernandes, São José/Jardim Brasília). O setor **não** é gravado no JSON; fica o registro para quem for usar a divisão por setor.
5. **Paróquia de Jesus Adolescente (Vila Euthália)** — única sem pároco publicado.
6. **Paróquia de São Joaquim (Jardim Noemia)** — sem ano de criação e sem telefone na página.
7. **9 paróquias sem telefone** (ver lista no JSON: `phone: null`), entre elas as 3 mais recentes (São José Patriarca 2017, São Sebastião Mártir 2019) e as 2 áreas pastorais.
8. **CEP grafado com ponto na fonte** em Paróquia de Sant'Ana (Cidade Nova São Miguel): "Cep: 08042.290" — normalizado para `08042-290`.
9. **Ano de criação da Catedral = 1630** conforme a página oficial (data da capela/povoação de São Miguel Paulista, não da ereção paroquial no formato canônico atual). Vale conferir.
10. Telefones foram gravados apenas no **primeiro número** quando a página lista vários (ex.: Catedral tem 2032.4160 / 2031.9785 / WhatsApp 99908-9747). Os demais estão nas páginas de origem registradas em `sources`.
