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
