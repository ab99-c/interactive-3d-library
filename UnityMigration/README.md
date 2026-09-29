# Quiet Study Hall — Unity starter

This folder is a **Unity starter scaffold** for the React + Babylon.js university library. It now includes a runtime bootstrap that creates a playable greybox library automatically, so you can press Play after importing the folder.

## Open and run

1. Install Unity 2022.3 LTS or newer with the 3D Core or URP template.
2. Create a new Unity project.
3. Copy the complete `UnityMigration/Assets/` folder into the new project's `Assets/` folder.
4. In Unity, create an empty scene and an empty GameObject named `LibrarySystems`.
5. Add the `LibraryBootstrap` component to `LibrarySystems`.
6. Press **Play**. The script creates the floor, three walls, simple shelves, books, player capsule, camera, gravity, collisions, and `E` interaction at runtime.

The bootstrap has no external model or prefab dependency. This is intentional: it gives you a working test scene first. The visual models, Arabic UI, four-floor art direction, animations, and final book page animation are still production work to add in the Editor.

## What is included

| Web project | Unity starter replacement |
|---|---|
| `scene-base.ts` | `LibraryBootstrap`, `PlayerController`, `BookInteraction` |
| `architecture-config.ts` | `LibraryConfig.cs` and `library-config.json` |
| Babylon collision movement | Unity `CharacterController.Move` |
| Babylon raycast | Unity `Physics.Raycast` |
| React HUD | Integration point for Canvas/TextMeshPro |
| Book catalog/page data | `Assets/Data/hayy-pages-data.json` |

## Important input note

The starter uses Unity's **legacy Input Manager** (`Horizontal`, `Vertical`, `Mouse X`, `Mouse Y`) because it works without installing an extra package. If your project is set to **Input System Package (New)** only, go to `Edit > Project Settings > Player > Active Input Handling` and select `Both`, then restart Unity.

## Next production steps

Replace the runtime primitives with shelf/book/player prefabs, add a third-person follow camera, connect TextMeshPro HUD and progress events, import the full 4-floor architecture, add the Arabic catalog importer, then optimize repeated books with shared materials and GPU instancing.
