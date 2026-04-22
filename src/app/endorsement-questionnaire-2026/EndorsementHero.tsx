'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Timer, Users } from 'lucide-react';

interface EndorsementHeroProps {
  candidateId?: string;
}

/**
 * Hero landing for /endorsement-questionnaire-2026.
 *
 * Marketing-grade splash that explains the MOYD endorsement process in under
 * 20 seconds, then deep-links into the actual questionnaire with `?start=1`
 * appended (plus `candidate_id` passthrough). Navy/gold MOYD brand colors;
 * scroll-reveal animations; responsive.
 */
export default function EndorsementHero({ candidateId }: EndorsementHeroProps) {
  // Preserve candidate_id through to the form so the CRM share link works end-to-end.
  const startHref = candidateId
    ? `/endorsement-questionnaire-2026?start=1&candidate_id=${encodeURIComponent(candidateId)}`
    : '/endorsement-questionnaire-2026?start=1';

  return (
    <div className="relative z-10 min-h-screen">
      {/* Ambient gradient glows anchored to the hero — cheap parallax. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #d4a039 0%, transparent 60%)' }}
        />
        <div
          className="absolute top-1/2 -right-40 w-[38rem] h-[38rem] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3368ff 0%, transparent 60%)' }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/15 border border-gold-400/40 text-gold-200 text-xs font-bold uppercase tracking-widest"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
          2026 MOYD Endorsement
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-5 text-white font-extrabold leading-[0.95] tracking-tight"
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'clamp(2.75rem, 7vw, 5.5rem)',
            letterSpacing: '-0.04em',
            textTransform: 'uppercase',
          }}
        >
          Run <span className="inline-block">with</span>{' '}
          <span className="relative inline-block">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(90deg, #f0c04e 0%, #d4a039 50%, #f0c04e 100%)',
              }}
            >
              us.
            </span>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute left-0 right-0 -bottom-1 h-1.5 origin-left rounded-full"
              style={{ background: 'linear-gradient(90deg, #d4a039, transparent)' }}
            />
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed text-blue-50/90"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Missouri Young Democrats endorse candidates who share our vision for a
          Missouri that works for everyone under 40. Tell us who you are, the race
          you're running, and where you stand — we'll do the rest.
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
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base text-primary-900 overflow-hidden shadow-[0_10px_40px_-10px_rgba(212,160,57,0.6)] hover:shadow-[0_16px_50px_-10px_rgba(212,160,57,0.7)] transition-shadow"
            style={{
              backgroundImage: 'linear-gradient(135deg, #f0c04e 0%, #d4a039 100%)',
              fontFamily: 'Montserrat, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            {/* Shimmer overlay */}
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
              style={{
                background:
                  'linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.45) 50%, transparent 60%)',
              }}
            />
            <span className="relative">Begin application</span>
            <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <div
            className="inline-flex items-center gap-2 text-blue-100/80 text-sm"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            <Timer className="w-4 h-4" />
            ~20 minutes · save-and-return supported
          </div>
        </motion.div>

        {/* Three-up feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <HeroCard
            icon={<Users className="w-5 h-5" />}
            label="Who we endorse"
            copy="Young Democrats 35 and under, plus partner candidates 36+ who champion our issues."
          />
          <HeroCard
            icon={<ShieldCheck className="w-5 h-5" />}
            label="Confidential review"
            copy="Your answers stay inside our endorsement committee until you're publicly endorsed."
          />
          <HeroCard
            icon={<Timer className="w-5 h-5" />}
            label="What's next"
            copy="We review submissions rolling, interview finalists, and vote at the next MOYD board meeting."
          />
        </motion.div>

        {/* Process timeline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-16"
        >
          <h2
            className="text-blue-100/70 text-xs font-bold uppercase tracking-[0.2em] mb-5"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            How it works
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { n: '01', t: 'Apply', d: '12-page questionnaire. DOB auto-routes you to the Young Dem or Partner track.' },
              { n: '02', t: 'Review', d: 'Our endorsement committee reads every answer. We may follow up by text.' },
              { n: '03', t: 'Interview', d: 'Finalists meet with the committee — 20 minutes, Zoom or in person.' },
              { n: '04', t: 'Vote', d: 'MOYD board votes. Endorsed candidates get our full field and comms support.' },
            ].map((s) => (
              <li
                key={s.n}
                className="relative rounded-2xl p-5 bg-white/5 backdrop-blur-md border border-white/10 hover:border-gold-400/40 transition-colors"
              >
                <div
                  className="text-gold-300 text-xs font-black tracking-[0.2em] mb-2"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {s.n}
                </div>
                <div
                  className="text-white font-bold text-lg mb-1"
                  style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.02em' }}
                >
                  {s.t}
                </div>
                <div className="text-blue-100/75 text-sm leading-relaxed">{s.d}</div>
              </li>
            ))}
          </ol>
        </motion.div>

        {/* Final CTA stripe */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="mt-16 rounded-3xl p-8 sm:p-10 relative overflow-hidden border border-white/10"
          style={{
            background: 'linear-gradient(135deg, rgba(11,30,55,0.75) 0%, rgba(11,77,184,0.45) 100%)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div
                className="text-gold-300 text-xs font-black uppercase tracking-[0.2em] mb-2"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Ready?
              </div>
              <div
                className="text-white text-2xl sm:text-3xl font-extrabold leading-tight"
                style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.03em' }}
              >
                Let's get you on the ballot — and on ours.
              </div>
            </div>
            <Link
              href={startHref}
              className="group flex-shrink-0 inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-primary-900 shadow-lg hover:shadow-xl transition-shadow"
              style={{
                backgroundImage: 'linear-gradient(135deg, #f0c04e 0%, #d4a039 100%)',
                fontFamily: 'Montserrat, sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              Begin application
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function HeroCard({
  icon,
  label,
  copy,
}: {
  icon: React.ReactNode;
  label: string;
  copy: string;
}) {
  return (
    <div className="group relative rounded-2xl p-6 bg-white/5 backdrop-blur-md border border-white/10 hover:border-gold-400/40 hover:bg-white/10 transition-all duration-300">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gold-400/20 text-gold-300 mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div
        className="text-white font-bold text-base mb-1.5"
        style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.02em' }}
      >
        {label}
      </div>
      <div className="text-blue-100/75 text-sm leading-relaxed">{copy}</div>
    </div>
  );
}
