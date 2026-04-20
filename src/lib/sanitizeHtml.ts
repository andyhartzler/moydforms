/**
 * Lightweight HTML sanitiser that is safe to import from both server and
 * client code.
 *
 * We originally used `isomorphic-dompurify` but its transitive dep tree
 * (jsdom → html-encoding-sniffer → @exodus/bytes) includes a module that
 * is pure-ESM while the consumer tries to `require()` it. That crashes
 * the Vercel Node serverless runtime with ERR_REQUIRE_ESM on every SSR.
 *
 * The HTML we sanitise is authored via the CRM admin UI (trusted surface),
 * so this implementation is a conservative allow-list cleanup:
 *   - on the client, use the real DOMPurify for defence-in-depth;
 *   - on the server, strip `<script>` and any `on*=` attributes via regex
 *     before the string is streamed to the browser. The result matches
 *     the client-side DOMPurify output closely enough that the hydration
 *     mismatch warning doesn't fire.
 */

const SCRIPT_RE = /<script[\s\S]*?<\/script>/gi;
const ON_ATTR_RE = /\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;
const JS_URI_RE = /\s(?:href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi;

function baselineSanitize(html: string): string {
  return html
    .replace(SCRIPT_RE, '')
    .replace(ON_ATTR_RE, '')
    .replace(JS_URI_RE, '');
}

export function sanitizeHtml(html: string | undefined): string {
  if (!html) return '';
  // Server path: no window, ship the regex-scrubbed string.
  if (typeof window === 'undefined') return baselineSanitize(html);
  // Client path: hand off to DOMPurify for proper sanitisation.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const DOMPurify = require('dompurify') as any;
    const purify = DOMPurify.sanitize ? DOMPurify : DOMPurify(window);
    return purify.sanitize(html, {
      ALLOWED_TAGS: ['a', 'strong', 'b', 'em', 'i', 'u', 'br', 'p', 'span', 'code'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
    }) as string;
  } catch {
    return baselineSanitize(html);
  }
}
