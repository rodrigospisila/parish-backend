# Diocese de Crateús (CE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-18
- **Arquivo**: `paroquias/CE/crateus.json`
- **Cobertura**: **16 / 16 paróquias (100%)**, todas `alta`, + **2 áreas pastorais**
  (`status: nao-paroquial` + `loadAsParish: true`, fora de `parishesFound`)
- **Comunidades**: **49** — 18 igrejas-sede, as 25 de Ipaporanga, as 5 da Área Pastoral São Francisco
  e a Capela São Francisco de Crateús
- **Horários fixos**: **46 — todos `baixa`**, em 9 unidades, tirados do Lírio Católico
- **A diocese perdeu o site**: `diocesedecrateus.com.br`, `.net.br` e `.org` **não resolvem no DNS**
  (NXDOMAIN nos três). `website` gravado como `null`.

## Como a lista foi fechada

Duas fontes independentes, que se confirmam uma à outra:

1. **Arquivo da Internet** — o portal WordPress `diocesedecrateus.com.br` tem capturas de
   **abril/2023** e **abril–maio/2024** com o menu completo (14 paróquias + 3 áreas pastorais) e
   **16 fichas individuais**, cada uma com padroeiro, data de criação da paróquia/freguesia,
   1º pároco, párocos in solidum, endereço, CEP, telefone e — o achado decisivo — **o CNPJ**.
2. **Varredura das filiais do CNPJ da mitra na Receita Federal** — o CNPJ raiz **07.168.206** saiu
   do rodapé das próprias fichas arquivadas. Varrendo `0001` a `0040` em `minhareceita.org`
   (hoje, 18/09/2026), vieram **exatamente 19 estabelecimentos e nada além**:

| Filial | Nome fantasia | Situação | Município |
|---|---|---|---|
| 0001 | DIOCESE DE CRATEUS (sede/cúria) | ATIVA | Crateús |
| 0002 | PAROQUIA DE CRATEUS | ATIVA | Crateús |
| 0003 | PAROQUIA DE INDEPENDENCIA | ATIVA | Independência |
| 0004 | PAROQUIA DE PARAMBU | ATIVA | Parambu |
| 0005 | PAROQUIA DE PORANGA | ATIVA | Poranga |
| 0006 | PAROQUIA DE TAUA | ATIVA | Tauá |
| 0007 | PAROQUIA DE NOVA RUSSAS | ATIVA | Nova Russas |
| 0008 | PAROQUIA DE IPUEIRAS | ATIVA | Ipueiras |
| 0009 | PAROQUIA DE MONSENHOR TABOSA | ATIVA | Monsenhor Tabosa |
| 0010 | PAROQUIA DE NOVO ORIENTE | ATIVA | Novo Oriente |
| 0011 | PAROQUIA DE TAMBORIL | ATIVA | Tamboril |
| 0012 | PAROQUIA DE QUITERIANOPOLIS | ATIVA | Quiterianópolis |
| 0013 | PAROQUIA DE IPAPORANGA | ATIVA | Ipaporanga |
| 0014 | AREA PASTORAL DE SUCESSO | ATIVA | Tamboril |
| 0015 | PAROQUIA DE ARARENDA | ATIVA | Ararendá |
| 0016 | AREA PASTORAL SAO FRANCISCO | **BAIXADA** | Nova Russas |
| 0017 | PAROQUIA IMACULADA CONCEICAO | ATIVA | Crateús |
| 0018 | PAROQUIA NOSSA SENHORA DE FATIMA | ATIVA (2019) | Ipueiras (Nova Fátima) |
| 0019 | PAROQUIA DE SANTA TERESA | ATIVA (2019) | Tauá (Santa Tereza) |

**Achado**: duas unidades que o site ainda chamava de "área pastoral" (Nova Fátima e Santa Tereza)
**já estão registradas como PARÓQUIA** na Receita, desde dezembro de 2019 — foram promovidas depois
da última atualização do portal. Entraram como paróquia. E a terceira área pastoral do menu, **São
Francisco de Nova Russas, está com o CNPJ BAIXADO**, mas o site ainda publicava a ficha em
**26/05/2024**: pelo aviso do README ("às vezes a paróquia continua existindo apesar da baixa"),
ficou no dataset como `nao-paroquial` + `loadAsParish`, com `confidence: media` e nota.

Por isso as 16 paróquias e a Área Pastoral de Sucesso entraram com `alta`: o dado tem fonte oficial
arquivada **e** confirmação cadastral de hoje, com endereço e CEP.

## Fontes principais

| Fonte | O que deu |
|---|---|
| `web.archive.org/…/diocesedecrateus.com.br/paroquias/` (05/04/2023) | menu com as 14 paróquias e 3 áreas pastorais |
| 16 fichas `…/paroquias/<slug>/` (2023-04 e 2024-04/05) | padroeiro, criação da freguesia/paróquia, 1º pároco, párocos in solidum, diáconos, endereço, CEP, telefone e **CNPJ** |
| `…/o-clero/` (02/04/2023) | 23 presbíteros com ordenação, naturalidade, **endereço da casa paroquial** e contato — foi assim que os párocos foram atribuídos às fichas que só publicam "EQUIPE PAROQUIAL: PE. ADRIANO" |
| `minhareceita.org/07168206XXXXXX` | as 19 filiais, com razão social, nome fantasia, situação cadastral, endereço, CEP, telefone e data de início |
| catholic-hierarchy `/diocese/dcrts.html` | erigida em **28/09/1963**; 17 paróquias na estatística de 2023 |
| Lírio Católico (`CE.json`) | 23 fichas nos 13 municípios — única fonte de horário |

### Truques de coleta

- **O CNPJ estava no rodapé das fichas arquivadas.** Sem ele não haveria prova de completude: a
  diocese não tem site, e o Mapa das OSC não foi necessário.
- **As capturas do Arquivo da Internet chegam em gzip** quando se usa o sufixo `id_` (conteúdo cru).
  Quem não descomprimir vai ler lixo binário e concluir, errado, que a captura está corrompida.
- Os e-mails das fichas de 2024 vêm ofuscados (`[email protected]`) pelo plugin de proteção do
  WordPress e **não puderam ser recuperados** — nenhuma paróquia tem e-mail no dataset.

## Municípios (13)

Ararendá, Crateús (2 paróquias), Independência, Ipaporanga, Ipueiras (2), Monsenhor Tabosa,
Nova Russas (1 + a área pastoral), Novo Oriente, Parambu, Poranga, Quiterianópolis, Tamboril (1 + a
área pastoral de Sucesso) e Tauá (2).

## Comunidades

Só **duas** fichas publicam comunidades:

- **Paróquia Sagrado Coração de Jesus (Ipaporanga)** — a melhor ficha da diocese: declara 20 capelas
  e 25 CEBs e lista **25 comunidades nominadas**, agrupadas por região (Água Branca, Cajá dos Jorges,
  Sacramento, Torrões, Mulungu, Lagoa do Barro, Sítio Araras) e por zona urbana/rural, com o ano de
  construção de cada capela.
- **Área Pastoral São Francisco (Nova Russas)** — 5 capelas rurais.

Mais a **Capela São Francisco** de Crateús, que o Lírio Católico descreve explicitamente como
"Capela da Paróquia Senhor do Bonfim" (por isso entrou ligada à catedral, com `confidence: baixa`).

## Horários

46, **todos `baixa`**, de 9 unidades, tirados do Lírio Católico (a data do agregador é a de
regeneração da base, 2026-09-02, igual nas 757 fichas do Ceará). Com horário: Catedral Senhor do
Bonfim e sua Capela São Francisco, Imaculada Conceição (Crateús), São Vicente de Paulo (Ararendá),
Sagrado Coração de Jesus (Ipaporanga), N. Sra. da Conceição (Ipueiras), N. Sra. das Graças (Nova
Russas), N. Sra. da Imaculada Conceição (Quiterianópolis), N. Sra. do Rosário e Santa Teresa
d'Ávila (Tauá).

**As outras 9 unidades entram sem horário nenhum**: Independência, Tamboril, Monsenhor Tabosa,
Novo Oriente, N. Sra. de Fátima (Nova Fátima), Jesus Maria José (Poranga), São Pedro (Parambu) e as
2 áreas pastorais.

## Fora do JSON (missa publicada, vínculo não confirmado)

O Lírio Católico lista em Tauá **oito** igrejas/capelas que nenhuma fonte diocesana liga a uma
paróquia — e Tauá tem duas paróquias (N. Sra. do Rosário e Santa Teresa d'Ávila), então adivinhar o
vínculo seria inventar. Mesma situação em Crateús e Parambu:

| Cidade | Igreja | Endereço | Missas publicadas |
|---|---|---|---|
| Tauá | Capela Sagrado Coração de Jesus | R. Aristides de Freitas, 105 – Pedregal | dom. 17:00 (`@capela.sagradocoracao_`) |
| Tauá | Capela Santa Teresa d'Ávila | R. Manoel Araújo Chaves, 53 – Planalto dos Colibris | dom. 09:00 |
| Tauá | Capela de Santa Luzia | R. Cento e Oito, 160 – Conj. Joel Marques | dom. 17:00 |
| Tauá | Igreja de São José | Av. Chermont Alves de Oliveira – Cidade Nova | dom. 19:00; adoração qui. 19:00 |
| Tauá | Capela de N. Sra. das Graças / Capela de N. Sra. de Fátima / Capelinha N. Sra. Aparecida / Igreja de Jesus, Maria e José (Marrecas) | — | sem horário |
| Crateús | Igreja Santa Teresinha | R. Dr. Hermínio Bezerra, 764 – Planalto | dom. 17:00 |
| Crateús | Igreja de São Vicente de Paulo | R. Zacarias Carlos Melo, 744 – São Vicente | sem horário |
| Parambu | Igreja de N. Sra. da Conceição | Cococi | sem horário |

## Precisa de validação humana

1. **Site morto** — três domínios em NXDOMAIN. Se a diocese abrir um portal novo, tudo aqui deve ser
   reconferido: o conteúdo mais recente que existe é de **maio de 2024**.
2. **Párocos de fonte de 2023/2024** — nomes de pároco e párocos *in solidum* vêm de capturas com
   2 a 3 anos. Foram gravados em `priestName` porque a Receita confirma a existência e o endereço de
   cada paróquia hoje, mas **o clero pode ter mudado**. Este é o dado mais frágil do arquivo.
3. **Endereço divergente em Parambu** — a ficha arquivada e a página do clero dizem "Rua Santa
   Terezinha, 59"; a Receita (hoje) traz "Rua Francisca Carvalho Noronha, 166". Prevaleceu a Receita.
4. **Endereço divergente em Nova Russas** — a página do clero diz "Rua Santos Dumont, 1199"; a ficha
   e a Receita dizem "Av. Antônio Joaquim de Sousa, 1199". Prevaleceu a Receita.
5. **CEPs divergentes em Crateús** — as fichas publicam 63700-028 (catedral) e 63.705-678
   (Imaculada); a Receita traz 63700-001 nos dois. Gravado o da Receita.
6. **Ficha com dois CNPJs e dois endereços** — a de Ararendá traz, no rodapé, o CNPJ e o endereço de
   Ararendá *e* os de Ipaporanga. Foi preciso separar pelo cadastro da Receita.
7. **Área Pastoral São Francisco (Nova Russas) com CNPJ baixado** — mas com ficha no site em maio de
   2024. Confirmar se ainda existe, se virou paróquia ou se foi reabsorvida por N. Sra. das Graças.
8. **Paróquias sem ano de criação** — Catedral Senhor do Bonfim (a ficha só dá a história da
   freguesia) e N. Sra. de Fátima de Nova Fátima e Santa Teresa de Tauá, cujo ano gravado (2019) é a
   data de **abertura da filial na Receita**, não necessariamente a do decreto de ereção.
9. **Nenhum e-mail** — os das fichas de 2024 estão ofuscados pelo WordPress e os de 2023 não existem.
10. **Pe. "Akino"** — a ficha de Quiterianópolis abrevia assim o nome do responsável; foi atribuído ao
    **Pe. Ermínio José de Aquino**, cujo endereço na página do clero é o de Quiterianópolis. Conferir.
11. **46 horários `baixa`** — nenhum entra em produção. Caminho para subir: os Instagram publicados
    pelo Lírio (`paroquiasenhordobonfimcrateus`, `paroquiaimaculadacrateus`,
    `paroquiasenhorasantana.ind`, `paroquiadeipueiras`, `pascomnr`, `paroquiaquiterianopolis`,
    `paroq.nrosario`, `paroqsantatereza`, `capela.sagradocoracao_`, `igrejadejesusmariaejose`),
    nenhum lido nesta rodada, por orçamento.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `website`: está `null` — **está correto**, e o motivo agora é conhecido (os três domínios caíram).
- `address`: está "Curia Diocesana, Rua Firmino Rosa 1064"; a Receita confirma
  **Rua Firmino Rosa, 1064, bairro Sede, Crateús**.
- `zipCode`: está **63700-028**; a Receita traz **63700-001** para a sede (e também para as duas
  paróquias de Crateús). Vale conferir.
- `foundedYear` (1963), `bishopName` (Dom Ailton Menegussi): **conferem**.
