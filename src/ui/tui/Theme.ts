export const THEME = {
  colors: {
    bg: '#0B0F10',
    panelBg: '#111827',
    panelBorder: '#1F2937',
    borderActive: '#3B82F6',
    textPrimary: '#E5E7EB',
    textSecondary: '#9CA3AF',
    textMuted: '#4B5563',
    selectedBg: '#2563EB',
    selectedFg: '#FFFFFF',
    favorite: '#FACC15',
    success: '#22C55E',
    warning: '#EAB308',
    error: '#EF4444',
    modalBg: '#1F2937',
    modalBorder: '#3B82F6'
  },
  techColors: {
    react: '#06B6D4',     // Cyan
    node: '#22C55E',      // Green
    nodejs: '#22C55E',    // Green
    vite: '#A855F7',      // Purple
    flutter: '#3B82F6',   // Blue
    python: '#EAB308',    // Yellow
    docker: '#06B6D4',    // Cyan
    typescript: '#3B82F6', // Blue
    javascript: '#EAB308', // Yellow
    tailwind: '#06B6D4',  // Cyan
    default: '#9CA3AF'
  } as Record<string, string>
};

export function getTechColor(name: string): string {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return THEME.techColors[normalized] || THEME.techColors.default;
}

export function formatTechBadge(name: string): string {
  const color = getTechColor(name);
  return `{bold}{${color}-fg}[${name}]{/${color}-fg}{/bold}`;
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Never';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'Invalid date';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export const HR = '────────────────────────────────────────';
