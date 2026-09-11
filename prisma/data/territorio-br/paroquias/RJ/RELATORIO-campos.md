# Diocese de Campos (RJ) — relatório de pesquisa

- Data da coleta: **2026-09-11**
- Arquivo: `paroquias/RJ/campos.json`
- Resultado: **71 entradas** (68 paróquias/quase-paróquias + 3 marcadas `nao-paroquial`),
  **76 comunidades**, **48 horários fixos**

## O site oficial está suspenso

`https://diocesedecampos.org.br` — **qualquer URL do domínio devolve
`cgi-sys/suspendedpage.cgi`** (página de "site suspenso" da HostGator), inclusive `/paroquias/`
e `/wp-json/`. Não é bloqueio por User-Agent: testei com UA de Chrome, `-k` e `-L`.

A recuperação foi pelo **Arquivo da Internet**, que tem capturas frequentes e recentes do site
(a última das paróquias é de **18/08/2026**, menos de um mês antes desta coleta — o site
funcionava normalmente até pouco tempo atrás). Por isso os dados entraram como `alta`.

| Fonte | Uso |
|---|---|
| `https://web.archive.org/web/20260818233112/https://diocesedecampos.org.br/paroquias/` | **Diretório oficial completo**: 70 circunscrições numeradas com nome, data de criação, endereço, CEP, município/distrito, telefone, e-mail, pároco e diáconos — além de capelas e institutos no fim da página |
| `https://santuarioperpetuosocorro.org.br/missas-e-celebracoes/` e `/confissoes/` | Grade semanal de missas, novenas e confissões do Santuário (redentoristas) |
| `https://psja.org.br/horarios` | Grade de missas, confissões e terço da Paróquia São José do Avahy (Itaperuna) |
| `https://www.catholic-hierarchy.org/diocese/dcmpb.html` | 61 paróquias em 2023 |
| `https://cnbbleste1.org.br/dioceses/campos-dos-goytacazes/` | Endereço e telefone da cúria |

**Detalhe de coleta**: o Arquivo da Internet serve o HTML com `Content-Encoding: gzip` no modo
`id_` — sem `curl --compressed` o conteúdo volta como binário. Além disso, a listagem parece
carregada por AJAX (JetEngine/Crocoblock, `?jet_blog_ajax=1`), mas **o diretório inteiro está no
HTML estático** da página, como um bloco de texto Elementor numerado.

## Cobertura

| Métrica | Valor |
|---|---|
| Entradas no diretório oficial (numeradas) | 70 (números 2 a 75) |
| Números ausentes da numeração | **1, 20, 27, 35, 40** |
| Paróquias plenas | 60 |
| Quase-paróquias | 8 |
| Não paroquiais (`status: "nao-paroquial"`) | Reitoria São Sebastião (nº 57), Capelania São José do Colégio Eucarístico (nº 67), Santuário Nossa Senhora do Perpétuo Socorro (fora da numeração) |
| Paróquias esperadas (catholic-hierarchy, 2023) | 61 |
| Horários | 48 (39 MASS, 9 CONFESSION/ROSARY) em **2** comunidades apenas |
| Comunidades/capelas | 76 (71 matrizes + 5 capelas da Paróquia São José do Avahy) |

**60 paróquias plenas contra 61 esperadas** — conferência excelente para um diretório recuperado
do arquivo. A diferença de 1 cabe nos cinco números ausentes.

Municípios cobertos: Campos dos Goytacazes (25), Itaperuna (9), Santo Antônio de Pádua (4),
Bom Jesus do Itabapoana (4), Miracema (3), São João da Barra (3), São Fidélis (3), Cambuci (2),
São Francisco do Itabapoana (2), Cardoso Moreira (2), Porciúncula (2), Natividade, Varre-Sai,
Italva, Laje do Muriaé, Aperibé, São José de Ubá, Muriaé (Retiro do Muriaé).

## Horários: o grande buraco

**Só 2 das 71 entradas têm horário.** O diretório diocesano não publica grade de missas — só
endereço e clero. Dos três sites paroquiais citados no próprio diretório:

- `psja.org.br` (São José do Avahy, Itaperuna) — **no ar, com grade completa**. Coletado.
- `www.psbj.com.br` (Senhor Bom Jesus, Bom Jesus do Itabapoana) — **fora do ar** (conexão recusada).
- `www.psagradocoracao.com.br` (Sagrado Coração de Jesus, Campos) — **fora do ar**.

O Santuário Nossa Senhora do Perpétuo Socorro (redentoristas) tem site próprio ativo com grade
semanal — entrou com `status: "nao-paroquial"` + `loadAsParish: true`, pela regra do README
("igreja não paroquial com horário publicado entra").

Os horários de missa em hospital/casa de irmãs e as missas de sábado alternado da São José do
Avahy ficaram `baixa` por serem de recorrência mensal.

### Agregadores verificados e descartados — não repetir

Testei os dois agregadores antes de desistir dos horários. **Nenhum dos dois entra**, e
registro aqui para o enxame de validação não refazer o trabalho:

- **`horariodemissa.com.br`** (busca por Campos dos Goytacazes, 339 linhas de resultado): as
  próprias tarjas de aviso do site desejam *"um Santo Natal e um Feliz **2019**"*. É conteúdo
  pré-pandemia, que pelo README é rebaixado a `baixa`. Pior: **contradiz a fonte oficial** —
  para a Igreja Principal (que tem site paroquial ativo) ele publica quarta-feira 06:30 e
  quinta-feira 19:00, enquanto a paróquia publica quarta 19:00 e quinta 06:30 **e** 19:00. Um
  agregador que erra a única grade verificável não serve para as outras 69.
- **`missahora.com.br`**: só mostra as missas **do dia corrente** (8 igrejas na sexta-feira da
  coleta), não uma grade semanal, e também diverge da grade oficial da Igreja Principal.

Como nenhum dos dois corrobora o outro nem a fonte oficial, gravá-los violaria a regra do README
("mostrar horário errado é pior do que não mostrar").

**Recomendação para o enxame de validação**: Campos é o caso mais grave desta rodada de RJ.
Priorizar (a) confirmar se o domínio voltou ao ar; (b) buscar horários nas páginas de Facebook
e Instagram das paróquias — a diocese e as paróquias são muito ativas nessas redes, e as
notícias arquivadas mostram publicação constante. **Atenção**: o Arquivo da Internet ficou
"Temporarily Offline" no fim desta coleta; se o domínio continuar suspenso e o arquivo fora do
ar ao mesmo tempo, não há como reconferir o diretório.

## Precisa de validação humana

1. **Domínio suspenso**: `dioceses.json` registra `https://diocesedecampos.org.br` como site da
   diocese. Hoje ele devolve a página de suspensão da HostGator. Mesmo caso da Diocese de
   Cachoeira do Sul corrigida na 2ª rodada — mas aqui o site parece temporariamente suspenso
   (havia captura normal em 18/08/2026), não migrado. **Não alterei `dioceses.json`.**
2. **Endereço da cúria**: `dioceses.json` traz "Av. 7 de Setembro 247, 28013-330"
   (catholic-hierarchy); o CNBB Leste 1 traz "Rua Gilberto Siqueira, 14, Centro, 28010-400".
   Gravei o do CNBB no bloco `diocese` deste arquivo. **Divergência a resolver.**
3. **Números ausentes 1, 20, 27, 35 e 40**: não aparecem no diretório. Podem ser paróquias
   suprimidas, vagas, ou transferidas para a **Administração Apostólica Pessoal São João Maria
   Vianney**, que convive no mesmo território. Vale checar.
4. **Quase-paróquia Sant'Ana e São Joaquim – Retiro do Muriaé (nº 69)**: o diretório não informa
   o município. Retiro do Muriaé é distrito de **Itaperuna/RJ**; gravei `city: "Muriaé"` a
   partir do nome, o que **provavelmente está errado** (Muriaé fica em MG e é outra diocese).
   **Item nº 1 da validação.**
5. **Nº 59 (Santo Antônio e Santa Paulina, Carabuçu) e nº 61 (Santo Antônio, Pureza)**: o
   diretório as chama de "Paróquia", mas os e-mails oficiais ainda usam "quase-paroquia"/"qp".
   Gravei como paróquia (o que a fonte diz no nome).
6. **Nº 50 "Sagrado Coração de Jesus"** vem sem o prefixo "Paróquia" no diretório. Normalizei
   para "Paróquia Sagrado Coração de Jesus".
7. **Nº 49**: o e-mail publicado é `matriznossasenhoradasgraças@hotmail.com` — com **ç**, o que
   não é endereço válido. **Não gravei o e-mail.** O nome do padroeiro está grafado
   "São Pio de Pieltrecina" no site; normalizei para "São Pio de Pietrelcina".
8. **Nº 65** é publicada como "Quase-Paróquia de Santa Rita de Cássia de Cássia" (repetição no
   original). Normalizei.
9. **Nº 74**: publicada como "Nossa Senhora a Glória" (falta o "d"). Normalizei para
   "Nossa Senhora da Glória e São José". Sem endereço publicado.
10. **Nºs 68, 70, 74, 75**: sem telefone e/ou sem e-mail no diretório; 74 e 75 também sem
    endereço. Campos ficaram `null`.
11. **Anos de criação**: muitos vêm como data completa ("18.12.1926"); gravei só o ano. Vários
    registros (56, 57, 58, 59, 60, 61, 64, 66, 68 a 75) não trazem data — ficaram `null`.
    Não há sinal de "data de cadastro no CMS" repetida em massa, como no caso de São Carlos.
12. **Capelas institucionais no fim do diretório** (Imaculado Coração de Maria em Cardoso
    Moreira, N. Sra. do Bom Sucesso em Italva e em Laje do Muriaé, N. Sra. Auxiliadora dos
    salesianos/salesianas/Laura Vicunha, N. Sra. de Fátima em Miracema, Seminário Diocesano
    Maria Imaculada) **não entraram**: são capelas de instituição sem horário publicado — regra
    do README.
13. **Comunidades/capelas paroquiais não existem no dataset** exceto as 5 da São José do Avahy.
    O diretório diocesano não as lista e os sites paroquiais estão fora do ar. É a maior lacuna
    desta circunscrição depois dos horários.
