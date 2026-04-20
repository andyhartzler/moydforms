'use client';

import DOMPurify from 'isomorphic-dompurify';

/**
 * Shared help-text renderer for every form field.
 *
 * Schemas are authored via the Flutter CRM admin surface and often embed
 * inline <a> links (voter-lookup, national-guideline references, etc).
 * Rendering the string as plain text shows the raw tags — which is what
 * happened with "Are you registered to vote in Missouri?" whose help read
 * `Not sure? <a href='…'>Check your status here</a>`.
 *
 * Even though the authoring surface is trusted, we sanitize with DOMPurify
 * before injection so a compromised schema row can't exfiltrate session
 * data via <script> / onerror / etc. Allowlist is narrow — only inline
 * formatting and links to safe protocols.
 */
const ALLOWED_TAGS = ['a', 'strong', 'b', 'em', 'i', 'u', 'br', 'span', 'code'];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

// Force every anchor to open in a new tab with safe rel. Runs after
// DOMPurify's own target filter so we know what survived, then we stamp
// the attributes ourselves on the parsed DOM fragment. This is the
// standard "link hygiene" pass — keeps users from tabnabbing exploits
// while still getting a new-tab behaviour on external links.
function enhanceLinks(html: string): string {
  if (typeof window === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (/^https?:/i.test(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return doc.body.firstElementChild?.innerHTML ?? html;
}

interface FieldHelpProps {
  html: string | undefined;
  className?: string;
}

export default function FieldHelp({ html, className = 'text-sm text-gray-500 mb-3' }: FieldHelpProps) {
  if (!html) return null;
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
  });
  const enhanced = enhanceLinks(clean);
  return (
    <p
      className={`${className} [&_a]:text-primary-600 [&_a]:underline [&_a:hover]:text-primary-700`}
      dangerouslySetInnerHTML={{ __html: enhanced }}
    />
  );
}
