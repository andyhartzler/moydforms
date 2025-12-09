'use client';

import { useState } from 'react';
import Link from 'next/link';

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinkStyle = {
    fontFamily: 'Montserrat, sans-serif',
    fontStyle: 'normal',
    fontWeight: 800,
    fontSize: 'clamp(32px, 9vw, 40px)',
    letterSpacing: '0.03em',
    lineHeight: 1.35,
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden text-white z-50 relative"
        aria-label="Toggle menu"
      >
        <div className="w-6 h-5 flex flex-col justify-center items-center">
          <span
            className={`block w-full h-0.5 bg-white transition-all duration-300 ${
              isOpen ? 'rotate-45 translate-y-0.5' : '-translate-y-1'
            }`}
          />
          <span
            className={`block w-full h-0.5 bg-white transition-all duration-300 ${
              isOpen ? '-rotate-45 -translate-y-0.5' : 'translate-y-1'
            }`}
          />
        </div>
      </button>

      {/* Full Screen Menu */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#273351] z-40 flex items-center justify-center"
          onClick={() => setIsOpen(false)}
        >
          <nav className="flex flex-col items-center" style={{ gap: '3vw' }}>
            <Link
              href="https://moyoungdemocrats.org/our-team"
              className="text-white hover:text-white/80 transition-colors uppercase"
              style={navLinkStyle}
              onClick={() => setIsOpen(false)}
            >
              OUR TEAM
            </Link>
            <Link
              href="https://moyoungdemocrats.org/chapters"
              className="text-white hover:text-white/80 transition-colors uppercase"
              style={navLinkStyle}
              onClick={() => setIsOpen(false)}
            >
              CHAPTERS
            </Link>
            <Link
              href="https://events.moyoungdemocrats.org"
              className="text-white hover:text-white/80 transition-colors uppercase"
              style={navLinkStyle}
              onClick={() => setIsOpen(false)}
            >
              EVENTS
            </Link>
            <Link
              href="https://moyoungdemocrats.org/about"
              className="text-white hover:text-white/80 transition-colors uppercase"
              style={navLinkStyle}
              onClick={() => setIsOpen(false)}
            >
              ABOUT
            </Link>
            <Link
              href="https://moyoungdemocrats.org/donate"
              className="text-white hover:text-white/80 transition-colors uppercase"
              style={navLinkStyle}
              onClick={() => setIsOpen(false)}
            >
              DONATE
            </Link>
            <Link
              href="https://moyoungdemocrats.org/contact"
              className="text-white hover:text-white/80 transition-colors uppercase"
              style={navLinkStyle}
              onClick={() => setIsOpen(false)}
            >
              CONTACT
            </Link>
            <Link
              href="https://members.moyoungdemocrats.org"
              className="text-white hover:text-white/80 transition-colors uppercase"
              style={navLinkStyle}
              onClick={() => setIsOpen(false)}
            >
              MEMBERS
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
