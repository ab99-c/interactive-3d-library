using System.Collections.Generic;
using UnityEngine;

namespace QuietStudyHall.World
{
    public static class RuntimeObjectFactory
    {
        public static GameObject Cube(string name, Transform parent, Vector3 localPosition, Vector3 localScale, Material material, List<GameObject> registry)
        {
            GameObject obj = GameObject.CreatePrimitive(PrimitiveType.Cube);
            obj.name = name;
            obj.transform.SetParent(parent, false);
            obj.transform.localPosition = localPosition;
            obj.transform.localScale = localScale;
            Renderer renderer = obj.GetComponent<Renderer>();
            if (renderer != null && material != null) renderer.sharedMaterial = material;
            if (registry != null) registry.Add(obj);
            return obj;
        }

        public static GameObject Empty(string name, Transform parent, Vector3 localPosition, List<GameObject> registry)
        {
            GameObject obj = new GameObject(name);
            obj.transform.SetParent(parent, false);
            obj.transform.localPosition = localPosition;
            if (registry != null) registry.Add(obj);
            return obj;
        }
    }
}
