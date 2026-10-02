using UnityEngine;
using QuietStudyHall.Interaction;
using QuietStudyHall.Systems;

namespace QuietStudyHall.Books
{
    public enum BookState { OnShelf, Held, Open, Returning }

    public sealed class BookEntity : MonoBehaviour, IInteractable
    {
        public string bookId;
        public string title;
        public string author;
        public string category;
        [TextArea] public string description;
        public string contentReference;
        public string section;
        public string callNumber;
        public string floor;
        public string shelfId;
        public int row;
        public int slot;
        public BookState state = BookState.OnShelf;
        public bool contentAvailable = true;
        public Transform originalSlot;

        private void Awake()
        {
            if (string.IsNullOrEmpty(bookId)) bookId = gameObject.name;
            if (WorldStateManager.Instance != null) WorldStateManager.Instance.RegisterBook(bookId, floor, section);
        }

        public string GetInteractionPrompt() { return "E — فتح الكتاب"; }

        public void Interact(PlayerInteractor player)
        {
            state = state == BookState.Open ? BookState.OnShelf : BookState.Open;
            if (WorldStateManager.Instance != null) WorldStateManager.Instance.MarkDiscovered(bookId);
            if (ProgressionManager.Instance != null) ProgressionManager.Instance.BookOpened();
        }

        public void CaptureOriginalSlot()
        {
            if (originalSlot == null) originalSlot = transform.parent;
        }
    }
}
