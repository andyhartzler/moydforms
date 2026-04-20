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
  return (
    <p
      className={`${className} [&_a]:text-primary-600 [&_a]:underline [&_a:hover]:text-primary-700`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
