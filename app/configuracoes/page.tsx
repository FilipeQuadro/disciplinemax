"use client";

import { useState, useEffect } from "react";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import {
  Settings, Bell, MessageSquare, Timer, Smartphone, Check, AlertCircle, ExternalLink, Shield, Sparkles
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  registerServiceWorker, requestNotificationPermission, subscribeToPush
} from "@/lib/notifications";
import { sendTelegramMessage } from "@/lib/telegram";

export default function ConfiguracoesPage() {
  const { settings, setSettings, setNotificationsEnabled } = useStore();
  const { user } = useAuth();
  const [form, setForm] = useState({
    whatsapp_number: "",
    greenapi_instance_id: "",
    greenapi_token: "",
    telegram_bot_token: "",
    telegram_chat_id: "",
    notification_times: ["07:00", "12:00", "19:00"],
    pomodoro_duration: 25,
    short_break: 5,
    long_break: 15,
    pomodoros_until_long: 4,
    daily_books_goal: 20,
    daily_bible_chapters: 3,
    gemini_api_key: "",
    timezone: "America/Sao_Paulo",
    streak_freeze_available: 1,
    streak_freeze_used: 0,
  });
  const [notifPerm, setNotifPerm] = useState<string>("default");
  const [testingWa, setTestingWa] = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user) loadSettings();
    else setForm({
      whatsapp_number: "",
      greenapi_instance_id: "",
      greenapi_token: "",
      telegram_bot_token: "",
      telegram_chat_id: "",
      notification_times: ["07:00", "12:00", "19:00"],
      pomodoro_duration: 25,
      short_break: 5,
      long_break: 15,
      pomodoros_until_long: 4,
      daily_books_goal: 20,
      daily_bible_chapters: 3,
      gemini_api_key: "",
      timezone: "America/Sao_Paulo",
      streak_freeze_available: 1,
      streak_freeze_used: 0,
    });
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    }
  }, [user]);

  async function loadSettings() {
    if (!user) return;
    try {
      const { data } = await dataFetch({ action: "select", table: "user_settings", filters: { eq: { user_id: user.id }, maybeSingle: true } });
      if (data) { setSettings(data as any); setForm({ ...form, ...(data as any) }); }
    } catch {
      toast.error("Erro ao carregar configurações");
    }
  }

  async function enableNotifications() {
    const granted = await requestNotificationPermission();
    if (granted) {
      const reg = await registerServiceWorker();
      if (reg) { await subscribeToPush(reg); }
      setNotifPerm("granted");
      setNotificationsEnabled(true);
      toast.success("✅ Notificações ativadas!");
    } else {
      toast.error("Permissão negada. Ative nas configurações do navegador.");
    }
  }

  async function testWhatsApp() {
    if (!form.greenapi_instance_id || !form.greenapi_token || !form.whatsapp_number) {
      toast.error("Preencha o Instance ID, Token e número WhatsApp"); return;
    }
    setTestingWa(true);
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idInstance: form.greenapi_instance_id,
          apiTokenInstance: form.greenapi_token,
          phone: form.whatsapp_number,
          message: "✅ *DisciplinaMax* configurado com sucesso!\n\nVocê receberá lembretes automáticos aqui. 🎯📚",
        }),
      });
      const result = await res.json();
      if (result.ok) {
        toast.success("WhatsApp conectado e mensagem enviada! ✅");
      } else if (result.stateInstance === "notAuthorized") {
        toast.error("Instância NÃO conectada ao WhatsApp. Escaneie o QR Code no painel do Green-API.", { duration: 8000 });
      } else if (result.stateInstance === "sleepMode") {
        toast.error("Celular desligado/sem internet. Ligue e aguarde 5 min.", { duration: 6000 });
      } else if (result.stateInstance) {
        toast.error(`Estado: ${result.stateInstance} — ${result.error}`, { duration: 6000 });
      } else {
        toast.error(`Erro: ${result.error || "Verifique as credenciais."}`);
      }
    } catch (e: any) {
      toast.error(`Erro: ${e?.message || "Falha na conexão"}`);
    } finally {
      setTestingWa(false);
    }
  }

  async function testTelegram() {
    if (!form.telegram_bot_token || !form.telegram_chat_id) {
      toast.error("Preencha o token e o chat_id"); return;
    }
    setTestingTg(true);
    try {
      const result = await sendTelegramMessage(form.telegram_bot_token, form.telegram_chat_id,
        "✅ DisciplinaMax configurado com sucesso! 🎯📚");
      if (result.ok) {
        toast.success("Telegram conectado! ✅");
      } else {
        toast.error(result.error || "Erro ao enviar mensagem");
      }
    } catch (e: any) {
      toast.error(`Erro: ${e?.message || e}`);
    } finally { setTestingTg(false); }
  }

  async function saveSettings() {
    if (!user) { toast.error("Serviço indisponível"); return; }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        user_id: user.id,
        whatsapp_number: form.whatsapp_number,
        telegram_bot_token: form.telegram_bot_token,
        telegram_chat_id: form.telegram_chat_id,
        notification_times: form.notification_times,
        pomodoro_duration: Math.max(1, Math.min(120, form.pomodoro_duration)),
        short_break: Math.max(1, Math.min(30, form.short_break)),
        long_break: Math.max(1, Math.min(60, form.long_break)),
        pomodoros_until_long: Math.max(1, Math.min(10, form.pomodoros_until_long)),
        daily_books_goal: Math.max(1, Math.min(500, form.daily_books_goal)),
        daily_bible_chapters: Math.max(1, Math.min(50, form.daily_bible_chapters)),
        gemini_api_key: form.gemini_api_key,
        timezone: form.timezone,
        updated_at: new Date().toISOString(),
      };

      let { error } = await dataFetch({ action: "upsert", table: "user_settings", payload: {
        ...payload,
        greenapi_instance_id: form.greenapi_instance_id,
        greenapi_token: form.greenapi_token,
      }});

      if (error && (error.includes("greenapi") || error.includes("does not exist"))) {
        const { error: retryError } = await dataFetch({ action: "upsert", table: "user_settings", payload });
        error = retryError;
      }

      if (!error) { toast.success("Configurações salvas!"); loadSettings(); }
      else toast.error("Erro: " + error);
    } catch (err) { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  const addNotifTime = () => setForm((p) => ({ ...p, notification_times: [...p.notification_times, "09:00"] }));
  const removeNotifTime = (i: number) => setForm((p) => ({
    ...p, notification_times: p.notification_times.filter((_, idx) => idx !== i)
  }));

  // ─── Loading Skeleton ──────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="space-y-6 max-w-2xl animate-pulse">
        <div className="h-7 w-64 rounded bg-white/5" />
        <div className="h-3 w-48 rounded bg-white/5" />
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-2xl bg-white/[0.02]" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl page-enter">
      {/* Hero Header */}
      <div>
        <p className="text-xs mb-1" style={{ color: "#555E6E" }}>
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
        <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
          <Settings size={24} style={{ color: "#8B95A5" }} /> Configurações
        </h1>
      </div>

      {/* Notificações Push */}
      <section className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, rgba(212,175,55,0.03) 0%, rgba(20,24,32,0.8) 100%)", border: "1px solid rgba(212,175,55,0.1)" }}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,175,55,0.1)" }}>
              <Bell size={16} style={{ color: "#D4AF37" }} />
            </div>
            <h2 className="font-semibold text-white">Notificações Push</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: "#8B95A5" }}>Receba alertas enquanto as metas não forem cumpridas</p>

          <div className="flex items-center justify-between p-4 rounded-xl"
            style={{
              background: notifPerm === "granted" ? "rgba(58,186,180,0.06)" : "rgba(232,132,74,0.06)",
              border: notifPerm === "granted" ? "1px solid rgba(58,186,180,0.2)" : "1px solid rgba(232,132,74,0.2)",
            }}>
            <div className="flex items-center gap-3">
              {notifPerm === "granted" ? <Check size={20} style={{ color: "#3ABAB4" }} /> : <AlertCircle size={20} style={{ color: "#E8844A" }} />}
              <div>
                <p className="text-sm font-medium text-white">
                  {notifPerm === "granted" ? "Notificações ativas!" : "Notificações desativadas"}
                </p>
                <p className="text-xs" style={{ color: "#555E6E" }}>
                  {notifPerm === "granted" ? "Lembretes ativos o dia todo" : "Ative para receber lembretes automáticos"}
                </p>
              </div>
            </div>
            {notifPerm !== "granted" && (
              <button onClick={enableNotifications} className="btn-primary text-sm">Ativar</button>
            )}
          </div>

          <div className="mt-4">
            <label className="label">Horários de notificação</label>
            <div className="space-y-2">
              {form.notification_times.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="time" className="input w-32" value={t}
                    onChange={(e) => setForm((p) => ({
                      ...p,
                      notification_times: p.notification_times.map((x, idx) => idx === i ? e.target.value : x)
                    }))} />
                  <button onClick={() => removeNotifTime(i)} className="text-sm" style={{ color: "#D94F4F" }}>× Remover</button>
                </div>
              ))}
              <button onClick={addNotifTime} className="btn-ghost text-sm mt-1">+ Adicionar horário</button>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp */}
      <section className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, rgba(58,186,180,0.03) 0%, rgba(20,24,32,0.8) 100%)", border: "1px solid rgba(58,186,180,0.1)" }}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(58,186,180,0.1)" }}>
              <MessageSquare size={16} style={{ color: "#3ABAB4" }} />
            </div>
            <h2 className="font-semibold text-white">WhatsApp (Green-API)</h2>
          </div>
          <p className="text-sm mb-1" style={{ color: "#8B95A5" }}>Receba lembretes instantâneos via WhatsApp</p>
          <a href="https://green-api.com" target="_blank" rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 mb-4" style={{ color: "#D4AF37" }}>
            <ExternalLink size={11} /> Criar conta gratuita no Green-API
          </a>
          <div className="space-y-3">
            <div>
              <label className="label">Número WhatsApp (com código do país)</label>
              <input className="input" placeholder="55119XXXXXXXX" value={form.whatsapp_number}
                onChange={(e) => setForm((p) => ({ ...p, whatsapp_number: e.target.value }))} />
              <p className="text-xs mt-1" style={{ color: "#555E6E" }}>Ex: 5511987654321 (Brasil = 55)</p>
            </div>
            <div>
              <label className="label">Instance ID (Green-API)</label>
              <input className="input" placeholder="110100001" value={form.greenapi_instance_id}
                onChange={(e) => setForm((p) => ({ ...p, greenapi_instance_id: e.target.value }))} />
            </div>
            <div>
              <label className="label">API Token (Green-API)</label>
              <input className="input" placeholder="d75b3a663749..." value={form.greenapi_token}
                onChange={(e) => setForm((p) => ({ ...p, greenapi_token: e.target.value }))} />
            </div>
            <button onClick={testWhatsApp} disabled={testingWa} className="btn-ghost text-sm">
              {testingWa ? "Enviando..." : "📱 Testar envio WhatsApp"}
            </button>
          </div>
        </div>
      </section>

      {/* Telegram */}
      <section className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, rgba(124,107,189,0.03) 0%, rgba(20,24,32,0.8) 100%)", border: "1px solid rgba(124,107,189,0.1)" }}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,107,189,0.1)" }}>
              <MessageSquare size={16} style={{ color: "#7C6BBD" }} />
            </div>
            <h2 className="font-semibold text-white">Telegram</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: "#8B95A5" }}>Receba lembretes gratuitos pelo Telegram</p>
          <div className="space-y-3">
            <div>
              <label className="label">Telegram bot token</label>
              <input className="input" placeholder="123456:ABC-DEF1234ghIkl..." value={form.telegram_bot_token}
                onChange={(e) => setForm((p) => ({ ...p, telegram_bot_token: e.target.value }))} />
            </div>
            <div>
              <label className="label">Telegram chat_id</label>
              <input className="input" placeholder="123456789" value={form.telegram_chat_id}
                onChange={(e) => setForm((p) => ({ ...p, telegram_chat_id: e.target.value }))} />
              <p className="text-xs mt-1" style={{ color: "#555E6E" }}>Seu ID numérico. Envie /start ao bot antes de testar. Use <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" style={{ color: "#D4AF37" }}>@userinfobot</a> para descobrir.</p>
            </div>
            <button onClick={testTelegram} disabled={testingTg} className="btn-ghost text-sm">
              {testingTg ? "Enviando..." : "📱 Testar envio Telegram"}
            </button>
          </div>
        </div>
      </section>

      {/* Pomodoro */}
      <section className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, rgba(217,79,79,0.03) 0%, rgba(20,24,32,0.8) 100%)", border: "1px solid rgba(217,79,79,0.1)" }}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(217,79,79,0.1)" }}>
              <Timer size={16} style={{ color: "#D94F4F" }} />
            </div>
            <h2 className="font-semibold text-white">Pomodoro</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Foco (min)", key: "pomodoro_duration" },
              { label: "Pausa curta", key: "short_break" },
              { label: "Pausa longa", key: "long_break" },
              { label: "Pomos p/ longa", key: "pomodoros_until_long" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input type="number" className="input" min={1}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: +e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metas */}
      <section className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, rgba(124,107,189,0.03) 0%, rgba(20,24,32,0.8) 100%)", border: "1px solid rgba(124,107,189,0.1)" }}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,107,189,0.1)" }}>
              <Smartphone size={16} style={{ color: "#7C6BBD" }} />
            </div>
            <h2 className="font-semibold text-white">Metas Padrão</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Páginas de livro por dia</label>
              <input type="number" className="input" value={form.daily_books_goal}
                onChange={(e) => setForm((p) => ({ ...p, daily_books_goal: +e.target.value }))} />
            </div>
            <div>
              <label className="label">Capítulos da Bíblia por dia</label>
              <input type="number" className="input" value={form.daily_bible_chapters}
                onChange={(e) => setForm((p) => ({ ...p, daily_bible_chapters: +e.target.value }))} />
            </div>
          </div>
        </div>
      </section>

      {/* Streak Freeze */}
      <section className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, rgba(232,132,74,0.03) 0%, rgba(20,24,32,0.8) 100%)", border: "1px solid rgba(232,132,74,0.1)" }}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(232,132,74,0.1)" }}>
              <Shield size={16} style={{ color: "#E8844A" }} />
            </div>
            <h2 className="font-semibold text-white">Perdão de Streak</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: "#8B95A5" }}>Proteja seu streak se perder um dia — 1 uso por mês</p>
          <div className="flex items-center justify-between p-4 rounded-xl"
            style={{
              background: form.streak_freeze_available > 0 && form.streak_freeze_used < 1
                ? "rgba(58,186,180,0.06)" : "rgba(232,132,74,0.06)",
              border: form.streak_freeze_available > 0 && form.streak_freeze_used < 1
                ? "1px solid rgba(58,186,180,0.2)" : "1px solid rgba(232,132,74,0.2)",
            }}>
            <div className="flex items-center gap-3">
              <Shield size={20} style={{ color: form.streak_freeze_used < 1 ? "#3ABAB4" : "#E8844A" }} />
              <div>
                <p className="text-sm font-medium text-white">
                  {form.streak_freeze_used < 1 ? "Perdão disponível" : "Perdão já usado este mês"}
                </p>
                <p className="text-xs" style={{ color: "#555E6E" }}>
                  Se perder um dia, seu streak não será resetado
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IA */}
      <section className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, rgba(212,175,55,0.03) 0%, rgba(20,24,32,0.8) 100%)", border: "1px solid rgba(212,175,55,0.1)" }}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,175,55,0.1)" }}>
              <Sparkles size={16} style={{ color: "#D4AF37" }} />
            </div>
            <h2 className="font-semibold text-white">Google Gemini (IA Motivacional)</h2>
          </div>
          <p className="text-sm mb-1" style={{ color: "#8B95A5" }}>Chave gratuita para mensagens personalizadas da IA</p>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 mb-3" style={{ color: "#D4AF37" }}>
            <ExternalLink size={11} /> Obter chave gratuita no Google AI Studio
          </a>
          <input className="input" placeholder="AIzaSy..." value={form.gemini_api_key}
            onChange={(e) => setForm((p) => ({ ...p, gemini_api_key: e.target.value }))} />
          <p className="text-xs mt-1" style={{ color: "#555E6E" }}>Sem chave, mensagens estáticas são usadas</p>
        </div>
      </section>

      {/* Salvar */}
      <button onClick={saveSettings} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
        <Check size={18} /> {saving ? "Salvando..." : "Salvar Todas as Configurações"}
      </button>
    </div>
  );
}
