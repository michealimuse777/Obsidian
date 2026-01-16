'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';

const WalletMultiButton = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export default function Navbar() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 backdrop-blur-sm pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-black font-display text-lg">
                    O
                </div>
                <span className="font-display font-medium text-lg tracking-tight">OBSIDIAN</span>
            </div>

            <div className="pointer-events-auto">
                {/* 
                  WalletMultiButton is provided by the adapter UI. 
                  We override some styles via globals.css or implicit class names if needed, 
                  but standard button is fine for MVP.
                */}
                <WalletMultiButton style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '9999px',
                    fontFamily: 'var(--font-ibm-mono)',
                    fontSize: '0.875rem',
                    height: 'auto',
                    padding: '0.5rem 1rem',
                    color: 'white'
                }} />
            </div>
        </header>
    );
}
