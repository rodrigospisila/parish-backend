# Diocese de Cruz das Almas — relatório de pesquisa

- **Slug**: `cruz-das-almas` · **UF**: BA · **Sede**: Cruz das Almas
- **Pesquisa**: 11/09/2026
- **Território**: Cabaceiras do Paraguaçu, Cachoeira, Cruz das Almas, Governador Mangabeira,
  Maragogipe, Muritiba, Santo Amaro, São Félix, Sapeaçu e Saubara (10 municípios).
- Criada em 22/11/2017 pela constituição apostólica *Ut crescat*, desmembrada da Arquidiocese de
  São Salvador da Bahia.

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **17** (todas `alta`) |
| Comunidades/capelas | 17 (**só as matrizes**) |
| Horários fixos | 60 (56 MASS · 4 CONFESSION) — **todos `baixa`** |
| Paróquias com horário carregável | **0** |

**Cobertura: 17/17.** A diocese declara "17 paróquias e 185 comunidades em 10 municípios", e as 17
estão na página oficial, agrupadas em 3 foranias.

## Fontes

1. **`https://www.diocesedecruzdasalmas.com.br/paróquias`** — lista as 17 paróquias por forania, com
   nome e município. É tudo o que o site entrega ao leitor automático (confiança `alta` para nome,
   cidade e distrito).
2. **`horariodemissa.com.br`** — 16 igrejas nos 10 municípios; forneceu endereço, CEP, telefone,
   pároco e as grades de 12 paróquias.

## Limitações desta circunscrição (as maiores da rodada)

- **As 185 comunidades NÃO foram obtidas.** O site é um Wix e cada paróquia tem um botão "Leia mais"
  que abre um *lightbox* (`data-popupid`), cujo conteúdo **não vem no HTML** servido ao leitor
  automático. Só 12 `popupid` aparecem para 17 paróquias, e nenhum traz texto. Seria preciso um
  navegador real (Playwright) para abrir os pop-ups — **fica como tarefa para o enxame de validação**.
- **Nenhum horário carregável.** As 16 fichas do `horariodemissa.com.br` foram atualizadas pela
  última vez entre **05/03/2013 e 23/11/2017** (13 delas em 22–23/11/2017, quando a diocese foi
  criada). Pela regra do README, horário anterior a 2020 é `baixa`. O `buscamissa.com.br` não tem
  nenhuma igreja em Cruz das Almas, Cachoeira, Santo Amaro, São Félix, Maragogipe nem Saubara.
- **Nenhum e-mail de paróquia** e nenhum ano de fundação.

## Pontos que precisam de validação humana

1. **Duas paróquias sem nenhum dado além do nome e do município** — o agregador não as conhece:
   *Paróquia Santo Antônio* (Geolândia, Cabaceiras do Paraguaçu) e *Paróquia Nossa Senhora da Vitória*
   (São Roque do Paraguaçu, Maragogipe). Sem endereço, telefone, pároco ou horário.
2. **5 paróquias sem horário**: as duas acima, mais São José Operário (Cruz das Almas),
   Nossa Senhora da Purificação (Santo Amaro) e São Domingos de Gusmão (Saubara) — estas três têm
   ficha no agregador, mas sem grade.
3. **Nome da paróquia da sede**: a página lista "Nossa Senhora do Bom Sucesso — Cruz das Almas" no
   índice e "Paróquia Catedral Nossa Senhora do Bom Sucesso" no cartão; gravei
   **Catedral Nossa Senhora do Bom Sucesso**.
4. **Nome divergente da segunda paróquia de Cruz das Almas**: o índice diz "São José Operário", o
   cartão diz "Paróquia São José" e o `horariodemissa.com.br` diz "Paróquia São José". Gravei
   **Paróquia São José Operário** (o nome do índice). **Confirmar.**
5. **CEP fora de faixa**: *Nossa Senhora da Soledade* (Acupe, Santo Amaro) está com **42228-000** no
   agregador; a faixa de Santo Amaro é 442xx. Provável erro da fonte.
6. **Párocos** (13 registros) vêm do `horariodemissa.com.br` com dados de 2017 — muito provavelmente
   desatualizados. **Não devem ser exibidos sem conferência.**
7. **Endereço/telefone/CEP** de 15 paróquias também são de 2013–2017 e do agregador, não da diocese.
   Estão em `sources` com a data da ficha no título.
