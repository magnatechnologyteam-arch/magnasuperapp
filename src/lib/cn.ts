import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Gabungkan className secara aman: clsx menangani kondisional,
 * tailwind-merge menghapus konflik utility (mis. "px-2" vs "px-4").
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
