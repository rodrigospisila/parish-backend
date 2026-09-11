# Administração Apostólica Pessoal São João Maria Vianney (RJ) — relatório de pesquisa

- Data da coleta: **2026-09-11**
- Arquivo: `paroquias/RJ/sao-joao-maria-vianney.json`
- Resultado: **17 entradas** (12 paróquias + 1 quase-paróquia + 1 elevada a paróquia em 2026 +
  3 reitorias `nao-paroquial`), **18 comunidades**, **18 horários fixos**

## O que é esta circunscrição

Não é uma diocese territorial. É uma **circunscrição eclesiástica PESSOAL**, erigida por
São João Paulo II em 18/01/2002 pelo decreto *Animarum bonum*, a partir da antiga União
Sacerdotal São João Maria Vianney. Celebra na **forma extraordinária do Rito Romano** (livros
litúrgicos de 1962). Tem cúria, seminário, tribunal eclesiástico, presbitério e **paróquias
próprias**, e **convive com a Diocese de Campos no mesmo território** — as paróquias deste
arquivo **não** são da Diocese de Campos e não devem ser confundidas com as de `campos.json`.

Administrador Apostólico: **Dom Fernando Arêas Rifan**, bispo titular de Cedamusa.

## Fontes

| Fonte | Uso |
|---|---|
| `https://adapostolica.org/paroquias/` | **Diretório das 14 circunscrições paroquiais** com nome, endereço, CEP, município, telefone, pároco, vigários, e-mails e redes sociais. **Última alteração: 16/01/2016** |
| `https://adapostolica.org/reitorias/` | 3 reitorias com endereço e reitor. **Última alteração: 15/12/2015** |
| `https://adapostolica.org/transferencias-e-nomeacoes-de-2026/` (06/01/2026) | **Corroboração atual**: nomeações de 2026 que citam nominalmente 4 das paróquias |
| `https://adapostolica.org/clero-da-administracao-apostolica-pessoal-sao-joao-maria-vianney-2026/` (06/01/2026) | Quadro completo do clero em 2026 — usado para invalidar párocos obsoletos |
| `http://www.catolicosempre.org.br/horario-de-missas/` | Grade de missas e confissões da Igreja Principal (site paroquial **ativo**, posts de setembro de 2026) |
| `https://cnbbleste1.org.br/dioceses/adm-apostolica-sao-joao-maria-vlanney/` | Endereço atual da cúria |
| Wikipédia (pt) | "12 paróquias, uma quase-paróquia e 4 reitorias", 115 templos, 12 comunidades pelo Brasil |

O WordPress REST (`/wp-json/wp/v2/pages`) foi o caminho para ler as páginas: o site tem 83
páginas e devolve `modified` por página, o que permitiu datar cada fonte com precisão.
A página `/clero-.../` devolve 403 para leitor automático, mas o mesmo conteúdo vem limpo pela
REST (`/wp-json/wp/v2/posts/15651`).

## Cobertura

| Métrica | Valor |
|---|---|
| Paróquias pessoais | 13 (12 do diretório + a nº 9, elevada em 2026) |
| Quase-paróquias | 1 |
| Reitorias (`status: "nao-paroquial"`) | 3 |
| Esperado (Wikipédia) | 12 paróquias + 1 quase-paróquia + **4** reitorias |
| Comunidades/capelas nominais | 18 (17 matrizes + Santo Antônio de Jacutinga) |
| Horários | 18 — só na Igreja Principal |
| Confiança das entradas | 4 alta, 12 media, 1 baixa |

**Falta 1 reitoria** para bater com a Wikipédia — a Administração publica só 3. As demais
igrejas (115 templos ao todo, segundo a Wikipédia, mais 12 comunidades em RJ, SP, MG e ES
atendidas a pedido dos fiéis) **não são publicadas nominalmente em lugar nenhum**.

### Sobre o "154 paróquias" do catholic-hierarchy

O catholic-hierarchy registra **154 "parishes" em 2022** para esta circunscrição (e 122 a 150
nos anos anteriores). **Esse número conta templos e centros de missa, não paróquias canônicas** —
bate com os "115 templos" da Wikipédia, não com as 13 paróquias. **Não usei esse número como
expectativa de cobertura**; `parishesExpected` ficou em 13.

## Decisões tomadas

- **Prefixo "Paróquia Pessoal"**: a própria Administração usa "Paróquia Pessoal de Nossa Senhora
  das Graças e São Sebastião" no decreto de 2026 e no Facebook oficial de Varre-Sai. Adotei o
  prefixo em todas para deixar explícito, na lista de paróquias do app, que são circunscrições
  pessoais e não territoriais.
- **Campo extra `rite`** em cada paróquia: `"romano tradicional (forma extraordinária, livros de
  1962)"`. Não está no formato do README, mas é o dado que distingue esta circunscrição.
- **Confiança**: a página de paróquias é oficial mas está **parada desde 2016** — pelo README isso
  é `media`. Subi para `alta` as 4 entradas citadas nominalmente por fonte oficial de 2026
  (Igreja Principal, São Judas Tadeu/Santo Antônio, Nossa Senhora Aparecida e São Fidélis, e
  Nossa Senhora das Graças e São Sebastião de Varre-Sai).
- **Párocos obsoletos anulados**: cruzei cada pároco publicado em 2016 com o quadro do clero de
  2026. Onde o quadro de 2026 contradiz, gravei `priestName: null` e expliquei em `notes`:
  - **Igreja Principal** — o pároco de 2016 (Pe. Claudiomar Silva Souza) está no Pontifício
    Ateneo Sant'Anselmo, em Roma; o vigário (Pe. José Geraldo Freitas da Silva Júnior) é
    incardinado **não residente**, a serviço da Diocese de Campos (é, aliás, o administrador da
    Quase-paróquia Nossa Senhora Aparecida e Santo Antônio de Sant'Ana Galvão em `campos.json`).
  - **Nossa Senhora Aparecida e São Fidélis** — o pároco de 2016 (Pe. Gaspar Samuel Coimbra
    Pelegrini) é incardinado **não residente**, a serviço da Diocese de Barra do Piraí-Volta
    Redonda.
  - **Nossa Senhora das Graças (São João da Barra)** — o "Pe. João Paulo" publicado em 2016 não
    existe no quadro de 2026.
- **Nº 9 elevada a paróquia**: publicada em 2016 como "Quase-Paróquia de São Judas Tadeu e Santa
  Clara"; o decreto de 06/01/2026 já a chama de **"Paróquia de São Judas Tadeu (Santa Clara) e
  Santo Antônio (Jacutinga), Porciúncula – RJ e Varre-Sai – RJ"**. Gravei como paróquia, com sede
  em Santa Clara (Porciúncula) e **Santo Antônio de Jacutinga (Varre-Sai) como comunidade**.
- **Horários**: só a Igreja Principal publica grade (site paroquial próprio, ativo). As missas de
  primeira sexta/primeiro sábado ficaram `baixa` por recorrência mensal.

## Precisa de validação humana

1. **Quase-paróquia de Nossa Senhora de Lourdes e São Pio de Pietrelcina** — **a única entrada
   `baixa`**. A página oficial publica só o administrador (Pe. Sidnei Barcelos da Silva Júnior) e
   as redes sociais: **sem endereço, sem cidade, sem telefone**. Gravei
   `city: "Campos dos Goytacazes"` por ser a sede da circunscrição, mas **isso é inferência** e
   pode estar errado. **Item nº 1 da validação.**
2. **A 4ª reitoria** não aparece em fonte nenhuma. Localizar.
3. **As páginas de paróquias e reitorias estão paradas há 10 anos.** Endereços de igreja não
   mudam, mas telefones, e-mails e párocos provavelmente sim. O Facebook e o Instagram
   (@adapostolica) da Administração são ativos e seriam a via para conferir.
4. **Mons. José de Matos Barbosa** aparece simultaneamente como pároco em Bom Jesus do
   Itabapoana (página de paróquias) e reitor da Igreja de Nossa Senhora Aparecida no Parque IPS
   de Campos (página de reitorias). Dados de 2015/2016; pelo menos um está desatualizado.
5. **Pe. José Gualandi** é publicado como pároco de **duas** paróquias em Campos (Nossa Senhora
   do Terço e São Geraldo Magela), com o mesmo vigário nas duas. Plausível, mas conferir.
6. **Endereço da cúria**: `dioceses.json` registra "Rua Riachuelo 169, Parque Riachuelo,
   28013-450"; o CNBB Leste 1 publica **"Rua Dom Licínio, 169"**, mesmo CEP e bairro — a rua
   parece ter sido renomeada em homenagem a Dom Licínio Rangel, primeiro Administrador
   Apostólico. Gravei o nome novo no bloco `diocese` deste arquivo. **Não alterei `dioceses.json`.**
7. **Site paroquial morto**: `bomjesuscrucificado.org.br` (citado pela Administração) devolve
   404 em qualquer caminho. `catolicosempre.org.br` (Igreja Principal) está vivo e foi usado.
8. **Horários dos demais 16 templos**: nenhuma fonte oficial publica. O
   `latinmassdir.org` tem fichas (ex.: Nossa Senhora do Terço, "diariamente 07:00 e 18:00"), mas
   são de **2 anos atrás**, de agregador único e contraditórias com o padrão da circunscrição —
   **não gravei nada a partir dele**, seguindo a regra do README de que horário errado é pior que
   horário ausente.
9. **A Administração atende comunidades fora do RJ** (Rio de Janeiro capital, São Paulo, Minas
   Gerais e Espírito Santo — o decreto de 2026 nomeia inclusive um responsável pelo apostolado em
   **Vitória/ES**). Nenhuma delas está neste arquivo, que cobre só as circunscrições paroquiais
   publicadas. Se o Parish quiser cobri-las, é outra pesquisa.
