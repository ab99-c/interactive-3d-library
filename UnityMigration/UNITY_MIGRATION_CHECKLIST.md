# Unity migration checklist

## Completed in the current Unity 6 scaffold

| Area | Status | Native Unity implementation |
|---|---|---|
| Unity project | Done | Unity 6000.6.3f1 project folders, Packages, ProjectSettings |
| Main scene | Done | `Assets/Scenes/UniversityLibrary.unity` with `LibrarySystems` |
| Library greybox | Done | Runtime-generated hall, ceiling, walls, tables, warm lights, 16 bookcases |
| Books | Done | Colored book meshes, unique IDs, shelf metadata, `BookEntity` |
| Interaction contract | Done | `IInteractable` and `PlayerInteractor` with `E` raycast interaction |
| Player | Done | CharacterController, gravity, WASD, mouse look, sprint baseline |
| Event system | Done | `LibraryEventBus` |
| World state | Done | `WorldStateManager`, discovered books, visited areas, PlayerPrefs save |
| Progression | Done | `ProgressionManager`, XP, ranks, books opened, pages turned |
| Source data | Done | `hayy-pages-data.json` copied without rewriting the dataset |
| Architecture data | Done | `library-config.json` and `LibraryConfig.cs` |

## Next implementation phase

- Replace runtime primitives with reusable shelf, book, furniture, and architecture prefabs.
- Add TextMeshPro interaction HUD and book information panel.
- Parse the Arabic page dataset into a runtime book-content provider.
- Add four-floor stairs/elevator navigation and real lazy loading triggers.
- Add map UI with player position and library sections.
- Move desktop input to Unity Input System while keeping mobile-ready input interfaces.
- Add third-person or polished first-person presentation according to the approved final direction.
- Add static batching/GPU instancing and profile the Windows build.
- Add final audio architecture and safe placeholder ambience if no licensed audio is supplied.

## Source-of-truth rule

The web React/Babylon application remains intact. Unity is an additional native implementation; it does not copy TypeScript into the Unity project.
