import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { IntroScreen } from "@/components/IntroScreen";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "DisciplinaApp — Transformando disciplina em crescimento contínuo",
  description:
    "Plataforma de desenvolvimento de hábitos, leitura, foco e produtividade com IA pessoal (Kairos).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <IntroScreen />
          <Toaster position="top-center" />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
