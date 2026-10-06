export function BrandMark() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        className="brand-mark text-neutral-900"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path className="brand-body" d="M4 8h16l-1.4 11.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 8Z" />
        <path className="brand-handle" d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5" />
        <circle className="brand-dot" cx="12" cy="15.5" r="1.7" fill="currentColor" stroke="none" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap text-neutral-900">Shega Mart</span>
    </span>
  );
}
