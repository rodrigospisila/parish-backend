# Relatório de pesquisa — Diocese de Nova Friburgo (RJ)

- **Data da coleta:** 2026-09-11
- **Arquivo:** `paroquias/RJ/nova-friburgo.json`
- **Sede:** Nova Friburgo/RJ — Rua Augusto Spinelli, 41, Centro, CEP 28610-190, (22) 2522-2799
- **Bispo:** Dom Pedro Cunha Cruz
- **Site oficial:** https://diocesenf.org.br

## Resultado

| Item | Quantidade |
|---|---|
| Paróquias | **61** (59 `alta`, 2 `media`) |
| Comunidades/capelas | **11** (só as citadas em grades de horário) |
| Horários fixos | **140** (8 `alta`, 35 `media`, 97 `baixa`) |
| Cobertura esperada (Anuário Pontifício 2024) | 60 |

Vicariatos: Sede (22), Litoral (21), Norte (18). 19 municípios.

## Fontes principais

1. **API REST do site oficial** — `https://diocesenf.org.br/wp-json/wp/v2/paroquia?per_page=100`
   (`X-WP-Total: 61`) devolveu a listagem canônica de uma vez. A cidade e o vicariato de cada
   paróquia saíram da taxonomia `local_paroquia`
   (`/wp-json/wp/v2/local_paroquia?per_page=100`, 23 termos: 3 vicariatos pais + 20 municípios).
2. **Cadastro da Receita Federal via minhareceita.org** — as paróquias são **filiais do CNPJ da
   Mitra Diocesana de Nova Friburgo, 28.600.559**. Varri de `/0001` a `/0130`: existem
   **58 estabelecimentos ativos** (a matriz + 57 paróquias) e **nada acima de /0058**, o que
   funciona como prova de completude do cadastro. Foi daqui que vieram endereço, bairro, CEP e
   16 telefones.
3. **https://diocesenf.org.br/horarios-de-missa/** — a diocese tem a página, com uma tabela por
   paróquia, mas quase toda vazia (ver abaixo).
4. **https://www.horariodemissa.com.br** — 49 igrejas da diocese; a maior parte dos horários.
5. **https://www.catholic-hierarchy.org/diocese/dnofr.html** — bispo, sede e nº esperado (60).

## O que NÃO funcionou

- **As páginas individuais de paróquia do site são vazias.** `diocesenf.org.br/paroquia/<slug>/`
  responde 200 com 116 KB de HTML, mas o corpo tem só 1.9 KB de texto, todo de menu: o template
  Elementor/JetEngine do single não renderiza nenhum campo. Nenhum endereço, telefone, pároco ou
  horário sai do site por essa via. Por isso a Receita virou a fonte de endereço.
- **A página oficial de horários está quase toda em branco.** O HTML tem os 60 blocos
  (`loop-item`) das paróquias com o cabeçalho `Tipo Paróquia | Dia da Semana | Horário |
  Observações`, mas **só 5 têm alguma linha e só 2 têm linhas completas**:
  - Catedral São João Batista — 12 missas de segunda a sexta (**sem domingo e sem sábado**);
  - Paróquia Imaculada Conceição — 4 linhas, uma delas com o texto
    *"Blanditiis doloremque quia voluptatem quo provident doloremque"* (**Lorem Ipsum**);
  - N. Sra. das Graças, N. Sra. da Conceição do Paquequer e N. Sra. da Soledade — linhas com o
    tipo ("Missa", "Celebração da Palavra") e **sem dia nem hora**.

  Aproveitei só as 12 linhas da Catedral: 8 delas coincidem com o agregador e ficaram `alta`
  (duas fontes), 4 são novas e ficaram `media`. **Descartei as 4 linhas da Imaculada Conceição**
  por serem conteúdo de teste.

## Pontos para o enxame de validação

1. **Duas prováveis duplicatas no CMS da diocese** — são as 2 paróquias `media`, as únicas sem
   endereço e sem filial de CNPJ:
   - `sao-joao-batista-macae` — o site publica **duas** "Paróquia São João Batista" em Macaé
     (slugs `paroquia-sao-joao-batista-3` e `-4`, ambas criadas em 17/12/2025) e a Receita tem
     **uma** (`/0019-08`, Centro).
   - `sant-ana-nova-friburgo` — o site publica **duas** "Paróquia Sant'Ana" em Nova Friburgo e a
     Receita tem **uma** (`/0004-52`, bairro Cônego).

   Se as duas forem duplicatas, o total cai para 59 — abaixo dos 60 do Anuário, então
   provavelmente **uma delas é real e a outra não**. Precisa de confirmação humana.
2. **Registros com marca de conteúdo de teste no CMS:**
   - Paróquia Nossa Senhora de Fátima (Cachoeiras de Macacu) tem **slug `teste`**
     (`diocesenf.org.br/paroquia/teste/`) e não tem filial de CNPJ — mas o agregador confirma a
     paróquia em Papucaia, então parece real, com registro mal criado.
   - Paróquia Nossa Senhora da Soledade (Sumidouro) tem **slug `perferendis-fugit`** (latim de
     preenchimento); o CNPJ `/0057-13` confirma a paróquia.
3. **Slug do CMS que não bate com o título**: a paróquia intitulada "Paróquia Nossa Senhora das
   Graças" (Nova Friburgo, Olaria) tem slug `paroquia-sao-sebastiao` no CMS, e a intitulada
   "Paróquia São Sebastião" tem `paroquia-sao-sebastiao-2`. Usei o **título**, que é o que a
   Receita (`/0003-33` = N. Sra. das Graças, Olaria) e o agregador confirmam.
4. **Paróquia São Roque (Nova Friburgo, Olaria)** é a única da lista oficial sem filial no CNPJ da
   Mitra — pode ter CNPJ próprio ou ser recente. A ficha do agregador é de **07/08/2025**, a mais
   nova da diocese.
5. **Divergência de bairro em Santa Edwiges (Nova Friburgo)**: Receita diz *Vale dos Pinheiros*,
   agregador diz *Parque São Clemente*. Ficou com o da Receita.
6. **Cadastros da Receita com município defasado** (usados assim mesmo, com a cidade do site):
   - N. Sra. do Desterro está cadastrada em *Macaé/bairro Quissamã* — Quissamã emancipou-se de
     Macaé em 1989. Gravei `city: Quissamã`.
   - São João Batista de **Macuco** (`/0020-93`) está cadastrada em *Cordeiro* — Macuco
     emancipou-se de Cordeiro em 1988. Gravei `city: Macuco`.
   - N. Sra. das Neves aparece no agregador com cidade *Glicério*, distrito de Macaé.
     Gravei `city: Macaé` (Córrego do Ouro, pela Receita).
7. **97 dos 140 horários são `baixa`** porque as fichas do agregador são de **2013–2018**
   (pré-pandemia). Os `media`/`alta` vêm de três fontes com sinal de atualidade:
   - Paróquia Santo Antônio e São Francisco de Assis — ficha de **07/01/2023**, 26 horários
     (inclui confissões e a Capela Santo Antônio do Suspiro);
   - Paróquia São Roque — ficha de **07/08/2025**, 5 horários;
   - Catedral São João Batista — 8 horários corroborados pela página oficial.
8. **Endereços sem tipo de logradouro.** A Receita não publica "Rua/Praça/Avenida", só o nome:
   gravei `"Freidmann, 09"`, `"Sebastiao Gastaldi, s/n"` etc., normalizando as abreviações que
   apareciam no próprio nome (`Prc` → Praça, `Av` → Avenida). Também não há acentuação, porque o
   cadastro é em caixa alta sem acento — apliquei apenas capitalização.
9. **Comunidades quase inexistentes (11).** Nem o site nem a Receita publicam capelas; as 11
   registradas foram extraídas dos parênteses das grades do agregador (ex.: "10:00 (Capela Santo
   Antônio do Suspiro)"). Descartei a entrada espúria *"Capela Santo Antônio - após a missa"*,
   que é nota grudada no nome, e fundi "Capela Santo Antônio" na "Capela Santo Antônio do
   Suspiro" — exatamente o defeito de importador descrito no README.
10. A **Paróquia São Pedro (Santa Maria Madalena)** está no *Vicariato Episcopal Litoral* segundo
    a taxonomia do site, embora o município esteja no Norte — o site tem dois termos de taxonomia
    "Santa Maria Madalena", um por vicariato. Mantive a cidade; o vicariato não é gravado no JSON.
