using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using QuietStudyHall.Architecture;
using QuietStudyHall.Interaction;

namespace QuietStudyHall.World
{
    public sealed class FloorBuilder
    {
        private readonly LibraryConfig config; private readonly RuntimeMaterialPalette palette; private readonly ShelfBuilder shelves;
        public FloorBuilder(LibraryConfig config, RuntimeMaterialPalette palette) { this.config = config; this.palette = palette; shelves = new ShelfBuilder(config, palette); }

        public IEnumerator Build(LibraryFloor floor, Transform libraryRoot, List<GameObject> registry)
        {
            GameObject floorObject = new GameObject(floor + "_Floor"); floorObject.transform.SetParent(libraryRoot, false); floorObject.transform.localPosition = new Vector3(0f, config.FloorY(floor), 0f); registry.Add(floorObject);
            Transform root = floorObject.transform; float w = config.buildingSize.x, d = config.buildingSize.z, h = config.buildingSize.y;
            RuntimeObjectFactory.Cube("WoodFloor", root, new Vector3(0f, -.15f, 0f), new Vector3(w, .3f, d), palette.Floor, registry);
            RuntimeObjectFactory.Cube("Ceiling", root, new Vector3(0f, h, 0f), new Vector3(w, .25f, d), palette.Ceiling, registry);
            RuntimeObjectFactory.Cube("BackWall", root, new Vector3(0f, h * .5f, d * .5f), new Vector3(w, h, .3f), palette.Wall, registry);
            RuntimeObjectFactory.Cube("LeftWall", root, new Vector3(-w * .5f, h * .5f, 0f), new Vector3(.3f, h, d), palette.Wall, registry);
            RuntimeObjectFactory.Cube("RightWall", root, new Vector3(w * .5f, h * .5f, 0f), new Vector3(.3f, h, d), palette.Wall, registry);
            BuildTransport(root, floor, registry); yield return null;
            Vector3[] starts = { new Vector3(-17f, 0f, 20f), new Vector3(5f, 0f, 20f), new Vector3(-17f, 0f, -12f), new Vector3(5f, 0f, -12f) }; int id = 0;
            foreach (Vector3 start in starts) for (int i = 0; i < 4; i++) { shelves.BuildBookcase(root, start + new Vector3(i * 3.9f, 0f, 0f), "Bookcase_" + (++id), floor, registry); yield return null; }
            BuildFurniture(root, registry); BuildLights(root, h, registry); Debug.Log("Built " + floor + " with 16 bookcases and books.");
        }

        private void BuildTransport(Transform root, LibraryFloor floor, List<GameObject> registry)
        {
            for (int step = 0; step < 8; step++) RuntimeObjectFactory.Cube("StairStep_" + step, root, new Vector3(18f, step * .25f, -2f + step * .55f), new Vector3(3.2f, .25f, .7f), palette.Shelf, registry);
            GameObject elevator = RuntimeObjectFactory.Cube("Elevator", root, new Vector3(-19f, 1.1f, 0f), new Vector3(2.4f, 2.2f, 2.4f), palette.Table, registry);
            FloorTransport lift = elevator.AddComponent<FloorTransport>(); LibraryFloor next = floor == LibraryFloor.Second ? LibraryFloor.Ground : (LibraryFloor)((int)floor + 1); lift.Configure(new Vector3(-19f, config.FloorY(next) + 1.1f, 0f), "E — المصعد إلى الطابق التالي");
        }

        private void BuildFurniture(Transform root, List<GameObject> registry)
        {
            for (int table = 0; table < 2; table++) { Vector3 pos = new Vector3(0f, 0f, table == 0 ? -22f : 26f); RuntimeObjectFactory.Cube("ReadingTable", root, pos + new Vector3(0f, .85f, 0f), new Vector3(8f, .18f, 2.5f), palette.Table, registry); for (int x = -1; x <= 1; x += 2) for (int z = -1; z <= 1; z += 2) RuntimeObjectFactory.Cube("TableLeg", root, pos + new Vector3(x * 3f, .4f, z * .8f), new Vector3(.18f, .8f, .18f), palette.Table, registry); }
        }

        private void BuildLights(Transform root, float height, List<GameObject> registry)
        {
            for (int i = -1; i <= 1; i++) { GameObject lightObject = RuntimeObjectFactory.Empty("WarmPendantLight", root, new Vector3(i * 12f, height - .5f, 0f), registry); Light light = lightObject.AddComponent<Light>(); light.type = LightType.Point; light.color = new Color(1f, .72f, .42f); light.intensity = 5f; light.range = 18f; }
        }
    }
}
