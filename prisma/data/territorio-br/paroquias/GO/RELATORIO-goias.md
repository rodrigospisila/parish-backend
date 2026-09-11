# Relatório — Diocese de Goiás (GO)

Pesquisa em 11/09/2026. Arquivo: `goias.json`.

## Resultado

| Item | Qtd |
|---|---|
| Paróquias (confiança alta) | 25 |
| Paróquias (media / baixa) | 0 / 0 |
| Entradas `status: nao-paroquial` (santuários) | 2 |
| Comunidades/capelas | 0 |
| Horários fixos | 0 |
| Cobertura | **25 / 25 (100%)** |

## Fontes principais

1. **https://diocesedegoias.org.br/regioes-pastorais/** — fonte canônica. Publica as 25 paróquias
   agrupadas em 4 regiões pastorais, cada uma com fundação, pároco/administrador, diáconos,
   endereço, município, CEP, telefone/WhatsApp e e-mail. Sinal de atualidade: o `page-sitemap.xml`
   do site declara `lastmod` de **11/03/2026** para essa página. Por isso tudo entrou como `alta`.
   - Região Rio Vermelho: 6 paróquias (Britânia, Fazenda Nova, Itapirapuã, Jussara, Novo Brasil,
     Santa Fé de Goiás)
   - Região Serra Dourada: 5 paróquias (Buriti de Goiás, Cidade de Goiás ×2, Mossâmedes,
     Sanclerlândia) + 2 santuários
   - Região Uru: 8 paróquias (Guaraíta, Heitoraí, Itaberaí ×2, Itaguari, Itaguaru, Itapuranga,
     Taquaral de Goiás)
   - Região São Patrício: 6 paróquias (Carmo do Rio Verde, Ceres, Ipiranga de Goiás, Nova Glória,
     São Patrício, Uruana)
2. **minhareceita.org — filiais do CNPJ 01.861.749 (Diocese de Goiás)** — prova independente de
   completude. Varredura de `/0001` a `/0034`: a matriz (0001) e **exatamente 25 filiais ATIVAS**
   (0002 a 0026), todas paróquias, com bairro e endereço; de 0027 em diante retorna 404. Foi de
   onde vieram os bairros (a diocese não publica bairro).
3. **catholic-hierarchy.org/diocese/dgois.html** — 25 paróquias na estatística de 2023 (bate).

## Sem horários e sem comunidades — por quê

Esgotadas as fontes previstas no método, **não há um único horário de missa publicado** para esta
diocese:

- A diocese não tem página de horários (o sitemap tem só 12 páginas, nenhuma de missas).
- Sites paroquiais: só um existe, o da Paróquia N. Sra. d'Abadia de Itaberaí
  (`itaberaiparoquia.com.br`); a página `/missas/` está publicada **sem nenhuma grade** (só o título
  e a semana litúrgica) e a página `/paroquia/` ainda está com texto-modelo "Em breve o conteúdo
  correspondente será publicado aqui". O site `www.parima.com.br` (Ceres), divulgado pela diocese,
  **não responde**; `paroquiaimaculadaceres.org.br`, citado em buscas, também não resolve.
- Agregadores: `horariodemissa.com.br` tem fichas de Ceres, Itapuranga e Santa Rita/Goiás, todas com
  "(Nenhum horário de Missa informado)" e **última atualização em 2013**. `horariomissa.org` tem 14
  fichas de cidades desta diocese (Itaguaru, Ceres, Carmo do Rio Verde, Itaberaí, Itapuranga,
  Taquaral, Goiás ×2, Mossâmedes, Britânia, Santa Fé, Jussara, Novo Brasil, Buriti, Sanclerlândia) —
  **todas com o bloco de horários vazio**. `horariodemissahoje.com.br` saiu do ar (NXDOMAIN).
  `acervocatolico.com` lista as paróquias sem horário.
- `missahora.com.br` só tem **uma** igreja na cidade de Goiás: "Igreja de Nossa Senhora Aparecida",
  R. Quintino Bocaiúva, 2, bairro Santana, com terça/quinta/sábado às 19:00. Não consegui
  determinar a qual das duas paróquias da cidade ela pertence (é capela, não matriz), então **não
  foi gravada** — fica aqui para o enxame de validação.

Como não há lista confiável de capelas em nenhuma fonte, todos os `communities` ficaram `[]` (o
importador cria a igreja-matriz sozinho).

## Precisa de validação humana

1. **Pároco de Itaberaí (N. Sra. d'Abadia)** — divergência entre fontes oficiais: o site diocesano
   diz **Pe. Daniel Bertuzzi**; o site da própria paróquia diz **Pe. Ricardo Ribeiro Gomes** (pároco)
   e Pe. José Mateus Domingues Filho (vigário). Note que Pe. Ricardo Ribeiro Gomes aparece no site
   diocesano como pároco de Taquaral de Goiás. Gravei o dado do site diocesano.
2. **Nome da catedral** — a diocese publica "Paróquia de Sant'Ana"; gravei como
   **"Catedral de Sant'Ana"** (é a sé diocesana, e o e-mail oficial é `santanacatedral@gmail.com`).
   Confirmar se o app deve exibir "Catedral" ou "Paróquia".
3. **Endereço da catedral** — diocese: Praça da Liberdade, s/n. Receita Federal: Praça Castelo
   Branco, s/n. Gravei o da diocese.
4. **Endereço de Taquaral de Goiás** — diocese: "Praça da Matriz, s/n". Receita: "Praça Dom Abel,
   s/n". Gravei o da diocese.
5. **Bairro da Paróquia Santa Rita (Cidade de Goiás)** — Receita: "Bairro João Francisco" (gravado);
   `horariodemissa.com.br` (2013): "Vila Goiacy".
6. **Telefone truncado** — Uruana publica WhatsApp "(62) 9664-1233" (8 dígitos, falta o 9).
   Gravei em `notes`, não em `phone`.
7. **Guaraíta sem telefone** — a diocese publica só o e-mail.
8. **CEP da catedral** publicado como "76600.000" e o de Uruana como "76.335.000" (ponto no lugar do
   hífen) — normalizei para `76600-000` e `76335-000`.
9. **Os 2 santuários** (Diocesano N. Sra. Aparecida, no povoado de Areias, e N. Sra. do Rosário, na
   Cidade de Goiás) entraram com `status: "nao-paroquial"` e, sem horário publicado, ficam fora da
   carga pela regra do README. Se algum deles publicar missa fixa, vira caso de `loadAsParish`.
10. **A diocese inteira entra sem horário de missa** — é a situação de Pouso Alegre/Caratinga da
    3ª rodada. Só uma coleta por telefone ou pelas redes sociais das paróquias resolve.
