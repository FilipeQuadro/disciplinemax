Adiciona utilitários e documentação para facilitar desenvolvimento local, testes E2E e CI.

Inclui scripts de seed, E2E, snippet de injeção de token, documentação de dev e workflow CI para rodar a verificação E2E.

O que inclui:

- Seeds e helpers: `scripts/populate_data.js`, `scripts/seed_full.js`, `scripts/get_context.js`
- Snippet de injeção JWT: `scripts/generate_inject_snippet.js`
- E2E simples: `scripts/e2e_check.js`
- Docs e guia: `scripts/README_INJECT_AND_TEST.md`, `scripts/ROADMAP.md`, `CONTRIBUTING.md`
- CI workflow para E2E: `.github/workflows/ci.yml`
- PR template: `.github/PULL_REQUEST_TEMPLATE.md`
- Melhorias: `.gitignore` atualizado, `README.md` com quick actions

Motivação:

Reduz tempo de setup para novos devs, garante verificação mínima do fluxo (seed → /api/kairos/context → dashboard) e adiciona infraestrutura básica de CI para prevenir regressões.

Como testar localmente:

1. `pnpm install`
2. Iniciar serviços: `pnpm dev:api`, `pnpm --filter web dev`, `pnpm dev:kairos` (ou `uvicorn`)
3. Popular dados: `node scripts/seed_full.js` ou `node scripts/populate_data.js`
4. Rodar E2E: `node scripts/e2e_check.js`
5. Injetar token no browser: `node scripts/generate_inject_snippet.js` e cole o snippet no Console em `http://localhost:3000`.

Notas:

- Configure secrets (ex.: `DATABASE_URL`) no CI para a verificação funcionar.
- Revogue qualquer token que tenha sido compartilhado aqui por segurança.
