'use client';

import { useAuth } from '@/hooks/use-auth';
import { Icons } from "@/components/icons";
import { WorksheetWizard } from "@/components/worksheet-wizard";
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Floating Mathematical Symbols Component
function FloatingMathSymbols() {
  const symbols = [
    { symbol: 'π', size: 'text-8xl', color: 'text-blue-300/40' },
    { symbol: '∑', size: 'text-7xl', color: 'text-purple-300/35' },
    { symbol: '∞', size: 'text-6xl', color: 'text-green-300/45' },
    { symbol: '√', size: 'text-9xl', color: 'text-indigo-300/30' },
    { symbol: '∆', size: 'text-7xl', color: 'text-cyan-300/40' },
    { symbol: '∫', size: 'text-8xl', color: 'text-teal-300/35' },
    { symbol: 'α', size: 'text-6xl', color: 'text-violet-300/45' },
    { symbol: 'β', size: 'text-7xl', color: 'text-emerald-300/40' },
    { symbol: '∂', size: 'text-6xl', color: 'text-sky-300/35' },
    { symbol: '≤', size: 'text-5xl', color: 'text-blue-400/50' },
    { symbol: '≥', size: 'text-5xl', color: 'text-purple-400/45' },
    { symbol: '∈', size: 'text-6xl', color: 'text-green-400/40' },
    { symbol: 'θ', size: 'text-7xl', color: 'text-indigo-400/35' },
    { symbol: 'λ', size: 'text-6xl', color: 'text-cyan-400/40' },
    { symbol: 'Σ', size: 'text-5xl', color: 'text-teal-400/45' },
    { symbol: 'ψ', size: 'text-6xl', color: 'text-rose-300/35' },
    { symbol: 'Ω', size: 'text-7xl', color: 'text-amber-300/40' },
    { symbol: '∇', size: 'text-5xl', color: 'text-lime-300/45' },
    { symbol: '∴', size: 'text-4xl', color: 'text-pink-300/50' },
    { symbol: '∵', size: 'text-4xl', color: 'text-orange-300/45' },
    { symbol: '≈', size: 'text-5xl', color: 'text-slate-400/40' },
    { symbol: '≠', size: 'text-5xl', color: 'text-red-300/45' },
    { symbol: '±', size: 'text-6xl', color: 'text-yellow-300/40' },
    { symbol: '∪', size: 'text-5xl', color: 'text-fuchsia-300/35' },
    { symbol: '∩', size: 'text-5xl', color: 'text-emerald-400/40' }
  ];
  
  // Define specific positions for better distribution
  const positions = [
    // Top area
    { left: '5%', top: '5%' }, { left: '15%', top: '8%' }, { left: '25%', top: '3%' }, { left: '35%', top: '10%' }, 
    { left: '45%', top: '6%' }, { left: '55%', top: '12%' }, { left: '65%', top: '4%' }, { left: '75%', top: '9%' },
    { left: '85%', top: '7%' }, { left: '95%', top: '11%' },
    // Right side
    { left: '85%', top: '20%' }, { left: '92%', top: '30%' }, { left: '88%', top: '40%' }, { left: '94%', top: '50%' },
    { left: '90%', top: '60%' }, { left: '93%', top: '70%' },
    // Bottom area
    { left: '85%', top: '85%' }, { left: '75%', top: '88%' }, { left: '65%', top: '82%' }, { left: '55%', top: '90%' },
    { left: '45%', top: '87%' }, { left: '35%', top: '83%' }, { left: '25%', top: '89%' }, { left: '15%', top: '86%' },
    { left: '5%', top: '84%' }
  ];
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {symbols.map((item, index) => {
        const position = positions[index % positions.length];
        return (
          <div
            key={index}
            className={`absolute font-bold ${item.size} ${item.color} math-float select-none`}
            style={{
              left: position.left,
              top: position.top,
              animationDelay: `${index * 0.5}s`,
              animationDuration: `${8 + Math.random() * 6}s`,
              transform: `rotate(${Math.random() * 40 - 20}deg)`,
              filter: 'blur(0.5px)'
            }}
          >
            {item.symbol}
          </div>
        );
      })}
      
      <div className="absolute top-20 left-4 text-3xl text-blue-200/30 math-pulse font-mono rotate-12">x² + y² = r²</div>
      <div className="absolute top-60 left-2 text-2xl text-purple-200/35 math-pulse font-mono -rotate-6" style={{ animationDelay: '1s' }}>f'(x) = lim</div>
      <div className="absolute bottom-60 left-6 text-xl text-green-200/40 math-pulse font-mono rotate-8" style={{ animationDelay: '3s' }}>∫₀^∞ e^(-x²)dx</div>
      <div className="absolute bottom-20 left-3 text-2xl text-indigo-200/30 math-pulse font-mono -rotate-12" style={{ animationDelay: '5s' }}>∇·F = 0</div>
      
      <div className="absolute top-32 right-4 text-3xl text-cyan-200/35 math-pulse font-mono -rotate-10" style={{ animationDelay: '2s' }}>∑ᵢ₌₁^n aᵢ</div>
      <div className="absolute top-80 right-2 text-2xl text-teal-200/40 math-pulse font-mono rotate-15" style={{ animationDelay: '4s' }}>∂²u/∂x²</div>
      <div className="absolute bottom-40 right-5 text-xl text-violet-200/35 math-pulse font-mono -rotate-8" style={{ animationDelay: '6s' }}>det(A) ≠ 0</div>
      <div className="absolute bottom-80 right-3 text-2xl text-emerald-200/30 math-pulse font-mono rotate-12" style={{ animationDelay: '7s' }}>lim x→0</div>
      
      <div className="absolute top-2 left-1/4 text-2xl text-amber-200/35 math-pulse font-mono rotate-6" style={{ animationDelay: '1.5s' }}>sin²θ + cos²θ = 1</div>
      <div className="absolute top-4 right-1/3 text-xl text-rose-200/40 math-pulse font-mono -rotate-5" style={{ animationDelay: '3.5s' }}>e^(iπ) + 1 = 0</div>
      
      <div className="absolute bottom-2 left-1/3 text-2xl text-lime-200/35 math-pulse font-mono -rotate-7" style={{ animationDelay: '2.5s' }}>∮ F·dr = 0</div>
      <div className="absolute bottom-4 right-1/4 text-xl text-pink-200/40 math-pulse font-mono rotate-9" style={{ animationDelay: '4.5s' }}>√(-1) = i</div>
    </div>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await getAuth().signOut();
    router.push('/login');
  };
  
  return (
    <AuthWrapper>
      <div className="math-pattern-bg min-h-screen">
        <FloatingMathSymbols />
        <main className="container mx-auto px-4 py-8 relative z-10">
          <header className="mb-12 flex items-center justify-between print:hidden fade-in-up">
            <div className="flex items-center gap-4">
              <Icons.Logo className="h-16 w-16" />
              <div>
                <h1 className="educational-header text-5xl font-bold text-transparent">
                  ImproMaths
                </h1>
                <p className="mt-1 text-lg text-muted-foreground">
                  Elevate learning with tailor-made math worksheets using AI.
                </p>
              </div>
            </div>
            {user && !loading && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {user.email}</span>
                <Button onClick={handleLogout} variant="outline" size="sm">Logout</Button>
              </div>
            )}
          </header>
          
          <div className="max-w-4xl mx-auto">
            <WorksheetWizard />
          </div>
        </main>
      </div>
    </AuthWrapper>
  );
}
