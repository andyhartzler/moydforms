'use client';

import { motion } from 'framer-motion';

interface Props {
  areaLabel?: string | null;
  current: number;
  total: number;
}

/**
 * Breadcrumb the endorsement questionnaire (and any policy-grouped form)
 * renders above the current page's question set. Reads like:
 *
 *   Step 3 of 9  •  Healthcare & Reproductive Rights
 *
 * If no policy area is supplied, falls back to the step counter alone.
 * Kept styled-out so it works on both the white card and the navy body.
 */
export function PolicyAreaBreadcrumb({ areaLabel, current, total }: Props) {
  return (
    <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
      <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-moyd-unity/75">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-moyd-sunrise" />
        Step {current}
        <span className="text-moyd-unity/40">of {total}</span>
      </div>
      {areaLabel ? (
        <>
          <span aria-hidden className="hidden sm:inline text-gray-300">·</span>
          <motion.div
            key={areaLabel}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="inline-flex items-center text-[13px] font-semibold text-moyd-unity"
          >
            {areaLabel}
          </motion.div>
        </>
      ) : null}
    </div>
  );
}

/**
 * Snake_case policy-area keys -> display labels. Keeps the questionnaire
 * schema pristine (data = snake_case) while the UI shows proper title
 * casing + joined clauses for the composite areas.
 */
export const POLICY_AREA_LABELS: Record<string, string> = {
  economy_labor: 'Economy & Labor',
  healthcare: 'Healthcare',
  education: 'Education',
  environment_climate: 'Environment & Climate',
  civil_rights_lgbtq: 'Civil Rights & LGBTQ+',
  reproductive_rights: 'Reproductive Rights',
  criminal_justice: 'Criminal Justice',
  democracy_voting: 'Democracy & Voting',
  housing: 'Housing',
  immigration: 'Immigration',
  gun_policy: 'Gun Policy',
  tax_fiscal: 'Tax & Fiscal Policy',
  foreign_policy: 'Foreign Policy',
  youth_specific: 'Youth-Specific Issues',
  narrative: 'In Your Words',
};
