import Hero from '@/components/Hero';
import BidForm from '@/components/BidForm';
import Navbar from '@/components/Navbar';
import NetworkBadge from '@/components/NetworkBadge';

export default function Home() {
  return (
    <main className="min-h-screen relative flex flex-col">
      {/* Navbar Placeholder */}
      <Navbar />

      {/* Network Indicator */}
      <NetworkBadge />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-start pt-20 pb-20 gap-12">
        <Hero />

        <div className="w-full px-4 relative z-20 mt-4">
          <BidForm />
        </div>

        {/* Footer/Trust Indicators */}
        <div className="mt-auto pt-20 pb-10 text-center text-[#6A5A8A]/50 text-[10px] font-mono tracking-[0.15em]">
          <p>Powered by <span className="text-[#9B6CFF]/60">Solana</span> & <span className="text-[#9090a5]">Arcium</span> Confidential Computing</p>
        </div>
      </div>
    </main>
  );
}
