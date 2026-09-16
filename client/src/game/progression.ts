// قاعة الدراسة الهادئة — طبقة التقدم: أهداف الباحث، نقاط المعرفة، الرتب، وحفظ التقدم في المتصفح.
// هذه الوحدة مستقلة عن React وBabylon: تستقبل أحداث اللعبة وترجع الحالة والإشعارات.

export type GameEvent =
  | { type: "walked"; delta: number }
  | { type: "book-opened"; bookId: string; title: string }
  | { type: "page-turned"; bookId: string; direction: "rtl" | "ltr" };

export type ProgressState = {
  xp: number;
  walked: number;
  openedBooks: string[];
  pagesTurned: number;
  hayyTurns: number;
  completed: string[];
};

export type Rank = { id: string; title: string; minXp: number };

export type Objective = {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
  progress: (state: ProgressState) => { current: number; target: number; label: string };
  isComplete: (state: ProgressState) => boolean;
};

export type Toast = { id: number; kind: "discovery" | "objective" | "rank"; title: string; body: string };

export const PROGRESS_STORAGE_KEY = "quiet-study-hall:progression-v1";
export const AUDIO_STORAGE_KEY = "quiet-study-hall:audio-enabled";
export const CATALOG_SIZE = 16;

export const RANKS: Rank[] = [
  { id: "visitor", title: "زائر القاعة", minXp: 0 },
  { id: "reader", title: "قارئ", minXp: 50 },
  { id: "scholar", title: "باحث", minXp: 150 },
  { id: "sage", title: "عالِم", minXp: 300 },
  { id: "keeper", title: "حكيم المكتبة", minXp: 600 },
];

const walkTarget = 60;
const pagesTarget = 8;
const explorerTarget = 8;
const hayyTarget = 12;

export const OBJECTIVES: Objective[] = [
  {
    id: "first-steps",
    title: "الخطوات الأولى",
    description: "تجوّل في أرجاء القاعة وتعرّف على ممراتها وأروقتها.",
    rewardXp: 25,
    progress: (state) => ({
      current: Math.min(state.walked, walkTarget),
      target: walkTarget,
      label: `${toArabicDigits(Math.min(Math.round(state.walked), walkTarget))} / ${toArabicDigits(walkTarget)} وحدة مسافة`,
    }),
    isComplete: (state) => state.walked >= walkTarget,
  },
  {
    id: "first-book",
    title: "افتتاح المعرفة",
    description: "اقترب من أي رف وافتح كتاباً لتبدأ رحلتك.",
    rewardXp: 25,
    progress: (state) => ({
      current: Math.min(state.openedBooks.length, 1),
      target: 1,
      label: `${toArabicDigits(Math.min(state.openedBooks.length, 1))} / ١ كتاب`,
    }),
    isComplete: (state) => state.openedBooks.length >= 1,
  },
  {
    id: "pages",
    title: "قارئ مثابر",
    description: "اقلب صفحات الكتب وتعمّق في نصوصها.",
    rewardXp: 30,
    progress: (state) => ({
      current: Math.min(state.pagesTurned, pagesTarget),
      target: pagesTarget,
      label: `${toArabicDigits(Math.min(state.pagesTurned, pagesTarget))} / ${toArabicDigits(pagesTarget)} صفحات`,
    }),
    isComplete: (state) => state.pagesTurned >= pagesTarget,
  },
  {
    id: "explorer",
    title: "مستكشف الرفوف",
    description: "اكتشف ثمانية كتب مختلفة من فهرس القاعة.",
    rewardXp: 40,
    progress: (state) => ({
      current: Math.min(state.openedBooks.length, explorerTarget),
      target: explorerTarget,
      label: `${toArabicDigits(Math.min(state.openedBooks.length, explorerTarget))} / ${toArabicDigits(explorerTarget)} كتب`,
    }),
    isComplete: (state) => state.openedBooks.length >= explorerTarget,
  },
  {
    id: "hayy",
    title: "رحلة حي بن يقظان",
    description: "اقرأ اثنتي عشرة صفحة من كتاب حي بن يقظان.",
    rewardXp: 60,
    progress: (state) => ({
      current: Math.min(state.hayyTurns, hayyTarget),
      target: hayyTarget,
      label: `${toArabicDigits(Math.min(state.hayyTurns, hayyTarget))} / ${toArabicDigits(hayyTarget)} صفحة`,
    }),
    isComplete: (state) => state.hayyTurns >= hayyTarget,
  },
  {
    id: "archivist",
    title: "أمين المكتبة",
    description: "اكتشف فهرس القاعة كاملاً: ستة عشر كتاباً.",
    rewardXp: 80,
    progress: (state) => ({
      current: state.openedBooks.length,
      target: CATALOG_SIZE,
      label: `${toArabicDigits(state.openedBooks.length)} / ${toArabicDigits(CATALOG_SIZE)} كتب`,
    }),
    isComplete: (state) => state.openedBooks.length >= CATALOG_SIZE,
  },
];

export const toArabicDigits = (value: number) => String(value).replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);

export const rankFor = (xp: number): Rank => RANKS.reduce((best, rank) => (xp >= rank.minXp ? rank : best), RANKS[0]);

const defaultProgress = (): ProgressState => ({ xp: 0, walked: 0, openedBooks: [], pagesTurned: 0, hayyTurns: 0, completed: [] });

export function loadProgress(): ProgressState {
  try {
    const stored = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!stored) return defaultProgress();
    const parsed = JSON.parse(stored) as Partial<ProgressState>;
    return {
      ...defaultProgress(),
      ...parsed,
      openedBooks: Array.isArray(parsed.openedBooks) ? parsed.openedBooks : [],
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(state: ProgressState) {
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // التقدم يبقى داخل الجلسة عندما يعطّل المتصفح التخزين.
  }
}

export function resetProgress(): ProgressState {
  const fresh = defaultProgress();
  saveProgress(fresh);
  return fresh;
}

let toastSequence = 0;
const nextToastId = () => {
  toastSequence += 1;
  return toastSequence;
};

export function applyProgressEvent(previous: ProgressState, event: GameEvent): { state: ProgressState; toasts: Toast[] } {
  const state: ProgressState = {
    ...previous,
    openedBooks: [...previous.openedBooks],
    completed: [...previous.completed],
  };
  const toasts: Toast[] = [];
  const rankBefore = rankFor(previous.xp);

  switch (event.type) {
    case "walked": {
      state.walked += Math.max(0, event.delta);
      break;
    }
    case "book-opened": {
      if (!state.openedBooks.includes(event.bookId)) {
        state.openedBooks.push(event.bookId);
        state.xp += 10;
        toasts.push({ id: nextToastId(), kind: "discovery", title: "اكتشاف جديد", body: event.title });
      }
      break;
    }
    case "page-turned": {
      state.pagesTurned += 1;
      state.xp += 2;
      if (event.bookId === "hayy-ibn-yaqdhan") state.hayyTurns += 1;
      break;
    }
  }

  OBJECTIVES.forEach((objective) => {
    if (state.completed.includes(objective.id) || !objective.isComplete(state)) return;
    state.completed.push(objective.id);
    state.xp += objective.rewardXp;
    toasts.push({ id: nextToastId(), kind: "objective", title: "أُنجز الهدف", body: objective.title });
  });

  const rankAfter = rankFor(state.xp);
  if (rankAfter.id !== rankBefore.id) {
    toasts.push({ id: nextToastId(), kind: "rank", title: "ترقية الرتبة", body: rankAfter.title });
  }

  return { state, toasts };
}
