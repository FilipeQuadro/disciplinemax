"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import {
  Settings, Bell, MessageSquare, Timer, Smartphone, Check, AlertCircle, ExternalLink
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  registerServiceWorker, requestNotificationPermission, subscribeToPush
} from "@/lib/notifications";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { sendTelegramMessage } from "@/lib/telegram";
import { clsx } from "clsx";

export default function ConfiguracoesPage() {
  const { settings, setSettings, setNotificationsEnabled, notificationsEnabled } = useStore();
  const [form, setForm] = useState({
    whatsapp_number: "",
    callmebot_api_key: "",
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
  });
  const [notifPerm, setNotifPerm] = useState<string>("default");
  const [testingWa, setTestingWa] = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  async function loadSettings() {
    const { data } = await supabase.from("user_settings").select("*").single() as { data: any | null };
    if (data) { setSettings(data); setForm({ ...form, ...data }); }
  }

  async function enableNotifications() {
    const granted = await requestNotificationPermission();
    if (granted) {
      const reg = await registerServiceWorker();
      if (reg) { await subscribeToPush(reg); }
      setNotifPerm("granted");
      setNotificationsEnabled(true);
      toast.success("✅ Notificações ativadas! O sistema vai te lembrar das suas metas.");
    } else {
      toast.error("Permissão negada. Ative nas configurações do navegador.");
    }
  }

  async function testWhatsApp() {
    if (!form.whatsapp_number || !form.callmebot_api_key) {
      toast.error("Preencha o número e a chave da API"); return;
    }
    setTestingWa(true);
    const result = await sendWhatsAppMessage(
      form.whatsapp_number, form.callmebot_api_key,
      "✅ *DisciplinaApp* configurado com sucesso!\n\nVocê receberá lembretes automáticos aqui. 🎯📚"
    );
    setTestingWa(false);

    if (result.ok) {
      toast.success("WhatsApp conectado! Mensagem enviada ✅");
      return;
    }

    const detail = result.responseText || result.error || "Verifique o número e a chave.";
    toast.error(`Erro ao enviar: ${detail}`);
  }

  async function testTelegram() {
    if (!form.telegram_bot_token || !form.telegram_chat_id) {
      toast.error("Preencha o token do bot e o chat_id do Telegram"); return;
    }
    setTestingTg(true);
    try {
      await sendTelegramMessage(
        form.telegram_bot_token,
        form.telegram_chat_id,
        "✅ DisciplinaApp configurado com sucesso!\n\nVocê receberá lembretes automáticos aqui. 🎯📚"
      );
      toast.success("Telegram conectado! Mensagem enviada ✅");
    } catch (e: any) {
      toast.error(`Erro ao enviar Telegram: ${e?.message || e}`);
    } finally {
      setTestingTg(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase.from("user_settings").upsert({
      ...(form as any), updated_at: new Date().toISOString(),
    } as any);
    setSaving(false);
    if (!error) { toast.success("Configurações salvas!"); loadSettings(); }
    else toast.error("Erro: " + error.message);
  }

  const addNotifTime = () => setForm((p) => ({ ...p, notification_times: [...p.notification_times, "09:00"] }));
  const removeNotifTime = (i: number) => setForm((p) => ({
    ...p, notification_times: p.notification_times.filter((_, idx) => idx !== i)
  }));

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings size={24} className="text-slate-400" /> Configurações
        </h1>
        <p className="text-slate-400 text-sm mt-1">Personalize o sistema para funcionar do seu jeito</p>
      </div>

      {/* Notificações Push */}
      <section className="card">
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <Bell size={18} className="text-sky-400" /> Notificações Push
        </h2>
        <p className="text-sm text-slate-400 mb-4">Receba alertas no celular e PC enquanto as metas não forem cumpridas</p>

        <div className={clsx("flex items-center justify-between p-4 rounded-xl border",
          notifPerm === "granted"
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-orange-500/10 border-orange-500/30")}>
          <div className="flex items-center gap-3">
            {notifPerm === "granted" ? (
              <Check size={20} className="text-emerald-400" />
            ) : (
              <AlertCircle size={20} className="text-orange-400" />
            )}
            <div>
              <p className="text-sm font-medium text-white">
                {notifPerm === "granted" ? "Notificações ativas!" : "Notificações desativadas"}
              </p>
              <p className="text-xs text-slate-500">
                {notifPerm === "granted"
                  ? "O sistema vai te lembrar das metas o dia todo"
                  : "Ative para receber lembretes automáticos"}
              </p>
            </div>
          </div>
          {notifPerm !== "granted" && (
            <button onClick={enableNotifications} className="btn-primary text-sm">
              Ativar
            </button>
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
                <button onClick={() => removeNotifTime(i)}
                  className="text-red-400 hover:text-red-300 text-sm">× Remover</button>
              </div>
            ))}
            <button onClick={addNotifTime} className="btn-ghost text-sm mt-1">+ Adicionar horário</button>
          </div>
        </div>
      </section>

      {/* WhatsApp */}
      <section className="card">
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <MessageSquare size={18} className="text-emerald-400" /> WhatsApp (CallMeBot)
        </h2>
        <p className="text-sm text-slate-400 mb-1">Receba lembretes automáticos no WhatsApp — 100% gratuito</p>
        <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank"
          className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mb-4">
          <ExternalLink size={11} /> Como obter sua chave gratuita
        </a>

        <div className="space-y-3">
          <div>
            <label className="label">Número WhatsApp (com código do país)</label>
            <input className="input" placeholder="55119XXXXXXXX" value={form.whatsapp_number}
              onChange={(e) => setForm((p) => ({ ...p, whatsapp_number: e.target.value }))} />
            <p className="text-xs text-slate-500 mt-1">Ex: 5511987654321 (Brasil = 55)</p>
          </div>
          <div>
            <label className="label">Chave API CallMeBot</label>
            <input className="input" placeholder="1234567" value={form.callmebot_api_key}
              onChange={(e) => setForm((p) => ({ ...p, callmebot_api_key: e.target.value }))} />
          </div>
          <button onClick={testWhatsApp} disabled={testingWa} className="btn-ghost text-sm">
            {testingWa ? "Enviando..." : "📱 Testar envio WhatsApp"}
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <MessageSquare size={18} className="text-cyan-400" /> Telegram
        </h2>
        <p className="text-sm text-slate-400 mb-4">Receba lembretes gratuitos pelo Telegram usando um bot.</p>
        <div className="space-y-3">
          <div>
            <label className="label">Telegram bot token</label>
            <input className="input" placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" value={form.telegram_bot_token}
              onChange={(e) => setForm((p) => ({ ...p, telegram_bot_token: e.target.value }))} />
          </div>
          <div>
            <label className="label">Telegram chat_id</label>
            <input className="input" placeholder="123456789" value={form.telegram_chat_id}
              onChange={(e) => setForm((p) => ({ ...p, telegram_chat_id: e.target.value }))} />
            <p className="text-xs text-slate-500 mt-1">Use o chat_id do seu usuário ou grupo.</p>
          </div>
          <button onClick={testTelegram} disabled={testingTg} className="btn-ghost text-sm">
            {testingTg ? "Enviando..." : "📱 Testar envio Telegram"}
          </button>
        </div>
      </section>

      {/* Pomodoro */}
      <section className="card">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Timer size={18} className="text-red-400" /> Pomodoro
        </h2>
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
      </section>

      {/* Metas */}
      <section className="card">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Smartphone size={18} className="text-violet-400" /> Metas Padrão
        </h2>
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
      </section>

      {/* IA */}
      <section className="card">
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          🤖 Google Gemini (IA Motivacional)
        </h2>
        <p className="text-sm text-slate-400 mb-1">Chave gratuita para mensagens personalizadas da IA</p>
        <a href="https://aistudio.google.com/app/apikey" target="_blank"
          className="text-xs text-sky-400 flex items-center gap-1 mb-3">
          <ExternalLink size={11} /> Obter chave gratuita no Google AI Studio
        </a>
        <input className="input" placeholder="AIzaSy..." value={form.gemini_api_key}
          onChange={(e) => setForm((p) => ({ ...p, gemini_api_key: e.target.value }))} />
        <p className="text-xs text-slate-500 mt-1">Sem chave, mensagens estáticas são usadas</p>
      </section>

      {/* Salvar */}
      <button onClick={saveSettings} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
        <Check size={18} /> {saving ? "Salvando..." : "Salvar Todas as Configurações"}
      </button>
    </div>
  );
}
