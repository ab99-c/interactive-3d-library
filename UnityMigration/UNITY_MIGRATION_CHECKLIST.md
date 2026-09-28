# Unity migration checklist

## Ready in this scaffold

- Four-floor coordinates copied from `architecture-config.ts`.
- Ground-first lazy-loading pattern.
- Floor progress event and mesh-budget guard.
- CharacterController movement, gravity, and collision baseline.
- 1.5m forward raycast book pickup.
- Book identity fields: ID, title, section, call number, floor, shelf, row, slot.

## Still required inside Unity Editor

- Create the URP project and copy `Assets/`.
- Build the `UniversityLibrary` scene shell: floor, walls, ceiling, entrance, stairs, elevator, reading zones.
- Create shared shelf and book prefabs.
- Enable GPU instancing on shared book materials.
- Import/create player body, hands, camera, and animations.
- Connect TextMeshPro HUD to `LibraryBootstrap.ProgressChanged`.
- Add the Arabic book catalog as a ScriptableObject or JSON importer.
- Add save/restore using `Application.persistentDataPath`.
- Test Android build with touch joystick and look area.

## Do not copy

Do not copy `node_modules`, `dist`, React components, Vite config, or Babylon bundles into Unity. They are web-only build artifacts.
