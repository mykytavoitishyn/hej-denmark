const mem = new Map<string, string>();
export const store = {
  get(k: string): string | null {
    try {
      const v = localStorage.getItem(k);
      if (v !== null) return v;
    } catch {}
    return mem.get(k) ?? null;
  },
  set(k: string, v: string): void {
    mem.set(k, v);
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
  del(k: string): void {
    mem.delete(k);
    try {
      localStorage.removeItem(k);
    } catch {}
  },
  /** Removes everything, including the in-memory copy. Used to reset state between tests. */
  clear(): void {
    mem.clear();
    try {
      localStorage.clear();
    } catch {}
  },
};
/** Reads and parses a stored value. The result is untrusted, so callers must validate its shape. */
export const readJSON = <T>(k: string, fb: T): T => {
  const v = store.get(k);
  if (v == null) return fb;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fb;
  }
};
export const writeJSON = (k: string, v: unknown): void => store.set(k, JSON.stringify(v));
export const KEY = {
  active: 'hej-denmark-active-guest',
  profile: (id: string) => 'hej-denmark-guest-profile-' + id,
  done: (id: string) => 'hej-denmark-guest-completions-' + id,
  skipped: (id: string) => 'hej-denmark-guest-skipped-' + id,
  avatar: (id: string) => 'hej-denmark-guest-avatar-' + id,
  checklist: (id: string) => 'hej-denmark-step-checklist-guest-' + id,
  reminders: (id: string) => 'hej-denmark-reminders-guest-' + id,
  saved: (id: string) => 'hej-denmark-saved-events-guest-' + id,
  ask: (id: string) => 'hej-denmark-ask-history-guest-' + id,
  budget: (id: string) => 'hej-denmark-budget-guest-' + id,
};
