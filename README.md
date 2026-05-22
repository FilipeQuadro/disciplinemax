# DisciplinaApp — Execução local

Passos para rodar o projeto em desenvolvimento local (Windows):

Requisitos
- Node.js (recomendo LTS) — inclui `npm`.

1) Instale dependências

```bash
cd disciplina-app/disciplina-app
npm install
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
