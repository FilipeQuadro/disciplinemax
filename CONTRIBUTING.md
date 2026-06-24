# Contributing

Obrigado por contribuir com o DisciplinaApp. Este documento resume passos rápidos para trabalhar localmente.

1. Instale dependências

```bash
pnpm install
```

2. Configure variáveis de ambiente

```bash
cp .env.example .env
# editar .env conforme necessário
```

3. Gerar banco e seed

```bash
cd apps/api && npx prisma migrate dev && cd ../..
node scripts/populate_data.js
```

4. Rodar localmente

```bash
pnpm dev:web
pnpm dev:api
pnpm dev:kairos
```

5. Rodar E2E local

```bash
node scripts/e2e_check.js
```

Guidelines:
- Prefira abrir PRs pequenos e descritivos.
- Adicione testes para novas features.
- Revise `README.md` e `DISCIPLINAAPP_ARQUITETURA.md` quando fizer mudanças estruturais.
