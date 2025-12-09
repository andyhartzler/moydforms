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

      {/* Main Content - consistent padding top and bottom */}
      <main className="relative z-10 min-h-screen py-8">
        {children}
      </main>
    </div>
  );
}
