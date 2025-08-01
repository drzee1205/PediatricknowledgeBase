import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { registerServiceWorker } from "@/lib/pwa";

export const metadata: Metadata = {
  title: "NelsonGPT - Your Pediatric Medical Assistant",
  description: "AI-powered pediatric medical assistant powered by Nelson Textbook of Pediatrics. Evidence-based clinical support for healthcare professionals.",
  keywords: ["NelsonGPT", "Pediatrics", "Medical AI", "Clinical Assistant", "Nelson Textbook", "Healthcare", "PWA", "Mobile App"],
  authors: [{ name: "NelsonGPT Team" }],
  openGraph: {
    title: "NelsonGPT - Pediatric Medical Assistant",
    description: "AI-powered pediatric medical assistant powered by Nelson Textbook of Pediatrics",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NelsonGPT - Pediatric Medical Assistant",
    description: "AI-powered pediatric medical assistant powered by Nelson Textbook of Pediatrics",
  },
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "NelsonGPT",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black",
    "apple-mobile-web-app-title": "NelsonGPT",
    "msapplication-TileColor": "#121212",
    "msapplication-config": "/browserconfig.xml",
    "msapplication-navbutton-color": "#121212",
    "msapplication-starturl": "/",
    "application-name": "NelsonGPT",
    "theme-color": "#121212",
  },
  icons: {
    icon: [
      { url: '/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon-192x192.png',
  },
  category: "medical",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Register service worker on client side
  if (typeof window !== 'undefined') {
    registerServiceWorker();
  }

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta name="theme-color" content="#121212" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-1024x1024.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className="antialiased bg-background text-foreground"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
