import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getPortalProcessingLabel = (portal: string): string => {
  if (portal.toLowerCase() === 'amazon') return 'Amazon Price grab';
  if (portal.toLowerCase() === 'flipkart') return 'Flipkart API';
  return `${portal} API`;
}
