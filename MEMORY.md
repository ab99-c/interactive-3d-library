# Memory — Quiet Study Hall

- Babylon.js يشتغل عبر WebGL2 داخل Canvas.
- اتجاه الكاميرا الابتدائي خاصو يكون `rotation.y = Math.PI` لأن نقطة البداية في جهة مدخل القاعة وتطل نحو الرفوف.
- `?demo` يحرّك الكاميرا لمسار deterministic، لكنه لا يمثل دائماً أفضل لقطة بعد مدة طويلة لأن الكاميرا يمكن أن تتجه نحو جدار أو منطقة مظلمة.
- الأصول البصرية مولدة ومربوطة بروابط `/manus-storage/...`; لا تنقلها إلى source tree.
- `pnpm check` نجح بعد إضافة Babylon.js.
- واجهة HUD تعتمد على أحداث `library:book` من Babylon حتى تبقى وحدات اللعبة مستقلة عن React.
- يجب تشغيل `pnpm build` قبل إنشاء repository والنشر.
- طبقة التقدم في `game/progression.ts` مستقلة عن React: تستقبل أحداث `library:book-opened` و`library:page-turned` و`library:walked` وترجع الحالة والإشعارات، وتحفظ في `quiet-study-hall:progression-v1`.
- الصوت كله مولّد WebAudio داخل `scene-base.ts`؛ أول نقرة/مفتاح تفتح AudioContext (سياسة autoplay)، وزر الكتم يكتب `quiet-study-hall:audio-enabled`.
- أحداث جديدة من Babylon: `library:walked` (كل ٦٠٠ms أثناء الحركة) و`library:player-moved` (للخريطة) و`library:book-opened` و`library:page-turned`؛ والواجهة تطلب نغمات عبر `library:chime`.
- ذرات الغبار ParticleSystem تُنشأ في الوضع السينمائي فقط وتُعطَّل مع `prefers-reduced-motion`.
- البناء يحتاج صلاحيات كاملة لأن esbuild يطلق ثنائيه عبر أنبوب stdio ممنوع في بيئة الرمل الضيقة.
