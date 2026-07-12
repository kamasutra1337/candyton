/**
 * Thin wrapper over the Telegram Mini App runtime. Everything degrades
 * gracefully so the game runs identically in a normal browser (and later,
 * inside a Capacitor shell for the App Store / Play Store build).
 */
interface TelegramWebApp {
  ready(): void;
  expand(): void;
  colorScheme: 'light' | 'dark';
  initData: string;
  initDataUnsafe?: { user?: { id: number; first_name?: string; username?: string } };
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  };
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const tg = (): TelegramWebApp | undefined => window.Telegram?.WebApp;

export function initTelegram(): void {
  const app = tg();
  if (!app) return;
  app.ready();
  app.expand();
  app.setHeaderColor?.('#1b1030');
  app.setBackgroundColor?.('#1b1030');
}

export function telegramUser(): { id: number; name: string } | null {
  const u = tg()?.initDataUnsafe?.user;
  if (!u) return null;
  return { id: u.id, name: u.first_name ?? u.username ?? `Player ${u.id}` };
}

export function haptic(kind: 'light' | 'medium' | 'heavy' | 'success' | 'error'): void {
  const h = tg()?.HapticFeedback;
  if (!h) return;
  if (kind === 'success' || kind === 'error') h.notificationOccurred(kind);
  else h.impactOccurred(kind);
}

export const isTelegram = (): boolean => !!tg();
