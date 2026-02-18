'use client';

import { NETWORK, NETWORK_DISPLAY_NAME } from '@/config/network';

export default function NetworkBadge() {
    const isLocal = NETWORK === 'local';

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className={`
                px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest
                backdrop-blur-md border
                ${isLocal
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                }
                shadow-lg
            `}>
                <span className={`
                    inline-block w-2 h-2 rounded-full mr-2 animate-pulse
                    ${isLocal ? 'bg-yellow-400' : 'bg-purple-400'}
                `}></span>
                {NETWORK_DISPLAY_NAME}
            </div>
        </div>
    );
}
