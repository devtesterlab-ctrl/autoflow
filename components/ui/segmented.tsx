"use client";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
}

const COLUMN_CLASSES = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
} as const;

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 2,
}: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className={`grid gap-2 ${COLUMN_CLASSES[columns]}`}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`h-10 rounded-xl border px-3 text-sm font-semibold transition-all active:scale-[0.98] ${
                selected
                  ? "border-transparent bg-slate-900 text-white shadow-2xs dark:bg-white dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
