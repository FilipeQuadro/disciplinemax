# ============================================
# DISCIPLINA APP - Setup de Servicos Externos
# Execute: ./setup-services.ps1
# ============================================

$CRON_URL = "https://disciplinemax.onrender.com/api/cron?secret=040623ls"
$APP_URL  = "https://disciplinemax.onrender.com"

# ============================================
# 1. CRON-JOB.ORG - Criar 6 cron jobs
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CRON-JOB.ORG - Configurando 6 cron jobs" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$CRON_API_KEY = Read-Host "Cole sua API key do cron-job.org (Settings > API)"

if ($CRON_API_KEY) {
    $headers = @{
        "Authorization" = "Bearer $CRON_API_KEY"
        "Content-Type"  = "application/json"
    }

    $jobTitles = @("Disciplina 07h BRT", "Disciplina 09h BRT", "Disciplina 12h BRT", "Disciplina 15h BRT", "Disciplina 19h BRT", "Disciplina 21h BRT")
    $jobHours   = @(10, 12, 15, 18, 22, 0)

    for ($i = 0; $i -lt $jobTitles.Count; $i++) {
        $title = $jobTitles[$i]
        $hour  = $jobHours[$i]

        $scheduleJson = '{"timezone":"UTC","expiresAt":0,"hours":[' + $hour + '],"mdays":[-1],"minutes":[0],"months":[-1],"wdays":[-1]}'
        $notifJson    = '{"onFailure":true,"onFailureCount":1,"onSuccess":false,"onDisable":true}'
        $body         = '{"job":{"url":"' + $CRON_URL + '","enabled":true,"saveResponses":false,"title":"' + $title + '","requestMethod":0,"requestTimeout":300,"schedule":' + $scheduleJson + ',"notification":' + $notifJson + '}}'

        try {
            $r = Invoke-RestMethod -Uri "https://api.cron-job.org/jobs" -Method Put -Headers $headers -Body $body
            Write-Host "  OK: $title (jobId: $($r.jobId))" -ForegroundColor Green
        } catch {
            Write-Host "  FALHOU: $title - $($_.Exception.Message)" -ForegroundColor Red
        }
        Start-Sleep -Seconds 1
    }
} else {
    Write-Host "  Pulado - sem API key" -ForegroundColor Yellow
}

# ============================================
# 2. UPTIMEROBOT - Criar monitor keep-alive
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  UPTIMEROBOT - Criando monitor keep-alive" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$UPTIME_API_KEY = Read-Host "Cole sua API key do UptimeRobot (Integrations > API)"

if ($UPTIME_API_KEY) {
    $body = "api_key=$UPTIME_API_KEY&format=json&friendly_name=DisciplinaApp+Keep-Alive&url=$APP_URL&type=1&interval=300"

    try {
        $r = Invoke-RestMethod -Uri "https://api.uptimerobot.com/v2/newMonitor" -Method Post -ContentType "application/x-www-form-urlencoded" -Body $body
        if ($r.stat -eq "ok") {
            Write-Host "  OK: Monitor criado! ID: $($r.monitor.id)" -ForegroundColor Green
        } else {
            Write-Host "  ERRO: $($r.error.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  FALHOU: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  Pulado - sem API key" -ForegroundColor Yellow
}

# ============================================
# 3. RENDER - Configurar variaveis de ambiente
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  RENDER - Variaveis de ambiente" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$RENDER_API_KEY = Read-Host "Cole sua API key do Render (Account Settings > API Keys)"

if ($RENDER_API_KEY) {
    $headers = @{
        "Authorization" = "Bearer $RENDER_API_KEY"
        "Accept"        = "application/json"
    }

    try {
        $services = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Headers $headers
        $webService = $services | Where-Object { $_.type -eq "web_service" -or $_.name -like "*disciplina*" } | Select-Object -First 1

        if ($webService) {
            Write-Host "  Servico encontrado: $($webService.name) ($($webService.id))" -ForegroundColor Yellow

            $SERVICE_ID = $webService.id

            $envKeys   = @("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "CRON_SECRET", "GEMINI_API_KEY")
            $envValues = @(
                "https://sigpkpgibybgnszpxyzq.supabase.co",
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3BrcGdpYnliZ25zenB4eXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzE5MzUsImV4cCI6MjA5NDk0NzkzNX0.kG-vsXaeb9Jlzp9DuC9aAkXf32jElxuhTsniyF1OIh8",
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3BrcGdpYnliZ25zenB4eXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM3MTkzNSwiZXhwIjoyMDk0OTQ3OTM1fQ.g5tS-3iavhOGq3JCorPzfRBfGx4rYS4zPzgYDUNnDts",
                "BJNUDPbL7V3A23KvF52WBerw8Dr--hSHZAhaHB_0igyPT1am5didIZ45-Wej8QWWDAqmC12n0iRdNSjokObOgCA",
                "p9xUSyBeegVyUqcLK3iAECek9f0DjTdG10cz_u0OE4k",
                "040623ls",
                "AIzaSyADBnnVmf3zn_0h4B4Tw15KfAp5qOOrLTs"
            )

            for ($i = 0; $i -lt $envKeys.Count; $i++) {
                $ek = $envKeys[$i]
                $ev = $envValues[$i]
                $evBody = "{`"key`":`"$ek`",`"value`":`"$ev`"}"

                try {
                    Invoke-RestMethod -Uri "https://api.render.com/v1/services/$SERVICE_ID/env-vars/$ek" -Method Put -Headers $headers -ContentType "application/json" -Body $evBody | Out-Null
                    Write-Host "  OK: $ek" -ForegroundColor Green
                } catch {
                    Write-Host "  FALHOU: $ek - $($_.Exception.Message)" -ForegroundColor Red
                }
                Start-Sleep -Milliseconds 500
            }

            Write-Host ""
            Write-Host "  Triggering redeploy..." -ForegroundColor Yellow
            try {
                Invoke-RestMethod -Uri "https://api.render.com/v1/services/$SERVICE_ID/deploys" -Method Post -Headers $headers -ContentType "application/json" -Body "{}" | Out-Null
                Write-Host "  OK: Deploy triggered!" -ForegroundColor Green
            } catch {
                Write-Host "  FALHOU: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  Nenhum servico web encontrado" -ForegroundColor Red
        }
    } catch {
        Write-Host "  FALHOU: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  Pulado - sem API key" -ForegroundColor Yellow
}

# ============================================
# RESUMO - TELEGRAM BOT
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  TELEGRAM BOT - Acao manual necessaria" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Abra o Telegram e procure @BotFather" -ForegroundColor Yellow
Write-Host "2. Envie: /newbot" -ForegroundColor Yellow
Write-Host "3. Nome: DisciplinaApp Bot" -ForegroundColor Yellow
Write-Host "4. Username: disciplina_app_bot" -ForegroundColor Yellow
Write-Host "5. Copie o token retornado" -ForegroundColor Yellow
Write-Host "6. Envie qualquer mensagem ao bot" -ForegroundColor Yellow
Write-Host "7. Abra: https://api.telegram.org/bot<TOKEN>/getUpdates" -ForegroundColor Yellow
Write-Host "8. Copie o chat.id do resultado" -ForegroundColor Yellow
Write-Host ""
Write-Host "Depois adicione no Render Dashboard > Environment:" -ForegroundColor Yellow
Write-Host "  TELEGRAM_BOT_TOKEN=<seu_token>" -ForegroundColor Yellow
Write-Host "  TELEGRAM_CHAT_ID=<seu_chat_id>" -ForegroundColor Yellow
Write-Host ""
Write-Host "Setup concluido!" -ForegroundColor Green
