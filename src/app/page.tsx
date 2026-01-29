import Hero from '@/components/Hero';
import BidForm from '@/components/BidForm';
import Navbar from '@/components/Navbar';

export default function Home() {
  return (
    <main className="min-h-screen relative flex flex-col">
      {/* Navbar Placeholder */}
      <Navbar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-start pt-20 pb-20 gap-12">
        <Hero />

        <div className="w-full px-4 relative z-20 -mt-20">
          <BidForm />
        </div>

        {/* Footer/Trust Indicators */}
        <div className="mt-auto pt-20 pb-10 text-center text-[#C2A8FF]/40 text-xs font-mono">
          <p>Powered by <span className="text-[#9B6CFF]">Solana</span> & <span className="text-[#6AE3FF]">Arcium</span> Confidential Computing</p>
        </div>
      </div>
    </main>
  );
}
