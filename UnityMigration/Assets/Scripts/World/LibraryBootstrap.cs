using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using QuietStudyHall.Architecture;
using QuietStudyHall.Player;
using QuietStudyHall.Systems;

namespace QuietStudyHall.World
{
    public sealed class LibraryBootstrap : MonoBehaviour
    {
        [SerializeField] private LibraryConfig config;
        [SerializeField] private bool createPlayerAutomatically = true;
        [SerializeField] private bool buildAllFloorsOnStart = true;
        private readonly Dictionary<LibraryFloor, bool> builtFloors = new Dictionary<LibraryFloor, bool>();
        private readonly List<GameObject> runtimeObjects = new List<GameObject>();
        private Transform libraryRoot;
        private RuntimeMaterialPalette palette;
        private FloorBuilder floorBuilder;
        public event Action<LibraryFloor, float> ProgressChanged;

        private void Awake()
        {
            EnsureConfig();
            libraryRoot = new GameObject("UniversityLibrary_Runtime").transform;
            palette = new RuntimeMaterialPalette();
            floorBuilder = new FloorBuilder(config, palette);
            foreach (LibraryFloor floor in Enum.GetValues(typeof(LibraryFloor))) builtFloors[floor] = false;
            CreateRuntimeSystems();
            CreateAmbientLight();
            if (createPlayerAutomatically) PlayerFactory.Create(new Vector3(0f, 1.1f, -28f));
        }

        private IEnumerator Start()
        {
            if (!buildAllFloorsOnStart) { yield return BuildFloor(LibraryFloor.Ground); yield break; }
            yield return BuildFloor(LibraryFloor.Ground);
            yield return BuildFloor(LibraryFloor.First);
            yield return BuildFloor(LibraryFloor.Second);
            yield return BuildFloor(LibraryFloor.Basement);
        }

        public Coroutine LoadFloorAsync(LibraryFloor floor) { return StartCoroutine(BuildFloor(floor)); }

        private IEnumerator BuildFloor(LibraryFloor floor)
        {
            if (builtFloors[floor]) yield break;
            yield return floorBuilder.Build(floor, libraryRoot, runtimeObjects);
            builtFloors[floor] = true;
            ProgressChanged?.Invoke(floor, 1f);
        }

        private void EnsureConfig()
        {
            if (config != null) return;
            config = ScriptableObject.CreateInstance<LibraryConfig>();
            config.name = "Runtime University Library Config";
            config.buildingSize = new Vector3(48f, 12.9f, 72f);
            config.floorHeight = 4.2f;
            config.shelfLevels = 5;
        }

        private void CreateRuntimeSystems()
        {
            CreateSystem<WorldStateManager>("WorldStateManager");
            CreateSystem<ProgressionManager>("ProgressionManager");
        }

        private static T CreateSystem<T>(string name) where T : Component
        {
            GameObject system = new GameObject(name);
            return system.AddComponent<T>();
        }

        private void CreateAmbientLight()
        {
            GameObject lightObject = new GameObject("Library_Ambient_Light");
            Light light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(1f, .82f, .62f);
            light.intensity = .65f;
            light.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
            runtimeObjects.Add(lightObject);
        }
    }
}
