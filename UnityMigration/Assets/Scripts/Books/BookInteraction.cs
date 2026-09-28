using UnityEngine;

namespace QuietStudyHall.Books
{
    public sealed class BookInteraction : MonoBehaviour
    {
        [SerializeField] private Camera playerCamera;
        [SerializeField] private float interactionRange = 1.5f;
        [SerializeField] private Transform rightHand;
        [SerializeField] private KeyCode interactKey = KeyCode.E;
        private BookEntity heldBook;

        private void Update()
        {
            if (!Input.GetKeyDown(interactKey)) return;
            if (heldBook != null) { ToggleOpen(heldBook); return; }
            if (playerCamera == null) return;
            if (!Physics.Raycast(playerCamera.transform.position, playerCamera.transform.forward, out RaycastHit hit, interactionRange)) return;
            var book = hit.collider.GetComponentInParent<BookEntity>();
            if (book == null) return;
            heldBook = book;
            heldBook.state = BookState.Held;
            if (rightHand != null) { book.transform.SetParent(rightHand); book.transform.localPosition = new Vector3(0f, 0f, 0.35f); book.transform.localRotation = Quaternion.identity; }
        }

        private static void ToggleOpen(BookEntity book)
        {
            book.state = book.state == BookState.Open ? BookState.Held : BookState.Open;
            // Connect this state to the two-cover/page animation in the book prefab.
        }
    }
}
