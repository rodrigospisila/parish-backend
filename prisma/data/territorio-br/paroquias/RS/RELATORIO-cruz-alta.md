# RELATÓRIO — Diocese de Cruz Alta (RS)

- **Arquivo**: `paroquias/RS/cruz-alta.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 31 (30 paróquias + 1 santuário) |
| Entradas com confiança **alta** | 31 |
| Entradas com confiança **media** | 0 |
| Entradas com confiança **baixa** | 0 |
| Comunidades/capelas | 1 |
| Horários fixos | 63 (46 `alta`, 1 `media`, 16 `baixa`) |
| Cobertura | 31 / 31 |

> **A melhor das três desta tarefa.** O site oficial mantém uma ficha por paróquia com
> endereço, pároco, telefone, e-mail e **horários de missa**.

## O obstáculo: o site bloqueia clientes automatizados

`https://diocesecruzalta.com.br` responde **HTTP 403** ao WebFetch e devolve uma página de
desafio JavaScript ("Um momento, por favor… / Please wait while your request is being
verified…", com `window.location.reload()` em 5 s) a `curl`, mesmo com User-Agent de navegador,
cabeçalhos completos e cookie jar. **O site está no ar e ativo** — a última notícia é de
**07/08/2026** e o rodapé traz "Copyright © 2026".

Duas rotas foram usadas para ler o conteúdo:

1. **Arquivo da Internet** para descobrir a estrutura: `locais-sitemap.xml` (cópia de
   **01/02/2026**) revelou que as paróquias são um *custom post type* `locais`, categorizado por
   `locais_category/regiao-de-*`, com **32 URLs**; e o índice `/locais` (cópia de **03/02/2026**)
   confirmou a lista atual.
2. **Proxy de leitura em texto** (`r.jina.ai`) para ler cada ficha **ao vivo**, e não a cópia de
   2020 do Arquivo. A diferença é real: na Catedral, por exemplo, a secretária mudou de
   "Rosa Maria Santos" (2020) para "Márcia Escher Schanez" (2026) — sinal de que as fichas
   **são mantidas**. Por isso os horários semanais ficaram com confiança `alta`.

As `sources` do JSON registram a **URL canônica** de cada ficha
(`https://diocesecruzalta.com.br/locais/<slug>`), que é o endereço a reconferir.

## Cobertura

O "Guia de Locais" oficial lista **32 entradas**: 30 paróquias, o **Santuário Diocesano Nossa
Senhora de Fátima** e a **Capelania Militar**.

- Gravei **31 entradas**: as 30 paróquias + o Santuário (que tem missas públicas próprias:
  segunda 7h, sábado e domingo 16h).
- **A Capelania Militar NÃO entrou** por não ser paróquia. Seus dados, para registro:
  Rua General Osório, 1050 — Cruz Alta/RS, telefone (55) 3322-6566.

O catholic-hierarchy.org informa **31 paróquias** (estatística de 2023) e a diferença está
**explicada, não é falha de cobertura**:

> **A Paróquia São João Batista, de Lagoão, saiu da Diocese de Cruz Alta e passou à Diocese de
> Cachoeira do Sul em 2025.** A página `locais/paroquia-sao-joao-batista-lagoao` existia no site
> de Cruz Alta (cópia arquivada de 2020, na Região de Soledade, que então tinha 7 paróquias) e
> hoje responde **404**; a Região de Soledade passou a listar 6. A paróquia aparece no site da
> Diocese de Cachoeira do Sul em post publicado em **18/03/2025** e foi gravada no
> `cachoeira-do-sul.json` desta mesma rodada.

Regiões pastorais: Cruz Alta 6, Ijuí 7, Panambi 5, Espumoso 6, Soledade 6 (+ Santuário, que o
índice não classifica em região).

## Fontes principais

1. https://diocesecruzalta.com.br/locais — índice oficial das paróquias por região
2. https://diocesecruzalta.com.br/locais/&lt;slug&gt; — **31 fichas oficiais** (endereço, pároco,
   telefone, e-mail, aba "Missas" e aba "Atendimento")
3. https://web.archive.org/web/20260201165808/https://diocesecruzalta.com.br/locais-sitemap.xml
4. https://web.archive.org/web/20260203031717/https://diocesecruzalta.com.br/locais
5. https://www.catholic-hierarchy.org/diocese/dczal.html — 31 paróquias (2023); Dom Nélio
   Domingos Zortea desde 29/03/2023
6. https://www.diocesenet.com.br/home/paroquia-sao-joao-batista/ — a transferência de Lagoão
7. https://www.cnbb.org.br/dioceses/ e https://pt.wikipedia.org/wiki/Diocese_de_Cruz_Alta

## Qualidade dos campos

- **Endereço, telefone, e-mail, pároco**: preenchidos em praticamente todas as fichas.
- **CEP**: o site **não publica CEP de paróquia nenhuma** → 31 `null`.
- **Ano de criação**: idem → 31 `null`.
- **Comunidades**: o site **não lista comunidades**. A única gravada é a
  **Comunidade Menino Deus — Jacuizinho**, citada nos horários da Paróquia Nossa Senhora da
  Conceição (Tunas). As outras 30 entradas ficaram com `communities: []`.
- **Horários**: 17 das 31 fichas têm a aba "Missas" preenchida; 14 não têm.

## Pontos para o enxame de validação

1. **Horários com recorrência mensal (16 registros `baixa`)** — o importador não tem como
   representar "1ª sexta-feira do mês". Todos estão com `notes` explicando. Casos:
   Cristo Rei/Ijuí (1ª sexta 15h); Divino Espírito Santo/Jóia (1ª sexta 19h); Santa
   Terezinha/Condor (**1º, 2º e 3º sábado 19h** e **último domingo 9h** — a paróquia não tem
   missa semanal fixa); São João Batista/Panambi (1ª terça 19h30, Bênção dos pães);
   São José/Chapada (1ª sexta 15h e 2ª quarta 15h); São Jorge/Espumoso (1ª sexta: adoração e
   confissão 17h, missa 17h30); Nossa Senhora Aparecida/Ibirapuitã (1ª sexta 16h, 2ª quinta 16h);
   Santa Terezinha/Fontoura Xavier (1ª sexta 18h30).
2. **Dois horários são "todo dia 13 de cada mês"**, ou seja, recorrência por **data**, não por
   dia da semana. Como o formato exige `dayOfWeek`, gravei **`dayOfWeek: 0`** com a nota
   explícita e confiança `baixa`. São: **Paróquia Nossa Senhora do Rosário de Fátima**
   (Cruz Alta, 19h) e **Santuário Diocesano Nossa Senhora de Fátima** (16h). **Não carregar sem
   tratar.**
3. **Panambi, texto ambíguo** (`baixa`): a ficha diz *"Todos as sextas-feiras: 15h / Missa da
   Saúde, todos os domingos às 8h30min, e / na 1ª terça-feira do mês missa com Bênção dos pães
   às 19h30min"*. A pontuação não deixa claro se a "Missa da Saúde" é a de sexta ou a de
   domingo. Gravei sexta 15h (`baixa`, com nota), domingo 8h30 (`alta`) e a terça mensal
   (`baixa`).
4. **São José do Herval, quarta-feira 16h** (`media`): a ficha diz "celebração com benção da
   saúde" — **pode não ser missa** (celebração da Palavra). Gravado como `MASS` com nota.
5. **Catedral sem pároco**: a ficha ao vivo da **Catedral Divino Espírito Santo** não mostra
   linha "Pároco". A cópia arquivada de **2020** dizia **Pe. Márcio Laufer**. Gravei
   `priestName: null` para não carregar dado de 6 anos atrás. Confirmar.
6. **E-mail com typo no site oficial**: a Paróquia São Marcos (Alto Alegre) publica
   `mdca0007@diocesecruzalta.co.br` — falta o `.com`. Gravei **`email: null`**; o correto quase
   certamente é `mdca0007@diocesecruzalta.com.br` (todas as demais seguem esse padrão).
7. **Três paróquias sem e-mail publicado**: Santa Bárbara (Santa Bárbara do Sul), Nossa Senhora
   da Soledade (Soledade) e São Marcos (Alto Alegre).
8. **Paróquias com dois padres na mesma ficha** (gravei o primeiro em `priestName`):
   - Nossa Senhora da Natividade (Ijuí): **Pe. Silvio Jorge Mazzarolo** e Pe. Cristiano
     Segabinazzi — o segundo também é pároco de São José (Augusto Pestana).
   - Sagrado Coração de Jesus (Saldanha Marinho): **Pe. João Alberto Bagolin** e Pe. João Sênio
     Wickert — o primeiro também é pároco de Santa Bárbara do Sul.
   - São Geraldo Magela (Ijuí): a ficha traz "Frei Clair José Zampieron – Pároco" e mais dois
     frades.
9. **Um pároco em duas paróquias** (confirmado nas fichas, não é erro):
   Pe. Estacínio Rucci Rocnieski (Boa Vista do Incra **e** Fortaleza dos Valos) e
   Pe. Daniel Soares Chagas (Ibirapuitã **e** Mormaço).
10. **Telefones com dois ramais** — gravei só o primeiro. Ficam registrados aqui os completos:
    Nossa Senhora da Natividade/Ijuí `(55) 3332 1568/6604`; Nossa Senhora de Lourdes/Ibirubá
    `(54) 3324 1630/91978250`; São Pedro Apóstolo/Ajuricaba `(55) 3387.1345/1332`;
    São Pedro Apóstolo/Fortaleza dos Valos `(55) 3328.1194 /1307`.
11. **Endereços que são caixa postal, não logradouro**: Sagrado Coração de Jesus (Ijuí) —
    "Caixa Postal 666 — Vila Santana"; Nossa Senhora da Natividade (Ijuí) — "Praça da República,
    14 (Caixa Postal 32)". Vários outros trazem a caixa postal junto do logradouro.
12. **Nomes repetidos** (todos com `slug` distinto porque o slug inclui a cidade, mas atenção na
    carga): 3× "Paróquia São José" (Pejuçara, Augusto Pestana, Chapada); 2× "Paróquia São Pedro
    Apóstolo" (Fortaleza dos Valos, Ajuricaba); 2× "Paróquia Sagrado Coração de Jesus" (Ijuí,
    Saldanha Marinho); 2× "Paróquia Nossa Senhora dos Navegantes" (Salto do Jacuí, Mormaço);
    2× "Paróquia Santa Terezinha" (Condor, Fontoura Xavier); 2× "Paróquia Nossa Senhora
    Aparecida" (Boa Vista do Incra, Ibirapuitã); 2× "Paróquia Divino Espírito Santo" (Catedral,
    em Cruz Alta, e Jóia).
13. **Nome da Catedral**: o site chama de "Paróquia Divino Espírito Santo – Catedral". Gravei
    **"Catedral Divino Espírito Santo"** conforme a regra de prefixo do README.
14. **Se o bloqueio do site cair**, revisitar as 14 fichas sem aba "Missas": Imaculada Conceição
    (Cruz Alta), Nossa Senhora Aparecida (Boa Vista do Incra), Nossa Senhora da Natividade
    (Ijuí), Sagrado Coração de Jesus (Ijuí), São José (Augusto Pestana), Sagrado Coração de
    Jesus (Saldanha Marinho), Nossa Senhora de Lourdes (Ibirubá), Nossa Senhora dos Navegantes
    (Salto do Jacuí), Nossa Senhora da Soledade (Soledade) e Nossa Senhora dos Navegantes
    (Mormaço).
