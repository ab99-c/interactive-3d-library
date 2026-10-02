using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using QuietStudyHall.Architecture;
using QuietStudyHall.Books;
using QuietStudyHall.Player;
using QuietStudyHall.Interaction;
using QuietStudyHall.Systems;

namespace QuietStudyHall.World
{
    public sealed class LibraryBootstrap : MonoBehaviour
    {
        [SerializeField] private LibraryConfig config;
        [SerializeField] private bool createPlayerAutomatically = true;
        [SerializeField] private bool buildSimpleShelves = true;
        private readonly Dictionary<LibraryFloor, FloorBucket> floors = new Dictionary<LibraryFloor, FloorBucket>();
        private Transform libraryRoot;
        private Material wallMaterial, floorMaterial, ceilingMaterial, shelfMaterial, tableMaterial, labelMaterial;
        private readonly List<Material> bookMaterials = new List<Material>();
        public event Action<LibraryFloor, float> ProgressChanged;
        private sealed class FloorBucket { public bool Built; public bool Building; public readonly List<GameObject> Objects = new List<GameObject>(); }

        private void Awake()
        {
            if (config == null) { config = ScriptableObject.CreateInstance<LibraryConfig>(); config.name = "Runtime University Library Config"; config.buildingSize = new Vector3(48f, 12f, 72f); config.floorHeight = 4.2f; }
            libraryRoot = new GameObject("UniversityLibrary_Runtime").transform;
            foreach (LibraryFloor floor in Enum.GetValues(typeof(LibraryFloor))) floors[floor] = new FloorBucket();
            CreateSystem<WorldStateManager>("WorldStateManager"); CreateSystem<ProgressionManager>("ProgressionManager"); EnsureMaterials(); CreateWarmLighting(); if (createPlayerAutomatically) CreatePlayer();
        }
        private static T CreateSystem<T>(string name) where T : Component { GameObject system = new GameObject(name); return system.AddComponent<T>(); }

        private IEnumerator Start()
        {
            yield return LoadFloorAsync(LibraryFloor.Ground);
            yield return LoadFloorAsync(LibraryFloor.First);
            yield return LoadFloorAsync(LibraryFloor.Second);
            yield return LoadFloorAsync(LibraryFloor.Basement);
        }
        public Coroutine LoadFloorAsync(LibraryFloor floor) { return StartCoroutine(BuildFloor(floor)); }

        private IEnumerator BuildFloor(LibraryFloor floor)
        {
            FloorBucket bucket = floors[floor]; if (bucket.Built || bucket.Building) yield break; bucket.Building = true;
            Transform root = new GameObject(floor + "_Floor").transform; root.SetParent(libraryRoot, false); root.localPosition = new Vector3(0f, config.FloorY(floor), 0f);
            float w = config.buildingSize.x, d = config.buildingSize.z, h = config.buildingSize.y;
            CreatePrimitive("WoodFloor", PrimitiveType.Cube, root, new Vector3(0f, -.15f, 0f), new Vector3(w, .3f, d), floorMaterial, bucket);
            CreatePrimitive("Ceiling", PrimitiveType.Cube, root, new Vector3(0f, h, 0f), new Vector3(w, .25f, d), ceilingMaterial, bucket);
            CreatePrimitive("BackWall", PrimitiveType.Cube, root, new Vector3(0f, h * .5f, d * .5f), new Vector3(w, h, .3f), wallMaterial, bucket);
            CreatePrimitive("LeftWall", PrimitiveType.Cube, root, new Vector3(-w * .5f, h * .5f, 0f), new Vector3(.3f, h, d), wallMaterial, bucket);
            CreatePrimitive("RightWall", PrimitiveType.Cube, root, new Vector3(w * .5f, h * .5f, 0f), new Vector3(.3f, h, d), wallMaterial, bucket);
            CreatePrimitive("EntranceHeader", PrimitiveType.Cube, root, new Vector3(0f, h - 1f, -d * .5f + .15f), new Vector3(10f, 2f, .4f), wallMaterial, bucket);
            BuildTransportAreas(root, floor, bucket); yield return null;
            if (buildSimpleShelves)
            {
                Vector3[] starts = { new Vector3(-17f, 0f, 20f), new Vector3(5f, 0f, 20f), new Vector3(-17f, 0f, -12f), new Vector3(5f, 0f, -12f) }; int id = 0;
                foreach (Vector3 start in starts) for (int i = 0; i < 4; i++) { CreateBookcase(root, start + new Vector3(i * 3.9f, 0f, 0f), "Bookcase_" + (++id), bucket, floor); yield return null; }
            }
            CreateReadingTable(root, new Vector3(0f, 0f, -22f), bucket); CreateReadingTable(root, new Vector3(0f, 0f, 26f), bucket); CreatePendantLights(root, h, bucket);
            bucket.Built = true; bucket.Building = false; ProgressChanged?.Invoke(floor, 1f);
        }

        private void BuildTransportAreas(Transform root, LibraryFloor floor, FloorBucket bucket)
        {
            float y = config.FloorY(floor);
            for (int step = 0; step < 8; step++) CreatePrimitive("StairStep_" + step, PrimitiveType.Cube, root, new Vector3(18f, step * .25f, -2f + step * .55f), new Vector3(3.2f, .25f, .7f), shelfMaterial, bucket);
            GameObject elevator = CreatePrimitive("Elevator", PrimitiveType.Cube, root, new Vector3(-19f, 1.1f, 0f), new Vector3(2.4f, 2.2f, 2.4f), tableMaterial, bucket);
            FloorTransport lift = elevator.AddComponent<FloorTransport>();
            LibraryFloor next = floor == LibraryFloor.Second ? LibraryFloor.Ground : (LibraryFloor)((int)floor + 1);
            lift.Configure(new Vector3(-19f, config.FloorY(next) + 1.1f, 0f), "E — المصعد إلى الطابق التالي");
            GameObject stairLanding = CreatePrimitive("StairLanding", PrimitiveType.Cube, root, new Vector3(18f, 2f, 3f), new Vector3(3.2f, .2f, 2.5f), shelfMaterial, bucket);
            FloorTransport stairs = stairLanding.AddComponent<FloorTransport>();
            stairs.Configure(new Vector3(18f, config.FloorY(next) + 1.1f, 3f), "E — صعود الدرج");
        }

        private void CreateBookcase(Transform root, Vector3 position, string name, FloorBucket bucket, LibraryFloor floor)
        {
            CreatePrimitive(name + "_Back", PrimitiveType.Cube, root, position + new Vector3(0f, 1.45f, .08f), new Vector3(3.35f, 2.9f, .18f), shelfMaterial, bucket);
            CreatePrimitive(name + "_LeftPost", PrimitiveType.Cube, root, position + new Vector3(-1.62f, 1.45f, -.25f), new Vector3(.14f, 2.95f, .65f), shelfMaterial, bucket);
            CreatePrimitive(name + "_RightPost", PrimitiveType.Cube, root, position + new Vector3(1.62f, 1.45f, -.25f), new Vector3(.14f, 2.95f, .65f), shelfMaterial, bucket);
            CreatePrimitive(name + "_TopTrim", PrimitiveType.Cube, root, position + new Vector3(0f, 2.95f, -.25f), new Vector3(3.55f, .16f, .72f), shelfMaterial, bucket);
            CreatePrimitive(name + "_Label", PrimitiveType.Cube, root, position + new Vector3(0f, 3.14f, -.25f), new Vector3(1.4f, .12f, .5f), labelMaterial, bucket);
            for (int level = 0; level < 5; level++)
            {
                CreatePrimitive(name + "_Shelf_" + level, PrimitiveType.Cube, root, position + new Vector3(0f, .28f + level * .58f, -.34f), new Vector3(3.5f, .10f, .72f), shelfMaterial, bucket);
                for (int slot = 0; slot < 10; slot++)
                {
                    Material mat = bookMaterials[(slot + level + (int)floor) % bookMaterials.Count];
                    GameObject book = CreatePrimitive(name + "_Book_" + level + "_" + slot, PrimitiveType.Cube, root, position + new Vector3(-1.38f + slot * .29f, .68f + level * .58f, -.49f), new Vector3(.22f, .48f + (slot % 3) * .08f, .18f), mat, bucket);
                    book.transform.localRotation = Quaternion.Euler(0f, (slot % 2 == 0 ? -3f : 4f), (slot % 3 - 1) * 2f);
                    BookEntity entity = book.AddComponent<BookEntity>(); entity.bookId = name + "_book_" + level + "_" + slot; entity.title = "كتاب الجامعة " + ((int)floor * 100 + level * 10 + slot + 1); entity.shelfId = name; entity.floor = floor.ToString(); entity.section = "GENERAL";
                }
            }
        }

        private void CreateReadingTable(Transform root, Vector3 pos, FloorBucket bucket) { CreatePrimitive("ReadingTable", PrimitiveType.Cube, root, pos + new Vector3(0f, .85f, 0f), new Vector3(8f, .18f, 2.5f), tableMaterial, bucket); for (int x = -1; x <= 1; x += 2) for (int z = -1; z <= 1; z += 2) CreatePrimitive("TableLeg", PrimitiveType.Cube, root, pos + new Vector3(x * 3f, .4f, z * .8f), new Vector3(.18f, .8f, .18f), tableMaterial, bucket); }
        private void CreatePendantLights(Transform root, float height, FloorBucket bucket) { for (int i = -1; i <= 1; i++) { GameObject lightObject = new GameObject("WarmPendantLight"); lightObject.transform.SetParent(root, false); lightObject.transform.localPosition = new Vector3(i * 12f, height - .5f, 0f); Light light = lightObject.AddComponent<Light>(); light.type = LightType.Point; light.color = new Color(1f, .72f, .42f); light.intensity = 5f; light.range = 18f; bucket.Objects.Add(lightObject); } }
        private GameObject CreatePrimitive(string name, PrimitiveType type, Transform parent, Vector3 localPosition, Vector3 localScale, Material material, FloorBucket bucket) { GameObject obj = GameObject.CreatePrimitive(type); obj.name = name; obj.transform.SetParent(parent, false); obj.transform.localPosition = localPosition; obj.transform.localScale = localScale; if (material != null) obj.GetComponent<Renderer>().sharedMaterial = material; bucket.Objects.Add(obj); return obj; }
        private void EnsureMaterials() { wallMaterial = MakeMaterial("Warm Ivory Walls", new Color(.62f, .54f, .40f)); floorMaterial = MakeMaterial("Dark Wood Floor", new Color(.18f, .09f, .045f)); ceilingMaterial = MakeMaterial("Ceiling", new Color(.35f, .32f, .27f)); shelfMaterial = MakeMaterial("Walnut Shelves", new Color(.12f, .055f, .025f)); tableMaterial = MakeMaterial("Reading Tables", new Color(.24f, .12f, .055f)); labelMaterial = MakeMaterial("Shelf Labels", new Color(.72f, .52f, .20f)); Color[] colors = { new Color(.72f,.08f,.06f), new Color(.06f,.28f,.58f), new Color(.08f,.45f,.22f), new Color(.85f,.42f,.06f), new Color(.68f,.16f,.40f), new Color(.82f,.72f,.25f) }; foreach (Color color in colors) bookMaterials.Add(MakeMaterial("Book", color)); }
        private static Material MakeMaterial(string materialName, Color color) { Shader shader = Shader.Find("Universal Render Pipeline/Lit"); if (shader == null) shader = Shader.Find("Standard"); Material material = new Material(shader) { name = materialName }; material.color = color; return material; }
        private void CreateWarmLighting() { GameObject lightObject = new GameObject("Library_Ambient_Light"); Light light = lightObject.AddComponent<Light>(); light.type = LightType.Directional; light.color = new Color(1f, .82f, .62f); light.intensity = .65f; light.transform.rotation = Quaternion.Euler(45f, -30f, 0f); }
        private void CreatePlayer()
        {
            GameObject player = new GameObject("Player"); player.transform.position = new Vector3(0f, 1.1f, -28f); CharacterController controller = player.AddComponent<CharacterController>(); controller.height = 1.8f; controller.radius = .35f; PlayerController movement = player.AddComponent<PlayerController>();
            GameObject cameraObject = new GameObject("PlayerCamera"); cameraObject.transform.SetParent(player.transform, false); cameraObject.transform.localPosition = new Vector3(0f, .7f, 0f); Camera camera = cameraObject.AddComponent<Camera>(); camera.tag = "MainCamera"; movement.SetCamera(camera);
            GameObject hand = new GameObject("BookHand"); hand.transform.SetParent(cameraObject.transform, false); hand.transform.localPosition = new Vector3(.42f, -.35f, .65f); PlayerInteractor interactor = player.AddComponent<PlayerInteractor>(); interactor.SetCamera(camera); interactor.SetBookHand(hand.transform);
        }
    }
}
