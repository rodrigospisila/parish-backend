# Relatório — Diocese de Toledo (PR)

Agente de pesquisa, 2026-09-10. Arquivo de dados: `toledo.json`.

## Resumo

| Item | Quantidade |
|---|---|
| Paróquias | **32** (32 alta / 0 media / 0 baixa) |
| Comunidades/capelas | 3 (2 matrizes nomeadas + Capela Santo Américo, Nova Santa Rosa) |
| Horários fixos | 130 missas (todos alta, fonte oficial) |
| Cobertura | 32 / 32 esperadas (catholic-hierarchy e gcatholic, 31/12/2022) — **100 %** |

## Fontes principais

1. **Site oficial** `https://www.diocesetoledo.org/paroquias` — a listagem é carregada por AJAX
   (`POST https://www.diocesetoledo.org/paroquias/list` com `ref=paroquias&categoria=<decanato>`;
   categorias 1 = Toledo, 2 = Rondon, 3 = Palotina, 4 = Assis). Foram lidas as 32 páginas
   individuais `https://www.diocesetoledo.org/paroquias/ler/<id>` (ids 234, 257–265, 267–275,
   277–288, 295 e 441). Cada página traz: data de criação, pároco/vigários, telefones, endereço com
   CEP, e-mail, expediente e "Horários de Missa" por dia da semana. Rodapé "©2026", párocos e
   seminaristas atuais → sinal de atualidade → confiança **alta**.
2. `https://www.diocesetoledo.org/contato` — Cúria: Rua General Rondon, 2006, Jardim La Salle,
   Toledo/PR; (45) 3252-1417 / (45) 99970-0289; `curia@diocesetoledo.org` (rodapé).
3. catholic-hierarchy (`dtolo.html`) e gcatholic (`tole2.htm`): 32 paróquias (2022), bispo Dom João
   Carlos Seneme, C.S.S. (desde 26/06/2013). Wikipédia pt: 19 municípios, 4 decanatos (fala em 28
   paróquias — desatualizado).

## Distribuição por decanato (não há campo no schema; fica só aqui)

- **Decanato de Toledo (12):** Catedral Cristo Rei; São Pedro e São Paulo; Sagrada Família (Jd.
  Panorama); Menino Deus; São Francisco de Assis; São Cristóvão; Santa Rita de Cássia; N. Sra.
  Aparecida (Jd. Pancera, criada 06/02/2022); N. Sra. de Fátima (distrito Vila Nova); N. Sra. das
  Graças (distrito Novo Sarandi); Sagrada Família (distrito Dez de Maio); São Pedro (São Pedro do
  Iguaçu); N. Sra. Aparecida (Ouro Verde do Oeste).
- **Decanato de Rondon (9):** Sagrado Coração de Jesus, Maria Mãe da Igreja e Santa Margarida (Vila
  Margarida) em Marechal Cândido Rondon; N. Sra. Aparecida (Mercedes); São Luiz Gonzaga (Pato
  Bragado); Cristo Rei (Entre Rios do Oeste); N. Sra. da Glória (Quatro Pontes); Santa Rosa de Lima
  (Nova Santa Rosa).
- **Decanato de Palotina (5):** N. Sra. Aparecida e N. Sra. dos Navegantes (Guaíra); N. Sra.
  Aparecida (Terra Roxa); N. Sra. de Fátima (Maripá); São Vicente Palotti (Palotina).
- **Decanato de Assis (6):** N. Sra. de Lourdes (Tupãssi); N. Sra. do Carmo e São Francisco de Assis
  (Assis Chateaubriand); Santo Inácio de Loyola (Jesuítas); Santo Antônio (Formosa do Oeste); São
  Roque (Nova Aurora).

Municípios da diocese sem paróquia própria (Wikipédia): Iracema do Oeste (atendido por paróquia
vizinha). Paróquias em distritos ficaram com `city` = município e o distrito em `neighborhood`.

## Decisões de normalização

- Nomes sem a cidade (a cidade vai em `city`); "Paróquia Cristo Rei - Catedral" → **Catedral Cristo
  Rei**. "Santo Antonio" (Formosa do Oeste) grafado "Santo Antônio". "São Vicente Palotti" mantido
  como no site (grafia usual: Pallotti).
- Telefones: quando a página traz fixo + celular, ambos foram gravados separados por " / ".
- `foundedYear` = ano da "Data de Criação" da página oficial.
- Horários "Na 1ª Sexta às 15h" → `dayOfWeek 5`, `time 15:00`, `notes "1ª sexta-feira do mês"`;
  "1º e 3º Dom. 8h30" → domingo com nota. Expediente da secretaria não foi importado.
- Comunidades: o site não lista capelas; `communities: []` (importador cria a matriz). Exceção:
  Nova Santa Rosa (missa de domingo "na Capela Santo Américo") → capela criada + matriz nomeada.

## Dúvidas / validação humana

1. **Catedral Cristo Rei — CEP:** a página traz "85.9900-215" (dígito a mais). ViaCEP confirma
   **85900-215** para o Largo São Vicente de Paulo (Centro); gravado 85900-215.
2. **Cúria — CEP:** não consta no site (gravado `null`). catholic-hierarchy informa apenas a Caixa
   Postal 220, CEP 85900-970. A página de contato mostra "Rua General Rondon, 2006, 1333" — o
   "1333" parece resíduo de cadastro (ViaCEP: nº 2006 cai na faixa Centro 85901-160; Jardim La
   Salle seria 85902-090).
3. **Bispo:** as páginas `diocese/bispo/109..112` (biografia, bula etc.) vêm vazias (conteúdo via
   JS); nome mantido a partir de CNBB/catholic-hierarchy/gcatholic.
4. **Cristo Rei (Entre Rios do Oeste):** "Sábado: 1º e 3º Sábado" sem horário → não importado.
5. **Santa Rita de Cássia (Toledo):** o site tem duas páginas (ids 261 e 288, mesmo conteúdo); a
   listagem oficial usa a 288 (usada aqui).
6. **N. Sra. de Fátima (Maripá):** "Administrador Paroquial" gravado em `priestName` com a função
   entre parênteses. Idem Diamante do Sul/Anahy em Cascavel.
7. **E-mails:** São Luiz Gonzaga (Pato Bragado), N. Sra. das Graças (Novo Sarandi) e São Francisco
   de Assis (Assis Chateaubriand) não têm e-mail na página → `null`.
8. **Sites/redes das paróquias:** não listados no site diocesano → `website: null` (Catedral usa o
   domínio `catedraltoledo.com.br` no e-mail; não verificado).
9. Horários de confissão/adoração não são publicados no site diocesano (só "Quarta 19h30 com
   adoração ao Santíssimo" em N. Sra. Aparecida – Toledo, registrado como nota da missa).
