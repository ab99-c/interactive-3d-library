using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using QuietStudyHall.Architecture;
using QuietStudyHall.Books;
using QuietStudyHall.Player;

namespace QuietStudyHall.World
{
    public sealed class LibraryBootstrap : MonoBehaviour
    {
        [SerializeField] private LibraryConfig config;
        [SerializeField] private bool createPlayerAutomatically = true;
        [SerializeField] private bool buildSimpleShelves = true;
        [SerializeField] private Material wallMaterial;
        [SerializeField] private Material floorMaterial;
        [SerializeField] private Material shelfMaterial;
        [SerializeField] private Material bookMaterial;

        private readonly Dictionary<LibraryFloor, FloorBucket> floors = new Dictionary<LibraryFloor, FloorBucket>();
        private Transform libraryRoot;
        public event Action<LibraryFloor, float> ProgressChanged;

        private sealed class FloorBucket
        {
            public bool Built;
            public bool Building;
            public readonly List<GameObject> Objects = new List<GameObject>();
        }

        private void Awake()
        {
            if (config == null)
            {
                config = ScriptableObject.CreateInstance<LibraryConfig>();
                config.name = "Runtime Library Config";
            }

            libraryRoot = new GameObject("UniversityLibrary_Runtime").transform;
            foreach (LibraryFloor floor in Enum.GetValues(typeof(LibraryFloor)))
                floors[floor] = new FloorBucket();

            EnsureMaterials();
            if (createPlayerAutomatically) CreatePlayer();
        }

        private IEnumerator Start()
        {
            yield return LoadFloorAsync(LibraryFloor.Ground);
        }

        public Coroutine LoadFloorAsync(LibraryFloor floor)
        {
            return StartCoroutine(BuildFloor(floor));
        }

        private IEnumerator BuildFloor(LibraryFloor floor)
        {
            FloorBucket bucket = floors[floor];
            if (bucket.Built || bucket.Building) yield break;

            bucket.Building = true;
            Transform root = new GameObject(floor + "_Floor").transform;
            root.SetParent(libraryRoot, false);
            root.localPosition = new Vector3(0f, config.FloorY(floor), 0f);

            CreatePrimitive("Floor", PrimitiveType.Cube, root, new Vector3(0f, -0.15f, 0f), new Vector3(config.buildingSize.x, config.floorThickness, config.buildingSize.z), floorMaterial, bucket);
            yield return null;
            CreatePrimitive("BackWall", PrimitiveType.Cube, root, new Vector3(0f, config.buildingSize.y * 0.5f, config.buildingSize.z * 0.5f), new Vector3(config.buildingSize.x, config.buildingSize.y, config.wallThickness), wallMaterial, bucket);
            CreatePrimitive("LeftWall", PrimitiveType.Cube, root, new Vector3(-config.buildingSize.x * 0.5f, config.buildingSize.y * 0.5f, 0f), new Vector3(config.wallThickness, config.buildingSize.y, config.buildingSize.z), wallMaterial, bucket);
            CreatePrimitive("RightWall", PrimitiveType.Cube, root, new Vector3(config.buildingSize.x * 0.5f, config.buildingSize.y * 0.5f, 0f), new Vector3(config.wallThickness, config.buildingSize.y, config.buildingSize.z), wallMaterial, bucket);
            yield return null;

            if (buildSimpleShelves)
            {
                CreateShelfRow(root, new Vector3(-8f, 0f, 6f), 6, bucket);
                CreateShelfRow(root, new Vector3(8f, 0f, 6f), 6, bucket);
                CreateShelfRow(root, new Vector3(-8f, 0f, -10f), 6, bucket);
                CreateShelfRow(root, new Vector3(8f, 0f, -10f), 6, bucket);
            }

            bucket.Built = true;
            bucket.Building = false;
            ProgressChanged?.Invoke(floor, 1f);
        }

        private void CreateShelfRow(Transform root, Vector3 start, int count, FloorBucket bucket)
        {
            for (int i = 0; i < count; i++)
            {
                Vector3 position = start + new Vector3(i * 2.5f, config.shelfHeight * 0.5f, 0f);
                GameObject shelf = CreatePrimitive("Shelf", PrimitiveType.Cube, root, position, new Vector3(2f, config.shelfHeight, 0.45f), shelfMaterial, bucket);
                shelf.transform.position += new Vector3(0f, config.FloorY(LibraryFloor.Ground), 0f);
                for (int slot = 0; slot < 5; slot++)
                {
                    GameObject book = CreatePrimitive("Book_" + i + "_" + slot, PrimitiveType.Cube, root, position + new Vector3(-0.65f + slot * 0.3f, -0.65f + slot * 0.28f, -0.28f), new Vector3(0.22f, 0.72f, 0.12f), bookMaterial, bucket);
                    book.AddComponent<BookEntity>().title = "كتاب المكتبة " + (i * 5 + slot + 1);
                }
            }
        }

        private GameObject CreatePrimitive(string name, PrimitiveType type, Transform parent, Vector3 localPosition, Vector3 localScale, Material material, FloorBucket bucket)
        {
            GameObject obj = GameObject.CreatePrimitive(type);
            obj.name = name;
            obj.transform.SetParent(parent, false);
            obj.transform.localPosition = localPosition;
            obj.transform.localScale = localScale;
            if (material != null) obj.GetComponent<Renderer>().sharedMaterial = material;
            bucket.Objects.Add(obj);
            return obj;
        }

        private void EnsureMaterials()
        {
            if (wallMaterial == null) wallMaterial = MakeMaterial("Warm Walls", new Color(0.72f, 0.63f, 0.48f));
            if (floorMaterial == null) floorMaterial = MakeMaterial("Wood Floor", new Color(0.28f, 0.16f, 0.09f));
            if (shelfMaterial == null) shelfMaterial = MakeMaterial("Shelf Wood", new Color(0.20f, 0.10f, 0.05f));
            if (bookMaterial == null) bookMaterial = MakeMaterial("Book Covers", new Color(0.08f, 0.22f, 0.38f));
        }

        private static Material MakeMaterial(string materialName, Color color)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            Material material = new Material(shader) { name = materialName };
            material.color = color;
            return material;
        }

        private void CreatePlayer()
        {
            GameObject player = new GameObject("Player");
            player.transform.position = new Vector3(0f, 1.1f, -22f);
            CharacterController controller = player.AddComponent<CharacterController>();
            controller.height = 1.8f;
            controller.radius = 0.35f;
            PlayerController movement = player.AddComponent<PlayerController>();

            GameObject cameraObject = new GameObject("PlayerCamera");
            cameraObject.transform.SetParent(player.transform, false);
            cameraObject.transform.localPosition = new Vector3(0f, 0.7f, 0f);
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.tag = "MainCamera";
            movement.SetCamera(camera);

            BookInteraction interaction = player.AddComponent<BookInteraction>();
            interaction.SetCamera(camera);
        }

        private Transform RootFor(LibraryFloor floor)
        {
            foreach (Transform child in libraryRoot)
                if (child.name == floor + "_Floor") return child;
            return libraryRoot;
        }
    }
}
