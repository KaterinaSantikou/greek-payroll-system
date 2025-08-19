import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, language: 'el' | 'en' = 'el'): string {
  return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}
