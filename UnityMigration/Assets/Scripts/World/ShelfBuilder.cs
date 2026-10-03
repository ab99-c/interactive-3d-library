using System.Collections.Generic;
using UnityEngine;
using QuietStudyHall.Architecture;
using QuietStudyHall.Books;

namespace QuietStudyHall.World
{
    public sealed class ShelfBuilder
    {
        private readonly LibraryConfig config;
        private readonly RuntimeMaterialPalette palette;
        public ShelfBuilder(LibraryConfig config, RuntimeMaterialPalette palette) { this.config = config; this.palette = palette; }

        public void BuildBookcase(Transform root, Vector3 position, string shelfId, LibraryFloor floor, List<GameObject> registry)
        {
            RuntimeObjectFactory.Cube(shelfId + "_Back", root, position + new Vector3(0f, 1.45f, .08f), new Vector3(3.35f, 2.9f, .18f), palette.Shelf, registry);
            RuntimeObjectFactory.Cube(shelfId + "_LeftPost", root, position + new Vector3(-1.62f, 1.45f, -.25f), new Vector3(.14f, 2.95f, .65f), palette.Shelf, registry);
            RuntimeObjectFactory.Cube(shelfId + "_RightPost", root, position + new Vector3(1.62f, 1.45f, -.25f), new Vector3(.14f, 2.95f, .65f), palette.Shelf, registry);
            RuntimeObjectFactory.Cube(shelfId + "_TopTrim", root, position + new Vector3(0f, 2.95f, -.25f), new Vector3(3.55f, .16f, .72f), palette.Shelf, registry);
            RuntimeObjectFactory.Cube(shelfId + "_Label", root, position + new Vector3(0f, 3.14f, -.25f), new Vector3(1.4f, .12f, .5f), palette.Label, registry);
            int levels = Mathf.Max(1, config.shelfLevels);
            for (int level = 0; level < levels; level++)
            {
                RuntimeObjectFactory.Cube(shelfId + "_Shelf_" + level, root, position + new Vector3(0f, .28f + level * .58f, -.34f), new Vector3(3.5f, .10f, .72f), palette.Shelf, registry);
                for (int slot = 0; slot < 10; slot++)
                {
                    Material cover = palette.Books[(slot + level + (int)floor) % palette.Books.Count];
                    GameObject book = RuntimeObjectFactory.Cube(shelfId + "_Book_" + level + "_" + slot, root, position + new Vector3(-1.38f + slot * .29f, .68f + level * .58f, -.49f), new Vector3(.22f, .48f + (slot % 3) * .08f, .18f), cover, registry);
                    book.transform.localRotation = Quaternion.Euler(0f, slot % 2 == 0 ? -3f : 4f, (slot % 3 - 1) * 2f);
                    BookEntity entity = book.AddComponent<BookEntity>();
                    entity.bookId = shelfId + "_book_" + level + "_" + slot;
                    entity.title = "كتاب الجامعة " + ((int)floor * 100 + level * 10 + slot + 1);
                    entity.shelfId = shelfId; entity.floor = floor.ToString(); entity.section = "GENERAL"; entity.row = level; entity.slot = slot;
                }
            }
        }
    }
}
