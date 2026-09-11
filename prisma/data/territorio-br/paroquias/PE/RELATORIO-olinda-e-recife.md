# Arquidiocese de Olinda e Recife (PE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-11
- **Arquivo**: `paroquias/PE/olinda-e-recife.json`
- **Cobertura**: **150 / 150 paróquias (100%)** + 9 igrejas não paroquiais com missa publicada
- **Comunidades**: 179 · **Horários fixos**: 687 (598 `alta`, 52 `media`, 37 `baixa`), em 106 das 159 entradas

## Fontes principais

O site oficial (`https://www.arquidioceseolindarecife.org`, WordPress) publica a lista completa,
organizada por **vicariato**, com endereço, bairro, CEP, telefone, e-mail, pároco e data de criação
de cada paróquia. Foi a única fonte necessária para a lista.

| Página | URL | Paróquias | Última alteração (WP) |
|---|---|---|---|
| Vicariato Boa Viagem | `/boa-viagem/` | 14 | 12/05/2026 |
| Vicariato Beberibe | `/vicariato-beberibe/` | 13 | 13/05/2026 |
| Vicariato Cabo | `/cabo/` | 16 | 27/02/2025 |
| Vicariato Ibura | `/vicariato-ibura/` | 8 | 31/03/2026 |
| Vicariato Igarassu | `/paroquias/igarassu/` | 7 | 21/05/2024 |
| Vicariato Jaboatão | `/vicariato-jaboatao/` | 8 | 05/02/2025 |
| Vicariato Jardim São Paulo | `/jardim-sao-paulo/` | 11 | 25/02/2025 |
| Vicariato Olinda | `/paroquias/olinda/` | 14 | 05/02/2025 |
| Vicariato Paulista | `/vicariato-paulista/` | 11 | 05/02/2025 |
| Vicariato São Lourenço | `/vicariato-sao-lourenco/` | 11 | 02/10/2025 |
| Vicariato Soledade | `/soledade/` | 17 | 25/07/2025 |
| Vicariato Várzea | `/varzea/` | 8 | 05/02/2025 |
| Vicariato Vitória | `/vitoria-2/` | 12 | 05/12/2025 |
| **Total** | | **150** | |

- **Horários**: `/horarios-de-missas/` — página oficial, alterada em **31/03/2026**, com grade de 103
  paróquias/igrejas. Foi a única fonte de horários usada (não foi preciso recorrer a agregadores).
- **Catedral**: `/catedral/` (endereço, cura e horário de missa dominical).
- Conferência do número esperado: o próprio cabeçalho das 13 páginas de vicariato declara
  *"a Arquidiocese de Olinda e Recife abrange 19 municípios e o arquipélago de Fernando de Noronha
  […] e 150 paróquias"*. A soma das listas bate exatamente com esse número — é a melhor prova de
  completude disponível.

### Truque de coleta aproveitado

A WP REST API (`/wp-json/wp/v2/pages?include=…&_fields=id,slug,title,modified,content`) devolveu o
conteúdo das 13 páginas de vicariato + horários numa só chamada, com o campo `modified` de cada uma
— o que permitiu **escolher entre as páginas por vicariato e as páginas por município** (que existem
em paralelo, `/paroquias/recife/`, `/paroquias/olinda/` etc., e estão mais desatualizadas). Onde as
duas divergem (pároco, telefone), valeu a página do vicariato, mais recente.

## Decisões de modelagem

- **Nomes**: a fonte publica tudo em caixa alta e sem prefixo. Normalizado para
  `Paróquia <título>`; a cidade foi para `city`, o bairro para `neighborhood` e removido do
  `address`. Sufixos "(SEDE VICARIAL)" e "(PARÓQUIA/SANTUÁRIO DO MORRO)" saíram do nome.
- **Slug**: `<nome>-<cidade>`; quando o mesmo nome se repete na mesma cidade (muito comum aqui —
  há 5 "Nossa Senhora do Rosário" e 4 "Nossa Senhora de Fátima" só no Recife), entra o bairro:
  `nossa-senhora-do-rosario-pina-recife`.
- **9 igrejas não paroquiais com missa fixa publicada** entram com
  `status: "nao-paroquial"` + `loadAsParish: true` (regra do README):
  Catedral do Santíssimo Salvador do Mundo (Olinda), Basílica Nossa Senhora do Carmo (Recife),
  Basílica Sagrado Coração de Jesus (Recife), Basílica São Bento (Olinda),
  Basílica Nossa Senhora Auxiliadora (Jaboatão), Santuário Nossa Senhora de Fátima (Recife),
  Oratório Santa Teresinha (Derby, Recife), Capelania Colégio Maria Tereza (Boa Viagem, Recife) e
  Capela da Mariápolis Santa Maria (Igarassu). Não contam em `parishesFound`.
- **Ficaram de fora** (sem horário publicado, conforme a regra): os outros 8 oratórios e as 7
  capelanias hospitalares/militares listados pelo Vicariato Soledade, o **Santuário do Carmo de
  Olinda** e o **Santuário Tabor da Nova Evangelização (Mãe Rainha)**, em Ouro Preto/Olinda.
  Os dois santuários de Olinda são candidatos naturais a uma segunda passada — têm site e redes
  próprios (`maerainhaolindaerecife.com`) e provavelmente publicam grade lá.
- **Áreas pastorais** viraram comunidades da paróquia responsável, não paróquias:
  Área Pastoral São Benedito (Distrito de Botafogo → Paróquia São Gonçalo do Amarante, Itapissuma) e
  Área Pastoral São Paulo da Cruz e São José (Nova Morada → Paróquia São Francisco de Assis, UR-7).
- **Comunidades**: só as nomeadas em fonte oficial. Como a arquidiocese não publica lista de
  capelas, as 29 comunidades não-matriz vêm todas da página de horários (capelas com missa própria
  em Barra de Jangada, Timbi/Camaragibe, Candeias, Espinheiro e Santo Antônio/Recife). As demais 150
  entradas têm só a matriz.

## Pontos que precisam de validação humana

1. **Telefone malformado** — Paróquia Santa Isabel (Casa Amarela, Recife): a fonte publica
   "Tel.: 33267-9448" (um dígito a mais). Gravado como `null`.
2. **CEP malformado** — Paróquia São Miguel Arcanjo (Matinha, Abreu e Lima): a fonte publica
   "530565-165". Gravado como `null`.
3. **Sem CEP na fonte** — Paróquia São Vicente de Paulo (Dois Unidos) e Paróquia Nossa Senhora da
   Conceição (Iputinga). Paróquia São João Paulo II (Penedo, São Lourenço da Mata) não tem endereço,
   CEP nem telefone publicados — só "Comunidade Obra de Maria, BR 408, Km 100".
4. **Blocos de horário duplicados e divergentes na própria página oficial** (marcados `media`, com
   `notes`): Nossa Senhora da Conceição (Barro), Nossa Senhora de Fátima (San Martin),
   Nossa Senhora de Lourdes (Nova Descoberta), Nossa Senhora do Carmo (Cajueiro Seco) e
   Nossa Senhora do Rosário (Várzea) — esta última com dois domingos diferentes (7h/11h/19h *vs*
   7h/9h/19h). Foi adotado o bloco mais completo.
5. **Três blocos de horário sem cabeçalho de paróquia** na página oficial — "Capela Nossa Senhora de
   Lourdes (Hospital dos Servidores)", "Capela São Joaquim e Santana" e "Praça Nossa Senhora de
   Fátima no Rosarinho". Foram atribuídos à **Paróquia Coração Eucarístico de Jesus (Espinheiro)**
   porque o telefone publicado no fim do bloco (3222-0873) é o dela; comunidades e horários ficaram
   `baixa`. **Confirmar com a paróquia.**
6. **Cabeçalhos ambíguos** (`media`): "Nossa Senhora do Ó – Nossa Senhora do Ó/Paulista" (a paróquia
   do Paulista fica em Pau-Amarelo; o bairro "Nossa Senhora do Ó" é de Ipojuca) e
   "São Benedito – Peixinhos/Olinda" (a paróquia São Benedito fica no bairro São Benedito;
   Peixinhos é da Paróquia Nossa Senhora da Ajuda).
7. **Horário incerto** — Paróquia São José (São José, Recife): a fonte diz *"de segunda a sexta-feira:
   17h ou 19h"*. Gravado às 17h com `baixa` e nota.
8. **Recorrência mensal** (o bloco `baixa` de sempre, 37 horários): "1ª sexta-feira do mês",
   "3º sábado do mês", "última terça do mês", "todo dia 18", "4º domingo (missa dos doentes)".
   Concentram-se em Santo Antônio de Barra de Jangada, que celebra em 4 capelas em rodízio semanal —
   sem modelagem de recorrência mensal, essa paróquia perde metade da grade.
9. **Divergência entre as páginas do site** (a de município *vs* a de vicariato) em pároco e
   telefone de cerca de 15 paróquias. Prevaleceu a do vicariato (mais recente). Exemplos:
   Nossa Senhora das Graças (Engenho do Meio) — Pe. Adriano Araújo (vicariato, 02/2025) *vs*
   Pe. Rosivaldo Torres (município, 11/2025); Santa Isabel — Pe. Osman de Morais *vs* Pe. Sérgio Muniz.
   Vale uma conferência quando a arquidiocese unificar as páginas.
10. **Página `/vicariatos/` (id 91, de 2023) está obsoleta** — lista vigários episcopais que já não
    são os das páginas de vicariato. Não foi usada para dados de paróquia.
