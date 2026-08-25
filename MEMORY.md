# Memory — Quiet Study Hall

- Babylon.js يشتغل عبر WebGL2 داخل Canvas.
- اتجاه الكاميرا الابتدائي خاصو يكون `rotation.y = Math.PI` لأن نقطة البداية في جهة مدخل القاعة وتطل نحو الرفوف.
- `?demo` يحرّك الكاميرا لمسار deterministic، لكنه لا يمثل دائماً أفضل لقطة بعد مدة طويلة لأن الكاميرا يمكن أن تتجه نحو جدار أو منطقة مظلمة.
- الأصول البصرية مولدة ومربوطة بروابط `/manus-storage/...`; لا تنقلها إلى source tree.
- `pnpm check` نجح بعد إضافة Babylon.js.
- واجهة HUD تعتمد على أحداث `library:book` من Babylon حتى تبقى وحدات اللعبة مستقلة عن React.
- يجب تشغيل `pnpm build` قبل إنشاء repository والنشر.
