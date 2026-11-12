const KEY = 'koi-player-name';

export function readPlayerName(): string {
  try {
    return (localStorage.getItem(KEY) || '').trim();
  } catch {
    return '';
  }
}

export function writePlayerName(name: string): void {
  try {
    localStorage.setItem(KEY, name.trim());
  } catch {
    // 忽略
  }
}

export function clearPlayerName(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 忽略
  }
}
