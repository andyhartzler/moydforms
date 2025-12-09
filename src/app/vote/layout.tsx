import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Vote - Missouri Young Democrats',
  description: 'Cast your vote as a Missouri Young Democrats member.',
};

export default function VoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative">
      {/* Background - Override parent */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: 'linear-gradient(135deg, #273351 0%, #1a2540 50%, #273351 100%)',
        }}
      />

      {/* Minimal Header */}
      <header className="relative z-50 py-6">
        <div className="max-w-2xl mx-auto px-4">
          <Link href="https://moyoungdemocrats.org" className="flex justify-center">
            <Image
              src="/text-logo-960png.png"
              alt="Missouri Young Democrats"
              width={200}
              height={95}
              className="w-auto h-12 md:h-16"
              priority
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pb-12">
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
