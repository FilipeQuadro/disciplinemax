"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { FlameKindling, Mail, Lock, User, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: err } = await signUp(email, password, name);
        if (err) setError(err);
      } else {
        const { error: err } = await signIn(email, password);
        if (err) setError(err);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0B0E14" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: "linear-gradient(135deg, #D4AF37, #F5D060)",
              boxShadow: "0 0 40px rgba(212,175,55,0.2)",
            }}
          >
            <FlameKindling size={28} className="text-[#0B0E14]" />
          </div>
          <h1 className="font-serif text-2xl font-bold gradient-text-gold">DisciplinaMax</h1>
          <p className="text-xs mt-1 tracking-[0.15em] uppercase" style={{ color: "#555E6E" }}>Mentor de Disciplina</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="label">Nome</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#555E6E" }} />
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

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#555E6E" }} />
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

          <div>
            <label className="label">Senha</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#555E6E" }} />
              <input
                type="password"
                className="input pl-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: "#D94F4F" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {loading ? "Carregando..." : (
              <>
                {isSignUp ? "Criar Conta" : "Entrar"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm mt-6" style={{ color: "#8B95A5" }}>
          {isSignUp ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
            className="font-medium hover:underline"
            style={{ color: "#D4AF37" }}
          >
            {isSignUp ? "Entrar" : "Criar conta"}
          </button>
        </p>

        {/* Guest */}
        <div className="mt-6 text-center">
          <p className="text-xs mb-3" style={{ color: "#555E6E" }}>ou continue sem conta</p>
          <a href="/" className="btn-ghost text-sm">
            Entrar como convidado →
          </a>
        </div>
      </div>
    </div>
  );
}
