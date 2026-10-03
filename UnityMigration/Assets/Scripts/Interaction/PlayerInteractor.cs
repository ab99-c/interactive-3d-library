using UnityEngine;
using QuietStudyHall.Books;

namespace QuietStudyHall.Interaction
{
    public sealed class PlayerInteractor : MonoBehaviour
    {
        [SerializeField] private Camera playerCamera;
        [SerializeField] private float range = 2.2f;
        public IInteractable Current { get; private set; }
        public Transform BookHand { get; private set; }
        public BookEntity HeldBook { get; private set; }

        public void SetCamera(Camera cameraToUse) { playerCamera = cameraToUse; }
        public void SetBookHand(Transform hand) { BookHand = hand; }
        public void SetHeldBook(BookEntity book) { HeldBook = book; }
        public void ClearHeldBook() { HeldBook = null; }

        private void Update()
        {
            if (HeldBook != null)
            {
                if (Input.GetKeyDown(KeyCode.R)) HeldBook.ReturnToShelf(this);
                else if (Input.GetKeyDown(KeyCode.E)) HeldBook.Interact(this);
                return;
            }

            Current = null;
            if (playerCamera == null) return;
            if (Physics.Raycast(playerCamera.transform.position, playerCamera.transform.forward, out RaycastHit hit, range))
            {
                BookEntity book = hit.collider.GetComponentInParent<BookEntity>();
                if (book != null && book.state == BookState.OnShelf) Current = book;
                else Current = hit.collider.GetComponentInParent<FloorTransport>();
            }
            if (Current != null && Input.GetKeyDown(KeyCode.E)) Current.Interact(this);
        }
    }
}
