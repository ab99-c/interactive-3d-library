# TODO — اختيار كتاب بعينه وخروجه من الرف

- [x] تشخيص علاش الالتقاط الاصطناعي والـ mesh picking ما كيوصلوش دائماً للكتاب.
- [x] إضافة واجهة اختيار مستقلة لكل كتاب باينة ومربوطة بنفس BookInfo.
- [x] جعل النقر على الاختيار يخرج الكتاب المحدد بصرياً ويفتح بطاقته.
- [x] تصحيح اتجاه النص على الغلاف داخل المشهد.
- [x] تشغيل الفحص والبناء واختبار عدة كتب.
- [x] دفع الإصلاح إلى GitHub وإعادة نشره على Vercel.

## Current warning fix

- [x] Re-read the requested project skills and current implementation guidance.
- [x] Identify why the rendered book hotspot collection produces duplicate keys.
- [x] Fix the key generation while preserving exact mesh targeting.
- [x] Run TypeScript and production build checks.
- [x] Verify the local page and browser console no longer report duplicate-key warnings.
- [x] Save a stable checkpoint and report the repaired state.

## Return control and sound effects

- [x] Re-read the Babylon game implementation guidance and inspect the current active-book API.
- [x] Add a Return book method that restores the active book and clears its active state.
- [x] Add lightweight browser-native pull and return sound effects without external assets.
- [x] Add and style a visible Return book HUD button with disabled state when no book is active.
- [x] Run TypeScript and production build checks.
- [x] Verify the control, sounds, and scene visually, then save a checkpoint.

## Smooth movement tuning

- [x] Inspect the current camera speed, inertia, gravity, collisions, and keyboard mappings.
- [x] Tune movement and look responsiveness for W/A/S/D and all directions.
- [x] Run TypeScript and production build checks.
- [x] Verify the preview and save a stable checkpoint.
