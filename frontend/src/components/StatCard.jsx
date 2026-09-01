export default function StatCard({ icon: Icon, label, value, sub, tone = "navy", delay = 0, testid }) {
  const toneMap = {
    navy:    { bg: "rgba(15, 30, 61, 0.08)", color: "var(--p-navy)" },
    royal:   { bg: "rgba(30, 64, 175, 0.12)", color: "var(--p-royal)" },
    gold:    { bg: "rgba(240, 180, 41, 0.15)", color: "#8a6d15" },
    crimson: { bg: "rgba(185, 28, 28, 0.1)", color: "var(--p-crimson)" },
    muted:   { bg: "rgba(74, 90, 117, 0.12)", color: "var(--p-muted)" },
    emerald: { bg: "rgba(30, 64, 175, 0.12)", color: "var(--p-royal)" },
    terra:   { bg: "rgba(185, 28, 28, 0.1)", color: "var(--p-crimson)" },
  };
  const t = toneMap[tone] || toneMap.navy;
  return (
    <div className="stat-card fade-up" style={{ animationDelay: `${delay}s` }} data-testid={testid}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--p-muted)] font-semibold truncate">{label}</div>
          <div className="mt-3 text-base sm:text-lg xl:text-xl font-bold text-[var(--p-navy)] font-display leading-tight whitespace-nowrap overflow-hidden text-ellipsis" title={String(value)}>{value}</div>
          {sub && <div className="mt-1 text-xs text-[var(--p-muted)] truncate">{sub}</div>}
        </div>
        {Icon && (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: t.bg, color: t.color }}>
            <Icon size={20} strokeWidth={1.8}/>
          </div>
        )}
      </div>
    </div>
  );
}
