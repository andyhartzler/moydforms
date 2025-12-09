import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Voting Portal - Missouri Young Democrats',
  description: 'Cast your vote as a Missouri Young Democrats member.',
};

export default function VoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative">
      {/* Background - Same as main site */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: '#273351',
          backgroundImage: 'url(/Blue-Gradient-Background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      />

      {/* Main Content */}
      <main className="relative z-10 min-h-screen py-12">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 py-6 text-center">
        <p className="text-white/50 text-sm">
          &copy; {new Date().getFullYear()} Missouri Young Democrats
        </p>
      </footer>
    </div>
  );
}
