# Structure — Quiet Study Hall

## Runtime
React 19 كإطار خارجي فقط، وBabylon.js كمالك للـ canvas والمشهد. `GameCanvas.tsx` يدير lifecycle والمحرك والـ HUD، بينما `game/scene.ts` يحتوي منطق العالم والحركة والتفاعل بدون اعتماد على React.

## Modules

| الملف | المسؤولية |
|---|---|
| `client/src/App.tsx` | عرض اللعبة فقط |
| `client/src/components/GameCanvas.tsx` | تشغيل Babylon، إدارة HUD، استقبال أحداث الكتب |
| `client/src/game/scene.ts` | إنشاء القاعة، الإضاءة، الرفوف، الكتب، الكاميرا، الاصطدامات، demo mode |
| `client/src/game/scene-base.ts` | المشهد الأساسي والتفاعل: الصوت المولّد، ذرات الغبار، أحداث التقدم |
| `client/src/game/progression.ts` | أهداف الباحث، نقاط المعرفة، الرتب، والحفظ — مستقلة عن React وBabylon |
| `client/src/index.css` | هوية Quiet Study Hall، HUD، responsive behavior، motion |
| `ideas.md` | الاتجاه البصري وقرارات العلامة |
| `ASSETS.md` | سجل الأصول البصرية وروابط التخزين |

## Data model

`BookInfo` يحتوي `id`, `title`, `category`, و`description`. الكتاب يخزن هذه البيانات في `mesh.metadata.book` ويرسل حدث `library:book` عند النقر. هذا يفصل Babylon عن React ويحافظ على واجهة تفاعل بسيطة.

## Camera and controls

`UniversalCamera` بمنظور الشخص الأول، WASD/الأسهم للحركة، والماوس للنظر، مع gravity وcollisions وellipsoid. `?demo` يقدم حركة تلقائية deterministic للفحص البصري.

## Hosting notes

الأصول الكبيرة تستعمل روابط `/manus-storage/...` الخاصة بالمشروع بدل ملفات محلية داخل source tree. المشروع يبقى Vite static ويدعم build مناسباً لـ Vercel.


## Phase 2 architecture

- `client/src/game/architecture-config.ts` centralizes building, floor, corridor, room, door, stair, elevator, and shelf dimensions.
- World hierarchy: `Building → Floor → Section → Row → Shelf → Slot → Book`.
- Coordinate system: X east/west, Y vertical, Z north/south; floor levels are basement `-4.2`, ground `0`, first `4.2`, second `8.4`; building envelope is X `-24..24`, Z `-36..36`.
- Existing scene and interaction code remains the owner of Babylon nodes. New architectural factories layer onto `scene-base.ts` and preserve the existing `GameHandle` contract.
- Static architecture uses shared materials, frozen world matrices, simple collision boxes, and distance-aware visibility for mobile performance.
