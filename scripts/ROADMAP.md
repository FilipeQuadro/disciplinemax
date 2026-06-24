**Resumo Executivo**

- Objetivo: disponibilizar um dashboard funcional localmente com dados de usuário, conectar Kairos para insights e estabilizar fluxo de autenticação e testes.

**Estado Atual**

- Monorepo com `web` (Next.js), `api` (NestJS + Prisma) e `kairos` (FastAPI) rodando localmente.
- Usuário de teste criado; DB populado com dados mínimos (hábitos, livro, pomodoro, meta).
- Endpoints principais funcionando; `/api/kairos/context` retorna contexto esperado.

**O que o produto quer ser (visão curta)**

- Experiência personalizada: Kairos fornece insights e recomendações com base em hábitos, leituras e pomodoro.
- Dashboard único com progresso, metas, e recomendações proativas.

**Próximos passos (priorizados)**

- Curto prazo (hoje → 2 dias):
  - Injetar JWT no frontend (feito via `scripts/generate_inject_snippet.js`) e validar UI.
  - Criar scripts de seed mais abrangentes (mais usuários, histórico de pomodoro, leituras).
  - Documentar comandos de desenvolvimento e debug (README dev).
- Médio prazo (1–2 semanas):
  - Implementar E2E simples para fluxo de registro → popular dados → dashboard.
  - Adicionar testes unitários para serviços críticos (Kairos service, autenticação).
  - Preparar docker-compose com dependências (Postgres, Redis, Qdrant) e instruções para dev.
- Longo prazo (1–2 meses):
  - Polir recomendações do Kairos, métricas de qualidade das respostas e monitoramento de custo de LLM.
  - Pipeline de CI/CD com geração de schema e seeds automáticas.

**Riscos principais e mitigações**

- Dependência de infra (Postgres/Redis/Qdrant): sem Docker o setup local exige instalar serviços manualmente. Mitigação: fornecer `docker-compose` testado e instruções alternativas com serviços hospedados.
- Custos de LLM/API (Kairos): uso inadvertido pode gerar gastos. Mitigação: limitar calls em dev, usar mock local para testes.
- Segurança de tokens: tokens em localStorage expõem XSS risco. Mitigação: avaliar HttpOnly cookies e revisar surface de XSS.

**Recomendação imediata**

- Commitar scripts de seed e README de dev gerados (`scripts/populate_data.js`, `scripts/generate_inject_snippet.js`, `scripts/README_INJECT_AND_TEST.md`, `scripts/ROADMAP.md`).
- Executar E2E básico que roda os scripts de seed e valida `/api/kairos/context` e rota principal do `web`.

**Arquivos úteis gerados hoje**

- `scripts/populate_data.js`
- `scripts/generate_inject_snippet.js`
- `scripts/README_INJECT_AND_TEST.md`
- `scripts/ROADMAP.md`

Fim.
