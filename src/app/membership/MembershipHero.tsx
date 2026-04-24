'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarHeart, MapPin, Megaphone, Timer } from 'lucide-react';

interface MembershipHeroProps {
  chapter?: string;
}

/**
 * Hero landing for /membership.
 *
 * Marketing-grade splash that sets the stakes ("join the movement") before
 * the user hits the phone-entry screen. If the user arrived from a chapter
 * landing page with `?chapter=kc` we pass that along as a pre-fill hint
 * (the FormContainer schema itself handles chapter selection; this param
 * is just tracked for analytics + surface personalization).
 *
 * Deep-link escape: `?start=1` bypasses this hero and lands straight on
 * the phone-entry screen — used by SMS blasts and social CTAs where the
 * pitch has already happened upstream.
 */
export default function MembershipHero({ chapter }: MembershipHeroProps) {
  // Preserve chapter hint through to the form so analytics tie back.
  const startHref = chapter
    ? `/membership?start=1&chapter=${encodeURIComponent(chapter)}`
    : '/membership?start=1';

  return (
    <div className="relative z-10 min-h-screen">
      {/* Ambient gradient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full opacity-35 blur-3xl"
          style={{ background: 'radial-gradient(circle, #FDB813 0%, transparent 60%)' }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[38rem] h-[38rem] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #32A6DE 0%, transparent 60%)' }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-moyd-sunrise/15 border border-moyd-sunrise/40 text-moyd-sunrise text-xs font-bold uppercase tracking-widest"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-moyd-sunrise animate-pulse" />
          Membership · Free · Ages 14–36
        </motion.div>

        {/* Headline — Fraunces serif for the editorial feel */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-6 text-white font-display font-semibold leading-[0.95] tracking-tight"
          style={{
            fontSize: 'clamp(2.5rem, 6.5vw, 5rem)',
            letterSpacing: '-0.035em',
          }}
        >
          Join the{' '}
          <span className="relative inline-block">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, #FDB813 0%, #f0c04e 50%, #FDB813 100%)',
              }}
            >
              movement.
            </span>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute left-0 right-0 -bottom-1 h-1.5 origin-left rounded-full"
              style={{ background: 'linear-gradient(90deg, #FDB813, transparent)' }}
            />
          </span>
        </motion.h1>

        {/* Sub — Montserrat, keeps body clean */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed text-blue-50/90"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Missouri Young Democrats is the largest group of young organizers,
          candidates, and voters in the state. Membership is free — and it's
          how we win.
        </motion.p>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
        >
          <Link
            href={startHref}
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base text-moyd-unity overflow-hidden shadow-[0_10px_40px_-10px_rgba(253,184,19,0.6)] hover:shadow-[0_16px_50px_-10px_rgba(253,184,19,0.7)] transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-moyd-sunrise focus-visible:ring-offset-2 focus-visible:ring-offset-moyd-unity"
            style={{
              backgroundImage: 'linear-gradient(135deg, #FDB813 0%, #d4a039 100%)',
              fontFamily: 'Montserrat, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
              style={{
                background:
                  'linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.45) 50%, transparent 60%)',
              }}
            />
            <span className="relative">Become a member</span>
            <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <div
            className="inline-flex items-center gap-2 text-blue-100/80 text-sm"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            <Timer className="w-4 h-4" />
            Under 3 minutes · no payment required
          </div>
        </motion.div>

        {/* Three value props */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <ValueCard
            icon={<MapPin className="w-5 h-5" />}
            label="Your local chapter"
            copy="We'll connect you to your city's MOYD chapter the moment you join — no waiting list."
          />
          <ValueCard
            icon={<CalendarHeart className="w-5 h-5" />}
            label="Events + training"
            copy="Member-only organizer trainings, candidate meet-and-greets, and statewide convenings."
          />
          <ValueCard
            icon={<Megaphone className="w-5 h-5" />}
            label="A vote that matters"
            copy="Members elect MOYD leadership, shape our endorsements, and set the platform."
          />
        </motion.div>

        {/* Social proof / quote strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="mt-16 rounded-3xl p-8 sm:p-10 relative overflow-hidden border border-white/10"
          style={{
            background:
              'linear-gradient(135deg, rgba(39,51,81,0.75) 0%, rgba(11,77,184,0.45) 100%)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div
                className="text-moyd-sunrise text-xs font-black uppercase tracking-[0.2em] mb-2"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Ready?
              </div>
              <div className="text-white font-display text-2xl sm:text-3xl font-semibold leading-tight tracking-tight">
                This is how the next Missouri gets built.
              </div>
            </div>
            <Link
              href={startHref}
              className="group flex-shrink-0 inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-moyd-unity shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-moyd-sunrise focus-visible:ring-offset-2 focus-visible:ring-offset-moyd-unity"
              style={{
                backgroundImage: 'linear-gradient(135deg, #FDB813 0%, #d4a039 100%)',
                fontFamily: 'Montserrat, sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              Start
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ValueCard({
  icon,
  label,
  copy,
}: {
  icon: React.ReactNode;
  label: string;
  copy: string;
}) {
  return (
    <div className="group relative rounded-2xl p-6 bg-white/5 backdrop-blur-md border border-white/10 hover:border-moyd-sunrise/40 hover:bg-white/10 transition-all duration-300">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-moyd-sunrise/20 text-moyd-sunrise mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="text-white font-display font-semibold text-lg mb-1.5 tracking-tight leading-tight">
        {label}
      </div>
      <div className="text-blue-100/80 text-sm leading-relaxed">{copy}</div>
    </div>
  );
}
