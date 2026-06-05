"use client";

import { useState, useEffect, useCallback } from "react";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import {
  Settings, Bell, MessageSquare, Timer, Smartphone, Check, AlertCircle, ExternalLink, Shield, Sparkles, User, Gift, Copy
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  registerServiceWorker, requestNotificationPermission, subscribeToPush
} from "@/lib/notifications";
import { sendTelegramMessage } from "@/lib/telegram";
import { SkeletonList } from "@/components/Skeleton";

export default function ConfiguracoesPage() {
  const { settings, setSettings, setNotificationsEnabled } = useStore();
  const { user } = useAuth();
  const [form, setForm] = useState({
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
  const [testingTg, setTestingTg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: "", displayName: "", bio: "", isPublic: false });
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await dataFetch({ action: "select", table: "user_settings", filters: { eq: { user_id: user.id }, maybeSingle: true } });
      if (data) { setSettings(data as any); setForm((prev) => ({ ...prev, ...(data as any) })); }
    } catch {
      toast.error("Erro ao carregar configurações");
    }
  }, [user, setSettings]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const [profileRes, referralRes] = await Promise.all([
        fetch(`/api/profile?userId=${user.id}`).then((r) => r.json()).catch(() => null),
        fetch("/api/referral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, action: "get_code" }) }).then((r) => r.json()).catch(() => null),
      ]);
      if (profileRes?.profile) {
        const p = profileRes.profile;
        setProfileForm({
          username: p.username ?? "",
          displayName: p.display_name ?? "",
          bio: p.bio ?? "",
          isPublic: p.is_public ?? false,
        });
      }
      if (referralRes?.referralCode) {
        setReferralCode(referralRes.referralCode);
        setReferralCount(referralRes.referralCount ?? 0);
      }
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (user) { loadSettings(); loadProfile(); }
    else setForm({
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
  }, [user, loadSettings, loadProfile]);

  async function saveProfile() {
    if (!user) return;
    setProfileSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          username: profileForm.username || undefined,
          displayName: profileForm.displayName || undefined,
          bio: profileForm.bio || undefined,
          isPublic: profileForm.isPublic,
        }),
      });
      const data = await res.json();
      if (data.profile) {
        toast.success("Perfil salvo!");
        if (data.profile.referral_code && !referralCode) {
          setReferralCode(data.profile.referral_code);
        }
      } else {
        toast.error("Nome de usuário já existe ou é inválido");
      }
    } catch {
      toast.error("Erro ao salvar perfil");
    } finally {
      setProfileSaving(false);
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

  async function testPushNotification() {
    if (notifPerm !== "granted") {
      toast.error("Ative as notificações primeiro");
      return;
    }
    try {
      // Show a local test notification
      const notif = new Notification("🎯 Teste DisciplinaMax", {
        body: "Se você está vendo isso, as notificações estão funcionando! ✅",
        icon: "/icon-192.png",
        tag: "disciplina-test",
      });
      notif.onclick = () => { window.focus(); notif.close(); };
      toast.success("Notificação de teste enviada! Verifique seu navegador.");
    } catch (e: any) {
      toast.error(`Erro: ${e?.message || "Falha ao enviar notificação"}`);
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

      const { error } = await dataFetch({ action: "upsert", table: "user_settings", payload });

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
    return <SkeletonList count={5} className="max-w-2xl" />;
  }

  return (
    <div className="space-y-6 max-w-2xl page-enter">
      {/* Hero Header */}
      <div>
        <p className="text-xs mb-1" style={{ color: "#6B7585" }}>
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
        <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
          <Settings size={24} style={{ color: "#8B95A5" }} /> Configurações
        </h1>
      </div>

      {/* Perfil Público */}
      <section className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, rgba(58,186,180,0.03) 0%, rgba(20,24,32,0.8) 100%)", border: "1px solid rgba(58,186,180,0.1)" }}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(58,186,180,0.1)" }}>
              <User size={16} style={{ color: "#3ABAB4" }} />
            </div>
            <h2 className="font-semibold text-white">Perfil Público</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: "#8B95A5" }}>Escolha um nome de usuário para compartilhar seu progresso</p>
          <div className="space-y-3">
            <div>
              <label className="label">Nome de usuário</label>
              <div className="flex items-center gap-1">
                <span className="text-sm" style={{ color: "#8B95A5" }}>/u/</span>
                <input className="input flex-1" placeholder="seu_nome" value={profileForm.username}
                  onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} />
              </div>
              <p className="text-xs mt-1" style={{ color: "#6B7585" }}>3-20 caracteres, apenas letras minúsculas, números e _</p>
            </div>
            <div>
              <label className="label">Nome de exibição</label>
              <input className="input" placeholder="Seu Nome" value={profileForm.displayName}
                onChange={(e) => setProfileForm((p) => ({ ...p, displayName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Bio</label>
              <input className="input" placeholder="Uma frase sobre você..." maxLength={300} value={profileForm.bio}
                onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div>
                <p className="text-sm font-medium text-white">Perfil público</p>
                <p className="text-xs" style={{ color: "#6B7585" }}>Outros podem ver seu progresso em /u/{profileForm.username || "..."}</p>
              </div>
              <button
                onClick={() => setProfileForm((p) => ({ ...p, isPublic: !p.isPublic }))}
                className="w-12 h-6 rounded-full transition-all duration-200 relative"
                style={{ background: profileForm.isPublic ? "#3ABAB4" : "rgba(255,255,255,0.1)" }}
              >
                <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200"
                  style={{ left: profileForm.isPublic ? "26px" : "2px" }} />
              </button>
            </div>
          </div>
          <button onClick={saveProfile} disabled={profileSaving} className="btn-ghost text-sm mt-4 w-full">
            {profileSaving ? "Salvando..." : "Salvar Perfil"}
          </button>
        </div>
      </section>

      {/* Convites */}
      {referralCode && (
        <section className="rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(145deg, rgba(212,175,55,0.03) 0%, rgba(20,24,32,0.8) 100%)", border: "1px solid rgba(212,175,55,0.1)" }}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,175,55,0.1)" }}>
                <Gift size={16} style={{ color: "#D4AF37" }} />
              </div>
              <h2 className="font-semibold text-white">Convide Amigos</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: "#8B95A5" }}>Compartilhe seu código e ganhe 100 XP por indicação!</p>
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <code className="text-lg font-bold tracking-widest flex-1" style={{ color: "#D4AF37" }}>{referralCode}</code>
              <button
                onClick={() => { navigator.clipboard?.writeText(referralCode).then(() => toast.success("Código copiado! 📋")).catch(() => {}); }}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#8B95A5" }}
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: "#6B7585" }}>
              {referralCount} amigo{referralCount !== 1 ? "s" : ""} indicado{referralCount !== 1 ? "s" : ""} · +{referralCount * 100} XP bônus
            </p>
          </div>
        </section>
      )}

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
                <p className="text-xs" style={{ color: "#6B7585" }}>
                  {notifPerm === "granted" ? "Lembretes ativos o dia todo" : "Ative para receber lembretes automáticos"}
                </p>
              </div>
            </div>
            {notifPerm !== "granted" ? (
              <button onClick={enableNotifications} className="btn-primary text-sm">Ativar</button>
            ) : (
              <button onClick={testPushNotification} className="btn-ghost text-sm">🔔 Testar</button>
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
              <p className="text-xs mt-1" style={{ color: "#6B7585" }}>Seu ID numérico. Envie /start ao bot antes de testar. Use <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" style={{ color: "#D4AF37" }}>@userinfobot</a> para descobrir.</p>
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
                <p className="text-xs" style={{ color: "#6B7585" }}>
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
          <p className="text-xs mt-1" style={{ color: "#6B7585" }}>Sem chave, mensagens estáticas são usadas</p>
        </div>
      </section>

      {/* Salvar */}
      <button onClick={saveSettings} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
        <Check size={18} /> {saving ? "Salvando..." : "Salvar Todas as Configurações"}
      </button>
    </div>
  );
}
