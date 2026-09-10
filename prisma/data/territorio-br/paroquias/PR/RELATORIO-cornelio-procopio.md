# Relatório de pesquisa — Diocese de Cornélio Procópio (PR)

Data da pesquisa: 2026-09-10. Arquivo de dados: `cornelio-procopio.json`.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://dioceseprocopense.org.br/posts/lista/setor-1 … setor-4 | Listagem oficial das 25 paróquias por setor pastoral (9 + 5 + 7 + 4) | alta |
| https://dioceseprocopense.org.br/posts/detalhe/<id> (25 páginas) | Nome, cidade, endereço, CEP, telefone, e-mail, site, pároco atual ("Atualmente…"), data de criação, capelas nomeadas e, em 4 páginas, "Horário de Missas" | alta (dados cadastrais) / media (horários) |
| https://dioceseprocopense.org.br/posts/lista/clero (5 páginas) | Lista do clero com função e paróquia (entradas de 2016, 2018, 2021 e 2022) — usada para corroborar párocos | media |
| https://dioceseprocopense.org.br/ e /contatos | Endereço, CEP, telefone e e-mail da Cúria (rodapé) | alta |
| https://gcatholic.org/dioceses/diocese/corn0.htm | Nº esperado: 25 paróquias e 1 missão (31/12/2022); bispo Dom Marcos José dos Santos (nomeado 22/06/2022) | media |
| https://pt.wikipedia.org/wiki/Diocese_de_Corn%C3%A9lio_Proc%C3%B3pio | Criação (26/05/1973), Catedral Cristo Rei, bispo atual | media |
| https://siteantigo.arquidioceselondrina.com.br/ | Menu "Dom Marcos José, Bispo de CP" — corrobora o bispo atual | media |
| https://www.instagram.com/paroquia.urai/ | Horários de Uraí citados no resumo do buscador (página não acessível ao agente) | media |
| https://www.horariodemissa.com.br/igreja.php?k=CkK6v | Horários de Nova Fátima (atualizado em 21/06/2014) | baixa |

Consultadas sem resultado útil: catholic-hierarchy.org/diocese/dcopr.html (HTTP 403 em todas as tentativas);
CNBB Regional Sul 2 (403); horariodemissa.com.br — fichas de Cornélio Procópio, Uraí, Jataizinho, Santa Mariana,
Congonhinhas, S. S. da Amoreira, Sapopema e Figueira sem nenhum horário (atualizadas em 2013); missahora.com.br /
horariosmissa.com.br (403); horariodemissahoje.com.br (DNS não resolve); catedralcristorei.com.br e paroquiasbj.org.br
(DNS não resolve — sites citados pelo site diocesano); paroquiasaojoseassai.com.br (responde página vazia de 87 bytes);
numsocorpo.wixsite.com/dias (site de Congonhinhas, conteúdo de 2017, sem horários); paroquiasantanasapopema.blogspot.com
(último post de 01/2016, sem horários); páginas de Facebook/Instagram das paróquias (não acessíveis ao agente).
Buscas dirigidas por cidade ("<paróquia> horário de missas") foram feitas para todas as 25 paróquias.

O site diocesano tem posts datados de 2016, mas várias páginas foram editadas depois (posse em Sertaneja em 13/02/2022,
São Jerônimo "no ano de 2022", São José Operário 06/02/2021, Assaí 01/2021; entradas do clero de 15/08/2022). Não há
sinal de atualidade ≤ 12 meses, por isso os horários dele ficaram como **media**.

## Cobertura

- **Paróquias encontradas: 25 — esperadas: 25** (GCatholic 31/12/2022: 25 paróquias e 1 missão). A missão não é
  nomeada em nenhuma fonte consultada; não foi incluída. 19 municípios (Assaí, Congonhinhas, Cornélio Procópio, Curiúva,
  Figueira, Jataizinho, Leópolis, Nova América da Colina, Nova Fátima, Nova Santa Bárbara, Rancho Alegre, Santa Cecília
  do Pavão, Santa Mariana, Santo Antônio do Paraíso, São Jerônimo da Serra, São Sebastião da Amoreira, Sapopema,
  Sertaneja, Uraí).
- Distribuição por setor (campo `deanery`, extra ao esquema): Setor 1 = 9 (Cornélio Procópio 6, Nova América da Colina,
  Santa Mariana 2), Setor 2 = 5 (Uraí, Leópolis, Jataizinho, Sertaneja, Rancho Alegre), Setor 3 = 7 (Nova Santa Bárbara,
  Congonhinhas, Nova Fátima, Santa Cecília do Pavão, Santo Antônio do Paraíso, Assaí, S. S. da Amoreira), Setor 4 = 4
  (Curiúva, Sapopema, São Jerônimo da Serra, Figueira).
- Confiança das paróquias: **25 alta**, 0 media, 0 baixa.
- Comunidades: **63** (25 matrizes + 38 capelas/comunidades nomeadas em 8 paróquias; 39 alta, 24 media). As 17
  restantes ficaram só com a matriz — 5 delas citam capelas sem nomear (São José Operário "3 capelas", Medianeira/Santa
  Mariana "9 capelas", Santo Antônio do Paraíso "4 capelas rurais", São Jerônimo da Serra "23 comunidades rurais", São
  Miguel Arcanjo "Capela").
- Horários: **41 registros** (40 MASS, 1 ADORATION): **0 alta, 35 media, 6 baixa**, em 6 paróquias (Catedral, São
  Miguel Arcanjo, Rainha dos Apóstolos, S. S. da Amoreira — site diocesano; Uraí — Instagram via busca; Nova Fátima —
  agregador de 2014). **19 paróquias sem nenhum horário.**

## Regras aplicadas

- Nome: título da página de detalhe, com prefixo padronizado e sem cidade. "Paróquia Cristo Rei - Catedral Diocesana" →
  "Catedral Cristo Rei" (slug `cristo-rei-cornelio-procopio`); "Paróquia São Vicente Pallotti - Santuário Nossa Senhora
  do Perpétuo Socorro" → "Paróquia São Vicente Pallotti e Santuário Nossa Senhora do Perpétuo Socorro" (nome completo
  citado no histórico; slug `sao-vicente-pallotti-cornelio-procopio`); "Santo Antônio de Padua" → "de Pádua";
  "Paróquia Santa Ana" mantido como na fonte. Jataizinho: o título diz "Imaculada Conceição" (nome do decreto de
  1950) e o bloco de endereço diz "Nossa Senhora da Conceição" — ficou o título.
- `address`: rua e número; bairro/distrito em `neighborhood`; "Caixa Postal" descartada; CEP normalizado. Uraí: bairro
  "Centro" vem do agregador (a página diocesana não informa). Panema: `city` = Santa Mariana, `neighborhood` =
  "Distrito do Panema".
- `phone`: formato "(43) NNNN-NNNN"; `email`: todos os endereços do campo, separados por " / ". `website`: só domínios
  que respondem (Congonhinhas — wix, 2017); Facebook usado como `website` em Panema e Uraí (única presença web
  citada pela fonte); domínios mortos (Catedral, Figueira, Assaí) ficaram `null` e estão listados acima.
- `priestName`: o "Atualmente…" da página de detalhe prevalece sobre a lista do clero quando divergem (a lista tem
  entradas de 2016 e as páginas registram transferências até 2022). "Responsável"/"administração paroquial" →
  sufixo "(responsável)" ou "(administrador paroquial)".
- `foundedYear`: data do decreto de criação citada no histórico; Uraí = 1943 (posse do 1º pároco); São José Operário
  ficou `null` (o texto só dá o início da construção, 1975).
- Comunidades: só as nomeadas na página oficial. Nova América (5 capelas), São Vicente Pallotti (4), Panema (4 —
  lista de 1998, `media`), Rainha dos Apóstolos (3), Sertaneja (2), Nova Santa Bárbara (3, `media`), Assaí (17 + Pau
  D'Alho, `media` — lista fala em "dezembro de 2008"). Localidade em `neighborhood`; nomes repetidos receberam a
  localidade entre parênteses.
- Horários: transcritos do texto livre; intervalos expandidos; "19h30min" → "19:30". Eventos mensais (última quinta
  do mês em São Miguel; 1ª sexta em Rainha dos Apóstolos) ficaram como `baixa` com a recorrência em `notes`, para não
  entrarem como semanais. As "celebrações" de quarta-feira nas capelas de Rainha dos Apóstolos (sem Missa) não foram
  registradas. "Quarta 19h30 (Novena N. S. do Perpétuo Socorro)" em São Miguel foi mantida como MASS com a nota,
  porque a fonte a lista sob "Horário de Missas".
- Chaves extras ao esquema do README: `deanery` (= "Setor N") e `notes` em algumas comunidades; o importador as ignora.

## Registros que precisam de validação humana

1. **Párocos divergentes entre a lista do clero (2016) e as páginas das paróquias** — ficou o da página:
   São Francisco de Assis (página: Pe. Sebastião Rodrigues da Silva, desde 2017; clero 2016: Pe. Rafael Direito
   Teixeira); Nova América da Colina (página: Pe. Rafael Direito Teixeira; clero: Pe. Sebastião Rodrigues da Silva);
   Medianeira/Santa Mariana (página: Pe. Augustinho Lázaro Espilgolone; clero: Pe. Alcides Andreatta, que hoje aparece em
   Curiúva); S. S. da Amoreira (página: Pe. Antônio Luiz Martins; clero: Espilgolone); Santo Antônio do Paraíso
   (página: Pe. Julio Cezar Rodrigues, administrador; clero 2021: pároco de Sapopema); Sapopema (página: Pe. Mauro
   Wegrzyn; clero 2021: pároco de Sertaneja); Sertaneja (página: Pe. Orisvaldo José Calandro desde 13/02/2022; clero
   2021: Wegrzyn); Leópolis (página: Pe. João Paulo Domingues desde 2018; clero 2016: Pe. Wellerson Roberto Dias, hoje
   em Congonhinhas); Rancho Alegre (página: Pe. Sizenando; clero: idem); Figueira (página: Pe. Diego Dias; clero 2016:
   Pe. José Mauro).
2. **Pe. Eneas Meado da Cruz** aparece como pároco de Uraí e como "responsável" por Santa Cecília do Pavão — ambos
   registrados como a fonte diz.
3. **Catedral Cristo Rei — horários**: o site diocesano dá seg/qua/qui 7h e 19h, ter/sex 19h, sáb 19h30, dom 7h30/10h/
   17h30/19h30; o resumo de busca do agregador missahora.com.br (não acessível) dá "terça a sábado 7h e 19h; domingo
   7h30, 9h30, 17h e 19h; fechada às segundas". Registrada a versão oficial (`media`); conferir com a paróquia.
4. **Sapopema** — e-mail com acento na fonte ("paróquia-santa-ana@hotmail.com"; o blog traz "paróquia1-santa-ana@
   outlook.com") → `email: null`. O telefone do agregador é (43) 3848-1243 (na fonte oficial, 3548-1243).
5. **Sertaneja** — o e-mail listado (pefrancelino@brturbo.com.br) é pessoal do pároco anterior.
6. **Nova Santa Bárbara** — "Capela Nossa Senhora Aparecida (700 alqueires e Pocinho)": uma ou duas capelas? As
   comunidades Santa Cruz e São Benedito ficam no município de São Jerônimo da Serra (atendidas pela paróquia em 1996).
7. **Assaí** — lista de capelas de ~2008 (menciona "em dezembro de 2008 será Santuário Santa Paula Elisabete Cerioli").
8. **Panema** — as 4 comunidades vêm da posse de 1998; confirmar se ainda existem.
9. **São Miguel Arcanjo** — "Domingo 18h (Capela)" não registrado (capela sem nome); adoração só na última quinta do mês.
10. **Uraí** — horários (qua 19h30; sáb 19h30; dom 8h, 9h30, 19h30) vêm do resumo de busca do Instagram oficial;
    Nova Fátima (dom 7h30, 9h30, 19h30) vem de agregador de 2014 (`baixa`).
11. **Bispo** — o menu do site ainda traz "Artigos de Dom Manoel João Francisco" (bispo anterior); registrado Dom Marcos
    José dos Santos (GCatholic/Wikipédia/site de Londrina).
12. **Missão** — GCatholic conta "25 paróquias e 1 missão"; a missão não foi localizada.
13. **Sites paroquiais mortos** citados pela fonte oficial: www.catedralcristorei.com.br, www.paroquiasbj.org.br,
    www.paroquiasaojoseassai.com.br, www.pastoralfamiliarcong.com.br (não testado).

## Dúvidas abertas

- 19 paróquias sem horário: só as redes sociais (Facebook/Instagram, inacessíveis ao agente) parecem publicá-los —
  candidatas ao enxame de validação com acesso a essas páginas: Assaí (facebook.com/paroquiasaojosedeassai), Curiúva
  (facebook.com/ParoquiadeCuriuva), Leópolis (facebook.com/paroquiansaleopolis; transmissão dominical 8h), Rancho
  Alegre (instagram.com/paroquiasaopedro.ra.oficial), Sapopema (facebook.com/paroquiasantaanasapopema), Figueira
  (facebook.com/paroquiasbj), Congonhinhas (instagram.com/paroquia_nossa_sra_aparecidac), Panema
  (facebook.com/paroquiadopanema), Nova América (facebook.com/pascomimaculadaconceicaonac).
- Jataizinho: o agregador dá outro endereço (Praça Fr. Timóteo, 456) para o mesmo número — a fonte oficial diz
  Avenida Getúlio Vargas, 456.
