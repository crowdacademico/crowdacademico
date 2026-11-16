# Testes de ponta a ponta (Playwright e axe-core)

O navegador repete os passos de uma pessoa nas telas do sistema, os roteiros chamam a API de verdade, o axe-core confere a acessibilidade e o CT-16 mede o tempo de resposta. Tudo roda contra um **banco local descartável**: nunca toca no Supabase nem no Asaas, e nenhum e-mail sai da máquina.

## Como rodar

```
cd testes-e2e
npm install                 (uma vez só)
npx playwright install chromium   (uma vez só, se o navegador do Playwright não estiver instalado)
npm test                    (tudo: interface, API, acessibilidade e desempenho)
npm run relatorio           (a suíte PGlite do banco + tudo acima, e grava o relatório em resultados/)
```

Uma parte só: `npm run test:interface`, `npm run test:api`, `npm run test:acessibilidade`, `npm run test:desempenho`.

## O que o `npm test` sobe sozinho

Os três servidores sobem pelo `playwright.config.ts`, em portas próprias (as 3000 e 5173 do dia a dia ficam livres) e são desligados no fim:

| O quê | Porta | Como |
|---|---|---|
| Banco Postgres de verdade, montado do zero com `arquivos_banco_dados/01` a `08` (com o seed) | 5434 (e 5498 para os testes lerem o banco) | `ambiente/banco-local.mjs` (embedded-postgres) |
| Nest compilado na hora (`nest build`) | 3101 | `ambiente/iniciar-nest.mjs`, com `PAYMENT_PROVIDER=fake` e `EMAIL_PROVIDER=fake` |
| React (Vite) apontando para o Nest de teste | 5175 | `npx vite --port 5175` em `react/` |

**Pré-requisitos:** Node instalado, `npm install` feito em `nest/`, `react/` e aqui, e o `nest/.env` existindo (o Nest de teste lê dele só a chave do JWT e as chaves do CPF; o banco, o pagamento e o e-mail são trocados pelos de teste). Na primeira vez, o embedded-postgres baixa o Postgres (uns 30 MB).

**Para desenvolver um roteiro** sem esperar a subida a cada vez: deixe os três servidores ligados (os mesmos comandos da tabela) e rode com `REUSAR=1 npx playwright test ...`. Cuidado: o banco fica sujo entre rodadas; a rodada oficial é sempre a do `npm test`, com o banco novo.

## O que cada pasta cobre

| Pasta | Cobre |
|---|---|
| `testes/api/` | Roteiros de integração da API para os casos do Quadro 17 do TCC que antes só eram conferidos à mão: CT-01 a CT-06, CT-08, CT-09, CT-10, CT-11 (inclusive a regra de 16-11-2026: o administrador dono não aprova a própria campanha) e CT-13. Cada um confere a mensagem exata que o TCC cita. Os outros casos (CT-07, CT-12, CT-14, CT-17, CT-18 e CT-19) são regras do banco e estão na suíte PGlite (`informacoes/testes-banco`). |
| `testes/interface/` | As telas do Quadro 15: página inicial, Explorar, página da campanha, apoio com Pix pelo provedor de teste (até a confirmação), login, cadastro, recuperação de senha, Minha Conta, Estúdio e o painel (aprovação, moderação financeira, denúncias, pedidos de encerramento). Também RF-015 (aceite do Termo novo), RF-027, RF-028, RF-047, RF-057, RF-061 e o boleto desligado. Cada teste falha se a página jogar erro de JavaScript. |
| `testes/acessibilidade/` | axe-core em 22 telas (todas as públicas e as principais da restrita), nos temas claro e escuro, em 1440 px e 390 px: falha com qualquer violação "critical" ou "serious" e, no celular, com rolagem lateral. E o CT-15: cadastro, login, recuperação, página inicial, campanha e painel em 390 px, com a função principal à vista. |
| `testes/desempenho/` | CT-16 (RNF-11): Explorar, página da campanha e Minha Conta, uma carga de aquecimento e mais dez; a média precisa ficar abaixo de 3 s. |

## Por que `@playwright/test` (e não o Jest do Nest) para os roteiros da API

Um caminho só para tudo: o mesmo `playwright.config.ts` sobe o banco, o Nest e o React, e o `request` do Playwright chama a API com o mesmo banco que a interface usa. No Jest do Nest seria preciso montar o banco e o Nest de novo, em outro lugar, só para a API.

## Detalhes que importam

- **Limite de tentativas:** o Nest aceita 5 logins por minuto por IP. Cada teste se apresenta com um IP próprio no `X-Forwarded-For` (o Nest confia no primeiro proxy, `main.ts`), como pessoas diferentes; sem isso a suíte travaria no sexto login.
- **E-mail e pagamento de teste:** em desenvolvimento, o Nest devolve o token de recuperação de senha na resposta (`tokenRecuperacaoSenhaDev`), e o pagamento de teste é confirmado pela rota da T5 do Campo de Testes (`POST /campo-testes/pagamento/contribuicoes/:id/pagar`).
- **Dados:** os testes usam as contas do seed (senha `DevTcc123!`, lista em `testes/apoio.ts`) e criam o que precisam com e-mail único. Quando um teste muda uma linha do seed para preparar o caso, ele devolve no fim.

## Resultados

- `npm run relatorio` grava `resultados/relatorio-AAAA-MM-DD_HHMM.md`: casos por suíte (PGlite, interface, API, acessibilidade, desempenho), o tempo médio do CT-16 e as violações do axe-core por tela. É de lá que saem os números para a banca.
- O relatório do próprio Playwright (com as fotos e o passo a passo de cada falha) fica em `.estado/relatorio-html` (`npx playwright show-report .estado/relatorio-html`), fora do Git.
