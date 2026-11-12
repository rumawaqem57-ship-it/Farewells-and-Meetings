/** 酒馆全局函数安全访问：iframe 内优先 window，其次 parent；全部 try/catch，浏览器裸跑不崩。 */
export function getTavernFn<T extends (...args: any[]) => any>(name: string): T | null {
  const scopes: any[] = [];
  try {
    scopes.push(window);
  } catch {
    /* ignore */
  }
  try {
    if (window.parent && window.parent !== window) scopes.push(window.parent);
  } catch {
    /* 跨域 */
  }
  for (const scope of scopes) {
    try {
      const fn = scope?.[name];
      if (typeof fn === 'function') return fn.bind(scope) as T;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function getTavernEvents(): any | null {
  try {
    return (window as any).tavern_events ?? (window.parent as any)?.tavern_events ?? null;
  } catch {
    return null;
  }
}

export function getIframeEvents(): any | null {
  try {
    return (window as any).iframe_events ?? (window.parent as any)?.iframe_events ?? null;
  } catch {
    return null;
  }
}

export function hasTavern(): boolean {
  return !!(getTavernFn('getChatMessages') && getTavernFn('getLastMessageId') && getTavernFn('eventOn'));
}

/** 酒馆原生上下文：window 或 parent 的 SillyTavern.getContext()。 */
export function getSillyTavernContext<T = any>(): T | null {
  const scopes: any[] = [];
  try {
    scopes.push(window);
  } catch {
    /* ignore */
  }
  try {
    if (window.parent && window.parent !== window) scopes.push(window.parent);
  } catch {
    /* 跨域 */
  }
  for (const scope of scopes) {
    try {
      const context = scope?.SillyTavern?.getContext?.();
      if (context) return context as T;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** 访问全局对象（Mvu 是对象，不是函数）：window → parent。 */
export function getTavernGlobal<T = any>(name: string): T | null {
  const scopes: any[] = [];
  try {
    scopes.push(window);
  } catch {
    /* ignore */
  }
  try {
    if (window.parent && window.parent !== window) scopes.push(window.parent);
  } catch {
    /* 跨域 */
  }
  for (const scope of scopes) {
    try {
      const value = scope?.[name];
      if (value) return value as T;
    } catch {
      /* ignore */
    }
  }
  return null;
}
