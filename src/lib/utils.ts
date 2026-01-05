import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | undefined | null): string {
    if (!dateStr) return 'N/A';

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    // Use UTC methods to ensure consistent date rendering regardless of local time zone
    // since input dates like '2025-06-14' usually imply a specific calendar date.
    const day = date.getUTCDate();
    const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const year = date.getUTCFullYear().toString().slice(-2);

    return `${day} ${month} ${year}`;
}
