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
