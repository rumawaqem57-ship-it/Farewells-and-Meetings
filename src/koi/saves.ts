export interface ChapterSave {
  id: string;
  floorId: number | null;
  index: number;
  preview: string;
  at: number;
}

const KEY = 'koi-chapters';
const LIMIT = 30;

export function readChapterSaves(): ChapterSave[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (item): item is ChapterSave =>
          !!item &&
          typeof item === 'object' &&
          typeof item.index === 'number' &&
          typeof item.preview === 'string' &&
          typeof item.at === 'number',
      )
      .sort((a, b) => b.at - a.at)
      .slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function writeChapterSave(input: {
  floorId: number | null;
  index: number;
  preview: string;
}): ChapterSave[] {
  const id = input.floorId != null ? `floor-${input.floorId}` : 'sample';
  const entry: ChapterSave = {
    id,
    floorId: input.floorId,
    index: Math.max(0, input.index),
    preview: input.preview.replace(/\s+/g, ' ').trim().slice(0, 80),
    at: Date.now(),
  };
  const next = [entry, ...readChapterSaves().filter(item => item.id !== id)].slice(0, LIMIT);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 忽略
  }
  return next;
}

export function clearChapterSaves(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 忽略
  }
}

/* ============================================================
 * 手动存读档：9 个槽位（3×3），与上面的「自动章节回看」互不干扰。
 * ============================================================ */

export const SLOT_COUNT = 9;
const SLOT_KEY = 'koi-save-slots';

export interface SaveSlotData {
  /** 1–9 */
  slot: number;
  floorId: number | null;
  index: number;
  preview: string;
  speaker?: string;
  location?: string;
  phase?: string;
  at: number;
}

export interface SaveFile {
  v: 1;
  kind: 'koi-save';
  exportedAt: number;
  slots: Array<SaveSlotData | null>;
}

function emptySlots(): Array<SaveSlotData | null> {
  return Array.from({ length: SLOT_COUNT }, () => null);
}

function isSlot(value: unknown): value is SaveSlotData {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SaveSlotData>;
  return (
    typeof item.slot === 'number' &&
    typeof item.index === 'number' &&
    typeof item.preview === 'string' &&
    typeof item.at === 'number'
  );
}

export function readSaveSlots(): Array<SaveSlotData | null> {
  const slots = emptySlots();
  try {
    const raw = JSON.parse(localStorage.getItem(SLOT_KEY) || 'null');
    if (!raw || typeof raw !== 'object' || !Array.isArray((raw as SaveFile).slots)) return slots;
    (raw as SaveFile).slots.forEach((item, i) => {
      if (i < SLOT_COUNT && isSlot(item)) slots[i] = { ...item, slot: i + 1 };
    });
  } catch {
    // 损坏就当空
  }
  return slots;
}

function persist(slots: Array<SaveSlotData | null>): void {
  try {
    localStorage.setItem(SLOT_KEY, JSON.stringify({ v: 1, slots }));
  } catch {
    // 配额满：静默失败，UI 会因读回空槽而提示
  }
}

export function writeSaveSlot(
  slot: number,
  data: Omit<SaveSlotData, 'slot' | 'at'> & { at?: number },
): Array<SaveSlotData | null> {
  const slots = readSaveSlots();
  const target = Math.min(SLOT_COUNT, Math.max(1, slot));
  slots[target - 1] = {
    ...data,
    slot: target,
    preview: data.preview.replace(/\s+/g, ' ').trim().slice(0, 90),
    at: data.at ?? Date.now(),
  };
  persist(slots);
  return slots;
}

export function removeSaveSlot(slot: number): Array<SaveSlotData | null> {
  const slots = readSaveSlots();
  if (slot >= 1 && slot <= SLOT_COUNT) slots[slot - 1] = null;
  persist(slots);
  return slots;
}

export function firstEmptySlot(): number {
  const slots = readSaveSlots();
  const index = slots.findIndex(item => !item);
  return index === -1 ? 1 : index + 1;
}

export function exportSaveFile(): SaveFile {
  return { v: 1, kind: 'koi-save', exportedAt: Date.now(), slots: readSaveSlots() };
}

export type ImportResult =
  | { ok: true; count: number }
  | { ok: false; message: string };

/** 导入策略：按顺序填进空槽；空槽不够时从第 1 槽开始覆盖。 */
export function importSaveFile(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: '不是合法的 JSON 文件' };
  }
  const incoming = (parsed as SaveFile)?.slots;
  if (!Array.isArray(incoming)) return { ok: false, message: '文件里没有 slots 字段' };

  const valid = incoming.filter(isSlot);
  if (valid.length === 0) return { ok: false, message: '文件里没有可用的存档位' };

  const slots = readSaveSlots();
  let count = 0;
  for (const item of valid) {
    let target = slots.findIndex(entry => !entry);
    if (target === -1) target = (count % SLOT_COUNT);
    if (target === -1) break;
    slots[target] = { ...item, slot: target + 1 };
    count += 1;
  }
  persist(slots);
  return { ok: true, count };
}
