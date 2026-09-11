# Arquidiocese de Feira de Santana — relatório de pesquisa

- **Slug**: `feira-de-santana` · **UF**: BA · **Sede**: Feira de Santana
- **Pesquisa**: 11/09/2026
- **Território**: Feira de Santana + 18 municípios (Água Fria, Amélia Rodrigues, Anguera,
  Antônio Cardoso, Candeal, Conceição da Feira, Conceição do Jacuípe, Coração de Maria, Ipecaetá,
  Irará, Ouriçangas, Pedrão, Santa Bárbara, Santanópolis, Santo Estevão, São Gonçalo dos Campos,
  Serra Preta e Tanquinho).

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **46** (todas `alta`) |
| Igrejas não paroquiais com missa publicada | 3 |
| Comunidades/capelas | 49 (só as matrizes — a fonte não lista comunidades) |
| Horários fixos | 149 (138 MASS · 11 CONFESSION) — 27 `media`, 122 `baixa` |
| Paróquias com horário carregável (`alta`/`media`) | 3 de 46 |

**Cobertura: 46/46.** A própria página oficial diz "46 paróquias em 19 municípios", e as 46 estão lá.

## Fontes

1. **`https://arquidiocese-fsa.org.br/paroquias/`** — página única com **todas** as paróquias
   agrupadas em 7 foranias, cada uma com endereço, CEP, telefone, e-mail e, às vezes, site.
   Marcação limpa (`<h3 class="uagb-ifb-title">` + `<p class="uagb-ifb-desc">`), extraída por regex.
   Confiança `alta` para os 46 registros.
2. **`horariodemissa.com.br`** — 30 igrejas nas 19 cidades, 27 com grade.
3. **`buscamissa.com.br`** — 4 fichas de Feira de Santana, 3 com grade e marcadas como "Confirmado".

## O problema dos horários (vale para toda a Bahia desta rodada)

A Arquidiocese **não publica horário de missa** em lugar nenhum do site. O agregador
`horariodemissa.com.br` cobre bem a região, **mas as fichas estão paradas**: a data de
"última atualização" exibida em `igreja.php?k=…` é **2013 a 2018 em todas as 30 fichas**
(a Catedral, por exemplo, 17/02/2018). Pela regra do README ("texto anterior a 2020 é rebaixado para
`baixa`"), esses **122 horários entram como `baixa`** e não carregam.

O que sobra de atual são as **3 paróquias do `buscamissa.com.br`** (27 horários `media`):
Catedral Metropolitana Sant'Ana, Nossa Senhora das Graças e Senhor do Bonfim (Jardim Cruzeiro).

## Pontos que precisam de validação humana

1. **Comunidades**: nenhuma. Nem o site da Arquidiocese nem os agregadores listam comunidades/capelas
   das 46 paróquias. Cada paróquia ficou só com a matriz. É a maior lacuna desta circunscrição.
2. **Pároco e ano de fundação**: 0 de 46. O site lista os párocos em outra página (`/clero`), que não
   foi cruzada por falta de orçamento — **é a próxima coleta fácil**.
3. **Divergência de padroeiro em Anguera**: o site da Arquidiocese registra *Paróquia Nossa Senhora da
   Conceição* na Praça Artur Vieira; o `horariodemissa.com.br` registra, no mesmo endereço,
   *Paróquia Senhor do Bonfim*. Mantive o nome oficial e anexei o horário. **Confirmar.**
4. **Três paróquias homônimas de Senhor do Bonfim** no dataset (Jardim Cruzeiro/Feira de Santana,
   Bonfim de Feira/Feira de Santana e Candeal), mais *Senhor do Bomfim* de Santanópolis — o site grafa
   "Bomfim" nesta última e ela aparece com `city` "Feira de Santana" porque o bloco não traz a linha
   "Santanópolis – BA". **Corrigir a cidade de `senhor-do-bomfim-feira-de-santana` para Santanópolis.**
5. **Paróquias de distrito** cujo município é Feira de Santana mas cujo `neighborhood` guarda o
   distrito: Humildes, Ipuaçu/Gameleira, Bonfim de Feira, Maria Quitéria (São José das Itapororocas),
   Jaguara, Tiquaruçu, Matinha e Jaíba. Está correto canonicamente, mas convém conferir.
6. **CEP suspeito**: *Paróquia Nossa Senhora do Carmo* (Serraria Brasil, Feira de Santana) está
   publicada com CEP **40301-110**, que é de Salvador. Copiei como está.
7. **Telefones antigos com 8 dígitos** publicados pelo próprio site (ex.: São José Operário
   "(75) 8844-5456", Antônio Cardoso "(75) 8712-0500", Santa Marcelina): provavelmente celulares
   sem o nono dígito.
8. **6 paróquias sem e-mail** e **9 sem telefone** — a ficha oficial está incompleta.
9. **Entradas `nao-paroquial`** (entram só pelo horário publicado):
   - *Capela Nossa Senhora de Lourdes (Colégio Padre Ovídio)*, Centro;
   - *Capela Nossa Senhora da Piedade*, Hospital Dom Pedro de Alcântara, Kalilândia;
   - *Igreja Nossa Senhora dos Remédios*, Rua Dezoito de Setembro, 140, Centro — **não confundir**
     com a Paróquia Nossa Senhora dos Remédios do distrito de Ipuaçu; a paróquia de vínculo desta
     igreja do Centro não foi confirmada.
