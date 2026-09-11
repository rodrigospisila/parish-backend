# Relatório — Diocese de Ipameri (GO)

Pesquisa em 11/09/2026. Arquivo: `ipameri.json`.

## Resultado

| Item | Qtd |
|---|---|
| Paróquias (confiança alta) | 26 |
| Paróquias (media / baixa) | 0 / 0 |
| Entradas `status: nao-paroquial` | 4 (1 delas com `loadAsParish`) |
| Comunidades/capelas | 63 |
| Horários fixos | 102 (71 alta, 21 media, 10 baixa) |
| Cobertura | **26 / 25** (a 26ª é posterior à estatística de 2023) |

## Fontes principais

1. **Anuário Diocesano 2026** (PDF, 32 páginas, publicado em 08/05/2026) —
   `https://diocesedeipameri.com.br/wp-content/uploads/2026/05/Anuario-Diocesano-2026-2-1.pdf`.
   Achado a partir do post `noticias/igrejadiocesana/anuario-2026/`. Traz todas as paróquias com
   data de instalação, pároco, vigários, diáconos, secretárias, telefone e e-mail, além dos 19
   municípios da diocese, foranias, conselhos e comunidades religiosas. Foi o que revelou a
   **Paróquia São Marcos (Caldas Novas, instalada em 22/02/2025)**, que ainda não aparece no menu do
   site.
2. **Site diocesano — uma página por paróquia**: `diocesedeipameri.com.br/paroquias/<forania>/<slug>/`.
   O menu "PARÓQUIAS" lista as 25 paróquias por forania (Norte 5, Centro 4, Oeste 5, Sul 7,
   Sudoeste 4) mais 4 entradas não paroquiais. Cada página traz endereço, CEP, telefone, e-mail e
   clero, e **cinco delas publicam a grade de missas por capela** — foi a fonte da maioria dos
   horários. E-mails vinham ofuscados pelo Cloudflare e foram decodificados de `data-cfemail`.
3. **`paroquiamaededeus.com.br`** — site próprio da Paróquia N. Sra. Mãe de Deus (Catalão), com as
   13 comunidades (via WP REST, categoria 10) e a grade da matriz.
4. **`saletecaldas.com.br/santuario/`** — programação semanal do Santuário Diocesano N. Sra. da
   Salete (o domínio `www.saletecaldas.com.br` só devolve uma página de redirecionamento; o caminho
   certo é `/santuario/`).
5. **`missahora.com.br`** (agregador) — usado só para **corroborar**: a grade da Catedral de Ipameri
   é idêntica à publicada pela diocese, e a de N. Sra. das Dores e a do Santuário da Salete batem
   com as fontes oficiais. Foi o que permitiu marcar esses horários como `alta`.

## Quem publica horário e quem não publica

Publicam (6 templos, 102 horários):

| Templo | Horários | Observação |
|---|---|---|
| Catedral Divino Espírito Santo (Ipameri) | 26 | inclui adoração e confissão de quinta e 11 capelas/centros |
| N. Sra. das Dores (Caldas Novas) | 18 | matriz + Jubileum + 9 capelas |
| N. Sra. Mãe de Deus (Catalão) | 18 | site próprio; só a matriz, com confissões |
| Bom Jesus da Cana Verde (Corumbaíba) | 14 | 9 deles mensais → `baixa` |
| São Francisco de Assis (Catalão) | 11 | matriz + 6 capelas |
| Santuário N. Sra. da Salete (Caldas Novas) | 12 | inclui 2 terços |
| Bom Jesus da Lapa (Domiciano Ribeiro) | 3 | + 7 capelas rurais sem dia fixo |

As outras 20 paróquias **não publicam horário em lugar nenhum** — nem o site diocesano, nem o
anuário, nem os agregadores (o `missahora.com.br` só cobre Ipameri e Caldas Novas nesta diocese;
Catalão, Pires do Rio e Orizona retornam 404, e `horariomissa.org` não tem nenhuma ficha da região).

## Precisa de validação humana

1. **Paróquia São Marcos (Caldas Novas)** — só existe no Anuário 2026; sem endereço e sem página no
   site. Telefone com DDD de outro estado: (16) 99629-5129.
2. **Divergências de pároco entre o site e o anuário 2026** (gravei sempre o do site, que é a página
   específica da paróquia):
   - São Sebastião / Nova Aurora: site **Pe. Roberto Moreira Vaz** × anuário Pe. Francisco Soares Pereira
   - São Sebastião / Rio Quente: site **Pe. José Augusto da Silva, MCVV** × anuário Pe. Marcelo Aparecido Curto
   - Capela São José / Anhanguera: site **Pe. Murah Rannier Peixoto Vaz** × anuário Pe. Orcalino Lopes da Silva
3. **"Jubileum" (Caldas Novas)** — o site diocesano põe as missas de sábado 19h30 e domingo
   8h30/19h30 no "Jubileum"; o `missahora.com.br` põe as mesmas 3 no endereço da matriz. Gravei no
   Jubileum com `media`. Vale confirmar se o Jubileum é um espaço à parte ou o salão da matriz.
4. **Domiciano Ribeiro** — gravei como `city`, seguindo a fonte, mas é **distrito do município de
   Ipameri** (não consta na lista de 19 municípios do anuário) e tem CEP próprio (75784-000).
   Decidir se o importador deve normalizar para Ipameri.
5. **Paróquia São José (Davinópolis)** — a diocese a nomeia "Paróquia São José – Santo Antônio do
   Rio Verde / Davinópolis" e o slug da página é `capelanossasenhoraaparecida-davinopolis`. O
   território cobre o distrito de Santo Antônio do Rio Verde (Catalão) e Davinópolis; usei
   Davinópolis, que é a cidade do endereço/CEP publicado.
6. **Divergências de telefone/e-mail entre site e anuário** (gravei o do site, anotei o outro em
   `notes`): Bom Jesus da Lapa (3438-3104 × 3436-3104), Santo Antônio de Pádua/Ouvidor,
   São Francisco de Assis/Catalão, Divino Pai Eterno/Caldas Novas.
7. **CEP incompleto** — Sagrado Coração de Jesus (Pires do Rio): o site publica só "75200";
   completei para 75200-000 (CEP geral do município). Conferir.
8. **Telefone truncado** — Bom Jesus da Cana Verde publica WhatsApp "(64) 9267-6763" (8 dígitos).
   Ficou em `notes`, não em `phone`.
9. **Endereço do Santuário da Salete** — o site do santuário diz Rua 03, Qd. 14/18, CEP 75697-425;
   o anuário diz Rua 11, Qd. 41, Lt. 08, CEP 75690-000. Usei o do santuário.
10. **Fundação de N. Sra. Mãe de Deus (Catalão)** — anuário: 31/07/1835; o próprio site da paróquia:
    22/07/1835. O site também a chama de "Paróquia Nossa Senhora, Mãe da Igreja" no texto histórico.
11. **Horários da Mãe de Deus estão `media`** — o site é oficial, mas o post mais recente é de
    05/2024 e as comunidades de 09/2023; sem sinal de atualidade, ficaram `media` pela regra do
    README.
12. **9 horários `baixa` em Corumbaíba + 1 na Catedral** são de recorrência mensal ("2ª quarta-feira
    do mês", "1º domingo do mês" no Asilo São Vicente de Paulo) — o bloco que não cabe em
    `MassSchedule`.
13. **7 capelas rurais de Bom Jesus da Lapa** (São Francisco, N. Sra. da Abadia, Santa Bárbara, São
    Sebastião, Pré-Assentamento Ana Ferreira, São João Batista, Santa Águeda) entram como
    comunidades, mas **sem horário**: a própria página diz que a missa é "uma vez ao mês, em cada
    uma destas localidades com calendário previamente definido pelo padre com a comunidade".
14. **Duas comunidades homônimas em Corumbaíba** — "Comunidade Nossa Senhora Aparecida" existe no
    Pontal da Balsa e no Povoado do Areão; diferenciei pelo nome composto para não colidirem no
    importador.
