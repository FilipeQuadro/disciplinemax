# DisciplinaApp

> Plataforma SaaS de desenvolvimento de hábitos, leitura, produtividade e IA pessoal.
> **Kairos** é a inteligência artificial nativa da plataforma.

## Visão

O DisciplinaApp consolida em um único ecossistema: acompanhamento de leitura (livros + Bíblia), sessões de foco (Pomodoro), controle de hábitos e streaks, gamificação (XP, níveis, conquistas) e um coach de IA pessoal chamado **Kairos**.

## Arquitetura

```
disciplina-app/
├── apps/
│   ├── web/          # Frontend (Next.js 14+)
│   ├── api/          # Backend (NestJS + Prisma + PostgreSQL)
│   └── kairos/       # Serviço de IA (Python + FastAPI)
├── packages/
│   ├── shared/       # Tipos e contratos compartilhados (TS)
│   └── ui/           # Design system (React)
├── docs/             # Documentação e arquitetura
├── DISCIPLINAAPP_ARQUITETURA.md   # Documento técnico completo
└── turbo.json        # Config do monorepo
```

## Pré-requisitos

- Node.js >= 20
- pnpm >= 9
- Python >= 3.11
- PostgreSQL >= 15
- Redis >= 7 (para cache do Kairos)
- [Opcional] Ollama (para modelos locais do Kairos)

## Setup Rápido

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Configurar banco de dados
cd apps/api && npx prisma migrate dev && cd ../..

# 4. Rodar tudo em paralelo
pnpm dev

# Ou rodar individualmente:
pnpm dev:web      # Frontend na porta 3000
pnpm dev:api      # Backend na porta 4000
pnpm dev:kairos   # Kairos na porta 8000
```

## Estrutura dos Módulos

### Core (Produto)
| Módulo | Descrição |
|---|---|
| 📖 Leitura de Livros | Cadastro, metas, progresso, histórico de ritmo |
| ✝️ Leitura Bíblica | Planos de leitura, capítulos lidos, consistência |
| ⏱️ Pomodoro | Sessões de foco, intervalos, métricas de produtividade |
| 🔥 Consistência | Streaks, frequência, regularidade, evolução temporal |
| 🏆 Gamificação | XP, níveis, conquistas, desafios |
| 📊 Metas | Definição e acompanhamento de metas pessoais |

### Kairos (IA Nativa)
| Agente | Função |
|---|---|
| HabitCoach | Acompanha streaks, sugere ajustes |
| ReadingCoach | Planeja leituras, analisa ritmo |
| BibleCoach | Planos bíblicos, consistência espiritual |
| FocusCoach | Otimiza Pomodoro, analisa produtividade |
| PerformanceAnalyst | Cruzamento de métricas, insights |
| Motivator | Gatilhos contextuais em momentos de baixa |
| StudyPlanner | Trilhas automatizadas, cronogramas |
| BusinessAdvisor | 24 skills de gestão (Premium/Business) |

## Documentação

- [Arquitetura completa](./DISCIPLINAAPP_ARQUITETURA.md)
- [Roadmap](./docs/roadmap/ROADMAP.md)
- [API do Kairos](./docs/kairos/KAIROS_API.md)
- [ADRs](./docs/architecture/)

## Desenvolvimento rápido

Scripts de auxílio para desenvolvimento e testes locais:

- `scripts/populate_data.js` — popula dados mínimos (hábitos, livros, pomodoro, metas).
- `scripts/seed_full.js` — seed mais abrangente (histórico, múltiplas sessões e logs).
- `scripts/generate_inject_snippet.js` — gera snippet para injetar JWT + usuário no `localStorage`.
- `scripts/e2e_check.js` — E2E simples que roda `seed_full` e valida `/api/kairos/context`.

CI: existe um workflow GitHub Actions em `.github/workflows/ci.yml` que executa a verificação E2E.

## Licença

Privado. © 2026 DisciplinaApp.
