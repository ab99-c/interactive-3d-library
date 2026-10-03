using UnityEngine;
using UnityEngine.InputSystem;
using QuietStudyHall.Player;

namespace QuietStudyHall.Books
{
    public sealed class BookInteraction : MonoBehaviour
    {
        [SerializeField] private Camera playerCamera;
        [SerializeField] private float interactionRange = 2.2f;
        [SerializeField] private Transform rightHand;
        [SerializeField] private Key interactKey = Key.E;
        private BookEntity heldBook;

        public void SetCamera(Camera cameraToUse) { playerCamera = cameraToUse; }

        private void Update()
        {
            if (!ModernInput.Down(interactKey) || playerCamera == null) return;
            if (heldBook != null) { ToggleOpen(heldBook); return; }
            if (!Physics.Raycast(playerCamera.transform.position, playerCamera.transform.forward, out RaycastHit hit, interactionRange)) return;

            BookEntity book = hit.collider.GetComponentInParent<BookEntity>();
            if (book == null) return;
            heldBook = book;
            heldBook.state = BookState.Held;
            heldBook.CaptureOriginalSlot();
            if (rightHand != null)
            {
                book.transform.SetParent(rightHand, false);
                book.transform.localPosition = new Vector3(0f, 0f, 0.35f);
                book.transform.localRotation = Quaternion.identity;
            }
        }

        private static void ToggleOpen(BookEntity book)
        {
            book.state = book.state == BookState.Open ? BookState.Held : BookState.Open;
        }
    }
}
