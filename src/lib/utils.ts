/**
 * Capitalizes each word in a string (Title Case)
 * @param str - The string to capitalize
 * @returns The string with each word capitalized
 */
export function toTitleCase(str: string): string {
  if (!str) return '';

  // List of words that should stay lowercase (unless they're the first word)
  const minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'of', 'in'];

  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize the first word
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Keep minor words lowercase unless they're significant
      if (minorWords.includes(word)) {
        return word;
      }
      // Capitalize the first letter of other words
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Formats a class name string by filtering out falsy values
 * @param classes - Array of class name strings
 * @returns Joined class name string
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
