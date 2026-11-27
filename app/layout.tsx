import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Hub — A calmer place for team work",
    template: "%s · Hub",
  },
  description:
    "Hub is a fast, calm workspace for projects, tasks, docs, and team chat.",
  applicationName: "Hub",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Hub", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfa" },
    { media: "(prefers-color-scheme: dark)", color: "#151517" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem("hub-text-size");if(s&&["large","larger","largest"].indexOf(s)>-1)document.documentElement.setAttribute("data-text-size",s);if(localStorage.getItem("hub-sidebar")==="collapsed")document.documentElement.setAttribute("data-sidebar","collapsed")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
