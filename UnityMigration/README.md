# Quiet Study Hall — Unity Migration

This folder is a **Unity migration scaffold** for the current React + Babylon.js library. The existing web game remains unchanged in the repository root.

## Important

The current project cannot be opened directly as a Unity project because its gameplay is TypeScript/Babylon.js. Unity requires C# scripts, Unity scenes, prefabs, materials, and imported assets. This folder separates the Unity-ready structure and provides the first reusable gameplay scripts.

## Unity setup

1. Create a Unity **3D URP** project (Unity 2022.3 LTS or newer).
2. Copy the contents of `UnityMigration/Assets/` into the new project's `Assets/` folder.
3. Open `Assets/Scenes/UniversityLibrary.unity` after creating the scene, or create a new scene using the structure below.
4. Add `LibraryBootstrap` to an empty `LibrarySystems` GameObject.
5. Add `PlayerController` to the player capsule/character and assign the camera.
6. Add `BookEntity` to each book prefab and `BookInteraction` to the player/camera.

## Folder structure

- `Assets/Scripts/Architecture/` — building, floors, sections, shelf coordinates.
- `Assets/Scripts/World/` — scene bootstrap and lazy floor loading.
- `Assets/Scripts/Player/` — first-person movement, gravity, collisions.
- `Assets/Scripts/Books/` — individual book identity and pickup/open interaction.
- `Assets/Scripts/UI/` — progress and interaction HUD integration points.
- `Assets/Data/` — data copied/converted from `architecture-config.ts`.
- `Assets/Scenes/` — Unity scenes.
- `Assets/Prefabs/` — player, shelf, book, stairs, elevator prefabs.
- `Assets/Materials/`, `Models/`, `Textures/` — Unity art assets.

## Porting map

| Babylon/Web | Unity replacement |
|---|---|
| `scene-base.ts` | `LibraryBootstrap`, `PlayerController`, `BookInteraction`, floor builders |
| `architecture-config.ts` | `LibraryConfig.cs` + `library-config.json` |
| `WorldStateStore` | `WorldStateStore.cs` using JSON in `Application.persistentDataPath` |
| `MeshBuilder.CreateBox` | Unity primitive/prefab or optimized mesh prefab |
| `createInstance()` | GPU instancing / prefab batching / `Graphics.DrawMeshInstanced` |
| `moveWithCollisions` | `CharacterController.Move` |
| Babylon raycast | `Physics.Raycast` |
| `world-progress` events | C# event / Unity UI Slider |
| React HUD | Canvas + TextMeshPro + Slider |

## Performance rules

- Build only the ground floor on scene start.
- Load basement/first/second through `LibraryBootstrap.LoadFloorAsync` when the player reaches stairs/elevator.
- Use one book mesh per visual family and GPU instancing for shelf books.
- Use shared materials; do not create a material per book.
- Keep a mesh budget and delay floor loading if the budget is exceeded.
