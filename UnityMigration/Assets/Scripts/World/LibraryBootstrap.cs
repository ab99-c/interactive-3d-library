using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using QuietStudyHall.Architecture;

namespace QuietStudyHall.World
{
    public sealed class LibraryBootstrap : MonoBehaviour
    {
        [SerializeField] private LibraryConfig config;
        [SerializeField] private Transform groundRoot;
        [SerializeField] private Transform basementRoot;
        [SerializeField] private Transform firstFloorRoot;
        [SerializeField] private Transform secondFloorRoot;
        [SerializeField] private GameObject floorPrefab;

        private readonly Dictionary<LibraryFloor, FloorBucket> floors = new();
        public event Action<LibraryFloor, float> ProgressChanged;

        private sealed class FloorBucket
        {
            public bool Built;
            public bool Building;
            public readonly List<GameObject> Objects = new();
        }

        private void Awake()
        {
            foreach (LibraryFloor floor in Enum.GetValues(typeof(LibraryFloor)))
                floors[floor] = new FloorBucket();
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
            var bucket = floors[floor];
            if (bucket.Built || bucket.Building) yield break;
            if (floor != LibraryFloor.Ground && CountSceneObjects() >= config.meshBudget)
            {
                Debug.LogWarning($"Floor {floor} deferred: mesh budget reached.");
                yield break;
            }

            bucket.Building = true;
            Transform root = RootFor(floor);
            const int batches = 16;
            for (int i = 0; i < batches; i++)
            {
                if (floorPrefab != null)
                {
                    var instance = Instantiate(floorPrefab, root);
                    instance.transform.localPosition = Vector3.zero;
                    bucket.Objects.Add(instance);
                }
                ProgressChanged?.Invoke(floor, (i + 1f) / batches);
                yield return null;
            }

            bucket.Built = true;
            bucket.Building = false;
            ProgressChanged?.Invoke(floor, 1f);
        }

        private Transform RootFor(LibraryFloor floor) => floor switch
        {
            LibraryFloor.Basement => basementRoot,
            LibraryFloor.First => firstFloorRoot,
            LibraryFloor.Second => secondFloorRoot,
            _ => groundRoot
        };

        private static int CountSceneObjects() => FindObjectsByType<GameObject>(FindObjectsSortMode.None).Length;
    }
}
