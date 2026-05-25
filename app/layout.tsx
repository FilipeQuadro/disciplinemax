import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "@/components/Sidebar";
import { NotificationInit } from "@/components/NotificationInit";
import { IntroScreen } from "@/components/IntroScreen";
import { BackgroundParticles } from "@/components/BackgroundParticles";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "DisciplinaMax – Mentor de Disciplina",
  description: "Seu assistente inteligente de leitura, foco e disciplina diária",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Disciplina",
  },
  icons: {
    apple: "/icon-192.png",
    icon: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0E14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#0B0E14] text-slate-100 antialiased">
        <AuthProvider>
        <IntroScreen />
        <BackgroundParticles />
        <div className="flex h-screen overflow-hidden relative z-10">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
              {children}
            </div>
          </main>
        </div>
        <NotificationInit />
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#141820",
              color: "#F0F0F0",
              border: "1px solid rgba(212,175,55,0.12)",
              borderRadius: "14px",
              fontSize: "14px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            },
            success: { iconTheme: { primary: "#D4AF37", secondary: "#0B0E14" } },
            error: { iconTheme: { primary: "#D94F4F", secondary: "#F0F0F0" } },
          }}
        />
      </body>
    </html>
  );
}
