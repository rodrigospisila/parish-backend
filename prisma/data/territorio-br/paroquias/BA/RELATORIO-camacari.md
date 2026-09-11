# Diocese de Camaçari — relatório de pesquisa

- **Slug**: `camacari` · **UF**: BA · **Sede**: Camaçari
- **Pesquisa**: 11/09/2026
- **Território**: Camaçari, Candeias, Dias d'Ávila, Madre de Deus, São Francisco do Conde,
  São Sebastião do Passé, Simões Filho e Terra Nova.

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias e quase-paróquias | **26** (todas `alta`) |
| Capelania listada pela diocese, marcada `nao-paroquial` | 1 (Capelania Santa Maria) |
| Comunidades/capelas | **233** |
| Horários fixos | 146 (132 MASS · 10 CONFESSION · 4 ADORATION) — 101 `alta`, 7 `media`, 38 `baixa` |
| Paróquias com horário carregável | 15 de 26 |

**Cobertura: 26 de 27 declaradas.** A diocese diz ter 27 paróquias; a página oficial `/paroquias`
lista 28 itens, dos quais um ("Paróquias do Litoral de Camaçari") é apenas um agrupamento de horários
e outro é a Capelania Santa Maria. Ou a diocese conta a capelania no total, ou falta uma paróquia
na página. **Ponto a validar.**

## Fontes — a melhor das quatro circunscrições desta rodada

1. **`https://www.diocesedecamacari.com.br/paroquias`** e as 28 fichas em `/paroquia/<slug>` —
   trazem **ano de criação, pároco, vigários, diáconos, dia do padroeiro, endereço, CEP, telefone,
   e-mail e a lista completa de comunidades**. Daí saíram as 250 comunidades (confiança `alta`).
2. **`https://www.diocesedecamacari.com.br/horarios-de-missa`** — quadro **oficial** de horários,
   por paróquia e por comunidade, de 16 paróquias. Site ativo (notícias de setembro/2026), então os
   horários entram como `alta`. **129 dos 146 horários vêm daqui.**
3. `horariodemissa.com.br` — só 3 igrejas na diocese inteira e todas com ficha de 2013–2018;
   usadas apenas onde não havia horário oficial (São Gonçalo de São Francisco do Conde e São Roque
   de Terra Nova), com confiança `baixa`.

## Como os horários oficiais foram lidos

O quadro é texto livre, do tipo
`Missa / Domingo Matriz - 8h e 18h | Jauá - 7h | 2º domingo Cordoaria - 10h`.
O parser divide a linha por `|`, encontra cada hora, e atribui o local que aparece imediatamente
antes (ou logo depois, quando o local vem à frente). Depois casa esse local com a lista oficial de
comunidades da paróquia.

Escala de confiança aplicada:
- `alta` — segmento com uma hora e um local só;
- `media` — **7 casos** em que o segmento tinha mais de uma hora e mais de um local, e a associação
  hora↔local foi inferida (campo `notes` vazio, mas a fonte é a mesma linha);
- `baixa` — **38 casos** de **recorrência mensal ou quinzenal** ("1º e 3º sábado", "2ª Sexta",
  "1ª e 3ª Semana", "Quinzenal"), que não cabem em `MassSchedule`. O texto original foi preservado em
  `notes`. É o mesmo bloqueio de modelagem já registrado no README para Jequitinhonha e oeste paulista.

**32 horários** trazem em `notes` a frase *"local publicado: … (comunidade não consta da lista
oficial)"*: o quadro de horários cita um lugar que **não aparece** na lista de comunidades da ficha da
paróquia (ex.: "Alphaville", "Jauá", "Interlagos", "Condomínio da Espera – Itacimirim"). Nesses casos o
horário foi anexado à **matriz** e o nome publicado ficou registrado. **Conferir com a paróquia** —
provavelmente são comunidades reais que faltam na ficha.

## Pontos que precisam de validação humana

1. **A paróquia que falta para fechar 27.** Conferir a página `/paroquias` contra o Anuário.
2. **9 paróquias sem nenhum horário**: Nossa Senhora da Conceição e Nossa Senhora da Luz e
   São João Batista e São Miguel de Cotegipe (Simões Filho), Nossa Senhora Luz do Monte
   (São Francisco do Conde), Sagrado Coração de Jesus (Nazaré do Jacuípe) e Santa Marcelina e
   São Sebastião (São Sebastião do Passé), Sagrada Família (Madre de Deus). Elas têm ficha, mas não
   entram no quadro oficial de horários.
3. **CEP inválido publicado pela diocese**: Nossa Senhora da Boa Viagem (Dias d'Ávila) está com
   "428500-000" (7 dígitos). Gravei `zipCode: null` e mantive o endereço.
4. **5 paróquias sem endereço** na ficha oficial: Nossa Senhora de Fátima (Barra do Pojuca),
   Nossa Senhora Luz do Monte, Nossa Senhora de Nazaré da Passagem, Sagrado Coração de Jesus
   (Nazaré do Jacuípe) e Santa Marcelina.
5. **Só 5 e-mails** entre 26 paróquias, e dois deles são de obra social/congregação residente e não
   da secretaria paroquial (Quase-paróquia São José Operário `cemisericordia@hotmail.com`,
   São Francisco de Assis de Candeias `cambatente.na.fe.@hotmail.com`). **Conferir.**
6. **Telefones com 8 dígitos** copiados da fonte (celulares sem o nono dígito) em várias fichas.
7. **Nomes das comunidades** vieram de um parágrafo corrido separado por `;` — alguns trazem duas
   dedicações na mesma entrada (ex.: "Cristo Ressuscitado e Nossa Senhora de Fátima (Vida Nova)",
   "Santa Rita de Cássia e Bem-Aventurada Dulce dos Pobres"). Ficaram como um registro só, que é o
   que a diocese publica.
8. **"Paróquias do Litoral de Camaçari"** aparece na página como se fosse uma paróquia; é um
   agrupamento (Divino Espírito Santo, São Francisco de Arembepe, São Bento e N. Sra. de Fátima) e foi
   descartado. Seus horários de domingo **já constam** nas fichas individuais dessas paróquias — mas
   há pequenas divergências de hora entre o bloco agrupado e os blocos individuais que valeria
   conferir (ex.: Arembepe 09h na Matriz em um, 09h "Igreja da praia" no outro).
9. **Nomes normalizados por mim** para caber na regra de prefixo do dataset: o site escreve "Sant'Ana
   (Camaçari)", "São Bento / Monte Gordo (Camaçari)" etc.; gravei "Paróquia Sant'Ana", "Paróquia
   São Bento", com a cidade em `city` e o distrito nos dados de comunidade. A Catedral virou
   "Catedral São Thomaz de Cantuária" e o Santuário de Candeias, "Santuário Nossa Senhora das
   Candeias".
