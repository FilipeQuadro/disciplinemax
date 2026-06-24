# AUDITORIA TÉCNICA COMPLETA — DisciplinaApp

> Data: 17/06/2026
> Escopo: Análise profunda do estado atual do projeto
> Objetivo: Maximizar reaproveitamento, identificar conflitos, alinhar com a visão consolidada

---

## SUMÁRIO EXECUTIVO

| Métrica | Valor |
|---|---|
| Arquivos criados | 62 |
| Arquivos com implementação real | 47 |
| Arquivos stub/placeholder | 15 |
| Arquivos referenciados mas inexistentes | 28+ |
| Bugs funcionais identificados | 4 |
| Dependências quebradas (imports sem alvo) | 25+ |
| Módulos NestJS funcionais | 8 de 9 |
| Agentes Python implementados (stub) | 8 de 8 |
| Skills implementadas | 1 de 24 |
| Estimativa de reaproveitamento do esqueleto | **~65%** |
| Estimativa de reaproveitamento de código real | **~35%** |

**Veredito:** O projeto tem um esqueleto arquitetural sólido e bem pensado, mas está em estado de **protótipo não-executável**. Nenhum dos três serviços (web, api, kairos) roda sem correções. A estrutura conceitual é altamente reaproveitável; o código de implementação precisa de retrabalho significativo.

---

## 1. ESTRUTURA GERAL

### 1.1 Mapa Completo dos Módulos Existentes

```
disciplina-app/
├── ROOT (6 arquivos)
│   ├── package.json          ✅ Real — Turborepo + pnpm
│   ├── turbo.json            ✅ Real — Pipeline de tasks
│   ├── pnpm-workspace.yaml   ✅ Real — Workspaces
│   ├── .env.example          ✅ Real — Template de env vars
│   ├── README.md             ✅ Real — Documentação
│   └── DISCIPLINAAPP_ARQUITETURA.md  ✅ Real — 50+ seções
│
├── apps/web/ (Next.js — 8 arquivos)
│   ├── package.json          ✅ Real
│   ├── tsconfig.json         ✅ Real
│   ├── next.config.js        ✅ Real — Rewrites para /api e /kairos
│   └── src/
│       ├── app/layout.tsx    ✅ Real — Layout mínimo
│       ├── app/page.tsx      ✅ Real — Landing page (6 cards estáticos)
│       ├── app/globals.css   ✅ Real — TailwindCSS
│       ├── lib/api.ts        ✅ Real — HTTP client genérico
│       └── stores/appStore.ts ✅ Real — Zustand (user + kairosOpen)
│
├── apps/api/ (NestJS — 28 arquivos)
│   ├── package.json          ✅ Real
│   ├── tsconfig.json         ✅ Real
│   ├── prisma/schema.prisma  ✅ Real — 14 models completos
│   └── src/
│       ├── main.ts           ✅ Real — Bootstrap + CORS + Pipes
│       ├── app.module.ts     ✅ Real — Importa 9 módulos
│       └── modules/
│           ├── prisma/       ✅ Real — PrismaService + Module
│           ├── auth/         ✅ Real — register/login/bcrypt/JWT/guard/strategy
│           ├── books/        ⚠️ Real c/ bug — updateProgress sempre FINISHED
│           ├── bible/        ✅ Real — CRUD + progress
│           ├── pomodoro/     ⚠️ Real c/ bug — averagePerDay hardcoded 0
│           ├── habits/       ✅ Real — CRUD + log upsert
│           ├── gamification/ ✅ Real — XP/level calc
│           ├── goals/        ⚠️ Real c/ bug — isCompleted sempre true
│           └── kairos/        ⚠️ Real c/ bug — KairosModule não importa PrismaModule
│
├── apps/kairos/ (Python — 18 arquivos)
│   ├── pyproject.toml        ✅ Real
│   ├── requirements.txt      ✅ Real
│   ├── src/config.py         ✅ Real — Settings via pydantic-settings
│   ├── src/core/
│   │   ├── orchestrator.py   ✅ Real — Fluxo completo process()
│   │   ├── context_manager.py ⚠️ Import quebrado (src.core.rag.retriever)
│   │   ├── router.py         ✅ Real — 8 agentes, 9 regras
│   │   └── memory.py         ❌ Stub — 3 camadas, todas TODO
│   ├── src/agents/
│   │   ├── base_agent.py     ✅ Real — ABC + build_system_prompt
│   │   ├── habit_coach.py    ⚠️ Stub — call_llm retorna placeholder
│   │   ├── reading_coach.py  ⚠️ Stub — call_llm retorna placeholder
│   │   ├── bible_coach.py    ⚠️ Stub — call_llm retorna placeholder
│   │   ├── focus_coach.py    ⚠️ Stub — call_llm retorna placeholder
│   │   ├── performance_analyst.py ⚠️ Stub — call_llm retorna placeholder
│   │   ├── motivator.py      ⚠️ Stub — call_llm retorna placeholder
│   │   ├── study_planner.py  ⚠️ Stub — call_llm retorna placeholder
│   │   └── business_advisor.py ❌ Quebrado — importa 23 módulos inexistentes
│   └── src/skills/
│       ├── base_skill.py     ✅ Real — ABC abstrata
│       └── financial/pricing.py ✅ Real — Prompt F1 completo
│
├── packages/shared/          ❌ NÃO EXISTE (referenciado em 3 arquivos)
├── packages/ui/              ❌ NÃO EXISTE (referenciado em 3 arquivos)
└── docs/                     ❌ NÃO EXISTE (referenciado no README)
```

### 1.2 Dependências Entre Módulos

```
                    ┌─────────┐
                    │  web    │──── depende de ───▶ packages/shared*  ❌
                    │         │──── depende de ───▶ packages/ui*      ❌
                    └────┬────┘
                         │ HTTP
                         ▼
                    ┌─────────┐
                    │  api    │──── depende de ───▶ packages/shared*  ❌
                    │ (NestJS)│──── depende de ───▶ @prisma/client
                    └────┬────┘
                         │ HTTP (proxy)
                         ▼
                    ┌─────────┐
                    │ kairos  │──── importa ────▶ src.core.rag.retriever*  ❌
                    │ (Python)│──── importa ────▶ 23 skill modules*       ❌
                    └─────────┘

* = referenciado mas não existe
```

**Dependências quebradas identificadas:**

| Origem | Importa de | Status |
|---|---|---|
| `apps/api/src/modules/kairos/kairos.service.ts` | `PrismaService` via injeção | ❌ PrismaModule não importado no KairosModule |
| `apps/kairos/src/core/context_manager.py` | `src.core.rag.retriever.Retriever` | ❌ Arquivo não existe |
| `apps/kairos/src/agents/business_advisor.py` | 23 imports de skills | ❌ Apenas 1 existe (pricing.py) |
| `apps/web/package.json` | `@disciplina-app/shared` | ❌ Pacote não existe |
| `apps/web/package.json` | `@disciplina-app/ui` | ❌ Pacote não existe |
| `apps/api/package.json` | `@disciplina-app/shared` | ❌ Pacote não existe |
| Todos os módulos Python | `__init__.py` | ❌ Nenhum existe — Python não consegue importar |

### 1.3 Fluxos Principais da Aplicação

**Fluxo 1: Autenticação** ✅ Implementado
```
POST /auth/register → bcrypt hash → cria User → gera JWT
POST /auth/login → bcrypt compare → gera JWT
Subsequent requests → Authorization: Bearer <jwt> → JwtAuthGuard → req.user.id
```

**Fluxo 2: Leitura de Livros** ✅ Implementado (com bug)
```
POST /books → cria Book com status READING
PATCH /books/:id { pagesRead } → BUG: sempre marca FINISHED
GET /books → lista
GET /books/stats → agrupa por status
```

**Fluxo 3: Leitura Bíblica** ✅ Implementado
```
POST /bible/readings → registra capítulo (unique constraint evita duplicação)
GET /bible/progress → agrega por livro
GET /bible/plans → lista planos
```

**Fluxo 4: Pomodoro** ✅ Implementado (com bug)
```
POST /pomodoro/sessions → cria sessão
PATCH /pomodoro/sessions/:id → completa
GET /pomodoro/stats → BUG: averagePerDay = 0 hardcoded
```

**Fluxo 5: Hábitos + Streaks** ⚠️ Parcialmente implementado
```
POST /habits → cria hábito
POST /habits/:id/log → upsert de log
GET /streaks → retorna streaks
⚠️ Streaks não são recalculadas automaticamente após log de hábito
```

**Fluxo 6: Gamificação** ⚠️ Parcialmente implementado
```
GET /gamification/level → retorna XP e nível
⚠️ addXp() existe mas nunca é chamado automaticamente
⚠️ Nenhum evento dispara concessão de XP (concluir livro, logar hábito, etc.)
```

**Fluxo 7: Kairos Chat** ❌ Não funcional
```
POST /kairos/chat → KairosService.chat()
  → HTTP POST para http://localhost:8000/api/chat
  → ❌ Serviço Python não tem routes.py (FastAPI app não existe)
  → Persistência em KairosInteraction → ❌ PrismaModule não importado
```

### 1.4 Tecnologias Utilizadas

| Camada | Tecnologia | Versão Declarada | Instalada? |
|---|---|---|---|
| Monorepo | Turborepo | ^2.0.0 | ❌ npm install nunca rodou |
| Package Manager | pnpm | ^9.0.0 | — |
| Frontend | Next.js | ^14.2.0 | ❌ |
| State (web) | Zustand | ^4.5.0 | ❌ |
| Data Fetching | TanStack Query | ^5.50.0 | ❌ |
| CSS | TailwindCSS | ^3.4.0 | ❌ |
| Backend | NestJS | ^10.4.0 | ❌ |
| ORM | Prisma | ^5.18.0 | ❌ |
| Auth | JWT + bcryptjs | — | ❌ |
| IA | Python + FastAPI | ^0.115.0 | ❌ |
| LLM | LangChain + Ollama | ^0.3.0 | ❌ |
| Vector DB | Qdrant | — | ❌ |
| Cache | Redis | — | ❌ |

**Nenhum `npm install` ou `pip install` foi executado.** O projeto é puro scaffolding de código.

### 1.5 Pontos Fortes e Pontos Fracos

#### Pontos Fortes

| # | Ponto Forte | Justificativa |
|---|---|---|
| 1 | **Arquitetura modular bem definida** | Separação clara web/api/kairos, cada um com responsabilidade única |
| 2 | **Schema Prisma completo** | 14 models cobrindo todo o domínio do produto, com relações e constraints |
| 3 | **Padrão multi-agente conceitualmente correto** | AIOrchestrator + AgentRouter + BaseAgent seguem boas práticas |
| 4 | **Auth funcional no design** | JWT + bcrypt + guards, fluxo register/login bem estruturado |
| 5 | **Isolamento do Kairos como serviço** | Python separado do NestJS, comunicando via HTTP — permite escalar independentemente |
| 6 | **Documentação de arquitetura robusta** | DISCIPLINAAPP_ARQUITETURA.md cobre stack, schemas, endpoints, ADRs, roadmap |
| 7 | **Skills como prompt templates** | Decisão acertada — skills são fáceis de adicionar sem recompilar core |
| 8 | **Naming consistente** | camelCase em TS, snake_case em Python, Conventional Commits |

#### Pontos Fracos

| # | Ponto Fraco | Impacto |
|---|---|---|
| 1 | **Projeto não executa** | Nenhum dos 3 serviços roda sem correções significativas |
| 2 | **25+ imports quebrados** | business_advisor importa 23 módulos inexistentes; context_manager importa retriever inexistente |
| 3 | **Nenhum `__init__.py`** | Python não consegue resolver nenhum import de pacote |
| 4 | **packages/shared e packages/ui inexistentes** | Referenciados em tsconfig paths e package.json mas não criados |
| 5 | **4 bugs funcionais** | books (sempre FINISHED), goals (sempre completed), pomodoro (avg hardcoded), kairos (sem PrismaModule) |
| 6 | **Zero testes** | Nenhum arquivo de teste em nenhum serviço |
| 7 | **Zero integração com LLM** | call_llm() retorna string placeholder em todos os 8 agentes |
| 8 | **Sem Docker/Compose** | Nenhuma configuração de container para PostgreSQL, Redis, Qdrant |
| 9 | **Sem migrations** | prisma/migrations/ está vazio |
| 10 | **Frontend é apenas landing page** | Sem login, sem rotas, sem telas funcionais |
| 11 | **Sem sistema de eventos** | Gamificação (XP) não é disparada por ações do usuário |
| 12 | **Sem painel admin** | Não existe módulo de administração |

---

## 2. REAPROVEITAMENTO

### 2.1 Matriz de Reaproveitamento

#### Manter Sem Alterações (10 arquivos)

| Arquivo | Motivo |
|---|---|
| `turbo.json` | Configuração de pipeline correta |
| `pnpm-workspace.yaml` | Workspaces corretos |
| `.env.example` | Template completo de env vars |
| `apps/api/prisma/schema.prisma` | 14 models bem definidos *(requer adições para admin/ops, mas base sólida)* |
| `apps/api/src/main.ts` | Bootstrap NestJS correto |
| `apps/kairos/pyproject.toml` | Dependências Python corretas |
| `apps/kairos/requirements.txt` | Espelha pyproject.toml |
| `apps/kairos/src/config.py` | Settings via pydantic-settings |
| `apps/kairos/src/core/orchestrator.py` | Lógica do AIOrchestrator está correta conceitualmente |
| `apps/kairos/src/core/router.py` | AgentRouter com regras de roteamento bem estruturadas |

#### Manter com Pequenas Adaptações (14 arquivos)

| Arquivo | Adaptação Necessária |
|---|---|
| `package.json` (root) | Adicionar workspace `@disciplina-app/admin` |
| `README.md` | Atualizar para refletir Kairos Coach/Business/Ops + Admin |
| `apps/web/next.config.js` | Adicionar rewrite para `/admin` |
| `apps/web/package.json` | Adicionar dependências de formulário, charts, etc. |
| `apps/web/tsconfig.json` | Adicionar path para admin |
| `apps/web/src/app/layout.tsx` | Adicionar providers (Auth, Query) |
| `apps/web/src/lib/api.ts` | Adicionar interceptor de auth token |
| `apps/web/src/stores/appStore.ts` | Expandir com mais estado |
| `apps/api/src/app.module.ts` | Adicionar AdminModule, corrigir KairosModule |
| `apps/api/src/modules/auth/auth.module.ts` | Adicionar suporte a roles (ADMIN) |
| `apps/api/src/modules/auth/strategies/jwt.strategy.ts` | Adicionar `role` no payload |
| `apps/api/src/modules/books/books.service.ts` | Corrigir bug do updateProgress |
| `apps/api/src/modules/goals/goals.service.ts` | Corrigir bug do isCompleted |
| `apps/api/src/modules/pomodoro/pomodoro.service.ts` | Implementar averagePerDay |
| `apps/api/src/modules/kairos/kairos.module.ts` | Importar PrismaModule |
| `apps/kairos/src/core/memory.py` | Implementar as 3 camadas (Redis + PG + Qdrant) |
| `apps/kairos/src/agents/base_agent.py` | Implementar call_llm real com Ollama/OpenAI |
| `apps/kairos/src/skills/base_skill.py` | Adicionar enrich_context e parse_output |

#### Exige Refatoração (8 arquivos)

| Arquivo | Motivo da Refatoração |
|---|---|
| `apps/kairos/src/core/context_manager.py` | Remover import quebrado, reescrever _fetch_* com chamadas HTTP reais à API NestJS |
| `apps/kairos/src/agents/business_advisor.py` | Remover 23 imports quebrados, reescrever com carregamento dinâmico de skills |
| `apps/kairos/src/core/router.py` | Adicionar camadas Coach/Business/Ops no roteamento |
| `apps/api/src/modules/kairos/kairos.service.ts` | Adicionar camadas, controle de plano, proxy para Ops |
| `DISCIPLINAAPP_ARQUITETURA.md` | Atualizar para refletir nova visão (Coach/Business/Ops + Admin) |
| `apps/api/src/modules/habits/habits.service.ts` | Adicionar recálculo automático de streaks |
| `apps/api/src/modules/gamification/gamification.service.ts` | Conectar a eventos do sistema (criar event emitter) |
| `apps/web/src/app/page.tsx` | Transformar de landing page estática para dashboard real |

#### Deve Ser Descartado (0 arquivos)

Nenhum arquivo deve ser descartado completamente. O projeto não tem código "errado" que precise ser jogado fora — apenas código incompleto que precisa ser terminado.

#### Deve Ser Criado (Novo)

| Item | Prioridade |
|---|---|
| `__init__.py` em todos os pacotes Python | 🔴 Crítico |
| `packages/shared/` (package completo) | 🔴 Crítico |
| `packages/ui/` (package completo) | 🟡 Alto |
| `apps/kairos/src/api/routes.py` (FastAPI app) | 🔴 Crítico |
| `apps/kairos/src/api/schemas.py` (Pydantic) | 🔴 Crítico |
| `apps/kairos/src/rag/` (retriever, indexer, embeddings) | 🟡 Alto |
| 23 arquivos de skills (F2-G4) | 🟡 Alto |
| `apps/api/src/modules/admin/` (módulo completo) | 🔴 Crítico |
| `apps/admin/` (app Next.js separado) | 🟡 Alto |
| `docker-compose.yml` | 🔴 Crítico |
| Sistema de eventos (EventEmitter no NestJS) | 🟡 Alto |
| Stripe integration (pagamentos) | 🟡 Alto |
| Testes (todos os serviços) | 🟡 Alto |

### 2.2 Estimativa Percentual de Reaproveitamento

| Categoria | Arquivos | Reaproveitável | % |
|---|---|---|---|
| Root configs | 6 | 6 | 100% |
| Schema de banco (Prisma) | 1 | 1 | 100% |
| NestJS — módulos core (auth, books, bible, pomodoro, habits, gamification, goals) | 21 | 18 (3 com bug) | 86% |
| NestJS — Kairos module | 3 | 2 (1 com bug) | 67% |
| Next.js — web app | 8 | 6 | 75% |
| Python — core (orchestrator, router, context, memory) | 4 | 3 (1 com import quebrado) | 75% |
| Python — agents (8 agentes) | 8 | 4 (estrutura ok, stubs) | 50% |
| Python — skills | 2 | 2 | 100% |
| Documentação | 1 | 1 (precisa atualização) | 100% |
| **TOTAL** | **54** | **43** | **~80%** |

> **Reaproveitamento de esqueleto/estrutura: ~80%**
> **Reaproveitamento de código executável real: ~35%** (a maior parte é stub/placeholder)
> **Reaproveitamento de design arquitetural: ~90%** (as decisões conceituais estão corretas)

---

## 3. ALINHAMENTO COM A NOVA VISÃO

A nova visão estratégica define:

```
DisciplinaApp (Produto Principal)
├── Kairos (IA Central)
│   ├── Kairos Coach    — hábitos, produtividade, leitura, estudo bíblico, metas
│   ├── Kairos Business — 24 skills de empreendedorismo e negócios
│   └── Kairos Ops      — suporte inteligente, diagnóstico, automações admin/operacionais
├── Planos: Free, Premium, Business
└── Admin — controle total, gestão de usuários, assinaturas, analytics, logs, aprovação de ações do Kairos Ops
```

### 3.1 Matriz de Alinhamento

| Elemento da Nova Visão | Existe Hoje? | Estado | Ação Necessária |
|---|---|---|---|
| **DisciplinaApp** (produto) | ✅ | Módulos core implementados | Completar bugs + frontend |
| **Kairos** (IA central) | ✅ | Serviço Python com orchestrator | Implementar LLM real, RAG, memória |
| **Kairos Coach** | ⚠️ Parcial | 6 agentes (Habit, Reading, Bible, Focus, Performance, Motivator, StudyPlanner) | Agrupar formalmente como "Coach"; nenhum tem LLM real |
| **Kairos Business** | ⚠️ Parcial | BusinessAdvisor + 1 skill (F1) implementada | Criar 23 skills restantes; estruturar como camada separada |
| **Kairos Ops** | ❌ Inexiste | Zero estrutura para automações admin/operacionais | Criar do zero — agente de diagnóstico, automações, aprovação de ações |
| **Plano Free** | ✅ | Enum no Prisma | Implementar guards de feature gate |
| **Plano Premium** | ✅ | Enum no Prisma | Implementar guards de feature gate |
| **Plano Business** | ✅ | Enum no Prisma | Implementar guards de feature gate |
| **Admin — Gestão de usuários** | ❌ Inexiste | — | Criar AdminModule + AdminApp |
| **Admin — Gestão de assinaturas** | ❌ Inexiste | — | Integrar Stripe + admin endpoints |
| **Admin — Analytics** | ❌ Inexiste | — | Criar dashboard de métricas |
| **Admin — Logs** | ❌ Inexiste | — | Criar AuditLog model + interceptor |
| **Admin — Aprovação de ações Kairos Ops** | ❌ Inexiste | — | Criar ActionApproval model + workflow |

### 3.2 Análise Detalhada por Camada do Kairos

#### Kairos Coach

**Estado atual:** 7 dos 8 agentes Python já existem e correspondem ao domínio do Coach:
- HabitCoach ✅
- ReadingCoach ✅
- BibleCoach ✅
- FocusCoach ✅
- PerformanceAnalyst ✅
- Motivator ✅
- StudyPlanner ✅

**Gap:** Nenhum agente tem LLM real integrado (`call_llm` retorna placeholder). O `ContextManager` não busca dados reais (todos os `_fetch_*` retornam vazio). Não há separação formal entre as camadas Coach/Business/Ops no roteador.

**Esforço para alinhar:** Médio. A estrutura está correta; falta implementação.

#### Kairos Business

**Estado atual:** `BusinessAdvisor` agent existe com estrutura de dispatch por `skill_id`. Apenas `PricingSkill` (F1) está implementada com o prompt completo. As outras 23 skills estão referenciadas como imports mas não existem como arquivos.

**Gap:** 23 arquivos de skill precisam ser criados. O `BusinessAdvisor` não funcionará até que todos os imports sejam resolvidos (ou até que o carregamento seja alterado para dinâmico).

**Esforço para alinhar:** Médio-Alto. Cada skill é um prompt template (já existem nos documentos originais), mas é trabalho repetitivo criar 23 arquivos.

#### Kairos Ops

**Estado atual:** **Não existe nada.** Não há agente, não há schema, não há endpoints, não há workflow de aprovação.

**Gap total:** Tudo precisa ser criado do zero:
- `OpsAgent` ou conjunto de sub-agentes (diagnóstico, automação, monitoramento)
- Schema de `ActionApproval` (ação sugerida → status: pending/approved/rejected)
- Endpoints admin para aprovar/rejeitar
- Sistema de notificação para admins
- AuditLog para registrar todas as ações executadas

**Esforço para alinhar:** Alto. É uma camada inteira nova.

### 3.3 Estrutura Alvo Recomendada para o Kairos

```
apps/kairos/src/
├── core/                      # Mantém
│   ├── orchestrator.py
│   ├── context_manager.py
│   ├── router.py              # Refatorar: adicionar camada (coach/business/ops)
│   └── memory.py
│
├── coach/                     # NOVO — Kairos Coach
│   ├── __init__.py
│   ├── habit_coach.py         # Mover de agents/
│   ├── reading_coach.py
│   ├── bible_coach.py
│   ├── focus_coach.py
│   ├── performance_analyst.py
│   ├── motivator.py
│   └── study_planner.py
│
├── business/                  # NOVO — Kairos Business
│   ├── __init__.py
│   ├── advisor.py             # Mover de agents/business_advisor.py
│   └── skills/                # Mover de skills/
│       ├── financial/
│       ├── commercial/
│       ├── sales/
│       ├── marketing/
│       ├── support/
│       └── management/
│
├── ops/                       # NOVO — Kairos Ops
│   ├── __init__.py
│   ├── diagnostic_agent.py    # Diagnóstico de plataforma
│   ├── automation_agent.py    # Automações administrativas
│   ├── monitor_agent.py       # Monitoramento de saúde do sistema
│   └── approval.py            # Workflow de aprovação de ações
│
├── rag/                       # Criar
│   ├── __init__.py
│   ├── retriever.py
│   ├── indexer.py
│   └── embeddings.py
│
├── api/                       # Criar
│   ├── __init__.py
│   ├── routes.py              # FastAPI app
│   └── schemas.py             # Pydantic
│
└── config.py                  # Mantém
```

---

## 4. CONFLITOS ARQUITETURAIS

### 4.1 Lista Completa de Conflitos

| # | Problema Encontrado | Impacto | Gravidade | Recomendação |
|---|---|---|---|---|
| C1 | **Kairos não tem camada Ops** | Visão de "automações admin e aprovação de ações" é impossível sem nova camada | 🔴 Alta | Criar `ops/` com agentes de diagnóstico, automação e workflow de aprovação |
| C2 | **Sem painel administrativo** | Não há app ou módulo para gestão de usuários, planos, logs, analytics | 🔴 Alta | Criar `apps/admin/` (Next.js) + `AdminModule` no NestJS |
| C3 | **Sem modelo de AuditLog** | Impossível rastrear ações executadas pela IA ou por admins | 🔴 Alta | Adicionar `AuditLog` no schema.prisma |
| C4 | **Sem modelo de ActionApproval** | Kairos Ops não pode sugerir ações para aprovação manual | 🔴 Alta | Adicionar `ActionApproval` no schema.prisma |
| C5 | **Sem RBAC para Admin** | JWT atual não diferencia usuário comum de admin | 🔴 Alta | Adicionar `role` no User, criar `AdminGuard` |
| C6 | **KairosModule não importa PrismaModule** | `kairos.service.ts` injeta PrismaService mas o módulo não registra a dependência → DI falha em runtime | 🔴 Alta | Adicionar `PrismaModule` aos imports do KairosModule |
| C7 | **business_advisor.py importa 23 módulos inexistentes** | Importação falha ao carregar o módulo → Python crash | 🔴 Alta | Mudar para carregamento dinâmico (lazy import) ou criar os 23 arquivos |
| C8 | **context_manager.py importa retriever inexistente** | `from src.core.rag.retriever import Retriever` falha | 🔴 Alta | Criar `src/rag/retriever.py` ou tornar import condicional |
| C9 | **Nenhum `__init__.py` no projeto Python** | Python não resolve nenhum import de pacote | 🔴 Alta | Criar `__init__.py` em todos os diretórios `src/`, `src/core/`, `src/agents/`, `src/skills/`, etc. |
| C10 | **packages/shared e packages/ui inexistentes** | `pnpm install` falha; tsconfig paths não resolvem | 🔴 Alta | Criar ambos os packages com package.json + src/index.ts mínimo |
| C11 | **Sem FastAPI app** | `routes.py` não existe → serviço Python não tem entry point HTTP | 🔴 Alta | Criar `src/api/routes.py` com FastAPI app e endpoints |
| C12 | **Sem Docker Compose** | Dev não consegue subir PostgreSQL, Redis, Qdrant facilmente | 🟡 Média | Criar `docker-compose.yml` com todos os serviços |
| C13 | **Sem sistema de eventos para gamificação** | `addXp()` existe mas nunca é chamado; conquistas não são disparadas | 🟡 Média | Criar `EventEmitter` no NestJS ou usar `@nestjs/event-emitter` |
| C14 | **Streaks não recalculam** | HabitLog é inserido mas Streak não é atualizado | 🟡 Média | Adicionar lógica de recálculo no HabitsService após log |
| C15 | **Router não distingue camadas Kairos** | `AgentRouter` mapeia `request_type` → agente, mas não separa Coach/Business/Ops | 🟡 Média | Adicionar `layer` (coach/business/ops) no roteamento |
| C16 | **Sem feature gating por plano** | Não há guard que verifique `user.plan` antes de permitir acesso a recursos Premium/Business | 🟡 Média | Criar `PlanGuard` que verifica plano antes de executar |
| C17 | **Sem integração de pagamento** | Não há Stripe ou qualquer gateway de pagamento | 🟡 Média | Integrar Stripe para upgrade de plano |
| C18 | **Frontend é só landing page** | Sem telas de login, dashboard, hábitos, leitura, etc. | 🟡 Média | Construir telas funcionais |
| C19 | **Sem refresh token** | `auth.controller.ts` não tem endpoint `/auth/refresh` (documentado mas não implementado) | 🟢 Baixa | Adicionar endpoint de refresh |
| C20 | **`as any` em goals.service.ts** | `data: { ...data } as any` burla type checking | 🟢 Baixa | Tipar corretamente com DTO |
| C21 | **Sem rate limiting** | API não tem proteção contra abuso | 🟢 Baixa | Adicionar `@nestjs/throttler` |
| C22 | **Sem validação de input no Kairos** | Request do Kairos não valida se `user_id` é válido, se `type` está no enum | 🟢 Baixa | Adicionar Pydantic schemas rigorosos |

---

## 5. KAIROS — ANÁLISE MULTI-AGENTE

### 5.1 Escalabilidade

| Aspecto | Avaliação | Detalhe |
|---|---|---|
| **Adição de novos agentes** | ✅ Boa | `BaseAgent` é ABC com `execute()` abstrato. Criar novo agente = herdar + registrar no Router |
| **Execução paralela** | ⚠️ Limitada | `AIOrchestrator.process()` roteia para **um** agente por vez. O design prevê paralelo (múltiplos candidatos no Router) mas não implementa |
| **Carga de LLM** | ❌ Não avaliada | Sem rate limiting de chamadas LLM, sem cache de respostas, sem queue para processamento assíncrono |
| **Isolamento de recursos** | ❌ Ausente | Todos os agentes compartilham a mesma instância de LLM e memória — sem isolamento por tenant/usuário |

**Recomendação:** Implementar execução paralela com `asyncio.gather()` quando múltiplos agentes são candidatos. Adicionar fila (Celery ou Redis Queue) para processamento assíncrono de insights/recomendações que não precisam de resposta imediata.

### 5.2 Orquestração

| Aspecto | Avaliação | Detalhe |
|---|---|---|
| **Fluxo do Orchestrator** | ✅ Correto | contexto → roteamento → execução → crítica → memória → entrega |
| **Roteamento dinâmico** | ⚠️ Simples | `AgentRouter.route()` retorna apenas o primeiro candidato da lista. Não avalia contexto para escolher o melhor |
| **Crítica/Revisão** | ❌ Stub | `_needs_review()` checa se `content < 10 chars`. `_critique_and_refine()` retorna o mesmo resultado sem modificar |
| **Consolidação de múltiplos agentes** | ❌ Ausente | Se dois agentes respondessem em paralelo, não há lógica para consolidar as respostas |

**Recomendação:** Implementar roteamento baseado em scoring (peso do agente × relevância do contexto). Criar um `CriticAgent` que avalia respostas antes da entrega. Implementar consolidação quando múltiplos agentes respondem.

### 5.3 Separação de Agentes

| Aspecto | Avaliação | Detalhe |
|---|---|---|
| **Boundary entre agentes** | ✅ Bom | Cada agente tem `name`, `description`, `system_prompt` próprio |
| **Separação Coach/Business/Ops** | ❌ Ausente | Todos os 8 agentes estão em `src/agents/` sem separação por camada |
| **Acoplamento** | ⚠️ Médio | `BusinessAdvisor` importa diretamente 24 classes de skill — alto acoplamento |
| **Responsabilidade única** | ✅ Bom | Cada agente tem escopo claro (hábitos, leitura, bíblia, foco, etc.) |

**Recomendação:** Reorganizar em `src/coach/`, `src/business/`, `src/ops/`. Mudar `BusinessAdvisor` para carregar skills dinamicamente (lazy import ou registry pattern) em vez de importar todas no topo.

### 5.4 Memória e Contexto

| Aspecto | Avaliação | Detalhe |
|---|---|---|
| **Design de 3 camadas** | ✅ Excelente conceitualmente | Curto prazo (Redis), médio (PostgreSQL), longo (Vector DB) |
| **Implementação** | ❌ Zero | `MemoryStore.store()` e `recall()` são TODO stubs |
| **ContextManager** | ❌ Não funcional | Todos os `_fetch_*` retornam dados vazios; importa Retriever inexistente |
| **RAG** | ❌ Não existe | `src/rag/` não foi criado. Sem indexação, sem embeddings, sem busca semântica |
| **Isolamento por usuário** | ⚠️ Parcial | `UserContext` tem `user_id` mas não há garantia de que queries ao Vector DB sejam filtradas por usuário |

**Recomendação:** Implementar `MemoryStore` com Redis client real. Implementar `Retriever` com Qdrant client. Fazer `ContextManager._fetch_*` chamarem a API NestJS via HTTP. Garantir que todas as queries ao Qdrant incluam filtro `user_id`.

### 5.5 Ferramentas (Tools)

| Aspecto | Avaliação | Detalhe |
|---|---|---|
| **Agentes com acesso a tools** | ❌ Ausente | Nenhum agente tem capacidade de executar ações (criar hábito, ajustar meta, etc.) |
| **Function calling** | ❌ Não implementado | LangChain suporta tool use, mas não há definição de tools |
| **Permissões de tools** | ❌ Inexistente | Sem modelo de quais agentes podem executar quais ações |

**Recomendação:** Definir tools por agente. Ex.: `HabitCoach` pode criar/ajustar hábitos via API; `StudyPlanner` pode criar metas; `OpsAgent` pode executar ações admin (com aprovação). Implementar com LangChain tools ou function calling nativo do modelo.

### 5.6 Permissões

| Aspecto | Avaliação | Detalhe |
|---|---|---|
| **Controle de plano por agente** | ❌ Ausente | Nenhum agente verifica se o usuário tem plano Premium/Business |
| **Kairos Ops sem guard de admin** | ❌ Inexistente | Ops executa ações administrativas sem verificar se quem solicitou é admin |
| **Ações sensíveis sem aprovação** | ❌ Inexistente | Sem workflow de aprovação para ações do Ops |

**Recomendação:** Adicionar `plan_required` em cada agente. Verificar plano no `AIOrchestrator.process()` antes de rotear. Criar `ActionApproval` model para ações do Ops que requerem aprovação humana.

### 5.7 Segurança

| Aspecto | Avaliação | Detalhe |
|---|---|---|
| **Isolamento de dados entre usuários** | ⚠️ Parcial | API NestJS filtra por `userId` em queries. Kairos não tem garantia |
| **Sanitização de input** | ⚠️ Parcial | NestJS tem `ValidationPipe` com `whitelist`. Kairos não valida input |
| **Prompt injection** | ❌ Sem proteção | Mensagens do usuário vão direto para o LLM sem sanitização |
| **Rate limiting de IA** | ❌ Ausente | Sem limite de chamadas por usuário/plano |
| **Logs de auditoria de IA** | ❌ Ausentes | `KairosInteraction` registra interações mas não há AuditLog |
| **Modelo local vs cloud** | ✅ Design correto | Config suporta Ollama (local) com fallback para OpenAI |

**Recomendação:** Adicionar camada de sanitização antes do LLM. Implementar rate limiting por usuário e por plano. Criar AuditLog para todas as ações executadas por agentes (não apenas conversas).

---

## 6. PAINEL ADMINISTRATIVO

### 6.1 Estado Atual: INEXISTENTE

| Recurso | Existe? | Detalhe |
|---|---|---|
| Gestão de usuários | ❌ | Não há endpoint admin para listar, suspender, editar usuários |
| Gestão de planos/assinaturas | ❌ | Não há endpoint para alterar plano de um usuário |
| Gestão de assinaturas (pagamentos) | ❌ | Sem Stripe, sem webhook, sem portal do cliente |
| Logs | ❌ | Sem AuditLog model, sem interceptor de logging |
| Auditoria | ❌ | Sem registro de quem fez o quê e quando |
| Analytics | ❌ | Sem dashboard de métricas (MAU, retenção, conversão) |
| Aprovação de ações Kairos Ops | ❌ | Sem modelo, sem workflow, sem interface |
| Guard de admin | ❌ | Sem role no User, sem AdminGuard |

### 6.2 O Que Precisa Ser Construído

**No Prisma Schema:**
```prisma
// Adicionar role no User
model User {
  // ... campos existentes ...
  role  Role @default(USER)
}

enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}

// AuditLog
model AuditLog {
  id        String   @id @default(cuid())
  actorId   String   // quem executou (User ID ou "kairos_ops")
  action    String   // ex: "USER_SUSPENDED", "PLAN_CHANGED", "AI_ACTION_APPROVED"
  entity    String   // ex: "user", "subscription", "kairos_action"
  entityId   String?
  metadata  Json     @default("{}")
  ip        String?
  createdAt DateTime @default(now())

  @@index([actorId, createdAt])
  @@index([entity, createdAt])
  @@map("audit_logs")
}

// ActionApproval — ações sugeridas pelo Kairos Ops
model ActionApproval {
  id          String           @id @default(cuid())
  requestedBy String           // "kairos_ops" ou userId
  agentType   String           // qual agente sugeriu
  action      String           // ex: "SUSPEND_USER", "REFUND_SUBSCRIPTION"
  entityType  String           // "user", "subscription", etc.
  entityId    String
  payload     Json             @default("{}") // dados da ação
  status      ApprovalStatus   @default(PENDING)
  reviewedBy  String?          // admin userId
  reviewedAt  DateTime?
  reviewNote  String?
  createdAt   DateTime @default(now())

  @@index([status, createdAt])
  @@map("action_approvals")
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  EXECUTED
  CANCELLED
}
```

**No NestJS:**
```
apps/api/src/modules/admin/
├── admin.module.ts
├── admin.controller.ts      # Endpoints admin (todos com AdminGuard)
├── admin.service.ts          # Lógica de gestão
├── audit-log.service.ts      # Registro de auditoria
├── action-approval.service.ts # Workflow de aprovação
└── guards/
    └── admin.guard.ts         # Verifica role === ADMIN ou SUPER_ADMIN
```

**Frontend Admin:**
```
apps/admin/                    # Next.js app separado
├── src/app/
│   ├── (auth)/login/         # Login admin
│   ├── dashboard/            # Métricas gerais
│   ├── users/                # Gestão de usuários
│   ├── subscriptions/        # Gestão de assinaturas
│   ├── logs/                 # Audit logs
│   ├── approvals/            # Ações pendentes do Kairos Ops
│   └── analytics/            # Analytics e métricas
```

---

## 7. ROADMAP RECOMENDADO

### FASE 1 — Aproveitamento Imediato (Semanas 1-3)

**Objetivo:** Fazer o projeto existente executar sem erros.

| Tarefa | Esforço | Descrição |
|---|---|---|
| 1.1 Criar `__init__.py` em todos os pacotes Python | 🟢 Baixo | ~10 arquivos vazios |
| 1.2 Criar `packages/shared/` com package.json + index.ts | 🟢 Baixo | Package mínimo com tipos compartilhados |
| 1.3 Criar `packages/ui/` com package.json + index.ts | 🟢 Baixo | Package mínimo |
| 1.4 Corrigir `KairosModule` — importar `PrismaModule` | 🟢 Baixo | 1 linha |
| 1.5 Corrigir bug `books.service.ts` — updateProgress | 🟢 Baixo | Condicional: `pagesRead >= totalPages ? FINISHED : READING` |
| 1.6 Corrigir bug `goals.service.ts` — isCompleted | 🟢 Baixo | Condicional: `currentValue >= targetValue` |
| 1.7 Corrigir bug `pomodoro.service.ts` — averagePerDay | 🟢 Baixo | Calcular agrupando por dia |
| 1.8 Criar `docker-compose.yml` | 🟡 Médio | PostgreSQL, Redis, Qdrant |
| 1.9 Executar `pnpm install` + `prisma migrate dev` | 🟢 Baixo | Valida que tudo instala |
| 1.10 Criar FastAPI app (`routes.py` + `schemas.py`) | 🟡 Médio | Endpoints `/api/chat`, `/api/insights`, `/api/recommendations` |
| 1.11 Tornar import do `Retriever` condicional ou criar stub | 🟢 Baixo | Evitar crash no startup |
| 1.12 Mudar `business_advisor.py` para carregamento dinâmico | 🟡 Médio | Lazy import ou registry pattern |

**Resultado:** Projeto executa. `pnpm dev` sobte web (3000), api (4000) e kairos (8000). Banco de dados migra sem erros.

### FASE 2 — Refatoração Necessária (Semanas 4-6)

**Objetivo:** Alinhar a arquitetura com a nova visão estrutural.

| Tarefa | Esforço | Descrição |
|---|---|---|
| 2.1 Reorganizar agentes Python em `coach/`, `business/`, `ops/` | 🟡 Médio | Mover arquivos + atualizar imports |
| 2.2 Adicionar `Role` no schema Prisma + `AdminGuard` | 🟡 Médio | RBAC para admin |
| 2.3 Adicionar `AuditLog` e `ActionApproval` no schema | 🟡 Médio | Novos models |
| 2.4 Refatorar `AgentRouter` para suportar camadas | 🟡 Médio | Adicionar `layer` no roteamento (coach/business/ops) |
| 2.5 Criar `PlanGuard` no NestJS (feature gating) | 🟡 Médio | Verifica `user.plan` antes de acessar recursos |
| 2.6 Implementar `EventEmitter` para gamificação | 🟡 Médio | `@nestjs/event-emitter` + listeners que disparam XP |
| 2.7 Implementar recálculo automático de streaks | 🟡 Médio | Após log de hábito, recalcular streak |
| 2.8 Atualizar `DISCIPLINAAPP_ARQUITETURA.md` | 🟢 Baixo | Refletir Coach/Business/Ops + Admin |
| 2.9 Implementar `call_llm` real no `BaseAgent` | 🟡 Médio | Integrar Ollama ou OpenAI via LangChain |
| 2.10 Criar `src/rag/` (retriever, indexer, embeddings) | 🟡 Médio | Integração com Qdrant |

**Resultado:** Arquitetura está alinhada com a visão. Kairos tem LLM real. Gamificação funciona automaticamente. Feature gating por plano ativo.

### FASE 3 — Kairos Coach (Semanas 7-10)

**Objetivo:** IA funcional para usuários Free e Premium.

| Tarefa | Esforço | Descrição |
|---|---|---|
| 3.1 Implementar `ContextManager._fetch_*` com chamadas HTTP reais | 🟡 Médio | Buscar dados reais do usuário via API NestJS |
| 3.2 Implementar `MemoryStore` (Redis + PostgreSQL + Qdrant) | 🟡 Médio | 3 camadas de memória funcionais |
| 3.3 Refinar prompts dos 7 agentes Coach | 🟡 Médio | System prompts específicos e detalhados |
| 3.4 Implementar roteamento inteligente no `AgentRouter` | 🟡 Médio | Scoring baseado em contexto, não apenas primeiro candidato |
| 3.5 Implementar execução paralela de agentes | 🟡 Médio | `asyncio.gather` quando múltiplos agentes são candidatos |
| 3.6 Implementar `CriticAgent` para revisão de respostas | 🟡 Médio | Auto-avaliação antes da entrega |
| 3.7 Interface de chat no frontend (web) | 🟡 Médio | Componente de chat com Kairos |
| 3.8 Testes de integração Kairos ↔ NestJS | 🟡 Médio | Validar fluxo completo |

**Resultado:** Usuário conversa com Kairos. IA tem contexto real dos hábitos, leituras e sessões. Responde com insights personalizados.

### FASE 4 — Kairos Business (Semanas 11-14)

**Objetivo:** 24 skills de negócios funcionais para plano Business.

| Tarefa | Esforço | Descrição |
|---|---|---|
| 4.1 Criar 23 arquivos de skill (F2-G4) | 🟡 Médio | Prompt template + execute() para cada. Base já existe no documento original |
| 4.2 Implementar `enrich_context` e `parse_output` no `BaseSkill` | 🟡 Médio | Pydantic schemas para entrada/saída |
| 4.3 Criar interface de Business no frontend | 🟡 Médio | Tabs/seções para cada categoria (Financeiro, Vendas, etc.) |
| 4.4 Implementar `PlanGuard` verificando plano Business | 🟢 Baixo | Guard nos endpoints de skills |
| 4.5 Testes de skills | 🟢 Baixo | Validar prompts com inputs de exemplo |

**Resultado:** Usuário Business acessa as 24 skills. Cada skill coleta contexto, chama LLM, entrega resposta estruturada.

### FASE 5 — Kairos Ops (Semanas 15-18)

**Objetivo:** IA para automações administrativas com aprovação humana.

| Tarefa | Esforço | Descrição |
|---|---|---|
| 5.1 Criar `OpsAgent` (diagnóstico, automação, monitoramento) | 🟡 Médio | Agente que analisa plataforma e sugere ações |
| 5.2 Implementar workflow de `ActionApproval` | 🟡 Médio | Ops sugere → status PENDING → admin aprova → executa |
| 5.3 Criar `AuditLog` interceptor no NestJS | 🟡 Médio | Registra toda ação administrativa |
| 5.4 Implementar notificações para admins | 🟡 Médio | Avisar quando há ação pendente |
| 5.5 Implementar tools do Ops (function calling) | 🟡 Médio | Suspend user, refund, adjust plan, etc. |
| 5.6 Testes de workflow de aprovação | 🟢 Baixo | Validar fluxo pendente → aprovado → executado |

**Resultado:** Kairos Ops monitora a plataforma, sugere ações, admin aprova antes da execução. Tudo auditado.

### FASE 6 — Escala e Monetização (Semanas 19+)

**Objetivo:** Produto pronto para escala comercial.

| Tarefa | Esforço | Descrição |
|---|---|---|
| 6.1 Integrar Stripe (pagamentos) | 🟡 Médio | Webhooks, portal do cliente, upgrade/downgrade |
| 6.2 Criar painel admin completo | 🟡 Médio | Dashboard com MAU, retenção, conversão, receita |
| 6.3 Implementar rate limiting por plano | 🟢 Baixo | `@nestjs/throttler` com limites diferenciados |
| 6.4 Adicionar observabilidade (Sentry + OTel) | 🟡 Médio | Tracing distribuído web → api → kairos |
| 6.5 Otimizar para produção | 🟡 Médio | Caching, connection pooling, health checks |
| 6.6 App mobile (React Native / Expo) | 🟡 Médio | Compartilhamento de código com web |
| 6.7 LGPD — exportação e exclusão de dados | 🟢 Baixo | Endpoints `/data/export` e `/data/delete` |
| 6.8 API pública do Kairos | 🟡 Médio | Documentação OpenAPI, rate limiting, API keys |

**Resultado:** Produto comercializável. Pagamentos funcionais. Admin tem visão completa. Pronto para usuários reais.

---

## RESUMO FINAL

| Dimensão | Status | Nota |
|---|---|---|
| **Estrutura arquitetural** | ✅ Sólida | Decisões conceituais corretas e bem documentadas |
| **Código executável** | ❌ Não roda | 25+ imports quebrados, 0 `__init__.py`, packages inexistentes |
| **Kairos Coach** | ⚠️ 60% estruturado | Agentes existem mas sem LLM, memória ou contexto real |
| **Kairos Business** | ⚠️ 5% implementado | Apenas 1 de 24 skills criada |
| **Kairos Ops** | ❌ Inexistente | Zero estrutura para automações admin |
| **Painel Admin** | ❌ Inexistente | Sem módulo, sem guard, sem schema |
| **Gamificação** | ⚠️ Inerte | XP existe mas nunca é disparada por ações |
| **Segurança IA** | ❌ Insuficiente | Sem prompt sanitization, rate limiting, audit log |
| **Reaproveitamento** | ✅ ~80% do esqueleto | Estrutura é sólida; código precisa ser completado |

**Recomendação principal:** Seguir o roadmap de 6 fases. A Fase 1 (aproveitamento imediato) é crítica e de baixo esforço — resolve todos os imports quebrados e faz o projeto executar. A partir daí, cada fase adiciona uma camada de valor sem descartar o trabalho anterior.

---

*Auditoria técnica — DisciplinaApp — 17/06/2026*
