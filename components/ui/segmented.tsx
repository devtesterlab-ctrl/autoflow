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
    <div role="group" aria-label={label} className="space-y-2">
      <span className="block text-sm font-semibold">{label}</span>
      <div className={`grid gap-2 ${COLUMN_CLASSES[columns]}`}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`h-14 border-2 px-3 text-base font-bold active:translate-y-px ${
                selected
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/30 bg-transparent dark:border-white/30"
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
