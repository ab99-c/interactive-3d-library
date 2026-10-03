using System.Collections.Generic;
using UnityEngine;

namespace QuietStudyHall.World
{
    public sealed class RuntimeMaterialPalette
    {
        public readonly Material Wall, Floor, Ceiling, Shelf, Table, Label;
        public readonly List<Material> Books = new List<Material>();

        public RuntimeMaterialPalette()
        {
            Wall = Make("Warm Ivory Walls", new Color(.62f, .54f, .40f));
            Floor = Make("Dark Wood Floor", new Color(.18f, .09f, .045f));
            Ceiling = Make("Ceiling", new Color(.35f, .32f, .27f));
            Shelf = Make("Walnut Shelves", new Color(.12f, .055f, .025f));
            Table = Make("Reading Tables", new Color(.24f, .12f, .055f));
            Label = Make("Shelf Labels", new Color(.72f, .52f, .20f));
            Color[] colors = { new Color(.72f,.08f,.06f), new Color(.06f,.28f,.58f), new Color(.08f,.45f,.22f), new Color(.85f,.42f,.06f), new Color(.68f,.16f,.40f), new Color(.82f,.72f,.25f) };
            for (int i = 0; i < colors.Length; i++) Books.Add(Make("Book Cover " + i, colors[i]));
        }

        private static Material Make(string name, Color color)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            Material material = new Material(shader) { name = name };
            material.color = color;
            return material;
        }
    }
}
