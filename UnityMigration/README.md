# Quiet Study Hall — Enhanced Unity 6 Library

Target editor: Unity 6000.6.3f1.

This native Unity starter now builds a four-floor university-library environment at Play time. It includes a warm hall, ceiling, walls, detailed bookcase frames and labels, colorful books, reading tables, pendant lights, stairs, elevator transport points, player movement, collisions, and contextual `E` interaction.

## Controls

- `WASD`: move.
- Mouse: look.
- `Shift`: sprint.
- `E`: take a book, open a held book, or use a stair/elevator point.
- `R`: return the held book to its original shelf.

## Open and run

Use Unity 6000.6.3f1. In Unity Hub choose **Add > Add project from disk** and select the folder containing `Assets`, `Packages`, and `ProjectSettings`. Open `Assets/Scenes/UniversityLibrary.unity`, then press Play.

## Native systems included

- `IInteractable` and `PlayerInteractor` for raycast-based contextual interactions.
- `BookEntity` with physical take, camera-hand placement, open/close state, and return-to-shelf.
- `FloorTransport` for stairs/elevator floor movement.
- `WorldStateManager`, `ProgressionManager`, and `LibraryEventBus`.
- `BookData`, `BookCatalog`, `BookCatalogLoader`, and `BookContentProvider` for scalable JSON-backed records and the existing Arabic page dataset.

## Known limitations

The current build is a functional procedural foundation, not the final art pass. The next production phase adds TextMeshPro HUD and book reader, full search/map UI, imported models and prefabs, Input System actions, and instanced/LOD book rendering for very large catalogs.
