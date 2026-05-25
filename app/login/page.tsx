"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { playIntroChime } from "@/components/IntroScreen";
import { FlameKindling, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: err } = await signUp(email, password, name);
        if (err) setError(err);
        else playIntroChime();
      } else {
        const { error: err } = await signIn(email, password);
        if (err) setError(err);
        else playIntroChime();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Particles */}
      <div className="bg-particles">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-particle"
            style={{
              width: Math.random() * 3 + 1.5,
              height: Math.random() * 3 + 1.5,
              left: `${Math.random() * 100}%`,
              background: ["#D4AF37", "#7C6BBD", "#3ABAB4", "#E8844A"][i % 4],
              animationDuration: `${Math.random() * 20 + 20}s`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Ambient glow */}
      <div className="login-ambient-glow" />

      {/* Content */}
      <div className={`login-container ${mounted ? "mounted" : ""}`}>
        {/* Logo */}
        <div className="login-logo-wrapper">
          <div className="login-logo">
            <FlameKindling size={30} className="text-[#0B0E14]" />
          </div>
          <h1 className="login-title">DisciplinaMax</h1>
          <p className="login-subtitle">Mentor de Disciplina</p>
        </div>

        {/* Form Card */}
        <div className="login-card">
          <form onSubmit={handleSubmit} className="login-form stagger-children">
            {isSignUp && (
              <div className="login-field">
                <label className="label">Nome</label>
                <div className="relative">
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="login-field">
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label className="label">Senha</label>
              <div className="relative">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#555E6E" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 login-submit"
            >
              {loading ? (
                <div className="login-spinner" />
              ) : (
                <>
                  {isSignUp ? "Criar Conta" : "Entrar"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="login-toggle">
            <span style={{ color: "#8B95A5" }}>
              {isSignUp ? "Já tem conta?" : "Ainda não tem conta?"}
            </span>
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="login-toggle-btn"
            >
              {isSignUp ? "Entrar" : "Criar conta"}
            </button>
          </div>

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span>ou</span>
            <div className="login-divider-line" />
          </div>

          {/* Guest */}
          <button
            onClick={async () => {
              try {
                const { error } = await signIn("guest@disciplinemax.com", "guest1234");
                if (error) setError("Conta demo indisponível");
              } catch { setError("Erro ao acessar demo"); }
            }}
            className="login-guest"
          >
            <FlameKindling size={14} />
            Experimentar modo demo
          </button>
        </div>
      </div>
    </div>
  );
}
