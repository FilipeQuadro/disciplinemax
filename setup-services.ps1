# ============================================
# DISCIPLINA APP - Setup de Serviços Externos
# Execute: ./setup-services.ps1
# ============================================

$CRON_URL = "https://disciplinemax.onrender.com/api/cron?secret=040623ls"
$APP_URL  = "https://disciplinemax.onrender.com"

# ============================================
# 1. CRON-JOB.ORG - Criar 6 cron jobs
# ============================================
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  CRON-JOB.ORG - Configurando 6 cron jobs" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$CRON_API_KEY = Read-Host "Cole sua API key do cron-job.org (Settings > API)"

if ($CRON_API_KEY) {
    $headers = @{
        "Authorization" = "Bearer $CRON_API_KEY"
        "Content-Type"  = "application/json"
    }

    $jobs = @(
        @{ title = "Disciplina 07h BRT"; hour = 10 },
        @{ title = "Disciplina 09h BRT"; hour = 12 },
        @{ title = "Disciplina 12h BRT"; hour = 15 },
        @{ title = "Disciplina 15h BRT"; hour = 18 },
        @{ title = "Disciplina 19h BRT"; hour = 22 },
        @{ title = "Disciplina 21h BRT"; hour = 0  }
    )

    foreach ($job in $jobs) {
        $body = @{
            job = @{
                url          = $CRON_URL
                enabled      = $true
                saveResponses = $false
                title        = $job.title
                requestMethod = 0
                requestTimeout = 300
                schedule     = @{
                    timezone = "UTC"
                    expiresAt = 0
                    hours    = @($job.hour)
                    mdays    = @(-1)
                    minutes  = @(0)
                    months   = @(-1)
                    wdays    = @(-1)
                }
                notification = @{
                    onFailure  = $true
                    onFailureCount = 1
                    onSuccess  = $false
                    onDisable  = $true
                }
            }
        } | ConvertTo-Json -Depth 5

        try {
            $r = Invoke-RestMethod -Uri "https://api.cron-job.org/jobs" -Method Put -Headers $headers -Body $body
            Write-Host "  ✓ $($job.title) criado (jobId: $($r.jobId))" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ $($job.title) falhou: $($_.Exception.Message)" -ForegroundColor Red
        }
        Start-Sleep -Seconds 1
    }
} else {
    Write-Host "  Pulado - sem API key" -ForegroundColor Yellow
}

# ============================================
# 2. UPTIMEROBOT - Criar monitor keep-alive
# ============================================
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  UPTIMEROBOT - Criando monitor keep-alive" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$UPTIME_API_KEY = Read-Host "Cole sua API key do UptimeRobot (Integrations > API)"

if ($UPTIME_API_KEY) {
    $body = "api_key=$UPTIME_API_KEY&format=json&friendly_name=DisciplinaApp+Keep-Alive&url=$APP_URL&type=1&interval=300"

    try {
        $r = Invoke-RestMethod -Uri "https://api.uptimerobot.com/v2/newMonitor" -Method Post -ContentType "application/x-www-form-urlencoded" -Body $body
        if ($r.stat -eq "ok") {
            Write-Host "  ✓ Monitor criado! ID: $($r.monitor.id)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Erro: $($r.error.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Falhou: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  Pulado - sem API key" -ForegroundColor Yellow
}

# ============================================
# 3. RENDER - Configurar variáveis de ambiente
# ============================================
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  RENDER - Variáveis de ambiente" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$RENDER_API_KEY = Read-Host "Cole sua API key do Render (Account Settings > API Keys)"

if ($RENDER_API_KEY) {
    # Listar serviços para encontrar o ID
    $headers = @{
        "Authorization" = "Bearer $RENDER_API_KEY"
        "Accept"        = "application/json"
    }

    try {
        $services = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Headers $headers
        $webService = $services | Where-Object { $_.type -eq "web_service" -or $_.name -like "*disciplina*" } | Select-Object -First 1

        if ($webService) {
            Write-Host "  Serviço encontrado: $($webService.name) ($($webService.id))" -ForegroundColor Yellow

            $SERVICE_ID = $webService.id
            $envVars = @(
                @{ key = "NEXT_PUBLIC_SUPABASE_URL";         value = "https://sigpkpgibybgnszpxyzq.supabase.co" },
                @{ key = "NEXT_PUBLIC_SUPABASE_ANON_KEY";    value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3BrcGdpYnliZ25zenB4eXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzE5MzUsImV4cCI6MjA5NDk0NzkzNX0.kG-vsXaeb9Jlzp9DuC9aAkXf32jElxuhTsniyF1OIh8" },
                @{ key = "SUPABASE_SERVICE_ROLE_KEY";        value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3BrcGdpYnliZ25zenB4eXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM3MTkzNSwiZXhwIjoyMDk0OTQ3OTM1fQ.g5tS-3iavhOGq3JCorPzfRBfGx4rYS4zPzgYDUNnDts" },
                @{ key = "NEXT_PUBLIC_VAPID_PUBLIC_KEY";      value = "BJNUDPbL7V3A23KvF52WBerw8Dr--hSHZAhaHB_0igyPT1am5didIZ45-Wej8QWWDAqmC12n0iRdNSjokObOgCA" },
                @{ key = "VAPID_PRIVATE_KEY";                 value = "p9xUSyBeegVyUqcLK3iAECek9f0DjTdG10cz_u0OE4k" },
                @{ key = "CRON_SECRET";                       value = "040623ls" },
                @{ key = "GEMINI_API_KEY";                    value = "AIzaSyADBnnVmf3zn_0h4B4Tw15KfAp5qOOrLTs" }
            )

            foreach ($ev in $envVars) {
                $evBody = @{
                    key   = $ev.key
                    value = $ev.value
                } | ConvertTo-Json

                try {
                    Invoke-RestMethod -Uri "https://api.render.com/v1/services/$SERVICE_ID/env-vars/$($ev.key)" -Method Put -Headers $headers -ContentType "application/json" -Body $evBody | Out-Null
                    Write-Host "  ✓ $($ev.key)" -ForegroundColor Green
                } catch {
                    Write-Host "  ✗ $($ev.key): $($_.Exception.Message)" -ForegroundColor Red
                }
                Start-Sleep -Milliseconds 500
            }

            Write-Host "`n  ⚠️  Triggering redeploy..." -ForegroundColor Yellow
            try {
                Invoke-RestMethod -Uri "https://api.render.com/v1/services/$SERVICE_ID/deploys" -Method Post -Headers $headers -ContentType "application/json" -Body "{}" | Out-Null
                Write-Host "  ✓ Deploy triggered!" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Deploy falhou: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  ✗ Nenhum serviço web encontrado" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Falhou: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  Pulado - sem API key" -ForegroundColor Yellow
}

# ============================================
# RESUMO
# ============================================
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  TELEGRAM BOT - Ação manual necessária" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host @"

1. Abra o Telegram e procure @BotFather
2. Envie: /newbot
3. Nome: DisciplinaApp Bot
4. Username: disciplina_app_bot
5. Copie o token retornado
6. Envie qualquer mensagem ao bot
7. Abra: https://api.telegram.org/bot<TOKEN>/getUpdates
8. Copie o chat.id do resultado

Depois adicione no Render Dashboard > Environment:
  TELEGRAM_BOT_TOKEN=<seu_token>
  TELEGRAM_CHAT_ID=<seu_chat_id>

"@ -ForegroundColor Yellow

Write-Host "✅ Setup concluído!" -ForegroundColor Green
