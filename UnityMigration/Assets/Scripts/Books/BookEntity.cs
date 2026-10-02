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
        private Vector3 shelfPosition;
        private Quaternion shelfRotation;
        private Collider bookCollider;

        private void Awake()
        {
            if (string.IsNullOrEmpty(bookId)) bookId = gameObject.name;
            shelfPosition = transform.position;
            shelfRotation = transform.rotation;
            bookCollider = GetComponent<Collider>();
            if (WorldStateManager.Instance != null) WorldStateManager.Instance.RegisterBook(bookId, floor, section);
        }

        public string GetInteractionPrompt() { return state == BookState.OnShelf ? "E — أخذ الكتاب" : "E — فتح الكتاب"; }

        public void Interact(PlayerInteractor player)
        {
            if (state == BookState.OnShelf) Take(player);
            else if (state == BookState.Held) Open();
            else if (state == BookState.Open) Close();
        }

        public void Take(PlayerInteractor player)
        {
            if (state != BookState.OnShelf || player == null) return;
            CaptureOriginalSlot();
            Transform hand = player.BookHand;
            if (hand == null) return;
            transform.SetParent(hand, false);
            transform.localPosition = new Vector3(0.18f, -0.12f, 0.42f);
            transform.localRotation = Quaternion.Euler(0f, 0f, -12f);
            transform.localScale = new Vector3(1.15f, 1.15f, 1.15f);
            if (bookCollider != null) bookCollider.enabled = false;
            state = BookState.Held;
            player.SetHeldBook(this);
            if (WorldStateManager.Instance != null) WorldStateManager.Instance.MarkDiscovered(bookId);
            if (ProgressionManager.Instance != null) ProgressionManager.Instance.BookOpened();
        }

        public void Open() { state = BookState.Open; }
        public void Close() { state = BookState.Held; }

        public void ReturnToShelf(PlayerInteractor player)
        {
            if (state == BookState.OnShelf) return;
            transform.SetParent(null, true);
            transform.position = shelfPosition;
            transform.rotation = shelfRotation;
            transform.localScale = Vector3.one;
            if (bookCollider != null) bookCollider.enabled = true;
            state = BookState.OnShelf;
            if (player != null) player.ClearHeldBook();
        }

        public void CaptureOriginalSlot()
        {
            if (originalSlot == null) originalSlot = transform.parent;
            if (state == BookState.OnShelf) { shelfPosition = transform.position; shelfRotation = transform.rotation; }
        }
    }
}
