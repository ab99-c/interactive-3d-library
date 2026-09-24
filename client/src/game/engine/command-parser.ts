import type { StructuredCommand } from "./types";

const normalize = (value: string) => value.trim().toLocaleLowerCase("ar").replace(/[؟?!.,]/g, "");

export function parseCommand(raw: string): StructuredCommand | null {
  const text = normalize(raw);
  if (!text) return null;
  if (/^(undo|تراجع|رجوع)$/.test(text)) return { intent: "UNDO", raw };
  if (/^(redo|إعادة|اعادة)$/.test(text)) return { intent: "REDO", raw };
  if (/(رجع|أعد|اعد|return)/.test(text)) return { intent: "RETURN_OBJECT", objectQuery: extractObject(text), targetQuery: "original_position", raw };
  if (/(افتح|open)/.test(text)) return { intent: "OPEN_OBJECT", objectQuery: extractObject(text), raw };
  if (/(أغلق|اغلق|close)/.test(text)) return { intent: "CLOSE_OBJECT", objectQuery: extractObject(text), raw };
  if (/(ضع|حط|place|put)/.test(text)) return { intent: "PLACE_OBJECT", objectQuery: extractObject(text), targetQuery: extractTarget(text), raw };
  if (/(خذ|امسك|جيب|أعطني|اعطني|take|grab|get)/.test(text)) return { intent: "TAKE_OBJECT", objectQuery: extractObject(text), raw };
  return null;
}

function extractObject(text: string) {
  const cleaned = text.replace(/^(خذ|امسك|جيب|أعطني|اعطني|take|grab|get|افتح|open|رجع|أعد|اعد|return|أغلق|اغلق|close|ضع|حط|place|put)\s*/i, "").trim();
  if (!cleaned || /^(الكتاب|book|it|هذا|هدا)$/.test(cleaned)) return undefined;
  return cleaned.replace(/(على|فوق|للرف|إلى|الى|to|on|the|الطاولة|الرف).*$/i, "").trim() || undefined;
}

function extractTarget(text: string) {
  const match = text.match(/(?:على|فوق|إلى|الى|to|on)\s+(.+)$/i);
  return match?.[1]?.trim();
}
