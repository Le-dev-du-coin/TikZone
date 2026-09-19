import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "TikZone Cloud - Gestion Hotspot MikroTik & VPN à distance",
  description: "Plateforme cloud de gestion centralisée de routeurs MikroTik Hotspot (ROS 7.16+) et tunnels VPN",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" className="scroll-smooth" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <AuthProvider>
          {children}
          <WhatsAppSupportButton />
        </AuthProvider>
      </body>
    </html>
  );
}

