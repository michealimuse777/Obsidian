import type { Metadata } from 'next';
import { Inter, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '600'],
  variable: '--font-ibm-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'OBSIDIAN | Confidential Launchpad',
  description: 'AI-Driven, End-to-End Private Launchpad on Solana',
};

import AppWalletProvider from '../components/AppWalletProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased bg-black text-white min-h-screen selection:bg-purple-500/30`}
      >
        <AppWalletProvider>
          {children}
        </AppWalletProvider>
        <Toaster richColors position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
