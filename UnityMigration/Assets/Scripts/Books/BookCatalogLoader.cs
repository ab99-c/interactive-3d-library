using System;
using UnityEngine;

namespace QuietStudyHall.Books
{
    [Serializable]
    public sealed class BookDataCollection
    {
        public BookData[] books;
    }

    public sealed class BookCatalogLoader : MonoBehaviour
    {
        [SerializeField] private TextAsset catalogJson;
        [SerializeField] private BookCatalog catalog;

        private void Awake()
        {
            if (catalog == null) catalog = GetComponent<BookCatalog>();
            if (catalog == null) catalog = gameObject.AddComponent<BookCatalog>();
            Load();
        }

        public int Load()
        {
            if (catalogJson == null || string.IsNullOrEmpty(catalogJson.text)) return 0;
            try
            {
                BookDataCollection collection = JsonUtility.FromJson<BookDataCollection>(catalogJson.text);
                if (collection == null || collection.books == null) return 0;
                foreach (BookData book in collection.books) catalog.Register(book);
                return collection.books.Length;
            }
            catch (Exception error)
            {
                Debug.LogWarning("Book catalog could not be loaded: " + error.Message);
                return 0;
            }
        }
    }
}
