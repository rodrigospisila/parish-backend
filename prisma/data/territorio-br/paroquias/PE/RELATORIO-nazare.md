# Diocese de Nazaré (PE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-11
- **Arquivo**: `paroquias/PE/nazare.json` (sede: Nazaré da Mata/PE)
- **Cobertura**: **49 / 49 paróquias (100%)** + 1 área pastoral
- **Comunidades**: 50 (só as matrizes — a diocese não publica capelas)
- **Horários fixos**: 30, **todos `baixa`**, em apenas 5 das 50 entradas

## Fontes principais

Site oficial em WordPress, com a lista completa dividida em **7 regiões pastorais**. Seis das sete
páginas foram atualizadas em **03/08/2026** — fonte oficial recente e muito completa em contato.

| Página | URL | Paróquias | Última alteração (WP) |
|---|---|---|---|
| Região Pastoral Carpina | `/regiao-pastoral-carpina/` | 8 | 03/08/2026 |
| Região Pastoral Goiana | `/regiao-pastoral-goiana/` | 4 | 03/08/2026 |
| Região Pastoral Limoeiro | `/regiao-pastoral-limoeiro/` | 8 | 03/08/2026 |
| Região Pastoral Nazaré | `/regiao-pastoral-nazare/` | 9 | 03/08/2026 |
| Região Pastoral Orobó | `/regiao-pastoral-orobo/` | 5 + 1 área pastoral | 13/02/2026 |
| Região Pastoral Surubim | `/regiao-pastoral-surubim/` | 8 | 03/08/2026 |
| Região Pastoral Timbaúba | `/regiao-pastoral-timbauba/` | 7 | 03/08/2026 |
| **Total** | | **49 + 1 área** | |

- **Prova de completude**: `/dados-gerais/` (alterada em 03/07/2026) declara
  **49 Paróquias, 1 Área Pastoral, 7 Regiões Pastorais, 35 municípios**, 961.978 habitantes e
  5.921,645 km². A soma das sete páginas bate exatamente. Cobertura 49/49.
- **Horários**: `horariodemissa.com.br` (`search.php?uf=PE&cidade=<cidade>&opcoes=cidade_opcoes`),
  varrido nos 35 municípios da diocese.
- `/santuarios/` documenta dois santuários **privados** (São Severino do Ramos, em Paudalho, e
  Nossa Senhora de Lourdes, em Umari/Bom Jardim) — não entram, por não serem circunscrições
  diocesanas e não publicarem grade própria.

### Notas de coleta

- O conteúdo vem em shortcodes WPBakery misturados com **blocos de CSS inline gigantes** dentro do
  próprio `content.rendered` (a página da Região Nazaré tem 132 KB, dos quais ~128 KB são CSS).
  Foi preciso remover regras `seletor{...}` e shortcodes `[...]` antes de ler o texto.
- A WP REST API (`/wp-json/wp/v2/pages?include=…&_fields=…,modified,content`) entregou as 11 páginas
  relevantes numa chamada só, com a data de modificação de cada uma.

## Decisões de modelagem

- **Nomes**: a fonte publica em caixa alta. Normalizado para `Paróquia <título>`;
  "PARÓQUIA CATEDRAL NOSSA SENHORA DA CONCEIÇÃO" virou `Catedral Nossa Senhora da Conceição`.
  Sufixos entre parênteses viraram bairro: "(ANGÉLICAS)" e "(MURUPÉ)", ambos em Vicência.
- **Área Pastoral Nossa Senhora das Dores** (Umari, Bom Jardim) entra com `status: "nao-paroquial"`
  + `loadAsParish: true` e **não conta** em `parishesFound`.
- **Bairro e cidade** foram destacados do endereço à mão, entrada por entrada — o formato do
  endereço varia demais entre as páginas (vírgulas, travessões, "CEP" antes ou depois da cidade).
- **Horários**: a Diocese de Nazaré **não publica grade de missas em lugar nenhum** do site (a busca
  interna do WordPress por "horário de missas" só devolve notícias). A varredura dos 35 municípios
  no `horariodemissa.com.br` achou 27 igrejas cadastradas, mas **só 5 com horário preenchido**:
  São José e Santo Antônio (Carpina), São José (Feira Nova), Nossa Senhora da Glória (Glória do
  Goitá) e Sant'Ana (Bom Jardim). Todos entraram como **`baixa`**, com `notes` explicando a origem —
  o agregador não publica data de atualização e os telefones que ele traz são fixos antigos (ex.:
  (81) 3621-0486 para São José de Carpina, contra (81) 98307-6250 na página da diocese).
  **Nenhum horário desta diocese deve entrar em produção sem validação.**

## Pontos que precisam de validação humana

1. **A diocese entra sem horário confiável** — é o caso mais grave deste arquivo. Os 30 horários
   `baixa` cobrem 5 paróquias; as outras 45 ficam sem nada. Caminho sugerido para a validação: as
   paróquias têm e-mail publicado (todas as 50) e a maioria mantém Instagram/Facebook.
2. **Endereço da Catedral divergente**: a diocese publica "Praça Papa João XXIII, s/n, Centro,
   55800-000" e o agregador publica "Praça Herculano Bandeira, s/n, Centro" — este último é o
   endereço da **Cúria Diocesana** em `dioceses.json`. Conferir qual é a igreja e qual é a cúria.
3. **Sem CEP na fonte** (4): Nossa Senhora do Carmo (Limoeiro), Nossa Senhora do Rosário
   (Angélicas/Vicência), São José (Murupé/Vicência) e São Severino Mártir (Matinadas/Orobó).
4. **Sem telefone na fonte** (4): Nossa Senhora das Dores (Salgadinho), Nossa Senhora Auxiliadora
   (Caueiras/Aliança — a própria página escreve "Sem telefone"), Nossa Senhora do Rosário
   (Angélicas/Vicência) e São Sebastião (Machados).
5. **Telefone suspeito**: Nossa Senhora Auxiliadora (Guadalajara/Paudalho) publica
   "(81) 92001-2485" — celular de PE começando por 9 seguido de 2 é improvável; provável erro de
   digitação. E **São Severino Mártir (Matinadas/Orobó)** publica DDD **83** (Paraíba).
6. **E-mails que sugerem mudança de status recente** — várias paróquias novas mantêm e-mail de área
   pastoral: `areapastoralsaolourenco@gmail.com` (Paróquia São Lourenço/Goiana),
   `angelicasareapastoral@gmail.com` (Paróquia N. Sra. do Rosário/Angélicas) e
   `areapastoralsaojoaobatista@hotmail.com` (Paróquia São João Batista/Frei Miguelinho). São
   paróquias erigidas há pouco; vale confirmar a data de criação (nenhuma página publica
   `foundedYear`, que ficou `null` nas 50 entradas).
7. **E-mail com acento** — `paroquiasaosebastião1901@gmail.com` (São Sebastião, Lagoa de Itaenga):
   gravado como está na fonte, mas é inválido como endereço de e-mail.
8. **Comunidades**: nenhuma paróquia publica capelas/comunidades. O arquivo tem só as 50 matrizes.
