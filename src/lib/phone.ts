// Phone number utilities for form submission

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhone(phone);
  const phoneDigits = digits.length === 11 && digits.startsWith('1')
    ? digits.slice(1)
    : digits;

  if (phoneDigits.length === 0) return '';
  if (phoneDigits.length <= 3) return `(${phoneDigits}`;
  if (phoneDigits.length <= 6) return `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3)}`;
  return `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6, 10)}`;
}

export function formatPhoneE164(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+1${digits}`;
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

export function isPhoneComplete(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length >= 10;
}
