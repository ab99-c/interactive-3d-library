import { describe, expect, it } from "vitest";
import { parseCommand } from "./command-parser";

describe("parseCommand", () => {
  it("parses Arabic take commands", () => {
    expect(parseCommand("خذ الكتاب الأزرق")).toMatchObject({ intent: "TAKE_OBJECT", objectQuery: "الكتاب الأزرق" });
  });

  it("parses placement targets", () => {
    expect(parseCommand("ضع الكتاب فوق الطاولة")).toMatchObject({ intent: "PLACE_OBJECT", targetQuery: "الطاولة" });
  });

  it("parses return and history commands", () => {
    expect(parseCommand("رجع الكتاب للرف")).toMatchObject({ intent: "RETURN_OBJECT", targetQuery: "original_position" });
    expect(parseCommand("undo")).toMatchObject({ intent: "UNDO" });
    expect(parseCommand("redo")).toMatchObject({ intent: "REDO" });
  });

  it("rejects unsupported free-form text", () => {
    expect(parseCommand("غدا الجو جميل")).toBeNull();
  });
});
