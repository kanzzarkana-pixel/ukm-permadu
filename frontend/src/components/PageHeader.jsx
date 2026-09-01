import { Sparkles } from "lucide-react";

export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
      <div>
        {eyebrow && (
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase text-[var(--p-gold)] mb-2">
            <Sparkles size={14} strokeWidth={2}/> {eyebrow}
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--p-navy)] font-display leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[var(--p-muted)] max-w-2xl text-sm md:text-base">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
