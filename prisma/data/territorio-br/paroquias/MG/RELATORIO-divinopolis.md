# Relatório — Diocese de Divinópolis (MG)

Pesquisa em 2026-09-10. Arquivo: `divinopolis.json`.

## Fontes principais

| Fonte | Uso |
|---|---|
| https://diocesedivinopolis.org.br/foranias-e-paroquias/ | Lista canônica de templos (57), com endereço e telefone |
| https://diocesedivinopolis.org.br/missas/ | Quadro completo de horários e comunidades/capelas por templo |
| https://diocesedivinopolis.org.br/templo/&lt;slug&gt;/ (57 páginas) | Pároco/administrador, endereço, telefone |
| https://diocesedivinopolis.org.br/fale-conosco/ | Endereço, CEP e telefone da Cúria |
| https://www.catholic-hierarchy.org/diocese/ddivi.html | Nº esperado de paróquias (54, dados de 2023) e bispo |
| https://itapecerica.mg.gov.br/ (prefeitura) | Confirmação de que Marilândia é distrito de Itapecerica |

O site é WordPress com *custom post type* `templo` (não exposto na REST API); a extração foi feita
do HTML das páginas de listagem e de detalhe.

## Cobertura

- **57 registros** no JSON: **54 paróquias** + **3 não paroquiais** (`status: "nao-paroquial"`).
- 54 é exatamente o número informado pelo catholic-hierarchy.org (2023) — cobertura **100%**.
- **501 comunidades/capelas** e **959 horários fixos**.
  - 500 horários semanais → `confidence: "alta"`.
  - 459 horários de **recorrência mensal** ("1º e 3º domingo", "2ª quarta", "todo dia 28") →
    `confidence: "baixa"`, com a regra literal copiada em `notes` (não cabem em `MassSchedule`).
  - 111 **Celebrações da Palavra** foram descartadas (não são missa), conforme a regra do prompt.
- 26 municípios/distritos cobertos: Araújos, Camacho, Carmo do Cajuru, Cláudio, Conceição do Pará,
  Divinópolis, Florestal, Igarapé, Igaratinga, Itapecerica, Itatiaiuçu, Itaúna, Juatuba,
  Leandro Ferreira, Mateus Leme, Nova Serrana, Onça do Pitangui, Pará de Minas, Pedra do Indaiá,
  Perdigão, Pitangui, São Gonçalo do Pará, São Joaquim de Bicas, São José da Varginha,
  São Sebastião do Oeste (+ distritos de Azurita, Marilândia e Santo Antônio dos Campos).

## Registros não paroquiais

| Registro | Motivo |
|---|---|
| Santuário Diocesano de Nossa Senhora da Conceição (Conceição do Pará) | Santuário sem território; o território é da Paróquia Sagrado Coração de Jesus. Sem pároco no site. Tem missas publicadas (gravadas). |
| Santuário Diocesano de São Frei Galvão (Divinópolis, Jardim das Oliveiras) | Santuário sem pároco listado; não figura como paróquia. Missas publicadas (gravadas). |
| Seminário Diocesano São José | Casa de formação. Sem horários publicados. |

O **Santuário Senhor Bom Jesus** (Divinópolis, bairro Niterói) **é** paróquia (tem pároco e
11 comunidades) e foi gravado como paróquia, mantendo o prefixo "Santuário" do nome oficial.

## Decisões de nome e slug

- Nomes na lista oficial vêm como `<Padroeiro> – <Cidade>`; a cidade foi removida do `name`
  (prefixo padronizado "Paróquia …") e gravada em `city`.
- Três paróquias ficam em **distritos**. Para evitar colisão de slug, o slug usa o distrito:
  - `sao-sebastiao-azurita` — city `Mateus Leme`, neighborhood "Distrito de Azurita";
  - `nossa-senhora-do-desterro-marilandia` — city `Itapecerica`, neighborhood "Distrito de Marilândia";
  - `santo-antonio-santo-antonio-dos-campos` — city `Divinópolis` (evita colisão com
    `santo-antonio-divinopolis`, que é outra paróquia), neighborhood "Distrito de Santo Antônio
    dos Campos (Ermida)".

## Pontos para o enxame de validação humana

1. **Erros de cidade no endereço publicado pela própria diocese** (mantidos em `address` como
   estão na fonte; `city` foi corrigido pelo filtro de cidade do site):
   - *Paróquia São Francisco* (Pará de Minas): endereço termina "…Bairro Santo Antônio,
     **Divinópolis**-MG" — deveria ser Pará de Minas.
   - *Paróquia Santo Antônio* (Igaratinga): endereço termina "…Centro, **Igarapé**-MG" —
     deveria ser Igaratinga.
2. **CEP truncado na fonte**: Santuário Diocesano de São Frei Galvão — "C.E.P.: 35500-00"
   (7 dígitos). Gravado `zipCode: null`.
3. **Telefones em formato irregular** (copiados literalmente): "(37) 3236-9430 - 3236-9010",
   "(37) 3271-4005 ou (37)3271-4412", "(31)-3534-0647", "(031) 99735 - 1353",
   "(37) 3234-1273 / (37) 9 9832-5292", "(37) 3215-5701 - 3215- 5756",
   "(37) 3226-1236 ou 3226-2991".
4. **Sem telefone na fonte**: Paróquia Sagrado Coração de Jesus (Conceição do Pará),
   Paróquia Nossa Senhora das Dores (Divinópolis, sem endereço também) e Seminário Diocesano São José.
5. **Sem pároco listado**: os 3 registros não paroquiais.
6. **Dois blocos de horário em formato atípico foram transcritos à mão** (o parser automático não
   dava conta): Paróquia Nossa Senhora Aparecida (Cláudio) e Paróquia Sagrada Família (Divinópolis).
   Conferir contra a página /missas/.
7. **Linhas mistas missa/adoração/terço**: em algumas paróquias a fonte junta na mesma linha
   ("Domingo: 7h (Terço dos Homens), 8h e 10h (Missa dos Romeiros) e 19h" — São Sebastião,
   Leandro Ferreira; "Quinta-feira: 12h as 19h Adoração" — Santo Antônio, Santo Antônio dos Campos).
   O horário foi gravado como MASS/ADORATION conforme a leitura mais provável, mas pode haver
   imprecisão pontual de tipo.
8. **Comunidades sem horário fixo declarado**: Paróquia Nossa Senhora do Líbano (Carmo do Cajuru)
   diz "as demais capelas não têm horários fixos"; Paróquia Santo Antônio (Pará de Minas) diz que
   as demais comunidades são agendadas; Paróquia Nossa Senhora do Pilar (Pitangui) lista 10 capelas
   rurais só com nome. Essas capelas **não** foram gravadas como comunidades quando a fonte deu
   apenas o nome dentro de um bloco de texto corrido.
9. **`foundedYear` está `null` em todas** — o site não publica ano de criação nas fichas.
   Só se conhece Nossa Senhora do Desterro (Marilândia), paróquia desde 16/09/1870 segundo a
   prefeitura de Itapecerica; não foi gravado por não vir de fonte diocesana.
10. **E-mails**: nenhuma ficha de paróquia publica e-mail — todos `null`.
