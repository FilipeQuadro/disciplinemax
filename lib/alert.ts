import { logger } from "@/lib/logger";
import { MetricsService, METRICS } from "@/lib/metrics";
import { sendTelegramMessage } from "@/lib/telegram";
import { createClient } from "@supabase/supabase-js";

export interface AlertRule {
  name: string;
  metric: string;
  threshold: number;
  window: "1m" | "5m" | "15m";
  channel: "telegram" | "log";
}

const DEFAULT_RULES: AlertRule[] = [
  { name: "cron_failure", metric: METRICS.CRON_RUNS, threshold: 3, window: "15m", channel: "telegram" },
  { name: "telegram_errors", metric: METRICS.TELEGRAM_FAILED, threshold: 5, window: "5m", channel: "telegram" },
  { name: "push_errors", metric: METRICS.PUSH_FAILED, threshold: 10, window: "5m", channel: "log" },
];

const alertCooldown = new Map<string, number>();
const ALERT_COOLDOWN_MS = 15 * 60 * 1000;

/**
 * AlertService — fires alerts when metrics exceed thresholds.
 * Uses Telegram (free) and structured logs. No external services needed.
 */
export class AlertService {
  private static rules = DEFAULT_RULES;

  /**
   * Check all alert rules and fire if threshold exceeded.
   */
  static async checkAlerts(): Promise<void> {
    for (const rule of this.rules) {
      const errorCount = MetricsService.getCounter(rule.metric, { status: "error" });
      const successCount = MetricsService.getCounter(rule.metric, { status: "success" });
      const total = errorCount + successCount;

      if (total < rule.threshold) continue;

      const errorRate = errorCount / total;
      const cooldownKey = rule.name;
      const lastFired = alertCooldown.get(cooldownKey) ?? 0;

      if (Date.now() - lastFired < ALERT_COOLDOWN_MS) continue;

      if (errorRate > 0.5 || errorCount >= rule.threshold) {
        alertCooldown.set(cooldownKey, Date.now());
        await this.fireRuleAlert(rule, errorCount, total);
      }
    }
  }

  /**
   * Fire an alert immediately (bypasses threshold check).
   */
  static async fireAlert(
    title: string,
    message: string,
    channel: "telegram" | "log" = "log"
  ): Promise<void> {
    logger.error(`ALERT: ${title}`, { message, channel });

    if (channel === "telegram") {
      await this.sendTelegramAlert(`🚨 ${title}\n\n${message}`);
    }
  }

  private static async fireRuleAlert(rule: AlertRule, errorCount: number, total: number): Promise<void> {
    const message = `${rule.name}: ${errorCount}/${total} errors in ${rule.window}. Threshold: ${rule.threshold}`;

    logger.error(`ALERT: ${rule.name}`, { errorCount, total, window: rule.window });

    if (rule.channel === "telegram") {
      await this.sendTelegramAlert(`🚨 *Alerta: ${rule.name}*\n\n${errorCount}/${total} erros em ${rule.window}\nLimite: ${rule.threshold}`);
    }
  }

  private static async sendTelegramAlert(message: string): Promise<void> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) return;

      const sb = createClient(supabaseUrl, supabaseKey);
      const { data } = await sb
        .from("user_settings")
        .select("telegram_bot_token, telegram_chat_id")
        .limit(1)
        .maybeSingle();

      if (data?.telegram_bot_token && data?.telegram_chat_id) {
        await sendTelegramMessage(data.telegram_bot_token, data.telegram_chat_id, message);
      }
    } catch (e: unknown) {
      logger.error("AlertService: failed to send Telegram alert", { error: String(e) });
    }
  }

  static reset(): void {
    alertCooldown.clear();
  }
}
