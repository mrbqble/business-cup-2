/** "The Archivist": the game's original narrator badge, drawn from simple shapes. */
export function Archivist({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" role="img" aria-label="The Archivist, your case narrator" className={`shrink-0 ${className}`}>
      <circle cx="48" cy="48" r="45" fill="#e3c58b" stroke="#15110d" strokeWidth="3" />
      <circle cx="48" cy="48" r="38" fill="none" stroke="#15110d" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx="48" cy="57" r="17" fill="#f1d8bb" stroke="#15110d" strokeWidth="2.5" />
      <path d="M32 41 L36 24 Q48 18 60 24 L64 41 Z" fill="#3b2f25" stroke="#15110d" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="34" y="34" width="28" height="4" fill="#b3261e" />
      <rect x="23" y="39" width="50" height="6" rx="3" fill="#3b2f25" stroke="#15110d" strokeWidth="2.5" />
      <circle cx="41.5" cy="56" r="5.5" fill="#fffbf2" stroke="#15110d" strokeWidth="2" />
      <circle cx="54.5" cy="56" r="5.5" fill="#fffbf2" stroke="#15110d" strokeWidth="2" />
      <path d="M47 56 H49" stroke="#15110d" strokeWidth="2" />
      <circle cx="42.5" cy="56.5" r="1.6" fill="#15110d" />
      <circle cx="55.5" cy="56.5" r="1.6" fill="#15110d" />
      <path d="M42 66 Q48 70 54 66" fill="none" stroke="#15110d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
