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

## Direct mouse-look

- [x] Inspect the current Babylon camera pointer input and canvas event listeners.
- [x] Make passive mouse movement rotate the camera without requiring a button or pointer lock.
- [x] Preserve click/pointerdown book interaction and prevent UI controls from rotating the camera.
- [x] Run checks and verify mouse-look plus book clicks, then save a checkpoint.

## Restore walking after mouse-look

- [x] Inspect keyboard input ownership and current camera attachment.
- [x] Restore reliable WASD and arrow walking while keeping passive mouse-look.
- [x] Run checks and verify walking plus mouse-look together.
- [x] Save a stable checkpoint.

## Persist pulled book until explicit return

- [x] Trace every pull completion and shelf-reset path.
- [x] Ensure animation completion leaves the active book pulled out.
- [x] Keep return limited to selecting another book or pressing Return book.
- [x] Run checks and verify the behavior, then save a checkpoint.

## Modern Standard Arabic interface

- [x] Audit all visible HUD, welcome, control, and interaction strings.
- [x] Translate the interface into clear Modern Standard Arabic and preserve original book titles where appropriate.
- [x] Adjust RTL/Arabic typography and spacing without harming the 3D scene.
- [x] Run checks and verify the localized layout and interactions, then save a checkpoint.

## Click active book to return

- [x] Trace active-book click handling for canvas and React hotspots.
- [x] Make clicking the pulled-out book return it to the shelf.
- [x] Preserve selecting a different book and the Return book button.
- [x] Run checks and verify the interactions, then save a checkpoint.

## Book approaches the player

- [x] Inspect the current pull direction and camera/player position.
- [x] Increase the selected book motion so it travels toward the player, not only outward from the shelf.
- [x] Preserve one active book, click-to-return, Return book, and existing movement controls.
- [x] Run checks and verify the animation, then save a checkpoint.

## Mobile touch controls

- [x] Inspect the current mobile layout and canvas event handling.
- [x] Add a virtual joystick for movement in all directions.
- [x] Add touch-drag camera look without breaking book taps.
- [x] Run checks and verify mobile and desktop layouts, then save a checkpoint.

## GitHub upload and Vercel handoff

- [x] Confirm the latest mobile-controls checkpoint and clean repository state.
- [x] Commit and push the latest version to ab99-c/interactive-3d-library.
- [x] Verify GitHub main contains the mobile touch controls.
- [x] Provide the Vercel Publish handoff without performing publication here.

## Keep mobile player inside library

- [x] Inspect room dimensions and current camera movement loop.
- [x] Clamp camera position inside safe floor and wall boundaries for touch and keyboard movement.
- [x] Preserve book picking, mouse-look, and joystick behavior.
- [x] Run checks and verify mobile and desktop boundaries, then save a checkpoint.

## Realistic book proportions and placement

- [x] Inspect current book dimensions, cover/page offsets, and shelf clearance.
- [x] Refine book proportions so each mesh reads as a real book rather than a cube.
- [x] Add natural variation in thickness, height, tilt, and spacing while keeping titles readable.
- [x] Run checks and verify the shelves and book interactions, then save a checkpoint.

## Verify unchanged visible version

- [ ] Compare the active preview, latest checkpoint, GitHub main, and Vercel bundle.
- [ ] Confirm whether realistic book geometry is present in the served source.
- [ ] Fix any stale-build, deployment, or geometry issue causing the unchanged appearance.
- [ ] Run checks, verify visually, and save a corrected checkpoint.

## Standard book formats

- [x] Map Pocket, A5, Trade Paperback, B5, A4, square, planner, and notebook formats to game-scale proportions.
- [x] Apply format-specific width, height, thickness, cover, page block, and title-plate dimensions.
- [x] Arrange the varied books naturally while preserving shelf clearance and reliable picking.
- [x] Run checks and verify the scene, then save a checkpoint.

## Restore PC keyboard movement

- [x] Inspect keyboard focus and camera input ownership on desktop.
- [x] Restore WASD and arrow-key movement without requiring a canvas click.
- [x] Preserve passive mouse-look, book clicks, mobile joystick, and room bounds.
- [x] Run checks and verify desktop movement, then save a checkpoint.

## Reference-style realistic books

- [x] Treat the supplied photos as visual ground truth for leather covers, gold ornament, Arabic spine typography, and coordinated sets.
- [x] Add visible cover/spine detailing beyond flat colored rectangles while keeping the geometry lightweight.
- [x] Arrange books in denser, believable rows and multi-volume groups with safe picking targets.
- [x] Run checks and verify the reference-style result, then save a checkpoint.

## Visible reference redesign retry

- [x] Compare the visible build with the supplied reference style and identify why the previous change was imperceptible.
- [x] Make leather covers, gold ornament, Arabic spine details, and varied sizes visibly prominent at the camera distance.
- [x] Verify the exact rendered preview and confirm book picking still works.
- [x] Save a new checkpoint only after the visible difference is confirmed.

## Rebuild realistic Arabic-bound books

- [x] Define a book asset structure based on the supplied real-book references.
- [x] Replace the box-like appearance with rounded spines, separate covers, page blocks, and visible binding details.
- [x] Add reference-matched Arabic ornamental treatment while preserving lightweight picking meshes.
- [x] Verify at gameplay distance and test pull, return, and selection interactions before saving a checkpoint.

## Reference-shaped book rebuild

- [x] Compare the current visible silhouettes with the supplied book references.
- [x] Replace the repeated rectangular treatment with fully covered, curved-spine book forms.
- [x] Add thick cover edges, raised binding bands, and grouped multi-volume arrangements.
- [x] Verify the actual camera view and interaction before saving a checkpoint.

## Match supplied shelf silhouette

- [ ] Compare the reference shelf books with the rendered silhouette and spacing.
- [ ] Make each visible spine wider, taller, and materially full rather than a thin plaque.
- [ ] Fill the shelf rows with dense upright volumes and reduce large gaps.
- [ ] Verify the exact camera view and book interaction before saving a checkpoint.

## Exact Arabic bound-volume reference

- [x] Match the tall narrow-series silhouette shown in the reference.
- [x] Add brown/black leather bands, repeated gold ornament, vertical Arabic-style spine marks, and part-number badges.
- [x] Add a distinct large rounded-spine multi-volume form for reference sets.
- [x] Verify the visible shelf result and selection behavior before saving a checkpoint.ing.

## Smaller books and fuller shelves

- [x] Reduce book width, height, and depth while preserving readable details.
- [x] Increase each shelf row to a denser set of volumes with safe spacing.
- [x] Keep all book meshes uniquely pickable and preserve pull/return behavior.
- [x] Verify the filled shelves visually and run checks before checkpointing.

## Smaller final book scale

- [x] Reduce the current book dimensions substantially based on the supplied size reference.
- [x] Keep the shelf rows populated after scaling down the volumes.
- [x] Preserve readable spine details and unique book picking.
- [x] Verify the new scale visually and save a checkpoint.

## Recording error-fix pass

- [x] Trace duplicate pointer/click paths and touch-vs-joystick conflicts.
- [x] Harden one-book state and prevent repeated pull/return events.
- [x] Stabilize desktop keyboard movement and mobile touch movement.
- [x] Verify all recorded flows on desktop and mobile before checkpointing.

## Align books inside shelf bays

- [x] Inspect shelf depth, board heights, book local positions, and lean transforms.
- [x] Move the books inward and down so each volume is supported by its shelf board.
- [x] Keep rows evenly spaced, reduce protrusion, and preserve unique picking and pull/return behavior.
- [x] Verify alignment visually and run checks before saving a checkpoint.

## Public-domain Arabic book

- [x] Research a suitable Arabic book whose original text is in the public domain and verify the online source terms.
- [x] Record the source URL and the safe rights rationale before using any title or excerpt.
- [x] Add the verified book to the in-game catalogue without copying a protected modern edition.
- [x] Run checks, verify the Arabic book interaction, and save a checkpoint.

## Physical book opening animation

- [x] Inspect the current book hierarchy, pull animation, and active-book state.
- [x] Add a physical pull-to-player motion followed by a cover-opening and two-page spread animation.
- [x] Connect the opened physical book to the Arabic HUD and preserve explicit return behavior.
- [x] Verify desktop and mobile interaction, then save a checkpoint.

## Arabic two-page reading and RTL page turning

- [x] Inspect the opened-book geometry and current active-book state.
- [x] Add a stable two-page spread and a visible right-to-left page-turn animation.
- [x] Add Arabic page-turn controls and preserve close/return behavior.
- [x] Verify the interaction on desktop and mobile, then save a checkpoint.

## Remove book-picker overlay

- [x] Remove the visible «اختر كتاباً» panel from the React HUD.
- [x] Preserve direct physical shelf clicking, nearest-book inspection, page opening, page turning, and return behavior.
- [x] Run checks and verify desktop and mobile layout before saving a checkpoint.

## Recording: physical book does not open

- [x] Analyze the supplied recording and reproduce the failed physical-book flow.
- [x] Trace event routing and opened-book state for the selected mesh.
- [x] Fix the open and RTL page-turn animation without breaking return behavior.
- [x] Run checks, verify the recording-driven flow, and save a checkpoint.

## Square opened-book pages

- [x] Inspect the current open-page width and height.
- [x] Resize both physical reading pages to a near-square proportion.
- [x] Preserve RTL page turning, book pull, and return behavior.
- [x] Run checks and verify desktop and mobile before checkpointing.

## Direction-aware page clicks

- [x] Identify the physical left and right page meshes and current turn state.
- [x] Make right-page clicks turn right-to-left and left-page clicks turn left-to-right.
- [x] Keep Arabic controls, closing, return, and direct book interaction intact.
- [x] Run checks and verify both page directions before checkpointing.

## Side-aware full-book clicking

- [x] Detect clicks on the whole open-book hit area, not only exact page meshes.
- [x] Use the click side to turn the adjacent page in the matching direction.
- [x] Preserve exact page clicks, Arabic controls, close, return, and mobile touch behavior.
- [x] Run checks and verify both sides before checkpointing.

## Left page flips right

- [x] Confirm left-page clicks use a visible left-to-right motion.
- [x] Preserve right-page right-to-left motion and the full-book hit area.
- [x] Run checks and verify both directions before checkpointing.

## Bring book closer to the player

- [x] Inspect the current camera-relative pull distance.
- [x] Move the selected book closer to the player and keep the open spread readable.
- [x] Preserve page clicks, RTL/LTR turning, and return-to-shelf behavior.
- [x] Run checks and verify the closer interaction before checkpointing.

## Shared Hayy ibn Yaqdhan library

- [x] Replace per-volume book identities with Hayy ibn Yaqdhan metadata and Arabic page content.
- [x] Add visible page numbering consistently to every physical volume.
- [x] Preserve independent mesh interaction, pull, open, page turn, and return behavior.
- [x] Run checks and verify the library before checkpointing.

## Readable Arabic book pages

- [x] Inspect the current page texture and page-material visibility.
- [x] Render clear Arabic text on both square pages with visible page numbers.
- [x] Preserve page-side clicks, RTL/LTR turning, pull, and return behavior.
- [x] Run checks and verify the opened book before checkpointing.

## Fix mirrored Arabic page text

- [x] Inspect dynamic texture orientation and box-face UV mapping.
- [x] Correct the text orientation on both opened pages.
- [x] Preserve page clicks, RTL/LTR turning, pull, and return behavior.
- [x] Run checks and verify readable Arabic text before checkpointing.

## Correct Arabic text mirroring

- [x] Confirm the rendered face is horizontally mirroring the dynamic texture.
- [x] Apply a horizontal flip to the page texture while preserving Arabic RTL layout.
- [x] Verify title, lines, and page numbers are readable on both pages.
- [x] Run checks and preserve page turning, pull, and return behavior before checkpointing.

## Complete Hayy ibn Yaqdhan text

- [x] Find and verify a complete Arabic public-domain text source.
- [x] Prepare compact paginated text with sequential Arabic page numbers.
- [x] Render the complete pages inside every physical volume.
- [x] Verify navigation, readability, and performance before checkpointing.

## Mobile centered return control

- [x] Inspect all mobile return controls and page-turn controls.
- [x] Keep exactly one return-book control centered between left and right controls.
- [x] Ensure tapping it returns the active book to its shelf.
- [x] Run checks and verify the mobile layout before checkpointing.

## GitHub sync

- [x] Check the repository status, branch, and configured remote.
- [x] Commit the latest stable library changes.
- [x] Push the commit to the intended GitHub repository.
- [x] Verify the remote commit and report the GitHub URL.

## Deploy linked Vercel project

- [ ] Discover the existing Vercel project linked to `ab99-c/interactive-3d-library`.
- [ ] Trigger the latest GitHub `main` deployment without creating a duplicate project.
- [ ] Verify the production URL and deployment status.
- [ ] Report the live URL or the exact remaining account action.

## Match desktop to mobile reference

- [x] Inspect desktop-only HUD spacing, control order, and camera framing.
- [x] Adjust desktop visual composition to match the supplied reference.
- [x] Keep mobile layout and physical book interactions unchanged.
- [x] Run checks and verify both responsive layouts before checkpointing.

## Vercel shelves missing

- [x] Compare the live Vercel deployment with local scene initialization and assets.
- [x] Identify and fix the production-only shelves rendering failure.
- [x] Rebuild and redeploy the corrected production version.
- [x] Verify shelves and books on the live Vercel URL before checkpointing.

## Persistent Vercel shelves failure

- [x] Collect live runtime and bundle evidence from the production URL.
- [x] Trace shelf creation and rendering conditions in the source.
- [x] Fix the production-only shelf visibility failure.
- [x] Rebuild, push, redeploy, verify production, and save a checkpoint.

## Rebuild filled shelf bays

- [x] Inspect shelf boards, side frames, book local depth, and row heights.
- [x] Make the shelf boards and side frames visibly surround every book row.
- [x] Seat books on each board and move them inward so they do not float in front of the wall.
- [x] Build, push, redeploy, and verify the filled shelves on Vercel.

## Loading performance

- [x] Measure the current bundle size and startup cost.
- [x] Reduce avoidable initial work and defer non-critical scene details.
- [x] Optimize texture and page-content loading without breaking visual quality.
- [x] Rebuild, verify desktop/mobile responsiveness, and checkpoint the result.

## Performance upgrades 1-2-3

- [ ] Compress and resize heavy leather and wood textures while preserving visual clarity.
- [ ] Add progressive loading for library areas or distant detail.
- [ ] Add a lightweight Arabic loading screen during Babylon initialization.
- [ ] Rebuild, verify desktop/mobile interactions, and checkpoint the upgrade.


## ترقيات الأداء الجديدة

- [x] تحويل بيانات صفحات حي بن يقظان إلى أصل JSON كسول خارج حزمة Babylon.js.
- [x] جعل تفاصيل الرفوف البعيدة تتوقف أو تخف حسب بُعد اللاعب مع الحفاظ على الكتب القابلة للتفاعل.
- [x] إضافة وضع أداء خفيف للهاتف لتقليل device pixel ratio والظلال وجودة العرض.
- [x] فحص سطح المكتب والهاتف ومراجعة سجلات التشغيل بعد التغييرات.
- [ ] تشغيل pnpm check وpnpm build ثم commit وpush إلى GitHub والتحقق من Vercel قبل التسليم.


## إصلاح صفحات الكتاب الخاوية

- [ ] تشخيص طلب JSON وتوقيت تحديث خامة الصفحة بعد فتح الكتاب.
- [ ] ضمان ظهور نص حي بن يقظان ومعلومات الكتاب حتى مع تأخر التحميل أو فشل الطلب.
- [ ] اختبار فتح الكتاب وتقليب الصفحات على الحاسوب والهاتف ومراجعة السجلات.
- [ ] تشغيل pnpm check وpnpm build ثم commit وpush والتحقق من Vercel قبل التسليم.


## إضافة اليدين في منظور الشخص الأول

- [x] تحديد موضع اليد اليمنى واليسرى بالنسبة للكاميرا ومسار الإدخال.
- [x] بناء مجسمَي اليدين بخامات خفيفة وربطهما بحركة المشي والتفاعل.
- [x] اختبار حركة اليدين على الحاسوب والهاتف وضبط الأداء.
- [x] تشغيل pnpm check وpnpm build ثم commit وpush والتحقق من Vercel قبل التسليم.

## تطوير حركة اللاعب

- [x] تدقيق الحركة الحالية وتحديد مناطق الأثاث التي تحتاج تصادماً آمناً.
- [x] إضافة تسارع وتباطؤ وجري اختياري وحركة كاميرا طبيعية للمشي.
- [x] تطبيق تصادمات خفيفة مع الرفوف والطاولة مع الحفاظ على الوصول للكتب.
- [x] اختبار الحاسوب والهاتف وربط حركة اليدين بالحركة الجديدة.
- [ ] تشغيل pnpm check وpnpm build ثم commit وpush والتحقق من Vercel قبل التسليم.

## حقوق الملكية والنسبة

- [x] إضافة LICENSE باسم Abdel Aziz بصيغة All Rights Reserved.
- [x] إضافة إشعارات الحقوق إلى README ووسوم HTML وواجهة المكتبة وconsole.
- [ ] تشغيل pnpm check وpnpm build ثم commit وpush والتحقق من Vercel قبل التسليم.

## تعزيز حماية المشروع

- [x] توثيق عناصر المشروع المحمية: الكود، تصميم المشهد، العلامة، والمحتوى الأصلي.
- [x] إضافة ملف NOTICE يوضح ملكية الاسم والهوية البصرية والمكونات الأصلية.
- [x] مراجعة إعدادات النشر والمستودع لتقليل كشف ما لا يلزم من الملفات أو الأسرار.
- [ ] فحص النسخة ثم مزامنة GitHub والتحقق من Vercel قبل التسليم.

## خطة تطوير المكتبة المعتمدة

- [x] تثبيت فتح الكتاب وتحميل نص حي بن يقظان والصفحات العربية في كل الحالات.
- [x] مراجعة المشي والجري والتصادم وحركة اليدين وصقل التفاعل مع الكتاب.
- [x] تحسين أول ظهور للمكتبة والإضاءة والخامات والأداء على الحاسوب والهاتف.
- [x] استكمال توثيق الحقوق وحماية الملفات الحساسة ومراجعة جودة المشروع.
- [ ] تشغيل pnpm check وpnpm build ثم commit وpush والتحقق من Vercel قبل التسليم.
