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

## Execução local (Windows)

Passos para rodar o projeto em desenvolvimento local (Windows):

Requisitos
- Node.js (recomendo LTS) — inclui `npm`.

1) Instale dependências

```bash
pnpm install
```

2) Configure variáveis de ambiente

- Há um arquivo de exemplo `.env.local.txt` no repositório. Para desenvolvimento, copie-o:

```powershell
Copy-Item .env.local.txt .env.local
```

- O mínimo necessário para rodar é:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `CRON_SECRET`

- Se quiser usar notificações gratuitas, configure o Telegram ou WhatsApp no app em `Configurações` (não precisa adicionar nada no `.env.local`).

- APNs nativo no iOS é opcional e pago. Se não quiser usar, ignore estas variáveis:
  - `APNS_KEY_PATH`
  - `APNS_KEY_ID`
  - `APNS_TEAM_ID`
  - `APNS_BUNDLE_ID`
  - `NEXT_PUBLIC_APNS_BUNDLE_ID`
  - `APNS_PRODUCTION=true|false`

- Para usar o Telegram (recomendado):
  1. Abra a página `Configurações` no app.
  2. Em `Telegram`, informe o token do bot e o `chat_id` do seu usuário ou grupo.
  3. Clique em `Testar envio Telegram` para verificar.
  4. Se estiver ok, salve as configurações e deixe o servidor rodando.

- Para usar o WhatsApp:
  1. Abra a página `Configurações` no app.
  2. Em `WhatsApp (CallMeBot)`, informe seu número no formato internacional, ex: `5511987654321`.
  3. Insira a chave API gerada pelo CallMeBot.
  4. Clique em `Testar envio WhatsApp` para verificar.
  5. Se estiver ok, salve as configurações e deixe o servidor rodando.

- Para ativar o agendamento automático no GitHub Actions:
  1. Faça deploy do app em HTTPS (Vercel, Netlify, etc.).
  2. No repositório GitHub, adicione os secrets `CRON_URL` e `CRON_SECRET`.
  3. O workflow `.github/workflows/cron.yml` chamará automaticamente `/api/cron?secret=...` a cada 15 minutos.
  4. Garanta que `CRON_SECRET` seja o mesmo valor definido em `.env.local`.

3) Rodar em modo de desenvolvimento

```bash
npm run dev
```

- A aplicação estará disponível em `http://localhost:3000`.
- Para parar o servidor: pressione `Ctrl+C` no terminal onde está rodando.

4) Build para produção

```bash
npm run build
npm start
```

Observações
- Caso `npm` não seja reconhecido, instale o Node.js e reabra o terminal.
- O projeto exibirá avisos se as variáveis do Supabase não estiverem definidas; `.env.local.txt` já contém chaves de exemplo usadas durante desenvolvimento.
- Para segurança: não exponha as chaves de produção em repositórios públicos.

Execução contínua (produção/local sempre ativa)

- Rodando como serviço com PM2 (Linux/Windows via WSL):

```bash
# instalar pm2 globalmente (opcional)
npm install -g pm2
# no diretório do projeto
npm run setup
npm run build
npm run pm2:start
# ver logs
npm run pm2:logs
# parar o serviço
npm run pm2:stop
```

- Expor localmente para testes (ngrok):

```bash
ngrok http 3000
# use a URL gerada para testes em iOS/PWA
```

Automação de cron (para não precisar ativar manualmente)

- Você pode usar o endpoint interno `/api/cron` (já presente) para realizar verificações agendadas. Opções para agendamento automático:
	- Vercel Cron (se fizer deploy no Vercel)
	- GitHub Actions: um workflow de exemplo foi adicionado em `.github/workflows/cron.yml`. Configure os secrets `CRON_URL` (URL pública do deploy) e `CRON_SECRET` (valor do seu `CRON_SECRET` no `.env`) no repositório para ativar.
	- VPS/cron job: configurar `curl 'https://seu-domínio/api/cron?secret=...'` em `crontab`.

- O endpoint `/api/cron` envia notificações web push e também ativa o envio gratuito de mensagens WhatsApp se você configurar número e chave no app.

Web/PWA — caminho gratuito recomendado

- Use o app como PWA no navegador, sem precisar pagar Apple Developer.
- Faça deploy em HTTPS (Vercel, Netlify, ou outro host gratuito).
- Abra o site no Safari do iPhone e escolha `Adicionar à Tela de Início`.
- No app `Configurações`, configure seu Telegram bot token e `chat_id` para receber lembretes gratuitos por Telegram. Você também pode usar WhatsApp se preferir.
- Use o botão de ativar notificações para ativar web push no navegador.
- Notificações web são suportadas em iOS 16.4+ em Safari, mas podem ser menos confiáveis que push nativo.

iOS nativo é opcional e pago

- Se você não quer pagar Apple Developer, não precisa usar APNs.
- O app funciona bem no modo gratuito com PWA + WhatsApp.
- Se quiser usar APNs no futuro, isso é opcional e requer Apple Developer pago.

Segurança e deploy

- Não commit suas chaves de produção.
- Para produção, prefira usar variáveis de ambiente no provedor (Vercel/Netlify/Supabase).
>>>>>>> origin/master
