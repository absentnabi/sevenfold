export function FoldMark({ className }: { className?: string }) {
  const bars = [
    { x: 4.2, h: 8 },
    { x: 8.2, h: 12 },
    { x: 12.2, h: 16 },
    { x: 16.2, h: 20 },
    { x: 20.2, h: 16 },
    { x: 24.2, h: 12 },
    { x: 28.2, h: 8 },
  ];
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.14" />
      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={26 - bar.h}
          width="2.2"
          height={bar.h}
          rx="1.1"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
