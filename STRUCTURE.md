# Structure — Quiet Study Hall

## Runtime
React 19 كإطار خارجي فقط، وBabylon.js كمالك للـ canvas والمشهد. `GameCanvas.tsx` يدير lifecycle والمحرك والـ HUD، بينما `game/scene.ts` يحتوي منطق العالم والحركة والتفاعل بدون اعتماد على React.

## Modules

| الملف | المسؤولية |
|---|---|
| `client/src/App.tsx` | عرض اللعبة فقط |
| `client/src/components/GameCanvas.tsx` | تشغيل Babylon، إدارة HUD، استقبال أحداث الكتب |
| `client/src/game/scene.ts` | إنشاء القاعة، الإضاءة، الرفوف، الكتب، الكاميرا، الاصطدامات، demo mode |
| `client/src/index.css` | هوية Quiet Study Hall، HUD، responsive behavior، motion |
| `ideas.md` | الاتجاه البصري وقرارات العلامة |
| `ASSETS.md` | سجل الأصول البصرية وروابط التخزين |

## Data model

`BookInfo` يحتوي `id`, `title`, `category`, و`description`. الكتاب يخزن هذه البيانات في `mesh.metadata.book` ويرسل حدث `library:book` عند النقر. هذا يفصل Babylon عن React ويحافظ على واجهة تفاعل بسيطة.

## Camera and controls

`UniversalCamera` بمنظور الشخص الأول، WASD/الأسهم للحركة، والماوس للنظر، مع gravity وcollisions وellipsoid. `?demo` يقدم حركة تلقائية deterministic للفحص البصري.

## Hosting notes

الأصول الكبيرة تستعمل روابط `/manus-storage/...` الخاصة بالمشروع بدل ملفات محلية داخل source tree. المشروع يبقى Vite static ويدعم build مناسباً لـ Vercel.
