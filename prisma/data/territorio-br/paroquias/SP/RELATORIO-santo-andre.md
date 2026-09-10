# Relatório de pesquisa — Diocese de Santo André (SP)

- **Arquivo**: `paroquias/SP/santo-andre.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: enxame de pesquisa do território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas de "paróquia" no JSON | **108** |
| — paróquias propriamente ditas | 101 |
| — catedral | 1 (Catedral Nossa Senhora do Carmo) |
| — paróquia pessoal | 1 (São Miguel – Colônia Alemã) |
| — santuários paroquiais | 3 |
| — **oratórios (NÃO paroquiais)** | **2** |
| Comunidades/capelas | **365** (108 matrizes + 257 comunidades) |
| Horários fixos | **837** (todos `MASS`) |
| Confiança das paróquias | 108 `alta` / 0 `media` / 0 `baixa` |
| Confiança dos horários | 827 `alta` / 0 `media` / 10 `baixa` |
| Municípios cobertos | 7 (todo o Grande ABC) |

Distribuição por município: Santo André 38, São Bernardo do Campo 30, Mauá 13,
São Caetano do Sul 11, Diadema 10, Ribeirão Pires 5, Rio Grande da Serra 1.

## Fontes principais

Toda a carga veio do **site oficial da diocese**, que se mostrou a melhor fonte
encontrada até agora neste dataset: cada paróquia tem página própria com equipe
pastoral, horários de missa da matriz **e de cada comunidade**, endereço, telefone,
e-mail, redes sociais e data de criação.

| URL | Uso |
|---|---|
| https://diocesesa.org.br/ | Endereço, telefone e e-mail da Cúria |
| https://diocesesa.org.br/santuarios-e-paroquias/ | Índice das 9 foranias e das 108 igrejas (página com `dateModified` 2026-05-21) |
| https://diocesesa.org.br/bispo-diocesano/ | Dom Pedro Carlos Cipollini (eleito 27/05/2015, posse 26/07/2015) |
| https://diocesesa.org.br/paroquias/&lt;slug&gt;/ | 108 páginas individuais — origem de todos os dados de paróquia, comunidade e horário |
| https://www.catholic-hierarchy.org/diocese/dsand.html | Ereção 18/07/1954; 127 paróquias (2023) |
| https://pt.wikipedia.org/wiki/Diocese_de_Santo_André | 104 paróquias + 2 quase-paróquias; 825 km²; 7 municípios |

**Sinal de atualidade**: 107 das 108 páginas de paróquia trazem `dateModified` em 2026
(44 em jun/2026, 31 em mai/2026, 16 em abr/2026, 10 em jul/2026, 4 em ago/2026, 2 em
fev/2026). A única exceção é a Paróquia Pessoal São Miguel – Colônia Alemã (2024-09-10),
que aliás não publica horário de missa. Por isso os horários entraram como `alta`.

## Cobertura

- **108 encontradas** / **106 esperadas**. As 106 circunscrições paroquiais do JSON
  (101 paróquias + catedral + paróquia pessoal + 3 santuários) batem exatamente com a
  Wikipédia ("104 paróquias e 2 quase-paróquias"). A cobertura é considerada **completa**.
- O catholic-hierarchy registra **127** paróquias em 2023. Nenhuma fonte oficial atual
  confirma esse número; o próprio site diocesano soma 106 e o índice por forania publicado
  pela diocese (12+1 / 11 / 12+1 / 9 / 11 / 9+1 / 11 / 10 / 13+1 / 7) fecha com a lista.
  Tratado como divergência de fonte secundária, não como falta de cobertura.
- As foranias (Santo André Centro/Leste/Utinga, SBC Centro/Anchieta/Rudge Ramos,
  São Caetano do Sul, Diadema, Mauá, Ribeirão Pires e Rio Grande da Serra) não têm campo
  no formato do dataset e não foram gravadas.

### Preenchimento dos campos

| Campo | Preenchido |
|---|---|
| `address` / `neighborhood` / `foundedYear` | 108/108 (100%) |
| `priestName` | 108/108 (100%) |
| `phone` | 107/108 (99%) |
| `email` | 106/108 (98%) |
| `website` | 28/108 (25%) |
| `zipCode` | **0/108 (0%)** — o site não publica CEP |

68 das 108 paróquias têm comunidades além da matriz.

## Pontos para o enxame de validação

1. **Os 2 oratórios não são paróquias.** `Oratório Nossa Senhora Aparecida` (Santo André,
   Vila Dora, forania Centro) e `Oratório Imaculada Conceição e São Maximiliano Maria Kolbe`
   (São Bernardo do Campo, forania Anchieta) são igrejas não paroquiais listadas pela
   diocese junto com as paróquias. Ficaram no dataset com o prefixo `Oratório` para não
   perder os horários, mas **não devem virar `Parish` no import**. O do Kolbe não tem
   página com dados; o de N. Sra. Aparecida tem capelão (Pe. Jorge Luis Gomes Bonfim),
   endereço e horários, mas não tem telefone nem e-mail.

2. **Nenhum CEP no dataset.** O site diocesano nunca publica CEP. Os 108 `zipCode` estão
   `null` e precisam de complemento por outra fonte (Correios/Google Maps) se o Parish
   quiser exibi-los.

3. **10 horários `baixa` = recorrência mensal** (o `MassSchedule` só tem dia da semana).
   O texto original está em `notes`. São eles:
   - Paróquia Nossa Senhora de Fátima (Santo André, Vila Curuçá): `1º Sábado do mês às 08h`
     e `Sábados às 16h (e no 1º às 7h)` (2 registros).
   - Paróquia São Maximiliano Maria Kolbe (SBC): Capela N. Sra. Aparecida `1º sábado às 16h`;
     Capela Sagrado Coração de Jesus `3º domingo às 15h30`.
   - Paróquia São José (Ribeirão Pires), Comunidade Santo Antônio de Pádua:
     `1º Sábado às 8h | Domingo às 9h` — **atenção**: a missa de domingo às 9h desta
     comunidade é semanal e foi rebaixada junto com a linha inteira; vale promover a `alta`.
   - Paróquia Sant'Anna (Ribeirão Pires), Comunidade São Judas Tadeu: `2º e 4º Sábado às 19h30`.
   - Paróquia São Judas Tadeu (Ribeirão Pires): Capela N. Sra. Aparecida `2º Domingo às 9h`;
     Comunidade Mãe Rainha `2º Sábado às 9h`.

4. **Paróquia Pessoal São Miguel – Colônia Alemã** (Santo André, Vila Bastos) — única sem
   horário de missa: a seção "Horários de missas" da página está vazia. Também é a única
   página sem atualização em 2026 e a única sem e-mail. É paróquia pessoal (comunidade de
   língua alemã), não territorial.

5. **`priestName` inclui o cargo real.** Santuários e a Basílica Menor usam o título
   "Pároco Reitor" e o oratório usa "Capelão"; todos foram gravados em `priestName`.
   Vigários e diáconos ("Uso de ordem") existem no site mas não têm campo no dataset e
   foram descartados.

6. **Telefones**: gravado apenas o primeiro número de cada paróquia, normalizado para
   `(11) XXXXX-XXXX`. O site avisa que "alguns telefones fixos podem ser whatsapp" e várias
   paróquias publicam um segundo número (celular/WhatsApp) que não coube no formato.

7. **`website`**: só 28 paróquias têm site próprio; foi extraído do ícone "globe" das redes
   sociais paroquiais. Um caso (Paróquia Nossa Senhora de Guadalupe, SBC) usa esse ícone
   apontando para um canal do YouTube — foi descartado e o campo ficou `null`.

8. **Duas paróquias homônimas na mesma cidade** ganharam o bairro no slug para não colidir:
   `santo-antonio-santo-andre-vila-alpina` × `santo-antonio-santo-andre-jardim-santo-antonio`,
   `nossa-senhora-de-fatima-santo-andre-santa-maria` × `…-vila-curuca`, e
   `nossa-senhora-aparecida-santo-andre-vila-dora` (o oratório) ×
   `…-parque-novo-oratorio`.

9. **Paranapiacaba é de Santo André, não de Ribeirão Pires.** A `Paróquia Senhor Bom Jesus
   de Paranapiacaba` está na forania "Ribeirão Pires e Rio Grande da Serra", mas o endereço
   oficial é em Santo André; `city` seguiu o endereço.

## Método

1. Baixa da página índice `santuarios-e-paroquias/` e extração dos 108 links `/paroquias/<slug>/`
   em ordem de documento, com a forania de cada bloco.
2. Download das 108 páginas e parse do texto estruturado (nome, forania, ordem/data de
   criação, equipe pastoral, horários de missas, expediente, contatos, endereço, redes
   sociais e o grid de comunidades com horário e endereço de cada uma).
3. Normalização dos horários em português (`Segunda a sexta às 19h`, `Domingo às 8h30, 10h30
   e 18h`, `Seg a Sex às 7h`, linhas quebradas por `<br>`) para `dayOfWeek`/`time`.
4. Conferência do total com catholic-hierarchy e Wikipédia.

Nenhuma linha de horário do site ficou sem interpretação (0 avisos do parser).
