# Arquidiocese de Vitória da Conquista — relatório de pesquisa

- **Slug**: `vitoria-da-conquista` · **UF**: BA · **Sede**: Vitória da Conquista
- **Pesquisa**: 11/09/2026
- **Arcebispo**: Dom Vítor Agnaldo de Menezes · **Site**: https://arquiconquista.org.br

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **41** (todas `alta`) |
| Municípios cobertos | 20 (18 paróquias na sede) |
| Comunidades/capelas | **940** (todas `alta`) |
| Horários fixos | **224** (216 MASS · 8 ADORATION) — 185 `alta`, 8 `media`, 31 `baixa` |
| Paróquias com horário publicado | 39 de 41 |

**Cobertura: 41 de 41 publicadas pela arquidiocese.** A API do site devolve `X-WP-Total: 41` para
o tipo `paroquia`, distribuídas nos 4 vicariatos exatamente como a taxonomia declara: São Lucas 17,
São João 9, São Marcos 8, São Mateus 7. O `catholic-hierarchy.org` registra **34** paróquias em 2023
— a diferença são paróquias criadas depois, todas com ficha e data de criação publicadas
(Santa Dulce dos Pobres 2020, Sagrado Coração e Bom Jesus 2021, N. Sra. da Conceição e São Francisco
de Assis 2023, Santa Rita de Cássia/Poções e N. Sra. Aparecida/Itapetinga 2025, e quatro em 2026:
N. Sra. da Piedade, N. Sra. do Rosário, N. Sra. Mãe da Divina Providência e São Francisco de Assis).
Nenhuma fonte apontou paróquia fora dessa lista.

## Fontes

1. **API WordPress da arquidiocese** — `https://arquiconquista.org.br/wp-json/wp/v2/paroquia?per_page=100`
   (tipo de conteúdo próprio `paroquia`) e `.../wp-json/wp/v2/local_paroquia` (vicariatos). Deu a
   **lista canônica** de 41 paróquias com link e vicariato de uma vez. O site devolve 403 ao leitor
   automático; resolvido com `curl` mandando User-Agent de Chrome (truque do README).
2. **As 41 fichas em `/paroquia/<slug>/`** — cada uma publica **ano de criação, telefone, e-mail
   (ofuscado pelo Cloudflare, decodificado via `data-cfemail`), endereço com CEP, pároco e a lista
   completa de comunidades paroquiais** organizada por setor/zona. Daí saíram as 940 comunidades.
3. **`https://arquiconquista.org.br/horarios-de-missas/`** — quadro **oficial** de horários, uma
   tabela `dce-acf-repeater-table` por paróquia com as colunas *Tipo / Dia da Semana / Horário /
   Observações*. 190 linhas → 224 horários. Site ativo (notícias de setembro/2026), então entram
   como `alta`.
4. `catholic-hierarchy.org/diocese/dvidc.html` — só para o número esperado de paróquias.

Não foi preciso recorrer a agregador nenhum: **todos os 224 horários são oficiais**. (O aviso do
README sobre a base pré-pandemia do `horariodemissa.com.br` na Bahia não afetou esta circunscrição.)

## Como o quadro de horários foi lido

Cada paróquia aparece **duas vezes** na página: um bloco visível e um duplicado marcado
`elementor-hidden-desktop/tablet/mobile` (template). Só o primeiro bloco de cada `<article>` foi lido.

- **Horário com várias horas** ("07h30, 09h00 e 18h00") vira uma entrada por hora.
- **`community`**: a coluna *Observações* dá o local. "Igreja Matriz"/"Matriz" → matriz; nome de
  comunidade → casado contra a lista oficial da ficha da paróquia (normalizando "Com.", "Capela",
  "Igreja de", "N. Sra." → "Nossa Senhora", "Terezinha" → "Teresinha", e o sufixo entre parênteses
  do nome da comunidade).
- **`baixa` = 31 horários de recorrência mensal/quinzenal** ("1ª Sexta-feira", "2º Sábado",
  "1º e 3ª Quinta do Mês", "Dia 13 de cada mês", "Última Terça-feira", "1º e Última Semana"), que não
  cabem em `MassSchedule`. O texto original ficou em `notes`. Mesmo bloqueio de modelagem já
  registrado no README.
- **`media` = 8 ADORATION**: 7 vieram de observação do tipo "18h30 Adoração ao Santíssimo Sacramento"
  anexada à linha da missa (hora explícita, dia herdado da missa); 1 é a linha de quinta-feira 14h30
  de São José/Itapetinga, publicada com Tipo "Missa" mas cuja observação diz apenas "Adoração ao
  Santíssimo Sacramento (Igreja Matriz)" — convertida para ADORATION.
- **Descartada 1 linha**: "Celebração da Palavra – 2º domingo do mês – 15h00" (São João Batista/
  Ribeirão do Largo) — não é missa e não cabe no enum `type`.

## Pontos que precisam de validação humana

1. **Paróquia Nossa Senhora Aparecida (Jurema, VCA) × Paróquia Nossa Senhora Mãe da Divina
   Providência.** A segunda foi criada em **24/01/2026**, desmembrada da primeira, e está no quadro
   oficial **sem nenhum horário**. Mas a grade da Aparecida continua publicando 14 missas, entre elas
   5 na "Comunidade (Mãe da) Divina Providência", 2 no "Vocacionário" e 4 no "Lar da Misericórdia".
   **Forte suspeita de grade desatualizada** — parte dessas missas provavelmente já é da paróquia
   nova. Gravei como a arquidiocese publica hoje, mas é o primeiro item a conferir.
   (No casamento de comunidade usei um apelido explícito: "Mãe da Divina Providência" →
   "Comunidade Nossa Senhora da Divina Providência", que é o nome na ficha da paróquia.)
2. **Paróquia São Francisco de Assis (Pradoso, VCA)**, criada em 30/01/2026, também está no quadro
   oficial **sem nenhuma linha de horário** — só ela e a Mãe da Divina Providência.
3. **13 locais citados no quadro de horários que não constam da lista de comunidades da ficha**.
   Foram anexados à **matriz** com a frase *"local publicado: … (não consta da lista oficial de
   comunidades da paróquia)"* em `notes`:
   - N. Sra. Aparecida (VCA): "Vocacionário", "Lar da Misericórdia";
   - Senhor do Bonfim e Santo Antônio (Barra do Choça): "Hospital Municipal",
     "Casa São Camilo de Léllis", "Casa dos Enfermos";
   - Santo Antônio (Itarantim): "Centro Pastoral Dom Celso José";
   - N. Sra. de Fátima e Santo Antônio de Lisboa (VCA): "Lar Santa Catarina de Sena (Orfanato)";
   - N. Sra. das Graças (Recreio, VCA): "UNEX" (missa dominical de 17h no campus);
   - São José (Itapetinga): "Capela Menino Jesus de Praga – Igrejinha de Pedra";
   - Divino Espírito Santo (Poções): "Igrejinha do Divino" (3 missas de semana);
   - **N. Sra. das Graças (Itapetinga): "Comunidade N. Sra. Aparecida"** — esta é a mais suspeita,
     porque é claramente uma comunidade e a ficha da paróquia lista só 5 comunidades, nenhuma com
     esse nome. Provável comunidade faltando na ficha.
   Vários dos outros são casas de saúde/obras sociais e capelas — lugar de missa de verdade, mas
   não comunidade paroquial.
4. **Quase-paróquia?** O e-mail da "Paróquia Nossa Senhora da Conceição e São Francisco de Assis"
   (José Gonçalves, VCA) é `qpdaconceicaoesaofranciscoba@gmail.com` — o prefixo `qp` sugere
   **quase-paróquia**. O site a publica como "Paróquia" e foi assim que gravei. Conferir.
5. **Listas de comunidades com rótulos de seção misturados.** Algumas fichas põem no mesmo `<ul>`
   linhas que são cabeçalho ("URBANAS", "RURAIS", "COMUNIDADES URBANAS", "Setor …", "Região …",
   "Rede …", "Zonal …"); todas foram filtradas. **Exceção conhecida**: em Senhor do Bonfim e Santa
   Rita (Planalto) a ficha traz "Setor Santa Rita", "Setor N. Sra. de Fátima", "Setor São José",
   "Setor N. Sra. das Vitórias" dentro da lista — são setores, foram descartados, mas a comunidade
   "N. Sra. das Vitórias" existe separadamente e recebe a missa de domingo 09h. Vale conferir se
   algum "Setor X" da ficha é na verdade comunidade.
6. **Comunidades homônimas dentro da mesma paróquia.** Várias fichas repetem o mesmo nome em setores
   diferentes (Caetanos tem 4 "Comunidade Nossa Senhora Aparecida"; Anagé, 7; Bom Jesus da Serra, 3
   "Santa Luzia"). Foram gravadas como a fonte publica, sem deduplicação — **o importador vai
   precisar tratar isso**, ou o app mostra capelas repetidas.
7. **Nomes normalizados por mim** para a regra de prefixo do dataset: a arquidiocese escreve
   "Paróquia São José – Inhobim (VCA)", "Paróquia Nossa Senhora da Piedade (Quaraçu)", "Paróquia
   S. Coração De Jesus e Santa Maria Madalena – Maiquinique" etc.; gravei "Paróquia São José",
   "Paróquia Nossa Senhora da Piedade", "Paróquia Sagrado Coração de Jesus e Santa Maria Madalena",
   com a cidade em `city` e o distrito/bairro em `neighborhood`. A catedral virou
   "Catedral Metropolitana Nossa Senhora das Vitórias" (o site escreve "Catedral Metropolitana
   Paróquia Nossa Senhora das Vitórias").
8. **Sedes por distrito.** Três paróquias têm sede em distrito e não na cidade-nome: São José
   (distrito de Inhobim, VCA), São Francisco de Assis (Pradoso, VCA), N. Sra. da Conceição e São
   Francisco de Assis (José Gonçalves, VCA). E **N. Sra. da Piedade fica em Quaraçu, distrito de
   Cândido Sales** — gravei `city: "Cândido Sales"`, mas a ficha só diz "Quaraçu (Cândido Sales)".
9. **Campos ausentes na fonte**: 1 paróquia sem endereço e CEP (São João Batista, Ribeirão do Largo),
   2 sem telefone e 5 sem e-mail. Vários telefones vêm com 8 dígitos ou sem espaço
   ("(77)999057743", "77 98129-3773") — copiados como publicados.
10. **Matriz inferida.** Só 4 fichas nomeiam a matriz ("Matriz", "Matriz São José"). Nas outras 37
    criei a comunidade `Matriz <padroeiro>` com o endereço da paróquia e `isMatriz: true` — é o
    endereço da igreja publicado pela própria arquidiocese, mas o **nome** da matriz é convenção
    minha, não texto da fonte.
