import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Placeholder tabel kosong yang lebih hidup — menggantikan teks polos
 * "Belum ada X" yang sebelumnya dipakai berulang di semua tabel manager.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center gap-1.5 px-5 py-12 text-center">
      <div className="animate-float grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{title}</p>
      {description && (
        <p className="max-w-xs text-xs text-zinc-400 dark:text-zinc-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
