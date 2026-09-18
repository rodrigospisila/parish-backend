# Diocese de Grajaú (MA) — relatório de pesquisa

Data da coleta: **2026-09-18**. Agente de pesquisa (rodada MA — fechamento do Maranhão).

## Resumo

| Item | Valor |
|---|---|
| Unidades no JSON | **24** (23 paróquias + 1 área pastoral) |
| Confiança das paróquias | 24 `alta` |
| Comunidades | 0 (o site não publicava) |
| Horários fixos | 16, todos `baixa` |
| Cobertura | 24 encontradas × 21 esperadas (catholic-hierarchy 2023) |

## O achado: o site existia e caiu — foi recuperado do Arquivo da Internet

O `dioceses.json` traz `website: null` para Grajaú, e um buscador ainda oferece
`diocesegrajau.org.br` com páginas de paróquia. **Conferi eu mesmo**: o domínio devolve
NXDOMAIN — não é bloqueio de rede, é ausência de registro (`dns.google/resolve?name=...` →
`"Status":3`, com autoridade `org.br` do `registro.br`). O site estava no ar até pelo menos
**30/04/2026** (última captura da paginação no Arquivo da Internet).

Recuperei as **24 fichas de paróquia** (`/paroquias/<slug>/`, capturas de **março de 2025**), que
trazem, por paróquia: **padroeiro (com a data da festa em alguns casos), endereço, CEP, cidade,
telefone, e-mail e pároco**, além de vigários e diáconos. Os e-mails vinham ofuscados pelo
Cloudflare (`data-cfemail`) e foram decodificados.

Detalhe de extração que vale para a próxima vez: o **rodapé** das páginas repete o telefone
`(99) 99169-0563` e o e-mail `curia@diocesegrajau.org.br` da cúria. Uma varredura ingênua
sobrescreve o contato da paróquia pelo da cúria — aconteceu na primeira passada e foi corrigido
pegando **a primeira ocorrência** de cada campo, não a última. Três fichas não publicam e-mail
próprio (N. Sra. Aparecida e São Francisco Xavier, Santa Clara de Assis e São José da Providência)
e ficaram com `email: null`.

## Conferência cruzada perfeita com a Receita

A busca do Mapa das OSC/IPEA por razão social "DIOCESE DE GRAJAU" devolve **30 inscrições do CNPJ
06.132.674**, todas ATIVAS: 1 cúria, **24 paróquias/áreas pastorais**, o Colégio Santo Antônio, a
Escola Kolping, a Casa de Formação (em São Luís) e mais 2 registros de apoio. As 24 paróquias da
Receita batem **1:1 com as 24 fichas do site**, incluindo bairro e logradouro. É a melhor
corroboração desta rodada.

Ela também explica a defasagem das outras fontes: o gcatholic lista 17 igrejas e o
catholic-hierarchy conta 21 paróquias em 2023, porque **sete paróquias foram criadas entre 2019 e
2021**:

| Paróquia | Cidade | Abertura na Receita |
|---|---|---|
| São José e São Miguel Arcanjo | Barra do Corda | 01/04/2019 |
| Nossa Senhora da Conceição (Povoado Alto Brasil) | Grajaú | 01/04/2019 |
| Nossa Senhora de Fátima (Expoagra) | Grajaú | 01/04/2019 |
| São José Operário | São José dos Basílios | 01/04/2019 |
| São Paulo Apóstolo | Fernando Falcão | 23/06/2021 |
| Santa Clara de Assis (Extrema) | Grajaú | 05/07/2021 |
| São Pio de Pietrelcina | Itaipava do Grajaú | 07/07/2021 |
| Santa Luzia (Vila Alvorada) | Barra do Corda | 16/07/2021 |
| Área Pastoral Santa Filomena e Cristo Rei | Santa Filomena do Maranhão | 28/09/2021 |
| N. Sra. Aparecida e São Francisco Xavier (Alto do Pacote) | Dom Pedro | 06/10/2021 |

## Horários (todos `baixa`)

O site da diocese **não publicava horário de missa**. As 16 entradas vêm só do Lírio Católico,
para 3 paróquias: Santa Cruz (Barra do Corda), Santa Clara de Assis (Grajaú) e São Sebastião
(Presidente Dutra). A ficha da Catedral no Lírio existe mas **está sem nenhum horário**.

## Para o enxame de validação humana

1. **Horários**: 21 das 24 paróquias entram sem nenhum horário.
2. **Comunidades**: nenhuma. O site não publicava lista de comunidades.
3. **Párocos**: 20 das 24 fichas trazem pároco (março de 2025). Quatro estão em branco na fonte:
   São João Batista (Formosa da Serra Negra), São Pedro e São Paulo (Joselândia), São Francisco e
   São José Operário (Presidente Dutra) e N. Sra. da Conceição (Sítio Novo). Como a captura é de
   **março de 2025** e o bispo tomou posse em **17/02/2025** (Dom Giuseppe Luigi Spiga), é provável
   que tenha havido transferências desde então — **os párocos precisam de reconferência**.
4. **CEP de Santa Gianna Beretta Molla** (Trezidela, Barra do Corda): a ficha não publica CEP
   (só "Barra do Corda-MA"); ficou `null`. O da cidade é 65950-000.
5. **Telefone de São Pedro e São Paulo (Joselândia)**: a ficha publica `(83) 98192-1909` —
   **DDD da Paraíba**. Gravado como está; conferir.
6. **Endereço de Santa Cruz (Barra do Corda)**: a ficha traz "01Rua Gerôncio Falcão, 132 Centro –
   Caixa Postal 26" (o "01" grudado é lixo do CMS); a Receita traz "Rua Gerôncio Falcão, 132" e o
   Lírio, "Rua Gerôncio Falcão, 123".
7. **O site**: se a diocese reativar o domínio, refazer a coleta — a fonte era boa.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

| Campo | Valor atual | Observação |
|---|---|---|
| `website` | `null` | **está correto**: `diocesegrajau.org.br` saiu do ar (NXDOMAIN em 18/09/2026). Vale registrar a nota de que o site existiu até 2026 e está no Arquivo da Internet, para o dia em que voltar |
| `email` | `null` | o site publicava `curia@diocesegrajau.org.br`; como o domínio caiu, o e-mail provavelmente morreu junto. Gravei como `emailHistoric` no JSON da diocese, **não** como `email` |
| `phone` | `(99) 3532-8025` | o rodapé do site publicava `(99) 99169-0563` e a página de contato, `(99) 3532-6144` (este último a Receita atribui ao Colégio Santo Antônio, do mesmo CNPJ). Três números diferentes — conferir qual atende hoje |
| `address` | "Curia Diocesana, Praca Dom Roberto Colombo 60" | confere com a ficha da Catedral e com a Receita (que registra a cúria na mesma praça, bairro **Cidade Alta**) |
| `bishopName` | Dom Giuseppe Luigi Spiga | confere (posse em 17/02/2025; o próprio site noticiou "monsenhor Luigi Spiga, novo bispo da Diocese de Grajaú" em 06/03/2025) |

`foundedYear` 1922 é a ereção da **Prelazia de São José do Grajaú** (10/02/1922) — está certo pela
convenção do dataset. **Não alterar.**
