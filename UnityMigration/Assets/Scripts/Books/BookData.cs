using System;
using UnityEngine;

namespace QuietStudyHall.Books
{
    [Serializable]
    public sealed class BookLocation
    {
        public string floor;
        public string section;
        public string room;
        public string shelf;
        public int row;
        public int slot;
    }

    [Serializable]
    public sealed class BookData
    {
        public string id;
        public string title;
        public string author;
        public string category;
        public string language;
        public int year;
        public string isbn;
        public string description;
        public string contentReference;
        public BookLocation location;
    }
}
