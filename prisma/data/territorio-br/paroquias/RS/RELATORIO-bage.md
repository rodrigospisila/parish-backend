# RELATÓRIO — Diocese de Bagé (RS)

- **Arquivo**: `paroquias/RS/bage.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (PROMPT-pesquisa.md)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas em `parishes` | 16 (todas paróquias) |
| Paróquias com confiança **alta** | 0 |
| Paróquias com confiança **media** | 16 |
| Paróquias com confiança **baixa** | 0 |
| Comunidades/capelas | 2 (apenas as matrizes de 2 paróquias) |
| Horários fixos | 11 (todos `baixa`) |
| Cobertura | 16 / 16 (100 % da LISTA de paróquias) |

> **A diocese com o pior cenário de fontes das três.** A lista de paróquias está completa e
> confere com todas as referências, mas **comunidades e horários praticamente não existem em
> fonte pública**.

## O problema: o site oficial está fora do ar

O site `www.diocesedebage.com.br` — indicado pela Wikipédia, pela CNBB Regional Sul 3 e pelas
próprias páginas arquivadas — **não resolve em DNS** em 10/09/2026 (`getaddrinfo ENOTFOUND`,
testado com e sem `www`). Não há site substituto: o `bispadobage.wixsite.com/diocesedebagebr`
ainda no ar está **desatualizado** (apresenta como bispo **Dom Gílio Felício**, que deixou
Bagé em 2018).

A solução foi recuperar o conteúdo oficial pelo **Arquivo da Internet (Wayback Machine)**. A
página `pesqparoquia.php` ("Aqui você pode pesquisar a Paróquia por Cidade"), na cópia de
**30/11/2023**, renderiza a **tabela completa de paróquias** com responsável, telefone,
e-mail, endereço e cidade — a base deste arquivo.

Por isso **todas as 16 paróquias ficaram com confiança `media`**: fonte oficial, porém sem
sinal de atualidade (cópia de quase 3 anos atrás, de um site que saiu do ar).

## Fontes principais

1. `http://web.archive.org/web/20231130081234/http://www.diocesedebage.com.br/pesqparoquia.php`
   — **lista oficial de paróquias** (cópia de 30/11/2023)
2. `http://web.archive.org/web/2023/http://www.diocesedebage.com.br/visitenos.html` — endereço,
   CEP, telefones e e-mails da Cúria
3. `http://web.archive.org/web/2023/http://www.diocesedebage.com.br/nossobispo.html` — bispo e
   a frase "compõe-se de 16 paróquias, em 12 municípios"
4. https://cnbbsul3.org.br/diocese-de-bage/ — endereço, telefone, e-mail e bispo (fonte viva)
5. https://www.catholic-hierarchy.org/diocese/dbage.html — **16 paróquias**; Dom Cleonir Paulo
   Dalbosco, O.F.M.Cap., desde 26/09/2018
6. https://pt.wikipedia.org/wiki/Diocese_de_Bag%C3%A9 — 16 paróquias em 12 municípios
7. https://www.jornalfolhadacidade.com.br/2026/01/diocese-de-bage-anuncia-transferencias.html
   — **transferências e nomeações pastorais para 2026** (usada para atualizar párocos)
8. https://www.turismo.rs.gov.br/turismo/atrativo/visualizar/4409 — horários da Catedral
9. https://www.horariodemissa.com.br/igreja.php?k=agIZa — horários da Paróquia São Pedro
   (última atualização **12/02/2015**)

## Cobertura

**16 paróquias / 16 esperadas.** A página arquivada traz **18 registros**; dois deles **não
são paróquias** e ficaram fora do arquivo:

| Registro fora do arquivo | Responsável | Endereço |
|---|---|---|
| Capelania Militar | Pe. Lucas Antônio Mazzochini | Rua Rodrigues Lima, 78 – Bagé |
| Capela São José | Pe. Fábio Augusto | Rua Rodrigues Lima, 78 – Bagé |

Distribuição por município (9 dos 12 municípios da diocese):

| Município | Paróquias |
|---|---|
| Bagé | 6 — Catedral São Sebastião, N. Sra. da Imaculada Conceição, N. Sra. Auxiliadora, São Pedro, São Judas, Sagrada Família |
| Santana do Livramento | 3 — N. Sra. do Rosário, Santa Teresinha, Sant'Ana |
| Dom Pedrito | 1 — N. Sra. do Patrocínio |
| Hulha Negra | 1 — São José |
| Candiota | 1 — Sagrado Coração de Jesus |
| Pinheiro Machado | 1 — N. Sra. da Luz |
| Rosário do Sul | 1 — N. Sra. do Rosário |
| São Gabriel | 1 — Arcanjo São Gabriel |
| Lavras do Sul | 1 — Santo Antônio |

**Aceguá, Pedras Altas e Santa Margarida do Sul** integram a diocese mas não têm paróquia
própria (Pedras Altas é atendida pela Paróquia Nossa Senhora da Luz, de Pinheiro Machado,
conforme o anúncio de nomeações de 2026).

## Párocos: como foram determinados

A lista arquivada é de 2023 e o anúncio de **transferências para 2026** mudou várias
designações. Onde as duas fontes conflitam, prevaleceu o anúncio de 2026:

| Paróquia | Fonte 2023 | Nomeação 2026 | Gravado |
|---|---|---|---|
| N. Sra. do Patrocínio (Dom Pedrito) | Pe. Roberto Carlos R. Barboza | **Pe. Elautério C. da Silva Júnior** (pároco) + Pe. Márcio Macedo Guimarães (vigário) | Pe. Elautério |
| N. Sra. da Luz (Pinheiro Machado) | Pe. Elautério Conrado da Silva Júnior | **Pe. Julio Cesar Ribeiro** (Pinheiro Machado e Pedras Altas) | Pe. Julio Cesar Ribeiro |
| São José (Hulha Negra) | Frei Tiago Frey, Frei Paulo E. Müller | **Frei Luís Barbieri** | Frei Luís Barbieri |
| Sagrado Coração (Candiota) | Frei Tiago Frey, Frei Paulo E. Müller | **Frei Paulo Muller** | Frei Paulo Eduardo Müller |
| N. Sra. do Rosário (S. do Livramento) | Pe. Jean Junot Cherisme, Pe. Joel | **Pe. Roque Bisognin e Pe. Jonas Desrivières** (permanecem) | Roque Bisognin / Jonas Desrivières |
| N. Sra. do Rosário (Rosário do Sul) | Pe. Airton Machado Gusmão | Pe. Oberdan Junior Longhi (vigário) | Pe. Airton (pároco mantido) |

**Duas paróquias ficaram com `priestName: null`**, porque o titular de 2023 saiu e o
substituto não foi anunciado publicamente:

- **Catedral São Sebastião (Bagé)** — Pe. Jair da Silva foi designado, em 2026, vigário
  paroquial da Catedral de **Pelotas** (estudando na UCPel).
- **Paróquia São Judas (Bagé)** — Pe. Júlio Cezar Ribeiro foi para Pinheiro Machado.
- **Paróquia Santo Antônio (Lavras do Sul)** — o campo "Responsável ADM" traz **"Irmãs
  Franciscanas"**, não um presbítero. `priestName: null`.

## ⚠️ Pontos para o enxame de validação

1. **Site oficial fora do ar.** Verificar se a diocese migrou para outro domínio ou passou a
   usar só Instagram/Facebook (`@diocesedebage`). Toda a base de contatos deste arquivo é de
   2023 e precisa de reconfirmação.
2. **`communities: []` em 14 das 16 paróquias.** Nenhuma fonte pública lista as
   comunidades/capelas. É a maior lacuna do dataset do RS. O importador criará apenas a
   igreja-matriz.
3. **Horários quase inexistentes — todos `baixa`:**
   - **Catedral São Sebastião**: terça a sexta 18h, sábado 17h, domingo 10h e 19h. Fonte:
     Portal do Turismo do RS, **sem data de atualização**. Confirmar.
   - **Paróquia São Pedro**: domingo 9h; quarta, sexta e sábado 18h (19h no horário de verão).
     Fonte: horariodemissa.com.br, **atualizada em 12/02/2015 (11 anos)**. Confirmar.
   - Todas as demais 14 paróquias: `schedules: []`. O horariodemissa.com.br tem fichas de
     Bagé sem nenhum horário cadastrado; o horariosmissa.com.br não tem dado algum para
     Bagé, Santana do Livramento, São Gabriel ou Rosário do Sul; Dom Pedrito nem existe lá.
4. **Endereços/telefones divergentes entre fontes** (gravado o da fonte oficial arquivada):
   - **Catedral São Sebastião**: site oficial diz *Rua Conde de Porto Alegre, 01*;
     horariodemissa.com.br diz *Rua Conde de Porto Alegre, 1 — bairro Estrela d'Alva, CEP
     96400-280*; o Portal do Turismo do RS diz ***Praça Carlos Téles, 1 — Centro, CEP
     96400-003***. `zipCode: null` até haver confirmação.
   - **Paróquia São Judas**: oficial *Av. São Judas, 1694*; horariodemissa.com.br
     *Avenida Padre Abílio Sponchiado, 2007 — CEP 96415-200*.
   - **Paróquia N. Sra. Auxiliadora**: oficial *Rua Marechal Floriano, 1347*;
     horariodemissa.com.br *Avenida Marechal Floriano, 1335*.
   - **Paróquia Sagrada Família**: telefone oficial *(53) 3311-2780*;
     horariodemissa.com.br *(53) 3241-2344*.
   - **Paróquia São Pedro**: telefone oficial *(53) 99997-1991*; horariodemissa.com.br
     *(53) 3241-1386* e *(53) 9910-2021*. Foi gravado o fixo (3241-1386) e o CEP 96412-000.
5. **DDD misto**: paróquias de Santana do Livramento, Rosário do Sul, São Gabriel e Lavras do
   Sul aparecem com **(55)**; as de Bagé, Dom Pedrito e Pinheiro Machado com **(53)**.
   Confere com a geografia, mas vale checar (Sant'Ana e Santa Teresinha, em Livramento, têm o
   mesmo prefixo 3242 usado em Bagé).
6. **Santuário Diocesano de Nossa Senhora Conquistadora** (Rua Prof.ª Amélia Rezende, 151 —
   Morro de Belém, Bagé): padroeira da diocese desde 1974, erigido no episcopado de Dom
   Laurindo Guizzardi. **Não foi incluído** — não há registro público de horários nem
   confirmação de que seja unidade pastoral autônoma. Vale investigar.
7. **CEP da Cúria**: o site oficial escreve `96.400-021`; o `dioceses.json` do repositório já
   registra `96400-200` para o mesmo endereço (Rua Marcílio Dias, 1586). Foi gravado
   **96400-021** (forma da fonte oficial). Divergência a resolver.
8. **Paróquia Santo Antônio (Lavras do Sul)** tem "Irmãs Franciscanas" como responsáveis
   administrativas — situação de paróquia sem pároco residente. Confirmar.
