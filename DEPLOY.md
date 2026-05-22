# 🚀 Guia de Deploy Completo — DisciplinaApp

## Stack (100% Gratuita)
| Serviço | Função | Custo |
|---------|--------|-------|
| **Render** | Hosting Node.js | Grátis |
| **Supabase** | Banco + Realtime + Auth | Grátis |
| **CallMeBot** | WhatsApp automático | Grátis |
| **Google Gemini** | IA motivacional | Grátis |
| **cron-job.org** | Cron jobs externo | Grátis |
| **Web Push API** | Notificações push | Grátis |

---

## PASSO 1 — Supabase (Banco de dados)

1. Acesse: https://supabase.com → Criar conta gratuita
2. Clique em **New Project**
3. Nome: `disciplina-app` · Escolha a região mais próxima
4. Vá em **SQL Editor** → Cole o conteúdo de `supabase/schema.sql` → Execute
5. Vá em **Settings → API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

### Habilitar Realtime (sync entre dispositivos):
- Vá em **Database → Replication**
- Ative as tabelas: `books`, `bible_readings`, `pomodoro_sessions`, `daily_stats`

### Cron diário (reset de páginas):
- Vá em **Edge Functions** → criar função `daily-reset`
- Chamar a função `reset_daily_pages()` todo dia à meia-noite

---

## PASSO 2 — Chaves VAPID (Push Notifications)

Execute no terminal:
```bash
npx web-push generate-vapid-keys
```
Copie `Public Key` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
Copie `Private Key` → `VAPID_PRIVATE_KEY`

---

## PASSO 3 — Gemini AI (opcional, gratuito)

1. Acesse: https://aistudio.google.com/app/apikey
2. Clique em **Create API Key**
3. Copie a chave → `GEMINI_API_KEY`

---

## PASSO 4 — CallMeBot WhatsApp (gratuito)

1. Salve o número **+34 644 13 95 02** nos seus contatos como "CallMeBot"
2. Envie a mensagem: `I allow callmebot to send me messages`
3. Aguarde a resposta com sua **apikey**
4. Configure no app: Configurações → WhatsApp

---

## PASSO 5 — Deploy na Render

### Via GitHub (recomendado):
```bash
# 1. Criar repositório no GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/disciplina-app
git push -u origin main
```

1. Acesse: https://render.com → Criar conta gratuita
2. Clique em **New +** → **Web Service**
3. Conecte seu repositório GitHub (`disciplina-app`)
4. Configurações:
   - **Root Directory**: `disciplina-app` (se o repo tem subpasta)
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Em **Environment Variables**, adicionar todas as variáveis do `.env.example`
6. Clicar em **Create Web Service**

### Via render.yaml (Blueprint):
O arquivo `render.yaml` já está configurado. Basta conectar o repo e a Render detecta automaticamente.

### ⚠️ Importante — Free Tier:
- O serviço **hiberna após 15 min** sem requisições
- Cold start leva ~30-60s na primeira requisição após hibernação
- 750 horas gratuitas/mês (suficiente para 1 serviço)

---

## PASSO 5.5 — Manter acordado (UptimeRobot)

Para evitar a hibernação, use o **UptimeRobot** para pingar a cada 5 min:

1. Acesse: https://uptimerobot.com → Criar conta gratuita
2. Clique em **+ Add New Monitor**
3. Configure:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: DisciplinaApp Keep-Alive
   - **URL**: `https://seu-app.onrender.com`
   - **Monitoring Interval**: 5 minutes
4. Salve

Isso mantém o Render acordado 24/7. O UptimeRobot é 100% gratuito (até 50 monitors).

> 💡 Alternativa sem conta: crie um cron job extra no cron-job.org (passo 6) que pinga a URL raiz a cada 14 minutos.

---

## PASSO 6 — Configurar Cron Jobs (cron-job.org)

A Render free tier **não tem cron jobs nativos**. Use o cron-job.org como alternativa.

1. Acesse: https://cron-job.org → Criar conta gratuita
2. Clique em **Create Cronjob**
3. Configure:
   - **URL**: `https://seu-app.onrender.com/api/cron?secret=SEU_CRON_SECRET`
   - **Schedule**: 6x por dia nos horários desejados
   - **Request method**: GET

### Horários recomendados (Brasil UTC-3):
| Horário BRT | Horário UTC | Cron Expression |
|-------------|-------------|-----------------|
| 07:00 | 10:00 | `0 10 * * *` |
| 09:00 | 12:00 | `0 12 * * *` |
| 12:00 | 15:00 | `0 15 * * *` |
| 15:00 | 18:00 | `0 18 * * *` |
| 19:00 | 22:00 | `0 22 * * *` |
| 21:00 | 00:00 | `0 0 * * *` |

Crie **6 cron jobs separados** no cron-job.org, um para cada horário.

> 💡 **Dica**: O parâmetro `?secret=` acorda o serviço da hibernação e já processa as notificações.

---

## PASSO 7 — Instalar no iPhone (PWA)

1. Abra o app no Safari (iOS)
2. Toque no botão **Compartilhar** (ícone de seta)
3. Role e toque em **"Adicionar à Tela Início"**
4. Confirme — o app aparece como ícone nativo!

> Para notificações no iOS 16.4+: ative nas configurações do app instalado

---

## PASSO 8 — Instalar no Windows/Chrome

1. Abra o app no Chrome
2. Clique no ícone de instalação na barra de endereços
3. Clique **"Instalar"** — o app abre como janela nativa!

---

## Variáveis de Ambiente Completas

Configurar na Render (Dashboard → Environment):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BK...
VAPID_PRIVATE_KEY=xxx...
CRON_SECRET=meu_segredo_123
GEMINI_API_KEY=AIzaSy...
```

> Variáveis com prefixo `NEXT_PUBLIC_` são expostas no browser. As demais ficam só no servidor.

---

## Rodar localmente

```bash
cd disciplina-app
npm install
npm run dev
# Abrir http://localhost:3000
```

---

## Arquitetura de notificações

```
cron-job.org (6x/dia)
  → https://seu-app.onrender.com/api/cron?secret=XXX
    → Verifica metas do Supabase
    → Se pendente → envia Web Push (navegador/celular)
    → Se pendente → envia WhatsApp via CallMeBot
    → Se pendente → envia Telegram

Browser (NotificationInit.tsx)
  → Verifica a cada minuto se está no horário configurado
  → Se pendente → mostra notificação local

Service Worker (sw.js)
  → Recebe push do servidor mesmo com app fechado
  → Mostra notificação nativa no OS
```

---

## Sincronização em tempo real

```
iPhone registra +10 páginas
  → Supabase atualiza DB
  → Supabase Realtime emite evento
    → PC recebe evento via WebSocket
    → Dashboard atualiza instantaneamente ✅
```

---

## Custo estimado
- **Hospedagem (Render Free)**: R$0
- **Banco (Supabase Free)**: R$0
- **Cron Jobs (cron-job.org)**: R$0
- **WhatsApp**: R$0
- **IA**: R$0
- **TOTAL**: **R$ 0,00/mês** 🎉
