# DisciplinaApp — Documento de Arquitetura Técnica

> Plataforma SaaS unificada de desenvolvimento de hábitos, leitura, produtividade e IA pessoal.
> Kairos é a inteligência artificial nativa da plataforma.

---

## 1. Visão Geral

O DisciplinaApp consolida quatro fontes em um único ecossistema coeso:

| Fonte Original | Papel no Ecossistema |
|---|---|
| **DisciplinaApp** (apresentação) | Produto principal — módulos core de hábitos, leitura, Bíblia, Pomodoro, gamificação |
| **Kairós AI** (documento) | IA nativa — arquitetura multi-agente reutilizada como coach pessoal |
| **Claude para Pequenos Negócios** (24 skills) | Capacidades do Kairos — prompts orquestrados como agentes funcionais |
| **Briefing do Squad** (framework) | Padrão de orquestração multi-agente do Kairos |

### Princípios de Design

1. **Local-first onde possível** — dados do usuário ficam no dispositivo; sync opcional
2. **Privacy-first** — IA opera com modelos locais ou edge quando disponíveis; dados sensíveis nunca saem do dispositivo sem consentimento
3. **Monorepo** — frontend, backend e IA no mesmo repositório para coerência
4. **Multi-agente** — Kairos orquestra agentes especialistas, não um único modelo monolítico
5. **Escalável** — arquitetura modular que permite adicionar módulos sem refatorar o core

---

## 2. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    DisciplinaApp (SaaS)                    │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │   Web App    │   │  Mobile App  │   │   API REST   │  │
│  │  (Next.js)   │   │   (React     │   │  (NestJS)    │  │
│  │              │   │   Native)    │   │              │  │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘  │
│         │                  │                   │           │
│         └──────────┬───────┘                   │           │
│                    │                           │           │
│              ┌─────▼─────┐              ┌──────▼───────┐  │
│              │   BFF /    │              │  PostgreSQL  │  │
│              │  Gateway   │              │   (Prisma)   │  │
│              └─────┬─────┘              └──────────────┘  │
│                    │                                       │
│         ┌──────────▼──────────┐                           │
│         │      KAIROS IA      │                           │
│         │  (Serviço Python)   │                           │
│         │                      │                           │
│         │  ┌───────────────┐  │                           │
│         │  │AIOrchestrator │  │                           │
│         │  └──────┬────────┘  │                           │
│         │         │            │                           │
│         │  ┌──────▼────────┐   │                           │
│         │  │ Multi-Agente  │   │                           │
│         │  │   Hub        │   │                           │
│         │  └──────┬────────┘   │                           │
│         │    ┌────┼────┐       │                           │
│         │    ▼    ▼    ▼       │                           │
│         │  Agent Agent Agent   │                           │
│         │   #1    #2    #3     │                           │
│         └─────────────────────┘                           │
│                    │                                       │
│         ┌──────────▼──────────┐                           │
│         │  Vector DB (Qdrant)  │                           │
│         │  + Redis (Cache)     │                           │
│         └─────────────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Stack Tecnológica

| Camada | Tecnologia | Motivo |
|---|---|---|
| **Monorepo** | Turborepo + pnpm | Build caching, gestão de workspaces, paralelismo |
| **Frontend Web** | Next.js 14+ (App Router) | SSR, SEO, RSC, deploy no Vercel |
| **Mobile** | React Native (Expo) | Compartilhamento de código com web, deploy OTA |
| **Backend API** | NestJS (TypeScript) | Arquitetura modular, DI, decorators, OpenAPI |
| **ORM** | Prisma | Type-safe, migrations, intellisense |
| **Banco Principal** | PostgreSQL | Relacional, robusto, JSONB para flexibilidade |
| **IA / Kairos** | Python + FastAPI | Ecossistema ML/LangChain, tipagem, async |
| **Vector DB** | Qdrant | RAG, busca semântica, open-source, local-first |
| **Cache / Queue** | Redis | Cache de contexto, filas de agentes, pub/sub |
| **Auth** | Supabase Auth ou Clerk | Gerenciamento de sessão, OAuth, multitenant |
| **Deploy** | Vercel (web) + Railway (api/kairos) | Escala automática, preview deploys |
| **Observabilidade** | Sentry + OpenTelemetry | Erros, tracing, métricas |

---

## 4. Estrutura do Monorepo

```
disciplina-app/
├── apps/
│   ├── web/                    # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/            # App Router (páginas)
│   │   │   ├── components/     # Componentes UI
│   │   │   ├── hooks/          # Hooks customizados
│   │   │   ├── lib/            # Utils, API client
│   │   │   └── stores/         # Zustand stores
│   │   ├── public/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                    # Backend NestJS
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # Autenticação
│   │   │   │   ├── users/      # Usuários
│   │   │   │   ├── books/      # Leitura de livros
│   │   │   │   ├── bible/      # Leitura bíblica
│   │   │   │   ├── pomodoro/   # Sessões de foco
│   │   │   │   ├── habits/     # Hábitos e streaks
│   │   │   │   ├── gamification/  # XP, níveis, conquistas
│   │   │   │   ├── goals/      # Metas
│   │   │   │   └── kairos/     # Proxy para o serviço de IA
│   │   │   ├── common/         # Guards, interceptors, filters
│   │   │   ├── config/        # Configurações
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Schema do banco
│   │   │   └── migrations/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── kairos/                 # Serviço de IA (Python)
│       ├── src/
│       │   ├── core/
│       │   │   ├── orchestrator.py    # AIOrchestrator
│       │   │   ├── context_manager.py # Gerenciamento de contexto
│       │   │   ├── router.py          # Roteamento de agentes
│       │   │   └── memory.py          # Memória persistente
│       │   ├── agents/
│       │   │   ├── base_agent.py      # Classe base
│       │   │   ├── habit_coach.py     # Coach de Hábitos
│       │   │   ├── reading_coach.py   # Coach de Leitura
│       │   │   ├── bible_coach.py     # Coach Espiritual
│       │   │   ├── focus_coach.py     # Coach de Foco
│       │   │   ├── performance_analyst.py  # Analista de Desempenho
│       │   │   ├── motivator.py       # Motivador
│       │   │   ├── study_planner.py   # Planejador de Estudos
│       │   │   └── business_advisor.py  # Consultor de Negócios (24 skills)
│       │   ├── skills/                # 24 skills adaptadas
│       │   │   ├── financial/          # F1-F4
│       │   │   ├── commercial/         # C1-C4
│       │   │   ├── sales/             # V1-V4
│       │   │   ├── marketing/         # M1-M4
│       │   │   ├── support/           # A1-A4
│       │   │   └── management/        # G1-G4
│       │   ├── rag/
│       │   │   ├── indexer.py         # Indexação de dados do usuário
│       │   │   ├── retriever.py       # Busca semântica
│       │   │   └── embeddings.py      # Geração de embeddings
│       │   ├── api/
│       │   │   ├── routes.py          # Endpoints FastAPI
│       │   │   └── schemas.py         # Pydantic schemas
│       │   └── config.py
│       ├── tests/
│       ├── requirements.txt
│       └── pyproject.toml
│
├── packages/
│   ├── shared/                 # Tipos e contratos compartilhados
│   │   ├── src/
│   │   │   ├── types/          # Interfaces TypeScript
│   │   │   ├── constants/      # Constantes do app
│   │   │   └── utils/          # Utils puras
│   │   └── package.json
│   │
│   └── ui/                     # Design system compartilhado
│       ├── src/
│       │   ├── components/     # Botões, inputs, cards, etc.
│       │   ├── theme/          # Tokens de design
│       │   └── icons/         # Ícones customizados
│       └── package.json
│
├── docs/
│   ├── architecture/          # Diagramas, ADRs
│   ├── kairos/                 # Docs da IA
│   ├── api/                    # Documentação de API
│   └── roadmap/                # Planejamento
│
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 5. Schemas de Dados (Prisma)

### 5.1 Usuários e Autenticação

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  avatarUrl     String?
  plan          Plan     @default(FREE)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  books         Book[]
  bibleReadings BibleReading[]
  pomodoroSessions PomodoroSession[]
  habits        Habit[]
  goals         Goal[]
  achievements  UserAchievement[]
  kairosInteractions KairosInteraction[]
  kairosProfile KairosProfile?

  @@map("users")
}

enum Plan {
  FREE
  PREMIUM
  BUSINESS
}
```

### 5.2 Leitura de Livros

```prisma
model Book {
  id            String   @id @default(cuid())
  userId        String
  title         String
  author        String?
  coverUrl      String?
  totalPages     Int
  pagesRead     Int      @default(0)
  status        BookStatus @default(READING)
  startedAt     DateTime @default(now())
  finishedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("books")
}

enum BookStatus {
  WANTS_TO_READ
  READING
  FINISHED
  PAUSED
  ABANDONED
}
```

### 5.3 Leitura Bíblica

```prisma
model BibleReading {
  id            String   @id @default(cuid())
  userId        String
  book          String   // ex: "Gênesis", "Mateus"
  chapter       Int
  readAt        DateTime @default(now())
  planId        String?  // Referência a plano de leitura

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, book, chapter]) // Evita duplicação
  @@map("bible_readings")
}

model BibleReadingPlan {
  id            String   @id @default(cuid())
  name          String
  description   String?
  totalChapters Int
  durationDays  Int
  isDefault     Boolean  @default(false)
}
```

### 5.4 Pomodoro

```prisma
model PomodoroSession {
  id            String   @id @default(cuid())
  userId        String
  durationMin   Int      // Duração da sessão
  breakMin      Int      // Duração do intervalo
  type          SessionType @default(FOCUS)
  taskId        String?  // Relaciona com tarefa/meta
  startedAt     DateTime @default(now())
  completedAt   DateTime?
  isCompleted   Boolean  @default(false)

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("pomodoro_sessions")
}

enum SessionType {
  FOCUS
  SHORT_BREAK
  LONG_BREAK
}
```

### 5.5 Hábitos e Streaks

```prisma
model Habit {
  id            String   @id @default(cuid())
  userId        String
  name          String
  description   String?
  icon          String?
  color         String?
  frequency     HabitFrequency @default(DAILY)
  targetCount   Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  logs          HabitLog[]
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("habits")
}

model HabitLog {
  id            String   @id @default(cuid())
  habitId       String
  userId        String
  date          DateTime @db.Date
  count         Int      @default(1)
  note          String?
  createdAt     DateTime @default(now())

  habit         Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)

  @@unique([habitId, date])
  @@map("habit_logs")
}

enum HabitFrequency {
  DAILY
  WEEKLY
  MONTHLY
  CUSTOM
}

model Streak {
  id            String   @id @default(cuid())
  userId        String
  type          StreakType
  currentCount  Int      @default(0)
  bestCount     Int      @default(0)
  lastActiveDate DateTime @db.Date
  updatedAt     DateTime @updatedAt

  @@unique([userId, type])
  @@map("streaks")
}

enum StreakType {
  APP_ACCESS
  BOOK_READING
  BIBLE_READING
  POMODORO
  HABIT_COMPLETION
}
```

### 5.6 Gamificação

```prisma
model UserAchievement {
  id            String   @id @default(cuid())
  userId        String
  achievementId String
  unlockedAt    DateTime @default(now())

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, achievementId])
  @@map("user_achievements")
}

model Achievement {
  id            String   @id @default(cuid())
  code          String   @unique
  name          String
  description   String
  iconUrl       String?
  xpReward      Int      @default(0)
  tier          AchievementTier @default(BRONZE)
}

enum AchievementTier {
  BRONZE
  SILVER
  GOLD
  PLATINUM
  DIAMOND
}

model UserLevel {
  userId        String   @id
  xp            Int      @default(0)
  level         Int      @default(1)
  updatedAt     DateTime @updatedAt
}
```

### 5.7 Kairos (IA)

```prisma
model KairosProfile {
  userId        String   @id
  personality   String   @default("encorajador") // tom da IA
  preferences  Json     @default("{}") // preferências do usuário
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model KairosInteraction {
  id            String   @id @default(cuid())
  userId        String
  agentType     String   // Qual agente respondeu
  messageType   String   // "insight" | "motivation" | "recommendation" | "plan"
  content       String
  metadata      Json     @default("{}")
  createdAt     DateTime @default(now())

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("kairos_interactions")
}
```

---

## 6. API REST — Endpoints Principais

### 6.1 Autenticação

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cadastro de usuário |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Renovar token |
| GET | `/auth/me` | Dados do usuário logado |

### 6.2 Leitura de Livros

| Método | Rota | Descrição |
|---|---|---|
| GET | `/books` | Listar livros do usuário |
| POST | `/books` | Cadastrar novo livro |
| PATCH | `/books/:id` | Atualizar progresso (pagesRead) |
| DELETE | `/books/:id` | Remover livro |
| GET | `/books/stats` | Estatísticas de leitura |

### 6.3 Leitura Bíblica

| Método | Rota | Descrição |
|---|---|---|
| GET | `/bible/readings` | Histórico de leitura |
| POST | `/bible/readings` | Registrar capítulo lido |
| DELETE | `/bible/readings/:id` | Remover registro |
| GET | `/bible/plans` | Planos de leitura disponíveis |
| POST | `/bible/plans/:id/subscribe` | Inscrever em plano |
| GET | `/bible/progress` | Progresso consolidado |

### 6.4 Pomodoro

| Método | Rota | Descrição |
|---|---|---|
| POST | `/pomodoro/sessions` | Iniciar sessão |
| PATCH | `/pomodoro/sessions/:id` | Concluir/cancelar sessão |
| GET | `/pomodoro/sessions` | Histórico de sessões |
| GET | `/pomodoro/stats` | Estatísticas de foco |

### 6.5 Hábitos e Streaks

| Método | Rota | Descrição |
|---|---|---|
| GET | `/habits` | Listar hábitos |
| POST | `/habits` | Criar hábito |
| PATCH | `/habits/:id` | Editar hábito |
| DELETE | `/habits/:id` | Remover hábito |
| POST | `/habits/:id/log` | Registrar execução |
| GET | `/habits/:id/streak` | Streak do hábito |
| GET | `/streaks` | Todos os streaks do usuário |

### 6.6 Gamificação

| Método | Rota | Descrição |
|---|---|---|
| GET | `/gamification/level` | Nível e XP atual |
| GET | `/gamification/achievements` | Conquistas desbloqueadas |
| GET | `/gamification/achievements/available` | Conquistas disponíveis |
| GET | `/gamification/challenges` | Desafios ativos |

### 6.7 Kairos (IA)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/kairos/chat` | Conversa direta com Kairos |
| POST | `/kairos/insights` | Solicitar insights personalizados |
| POST | `/kairos/recommendations` | Solicitar recomendações |
| POST | `/kairos/plan` | Criar plano de estudo/leitura |
| GET | `/kairos/interactions` | Histórico de interações |
| GET | `/kairos/profile` | Perfil e preferências da IA |
| PATCH | `/kairos/profile` | Ajustar personalidade/preferências |
| POST | `/kairos/skills/:skillId/execute` | Executar skill específica (Premium) |

---

## 7. Arquitetura do Kairos (IA Nativa)

### 7.1 Visão Geral

O Kairos é o motor de inteligência do DisciplinaApp. Ele herda três princípios do Kairós AI original:

1. **Contexto Inteligente** — constrói contexto a partir dos dados do usuário (hábitos, leituras, sessões)
2. **Arquitetura Local-First** — prioriza modelos locais (Ollama) ou edge; fallback para API
3. **Orquestração Centralizada** — um `AIOrchestrator` coordena todo o fluxo de IA

E adota o padrão **multi-agente** do Briefing do Squad: cada agente é um especialista com função, regras e memória próprias.

### 7.2 AIOrchestrator

```python
class AIOrchestrator:
    """
    Núcleo unificado do Kairos.
    Coordena: contexto -> roteamento -> execução do agente -> crítica -> entrega.
    """

    def __init__(self):
        self.context_manager = ContextManager()
        self.router = AgentRouter()
        self.memory = MemoryStore()

    async def process(self, user_id: str, request: KairosRequest) -> KairosResponse:
        # 1. Construir contexto do usuário
        context = await self.context_manager.build(user_id, request)

        # 2. Roteamento: qual agente deve responder?
        agent = self.router.route(request.type, context)

        # 3. Executar agente com contexto
        result = await agent.execute(context, request)

        # 4. Crítica e revisão (auto-avaliação)
        if self.needs_review(result):
            result = await self.critique_and_refine(result, agent)

        # 5. Persistir na memória
        await self.memory.store(user_id, request, result)

        # 6. Entregar resposta
        return KairosResponse(
            content=result.content,
            agent=agent.name,
            metadata=result.metadata,
        )
```

### 7.3 Agentes Especialistas

Cada agente herda de `BaseAgent` e implementa `execute()`:

| Agente | Função | Dados que consome | Output |
|---|---|---|---|
| `HabitCoach` | Acompanha streaks, sugere ajustes de rotina | HabitLog, Streak | Insights, sugestões de ajuste |
| `ReadingCoach` | Planeja leituras, analisa ritmo | Book, páginas lidas | Cronograma, próximas leituras |
| `BibleCoach` | Planos bíblicos, consistência espiritual | BibleReading, BibleReadingPlan | Plano diário, progresso |
| `FocusCoach` | Otimiza Pomodoro, analisa produtividade | PomodoroSession | Recomendações de sessão, horários ótimos |
| `PerformanceAnalyst` | Cruzamento de métricas, insights preditivos | Todos os dados | Relatórios, tendências, alertas |
| `Motivator` | Gatilhos contextuais em momentos de baixa | Streak (queda), inatividade | Mensagens motivacionais |
| `StudyPlanner` | Trilhas automatizadas, cronogramas | Goals, Book, BibleReading | Plano de estudo estruturado |
| `BusinessAdvisor` | 24 skills de gestão e negócios (Premium) | Dados de negócio do usuário | Análises, propostas, scripts, planos |

### 7.4 AgentRouter — Roteamento Dinâmico

```python
class AgentRouter:
    """
    Determina qual agente deve responder com base no tipo de request
    e no contexto do usuário.
    """

    ROUTING_RULES = {
        "habit_question": ["habit_coach", "performance_analyst"],
        "reading_plan": ["reading_coach", "study_planner"],
        "bible_guidance": ["bible_coach"],
        "focus_optimization": ["focus_coach"],
        "performance_report": ["performance_analyst"],
        "motivation_needed": ["motivator"],
        "study_plan": ["study_planner", "reading_coach"],
        "business_help": ["business_advisor"],
        "general_chat": ["habit_coach", "reading_coach", "focus_coach"],
    }

    def route(self, request_type: str, context: UserContext) -> BaseAgent:
        candidates = self.ROUTING_RULES.get(request_type, ["habit_coach"])
        # Seleciona o agente mais adequado com base no contexto
        ...
```

### 7.5 RAG — Busca Semântica nos Dados do Usuário

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Dados do  │────▶│  Indexer     │────▶│  Qdrant  │
│ Usuário   │     │ (embeddings) │     │ VectorDB │
└──────────┘     └──────────────┘     └────┬─────┘
                                            │
┌──────────┐     ┌──────────────┐          │
│ Request  │────▶│  Retriever   │◀─────────┘
│ do User  │     │ (busca sem.) │
└──────────┘     └──────┬───────┘
                        │
                 ┌──────▼───────┐
                 │  Contexto    │
                 │  Enriquecido │
                 └──────────────┘
```

O RAG indexa continuamente:
- Logs de hábitos (quando, qual, frequência)
- Registros de leitura (livro, capítulo, ritmo)
- Sessões Pomodoro (duração, horário, tarefa)
- Interações anteriores com Kairos
- Metas e progresso

Isso permite que o Kairos responda: *"Na última vez que você leu 20 páginas por dia, você manteve o foco por 3 sessões Pomodoro. Quer retomar esse ritmo?"*

### 7.6 Memória Persistente

O Kairos mantém três camadas de memória:

| Camada | Armazenamento | Conteúdo | TTL |
|---|---|---|---|
| **Curto prazo** | Redis (sessão) | Contexto da conversa atual | 24h |
| **Médio prazo** | PostgreSQL | Interações recentes, preferências ajustadas | 90 dias |
| **Longo prazo** | Vector DB (Qdrant) | Perfil do usuário, padrões de comportamento | Permanente |

---

## 8. Mapeamento das 24 Skills → Kairos

As 24 skills do "Claude para Pequenos Negócios" são absorvidas como capacidades do `BusinessAdvisor`, disponíveis para usuários **Premium**.

### 8.1 Financeiro (F1-F4)

| Skill Original | Capacidade Kairos | Trigger |
|---|---|---|
| F1 Consultor de Precificação | `kairos.business.pricing` | Usuário pede análise de preço |
| F2 Analisador de Fluxo de Caixa | `kairos.business.cashflow` | Usuário registra entradas/saídas |
| F3 Explicador Financeiro | `kairos.business.education` | Usuário pergunta sobre termo financeiro |
| F4 Planejador de Metas Financeiras | `kairos.business.goals` | Usuário define meta de faturamento |

### 8.2 Comercial (C1-C4)

| Skill Original | Capacidade Kairos | Trigger |
|---|---|---|
| C1 Montador de Proposta | `kairos.business.proposal` | Usuário solicita proposta |
| C2 Script de Vendas | `kairos.business.sales_script` | Usuário pede roteiro de vendas |
| C3 Follow-up Inteligente | `kairos.business.followup` | Usuário marca proposta como enviada |
| C4 Análise de Cliente Ideal | `kairos.business.icp` | Usuário cadastra clientes |

### 8.3 Vendas (V1-V4)

| Skill Original | Capacidade Kairos | Trigger |
|---|---|---|
| V1 Qualificador de Lead | `kairos.business.lead_qualify` | Novo lead cadastrado |
| V2 Contorno de Objeções | `kairos.business.objections` | Usuário registra objeção |
| V3 Reativador de Cliente | `kairos.business.reactivate` | Cliente marcado como inativo |
| V4 Argumentos por Perfil | `kairos.business.profiles` | Usuário descreve cliente |

### 8.4 Marketing (M1-M4)

| Skill Original | Capacidade Kairos | Trigger |
|---|---|---|
| M1 Calendário Editorial | `kairos.business.calendar` | Usuário pede plano de conteúdo |
| M2 Legendas e Posts | `kairos.business.copywriting` | Usuário solicita legenda |
| M3 Roteiro de Reels | `kairos.business.video_script` | Usuário pede roteiro de vídeo |
| M4 Análise de Campanha | `kairos.business.campaign_analysis` | Usuário informa métricas |

### 8.5 Atendimento (A1-A4)

| Skill Original | Capacidade Kairos | Trigger |
|---|---|---|
| A1 Roteiro WhatsApp | `kairos.business.whatsapp_script` | Usuário configura atendimento |
| A2 Respostas Google | `kairos.business.review_response` | Nova avaliação recebida |
| A3 FAQ Inteligente | `kairos.business.faq` | Usuário cadastra dúvidas frequentes |
| A4 Script de Agendamento | `kairos.business.scheduling` | Usuário configura agendamento |

### 8.6 Gestão (G1-G4)

| Skill Original | Capacidade Kairos | Trigger |
|---|---|---|
| G1 Rotina Semanal | `kairos.business.weekly_routine` | Início da semana / domingo |
| G2 Checklist Operacional | `kairos.business.checklist` | Usuário cria processo |
| G3 Reunião Rápida | `kairos.business.meeting` | Usuário agenda reunião |
| G4 Delegação com Clareza | `kairos.business.delegation` | Usuário delega tarefa |

### 8.7 Arquitetura de Skills

Cada skill é implementada como um **prompt template + schema de entrada/saída**:

```python
@skill(
    id="F1",
    name="Consultor de Precificação",
    category="financial",
    plan_required="PREMIUM",
)
class PricingSkill(BaseSkill):
    """
    Descobre se o usuário está cobrando o preço certo.
    """

    INPUT_SCHEMA = PricingInput  # Pydantic model
    OUTPUT_SCHEMA = PricingOutput

    SYSTEM_PROMPT = """Você é um consultor de precificação para pequenos negócios brasileiros.
    Seu papel é ajudar o dono a descobrir se está cobrando o preço certo.

    REGRA PRINCIPAL:
    Nunca responda com análise ou cálculo sem ter os dados necessários.
    Se o usuário for vago, faça perguntas antes de concluir.

    COLETA DE CONTEXTO:
    - O que é o produto ou serviço?
    - Qual o preço atual cobrado?
    - Quais os custos diretos por unidade?
    - Quais os custos fixos mensais?
    - Quantas unidades/atendimentos por mês?
    - O negócio paga imposto? Qual regime?
    - Qual margem de lucro o dono considera justa?
    - Como o mercado local precifica o mesmo produto?

    ENTREGA:
    - Tabela: preço mínimo / preço recomendado / preço atual
    - Diagnóstico em uma linha
    - Máximo 2 sugestões práticas
    """

    async def execute(self, context: UserContext, inputs: PricingInput) -> PricingOutput:
        # 1. Enriquecer contexto com dados do usuário (se disponível)
        enriched = await self.enrich_context(context, inputs)

        # 2. Chamar LLM com system prompt + contexto
        response = await self.llm.generate(
            system=self.SYSTEM_PROMPT,
            context=enriched,
            user_input=inputs.user_message,
        )

        # 3. Estruturar resposta
        return self.parse_output(response)
```

---

## 9. Modelo SaaS

### 9.1 Planos

| Recurso | Free | Premium | Business |
|---|:---:|:---:|:---:|
| Leitura de livros (até 3) | ✅ | ✅ | ✅ |
| Leitura bíblica | ✅ | ✅ | ✅ |
| Pomodoro | ✅ | ✅ | ✅ |
| Streaks e consistência | ✅ | ✅ | ✅ |
| Gamificação básica | ✅ | ✅ | ✅ |
| Kairos — insights diários | — | ✅ | ✅ |
| Kairos — coaching avançado | — | ✅ | ✅ |
| Analytics cruzados | — | ✅ | ✅ |
| Metas inteligentes preditivas | — | ✅ | ✅ |
| Desafios exclusivos | — | ✅ | ✅ |
| 24 Skills de negócios | — | — | ✅ |
| Múltiplos hábitos ilimitados | — | ✅ | ✅ |
| Comunidades | — | Futuro | Futuro |

### 9.2 Gatilhos de Upsell (Kairos)

O Kairos identifica naturalmente quando o usuário poderia se beneficiar de recursos Premium:

- Usuário no plano Free mantém 7+ dias de streak → Kairos sugere Premium para insights avançados
- Usuário menciona ter um negócio → Kairos sugere plano Business
- Usuário atinge limite de 3 livros → Kairos sugere Premium para leituras ilimitadas

---

## 10. Roadmap

### Fase 1 — MVP (Semanas 1-6)
- [ ] Setup do monorepo (Turborepo + pnpm)
- [ ] Auth (registro, login, refresh)
- [ ] Módulo de Leitura de Livros (CRUD + progresso)
- [ ] Módulo de Leitura Bíblica (registro + planos básicos)
- [ ] Pomodoro (iniciar, pausar, concluir, histórico)
- [ ] Streaks (contagem automática)
- [ ] Gamificação básica (XP, níveis)

### Fase 2 — Kairos Core (Semanas 7-10)
- [ ] Serviço Python (FastAPI) + AIOrchestrator
- [ ] ContextManager (build de contexto a partir dos dados)
- [ ] AgentRouter (roteamento básico)
- [ ] Agentes: HabitCoach, ReadingCoach, Motivator
- [ ] RAG básico (indexação de dados do usuário)
- [ ] Integração com NestJS (proxy `/kairos/*`)

### Fase 3 — Premium (Semanas 11-14)
- [ ] PerformanceAnalyst (cruzamento de métricas)
- [ ] FocusCoach (otimização de Pomodoro)
- [ ] BibleCoach (planos de leitura inteligentes)
- [ ] StudyPlanner (trilhas automatizadas)
- [ ] Analytics dashboard
- [ ] Sistema de pagamentos (Stripe)

### Fase 4 — Business (Semanas 15-18)
- [ ] BusinessAdvisor agent
- [ ] Implementação das 24 skills (F1-G4)
- [ ] Interface de negócios (cadastro de clientes, propostas, etc.)
- [ ] Integração com WhatsApp (notificações)

### Fase 5 — Expansão (Semanas 19+)
- [ ] App mobile (React Native / Expo)
- [ ] Comunidades e rankings
- [ ] API pública do Kairos
- [ ] Integração com wearables
- [ ] Modo offline (local-first completo)

---

## 11. Padrão de Orquestração Multi-Agente (Herdado do Squad)

O Briefing do Squad define um padrão de agentes com:
- **Identidade** (quem é, o que faz)
- **Regras** (o que pode e não pode fazer)
- **Memória** (contexto persistente)
- **Processo** (quem aciona quem)

### Mapeamento Squad → Kairos

| Papel no Squad | Equivalente no Kairos | Função |
|---|---|---|
| Atendimento (Sônia) | `OnboardingAgent` | Recebe novo usuário, configura perfil inicial |
| Inteligência (Maria/João) | `PerformanceAnalyst` | Lê dados do usuário, gera diagnóstico |
| Estratégia (Ana/Lucas) | `StudyPlanner` | Cria planos, define cronogramas |
| Criação (Gabriel, etc.) | `Motivator` | Gera conteúdo motivacional personalizado |
| Performance (José, etc.) | `FocusCoach` | Otimiza produtividade, analisa foco |
| Transversal (Francisco, etc.) | `AIOrchestrator` | Coordena, revisa, entrega |

### Fluxo de Orquestração

```
Usuário: "Não estou conseguindo manter o ritmo de leitura"
     │
     ▼
┌──────────────┐
│AIOrchestrator│
└──────┬───────┘
       │ 1. Constrói contexto (RAG + perfil)
       ▼
┌──────────────┐
│AgentRouter   │ → identifica: problema de leitura + motivação
└──────┬───────┘
       │ 2. Roteia para 2 agentes
       ▼
┌─────────────────────────────────────────┐
│              Paralelo                    │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ReadingCoach  │  │  Motivator   │    │
│  │(ajusta plano)│  │(gatilho de   │    │
│  │              │  │ ânimo)       │    │
│  └──────┬───────┘  └──────┬───────┘    │
└─────────┼──────────────────┼────────────┘
          │ 3. Resultados    │
          ▼                  ▼
   ┌────────────────────────────┐
   │   AIOrchestrator           │
   │   (consolida + crítica)    │
   └─────────────┬──────────────┘
                 │ 4. Entrega unificada
                 ▼
   "Recebi seu pedido de ajuda! Seu ritmo
    caiu de 20 páginas/dia para 5 nas últimas
    2 semanas. Ajustei sua meta para 10
    páginas/dia — é mais sustentável.
    Você já provou que consegue mais que isso.
    Bora retomar? 📖"
```

---

## 12. Segurança e Privacidade

| Aspecto | Estratégia |
|---|---|
| **Dados do usuário** | PostgreSQL com criptografia em repouso (PGCRYPTO) |
| **Dados de IA** | Vetores no Qdrant isolados por `user_id` |
| **Comunicação** | TLS 1.3 em todas as conexões |
| **Autenticação** | JWT + refresh tokens, rotação a cada 15 dias |
| **Autorização** | RBAC (Free, Premium, Business) via guards no NestJS |
| **Privacy-first** | Dados de IA nunca compartilhados entre usuários |
| **Local-first (opcional)** | Modelos via Ollama para usuários que querem 100% offline |
| **LGPD** | Endpoint de exportação e exclusão de dados (Art. 18) |

---

## 13. Decisões Arquiteturais (ADRs)

### ADR-001: Monorepo com Turborepo
**Status:** Aceito
**Contexto:** Frontend (Next.js), Backend (NestJS) e IA (Python) precisam compartilhar tipos e contratos.
**Decisão:** Monorepo Turborepo com workspaces pnpm. O serviço Python é orquestrado via Docker Compose em dev e Railway em prod.
**Consequência:** Coerência de tipos TS entre web e api. Python fica como serviço separado mas no mesmo repo.

### ADR-002: Python para o Kairos (não TypeScript)
**Status:** Aceito
**Contexto:** O ecossistema de IA/ML (LangChain, LlamaIndex, Ollama, embeddings) é maduro em Python.
**Decisão:** Kairos é um serviço FastAPI em Python. Comunicação com o NestJS via HTTP interno.
**Consequência:** Dois runtimes (Node + Python), mas cada um no seu domínio de força.

### ADR-003: RAG com Qdrant (não pgvector)
**Status:** Aceito
**Contexto:** Qdrant é mais performático para busca vetorial em escala e tem melhor suporte a filtragem.
**Decisão:** Qdrant como vector DB dedicado. PostgreSQL para dados relacionais.
**Consequência:** Infra adicional, mas melhor performance para o Kairos em escala.

### ADR-004: Skills como prompts estruturados (não código)
**Status:** Aceito
**Contexto:** As 24 skills são essencialmente prompts com regras. Codificá-las como código seria excessivo.
**Decisão:** Cada skill é um decorator Python que registra um prompt template + schema Pydantic. O LLM executa o prompt; o schema valida I/O.
**Consequência:** Skills são fáceis de adicionar/modificar sem redeploy do core.

---

## 14. Convenções de Código

| Aspecto | Padrão |
|---|---|
| **Linguagem** | TypeScript (web/api), Python (kairos) |
| **Estilo TS** | ESLint + Prettier, regra `strict` no TS |
| **Estilo Python** | Ruff + Black, type hints obrigatórios |
| **Commits** | Conventional Commits (`feat:`, `fix:`, `docs:`, etc.) |
| **Branches** | `main` (prod), `develop` (staging), `feat/*`, `fix/*` |
| **Naming** | camelCase (TS), snake_case (Python) |
| **API** | RESTful, versionamento via header `X-API-Version: 1` |
| **Testes** | Vitest (TS), Pytest (Python), mínimo 70% cobertura em módulos core |

---

*Documento gerado em 17/06/2026. DisciplinaApp — Transformando disciplina em crescimento contínuo.*
