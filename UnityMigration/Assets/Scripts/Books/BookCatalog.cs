using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace QuietStudyHall.Books
{
    public sealed class BookCatalog : MonoBehaviour
    {
        private readonly Dictionary<string, BookData> records = new Dictionary<string, BookData>();
        private readonly Dictionary<string, BookEntity> entities = new Dictionary<string, BookEntity>();
        public int Count { get { return records.Count; } }

        public void Register(BookData data)
        {
            if (data == null || string.IsNullOrEmpty(data.id)) return;
            records[data.id] = data;
        }

        public void RegisterEntity(BookEntity entity)
        {
            if (entity == null || string.IsNullOrEmpty(entity.bookId)) return;
            entities[entity.bookId] = entity;
        }

        public BookData Find(string id)
        {
            records.TryGetValue(id, out BookData result);
            return result;
        }

        public BookEntity FindEntity(string id)
        {
            entities.TryGetValue(id, out BookEntity result);
            return result;
        }

        public List<BookData> Search(string query)
        {
            if (string.IsNullOrWhiteSpace(query)) return records.Values.ToList();
            string term = query.Trim().ToLowerInvariant();
            return records.Values.Where(book =>
                Contains(book.title, term) || Contains(book.author, term) || Contains(book.category, term) || Contains(book.language, term) || Contains(book.isbn, term)).ToList();
        }

        private static bool Contains(string value, string term) { return !string.IsNullOrEmpty(value) && value.ToLowerInvariant().Contains(term); }
    }
}
