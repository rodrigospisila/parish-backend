# Relatório de pesquisa — Diocese de Araçatuba (SP)

- **Arquivo**: `paroquias/SP/aracatuba.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território BR — oeste paulista (onda SP)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas de paróquia no JSON | 35 |
| Paróquias efetivas (entram na carga) | **34** |
| Entradas não paroquiais | 1 (Capela Sagrado Coração de Jesus – Brejo Alegre, `status: "nao-paroquial"`) |
| Confiança das paróquias | 34 alta / 0 media / 0 baixa |
| Comunidades/capelas | 155 |
| Horários fixos | 280 (229 `alta`, 51 `baixa`) |
| Paróquias esperadas (GCatholic 2022) | 33 |

Cobertura estimada: **100%+** (34 encontradas contra 33 esperadas — a diferença provavelmente é
paróquia erigida depois da estatística de 2022 do GCatholic).

## Fontes principais

1. **Site oficial** — https://diocesedearacatuba.com.br
   - `/regiao-pastoral-de-andradina/paroquias/` — página "PARÓQUIAS", **lista canônica** com todas as
     4 regiões pastorais (Andradina, Guararapes, Araçatuba, Birigui) e a cidade de cada paróquia.
   - `/regiao-pastoral-de-<regiao>/` — as quatro páginas de região (corroboração da lista).
   - `/curia/` — endereço, e-mail e bispo diocesano (Dom Sergio Krzywy).
   - **35 páginas "HORÁRIO DE MISSA – <paróquia> (<cidade>/SP)"**, uma por paróquia, todas modificadas
     entre 14 e 26 de maio de 2026 — fonte de **todas** as comunidades e horários deste dataset.
2. **GCatholic** — https://gcatholic.org/dioceses/diocese/arac1 (33 paróquias, 276 missões, 2022).

### Detalhe técnico que destravou a coleta

O site é WordPress + Elementor: o `content.rendered` da REST API vem **vazio** e o HTML servido também
não tem o conteúdo — cada página de horário é um **cartaz PNG** (`/wp-content/uploads/2026/05/*.png`,
2560×720). A rota foi: listar as páginas por `\/wp-json\/wp\/v2\/pages?per_page=100` (60 páginas, das quais
35 são "HORÁRIO DE MISSA"), baixar o `<img>` de cada uma e ler as imagens. O custom post type `locais`
existe mas só tem 5 registros publicados e está vazio — não serve.

## O que ficou faltando

- **Endereço, CEP, telefone, e-mail, site, pároco e ano de fundação das paróquias**: o site diocesano
  não publica nenhum desses campos (nem na página de paróquias, nem nas de região, nem nos cartazes).
  Todos gravados como `null`. Seria necessário ir paróquia a paróquia (Facebook/Instagram/Google Maps)
  — não coube no orçamento desta rodada.
- **Bairro das capelas**: gravado só quando o cartaz o informava entre parênteses (ex.: "Capela São José
  (Bairro Nova York)", "RURAL – Jacutinga"). Nas demais, `null`.
- Não há horários de **confissão, adoração ou terço** publicados; só missas.

## Pontos que precisam de validação humana

1. **51 horários de recorrência mensal** marcados `baixa` (não cabem no modelo `MassSchedule`, que só tem
   dia da semana). A regra literal está em `notes` de cada horário. Os casos mais pesados:
   - **Paróquia Nossa Senhora Auxiliadora (Valparaíso)**: 14 dos 15 horários são mensais — praticamente
     toda a paróquia funciona por rodízio. Inclui ainda "4º domingo do mês, 7h: rodízio entre as capelas
     Bom Jesus / São Pedro / Santo Expedito", gravado só em `notes` da paróquia.
   - **Paróquia Santo Antônio (Coroados)** e **Paróquia São José (Castilho)**: capelas rurais atendidas
     1×/mês (1º a 4º domingo/sábado).
   - **Paróquia Imaculada Conceição (Birigui)** e **Paróquia São Benedito e São Cristóvão (Birigui)**:
     6 e 4 capelas rurais em rodízio de sextas-feiras.
2. **Missas mensais sem horário publicado** (não gravadas como horário; ficam em `notes` da paróquia):
   - Paróquia Nossa Senhora da Conceição (Bilac): Capela da Ressurreição (1ª segunda do mês) e Capela
     Bom Jesus / Bairro Imbé (4ª quarta do mês) — o cartaz cita o dia mas **não o horário**.
   - Paróquia São Sebastião (Araçatuba): "Águas Claras e Verde Parque – 15 em 15 dias" às quintas, sem
     horário. As duas comunidades foram gravadas, o horário não.
   - Paróquia São João Batista (Mirandópolis): "NAS COMUNIDADES – aos domingos, 9h", **sem nomear as
     comunidades**. Comunidades e horário não gravados; só a Matriz.
   - Paróquia Nossa Senhora Aparecida (Guaraçaí): o cartaz declara que as missas nas comunidades seguem
     escala rotativa organizada mensalmente, "sem fixação de datas específicas" — nenhuma comunidade
     nomeada.
3. **Nome oficial de duas paróquias diverge entre páginas do próprio site**:
   - Araçatuba: a página "PARÓQUIAS" diz "Paróquia Santuário São João Batista e São Judas Tadeu"; o
     cartaz diz "Santuário São João Batista e São Judas Tadeu". Gravei **"Santuário São João Batista e
     São Judas Tadeu"**.
   - Araçatuba: a página da Região de Araçatuba lista "Paróquia Santo Antônio" (12ª), mas a página
     "PARÓQUIAS" e o cartaz dizem "Paróquia Santo Antônio de **Pádua**"; a mesma página de região grafa
     "São Fracisco" (erro de digitação) e "Paróquia São Fracisco de Santa Clara" onde o correto é
     "Paróquia São Francisco **e** Santa Clara". Usei a grafia da página "PARÓQUIAS" + cartaz.
   - Birigui: página de região diz "Paróquia Santa Clara"; a página "PARÓQUIAS" e o cartaz dizem
     "Paróquia Santa Clara **de Assis**". Usei a forma longa.
4. **Capela Sagrado Coração de Jesus (Brejo Alegre)**: a própria diocese a lista como *Capela*, não
   paróquia, na Região Pastoral de Birigui. Gravada com `status: "nao-paroquial"` — **não deve entrar**
   na carga como paróquia, mas Brejo Alegre é município e pode merecer tratamento próprio.
5. **Telefone da cúria diverge entre fontes**: o rodapé do site oficial e a página `/curia/` dão
   **(18) 3624-3561**; resultados de busca (e cadastros de terceiros) dão (18) 3301-3561. Gravei o do site.
6. **Capela São Domingos Sávio (Colégio Salesiano)**, na Paróquia São Francisco e Santa Clara: tem missa
   diária (segunda a sábado, 17h) e três domingos — é capela de colégio, não comunidade territorial.
   Gravada como comunidade da paróquia; vale conferir se deve mesmo aparecer para os fiéis.
7. **Duplicidade de topônimos**: várias paróquias têm capelas com o mesmo orago (ex.: duas "Capela São
   Roque" em Coroados, duas "Capela Santo Antônio" em Birigui/São Benedito, várias "Capela Nossa Senhora
   Aparecida" em Andradina). Desambiguei acrescentando o bairro/localidade entre parênteses no `name`
   quando havia colisão dentro da mesma paróquia.
