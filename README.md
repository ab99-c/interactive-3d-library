# Quiet Study Hall — 3D Library

© 2026 Abdel Aziz. All Rights Reserved. See [LICENSE](./LICENSE) — this is proprietary software; no reuse or redistribution is permitted without written permission.

تجربة مكتبة 3D تفاعلية بحال لعبة، مبنية بــ React وBabylon.js. اللاعب يقدر يتحرك داخل القاعة باستعمال `W A S D` أو الأسهم، ينظر بالماوس، وينقر على الكتب باش يفتح بطاقة معلومات قصيرة.

## التشغيل المحلي

```bash
pnpm install
pnpm dev
```

افتح الرابط المحلي اللي كيعطيه Vite. لفحص بصري deterministic استعمل المسار `/?demo`.

## الأوامر

```bash
pnpm check
pnpm build
```

## البنية

العالم 3D موجود في `client/src/game/scene.ts`، ودمج Babylon مع React والـ HUD موجود في `client/src/components/GameCanvas.tsx`. الأصول البصرية الكبيرة كتستعمل روابط التخزين الخاصة بالمشروع، وما خاصهاش تتحط داخل `client/public`.

## النشر على Vercel

المشروع Vite static، لذلك يمكن ربط repository الجديد بمشروع Vercel. أمر build هو `pnpm build`، ومجلد الخرج هو `dist/public` حسب إعدادات القالب. قبل النشر، شغّل `pnpm check` و`pnpm build` وتأكد من فتح `/` وإعادة تحميله.

## الحالة الحالية

النسخة الأولى فيها قاعة واحدة، رفوف، كتب ملونة، طاولة قراءة، مصباح، حركة منظور الشخص الأول، اصطدامات، تفاعل بالنقر، HUD وتعليمات. الميزات خارج النطاق حالياً هي اللعب الجماعي، الحفظ بين الجلسات، الألغاز، والشخصية المرئية من منظور ثالث.
