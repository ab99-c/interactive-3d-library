using UnityEngine;

namespace QuietStudyHall.Books
{
    public enum BookState { OnShelf, Held, Open, Returning }

    public sealed class BookEntity : MonoBehaviour
    {
        public string bookId;
        public string title;
        public string section;
        public string callNumber;
        public string floor;
        public string shelfId;
        public int row;
        public int slot;
        public BookState state = BookState.OnShelf;
        public bool contentAvailable = true;
        public Transform originalSlot;

        public void CaptureOriginalSlot()
        {
            if (originalSlot == null) originalSlot = transform.parent;
        }
    }
}
