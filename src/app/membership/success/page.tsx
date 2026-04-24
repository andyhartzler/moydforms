import Link from 'next/link';
import {
  CheckCircle2,
  Users,
  Calendar,
  MessageCircle,
  ExternalLink,
  Instagram,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const metadata = {
  title: 'Welcome to MOYD | Missouri Young Democrats',
  description: 'Your membership application has been received.',
};

/**
 * Success screen for the membership form — the moment somebody officially
 * becomes part of the largest young-voter organizing bloc in Missouri.
 * Treated as a brand moment, not a toast: editorial serif hero, a three-step
 * welcome timeline, and two meaningful CTAs that actually take the new
 * member somewhere useful (Slack + chapter events), not just "our website".
 */
export default function MembershipSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="max-w-xl w-full">
        {/* Editorial welcome card */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-[0_30px_80px_-30px_rgba(39,51,81,0.35)]">
          {/* Top accent */}
          <div
            aria-hidden
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{
              background: 'linear-gradient(90deg, #273351 0%, #FDB813 45%, #32A6DE 100%)',
            }}
          />
          {/* Ambient sunrise blur */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, #FDB813 0%, transparent 65%)' }}
          />

          <div className="relative p-8 sm:p-10">
            {/* Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-moyd-unity text-moyd-sunrise flex items-center justify-center shadow-[0_10px_24px_-10px_rgba(39,51,81,0.6)]">
                <Sparkles className="w-7 h-7" strokeWidth={2.25} />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-moyd-unity/70">
                  You're in
                </div>
                <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Membership received
                </div>
              </div>
            </div>

            {/* Editorial hero */}
            <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.02] tracking-tight text-moyd-unity">
              Welcome to the{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, #FDB813 0%, #d4a039 50%, #FDB813 100%)',
                }}
              >
                movement.
              </span>
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-gray-700">
              Your application is in — check your email for a welcome note with
              next steps. We're already routing you to the right chapter and
              queueing you up for the next organizing call.
            </p>

            {/* Rule */}
            <div
              aria-hidden
              className="mt-8 mb-6 h-px w-24"
              style={{ background: 'linear-gradient(90deg, #d4a039, transparent)' }}
            />

            {/* Timeline */}
            <div className="space-y-4">
              <TimelineItem
                icon={<MessageCircle className="w-5 h-5" />}
                label="Today"
                title="Welcome email"
                copy="A welcome note with your member portal login and the Slack invite."
              />
              <TimelineItem
                icon={<Users className="w-5 h-5" />}
                label="This week"
                title="Chapter intro"
                copy="Your local chapter leader will reach out about upcoming meetings."
              />
              <TimelineItem
                icon={<Calendar className="w-5 h-5" />}
                label="Soon"
                title="Events + training"
                copy="You'll be invited to the next statewide meeting and organizer trainings."
              />
            </div>

            {/* CTAs */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="https://members.moyoungdemocrats.org"
                className="group inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-moyd-unity shadow-[0_10px_30px_-12px_rgba(253,184,19,0.6)] hover:shadow-[0_14px_36px_-12px_rgba(253,184,19,0.75)] transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-moyd-sunrise focus-visible:ring-offset-2"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #FDB813 0%, #d4a039 100%)',
                }}
              >
                Member portal
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="https://events.moyoungdemocrats.org"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-moyd-unity bg-white border-2 border-moyd-unity hover:bg-moyd-unity hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-moyd-unity focus-visible:ring-offset-2"
              >
                See events
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
            <Link
              href="https://instagram.com/moyoungdems"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-moyd-unity/80 hover:text-moyd-unity"
            >
              <Instagram className="w-4 h-4" />
              Follow @moyoungdems
            </Link>
          </div>
        </div>

        {/* Footer attribution */}
        <p className="mt-6 text-sm text-blue-100/80 text-center font-medium">
          Powered by <span className="text-white font-semibold">Missouri Young Democrats</span>
        </p>
      </div>
    </div>
  );
}

function TimelineItem({
  icon,
  label,
  title,
  copy,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-moyd-unity/5 text-moyd-unity flex items-center justify-center border border-moyd-unity/10">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-moyd-unity/60">
          {label}
        </div>
        <div className="mt-0.5 font-display text-lg font-semibold text-moyd-unity tracking-tight leading-tight">
          {title}
        </div>
        <div className="mt-1 text-sm text-gray-600 leading-relaxed">{copy}</div>
      </div>
    </div>
  );
}
