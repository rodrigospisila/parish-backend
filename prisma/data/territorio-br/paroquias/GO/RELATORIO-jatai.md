# Relatório — Diocese de Jataí (GO)

Pesquisa em 11/09/2026. Arquivo: `jatai.json`.

## Resultado

| Item | Qtd |
|---|---|
| Paróquias (confiança alta) | 33 |
| Paróquias (media / baixa) | 0 / 0 |
| Entradas `status: nao-paroquial` | 0 |
| Comunidades/capelas | 260 (incluindo as matrizes) |
| Horários fixos | 68 (6 alta, 46 media, 16 baixa) |
| Cobertura | **33 encontradas / 31 esperadas** |
| Municípios cobertos | 20 |

## Fontes principais

1. **Site oficial (Wix) — uma ficha por paróquia em 4 coleções dinâmicas.** As páginas **não são
   alcançáveis pela navegação normal**; foram encontradas pelos sitemaps dinâmicos listados em
   `https://www.diocesedejatai.org/sitemap.xml`:
   - `dynamic-paroquiasleste_p_8d5b553c…` → **Distrito Leste**, 12 paróquias (Rio Verde e região)
   - `dynamic-distritocentro_p_1798657b…` → **Distrito Centro**, 7 (Jataí, Aporé, Chapadão do Céu)
   - `dynamic-team-4_p_0f8544bb…` → **Distrito Noroeste**, 5 (Mineiros ×3, Santa Rita do Araguaia, Portelândia)
   - `dynamic-team-5_p_3bbe0c0e…` → **Distrito Sul**, 9 (Quirinópolis, Caçu, São Simão, Itajá etc.)

   O mapeamento `team-4` = Noroeste e `team-5` = Sul foi confirmado pelos `href` do menu do site.
   Cada ficha traz cidade, endereço, pároco, vigários, diáconos, secretaria, telefone, e-mail e —
   o mais valioso — a **lista de Comunidades Urbanas e Comunidades Rurais**. Daí vieram as 260
   comunidades, de longe o melhor rendimento das quatro dioceses desta rodada.
2. **`missahora.com.br`** — 2 fichas de Rio Verde, ambas batendo com a fonte oficial (Igreja São
   Sebastião, da Paróquia N. Sra. das Dores; e a Paróquia São Francisco de Assis). Foi o que
   permitiu marcar **6 horários como `alta`**.
3. **catholic-hierarchy.org/diocese/djata.html** — 31 paróquias (2023).

Notas de coleta: o site devolve **HTTP 429** a leitores automáticos rápidos — foi preciso baixar as
33 páginas uma a uma, com pausa. O conteúdo vem no SSR do Wix (não há `warmupData` útil).

## Por que os horários ficaram quase todos `media`

Só **7 das 33** paróquias publicam grade de missa: Santa Helena, Imaculado Coração de Maria,
N. Sra. das Dores, São Francisco de Assis (todas de Rio Verde/região), São Judas Tadeu (Jataí),
N. Sra. d'Abadia (Quirinópolis) e São João Batista (Itajá).

Várias fichas carregam um campo **"Última Atualização"** com data de **31/08/2023** ou **18/03/2024**
— mais de 12 meses. Pela regra do README (horário exige publicação oficial com sinal de atualidade),
os horários não corroborados por segunda fonte ficaram `media`. São posteriores à pandemia, então
não caem para `baixa`.

## Precisa de validação humana

1. **Cobertura 33 × 31** — não há duplicata entre as 33 (as homônimas estão em cidades diferentes:
   3× Santo Antônio de Pádua em Rio Verde, Mineiros e Santo Antônio da Barra; 3× N. Sra. d'Abadia em
   Montividiu, Quirinópolis e Cachoeira Alta; 2× São João Batista em Gouvelândia e Itajá; 2× São
   Judas Tadeu e 2× N. Sra. de Fátima em Jataí e Rio Verde; 2× São Sebastião em Jataí e Itarumã).
   A diferença provavelmente são paróquias criadas depois de 2023. Confirmar com a cúria.
2. **DUAS TABELAS DE HORÁRIO NÃO PUDERAM SER LIDAS COM SEGURANÇA** — é o ponto mais importante
   deste relatório:
   - **Paróquia Santa Helena (Santa Helena de Goiás)** publica "HORÁRIO E LOCAIS DAS MISSAS" em duas
     colunas; na leitura automática a marca "(Matriz)" aparece solta entre os horários e não dá para
     saber se cada horário pertence à comunidade listada acima dele ou à matriz. **Nenhum horário
     foi gravado** — a paróquia entra com 26 comunidades e zero missas. Precisa de conferência
     visual (a página tem ~10 comunidades com horário).
   - **Paróquia N. Sra. d'Abadia (Quirinópolis)** publica a grade urbana como tabela
     dia × horário × local, mas sábado lista 3 horários para 5 locais, domingo 6 horários para 8
     locais e quarta 3 horários para 4 locais. Gravei **somente** as linhas inequívocas (segunda,
     terça, quinta e sexta). Faltam as missas de sábado e domingo — as mais importantes — e as de
     quarta. Também ficaram de fora ~14 celebrações rurais mensais cuja linha lista "3 celebrações"
     com 3 horários e 3 locais na mesma célula.
3. **E-mail errado em duas fichas** — `paroquia.nossasenhoradefatimarv@gmail.com` (da Paróquia
   N. Sra. de Fátima de **Rio Verde**) aparece também nas fichas da **Paróquia N. Sra. Aparecida de
   Maurilândia** e da **Paróquia Divino Espírito Santo de Mineiros**. Gravei `email: null` em
   Mineiros e mantive em Maurilândia o e-mail próprio que a ficha também traz.
4. **Mesmo padre em duas paróquias** (conferir se é acúmulo ou dado desatualizado):
   - **Pe. Neilton Nunes Neves** — pároco de São Judas Tadeu (Rio Verde, Distrito Leste) **e**
     administrador de N. Sra. d'Abadia (Quirinópolis, Distrito Sul), a mais de 200 km
   - **Pe. Everaldo da Luz Silva** — pároco de Santo Agostinho (Aporé) e vigário de São Sebastião
     (Jataí). Há ainda um **Pe. Everaldo da Luz Morais de Souza** em Santa Rita do Araguaia e um
     **Pe. Everaldo Alves de Assis** em Cachoeira Alta — três nomes parecidos, conferir
   - **Pe. Caio Murilo de Souza** — Itaguaçu e Paranaiguara
   - **Pe. Cícero Martiniano da Silva** — vigário em Quirinópolis e administrador em Gouvelândia
     (numa ficha aparece como "Pe.", noutra como "Frei")
   - **Pe. Jacques Douglas da Silva** — pároco de Santo Antônio da Barra e vigário de Santa Helena
5. **Telefone repetido** — (64) 3631-2714 serve tanto a Paróquia N. Sra. de Fátima quanto a Paróquia
   São Sebastião, ambas de Jataí.
6. **Itaguaçu** — gravei como `city`, seguindo a fonte, mas o CEP 75893-000 é de **distrito**, não de
   município autônomo. Definir a qual município pertence antes da carga.
7. **Paróquias sem endereço publicado**: São João Batista (Gouvelândia) — ficha com o campo vazio.
8. **Paróquias sem nenhuma comunidade listada** (campos em branco na ficha): Santo Agostinho
   (Aporé), São Sebastião (Jataí), Santo Antônio de Pádua (Mineiros). Entram com `communities: []`,
   e o importador cria a matriz.
9. **Territórios que cruzam municípios** — vale conferir no app: São Judas Tadeu (Jataí) atende
   Perolândia e o distrito de Estância; Sagrado Coração de Jesus (Caçu) atende Aparecida do Rio
   Doce; São João Batista (Itajá) atende Lagoa Santa; N. Sra. Aparecida (Maurilândia) atende
   Castelândia.
10. **16 horários `baixa`** por recorrência mensal, concentrados em São Judas Tadeu/Jataí (7 sábados
    rurais numerados), Quirinópolis (4) e Itajá (3).
11. **Horários publicados sem local ou sem hora — não gravados**: Itajá, "Missas nas casas: segunda e
    terça-feira do mês às 19h" (sem local) e "última terça do mês: missa com a Família do Terço dos
    Homens" (sem horário).
12. **Campo "Site" com link de busca do Google** nas fichas de N. Sra. do Rosário (Jataí), São Judas
    Tadeu (Jataí) e N. Sra. Rainha do Céu (Chapadão do Céu) — não gravei como `website`.
13. **Paróquia São Judas Tadeu (Rio Verde)** — a ficha lista "Capela São Judas Tadeu" entre as
    comunidades urbanas; gravei-a como a matriz, por ser homônima do título da paróquia. Conferir.
14. **Endereço da cúria** — o rodapé do site diz Praça Dom Germano, 660, CEP 75800-035; o
    `dioceses.json` do dataset registra Av. Joaquim Cândido de Carvalho 56, CEP 75800-053.
