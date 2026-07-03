const VOWEL_MAP: Record<string, string> = {
  a: 'á',
  e: 'é',
  i: 'í',
  o: 'ó',
  u: 'ú',
  A: 'Á',
  E: 'É',
  I: 'Í',
  O: 'Ó',
  U: 'Ú',
};

export function toPseudoString(value: string): string {
  const accented = value
    .split('')
    .map((ch) => VOWEL_MAP[ch] ?? ch)
    .join('');
  return `[[${accented}]]`;
}
