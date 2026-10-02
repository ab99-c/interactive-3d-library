using UnityEngine;
using QuietStudyHall.Books;

namespace QuietStudyHall.Interaction
{
    public sealed class PlayerInteractor : MonoBehaviour
    {
        [SerializeField] private Camera playerCamera;
        [SerializeField] private float range = 2.2f;
        public IInteractable Current { get; private set; }

        public void SetCamera(Camera cameraToUse) { playerCamera = cameraToUse; }

        private void Update()
        {
            Current = null;
            if (playerCamera == null) return;
            if (Physics.Raycast(playerCamera.transform.position, playerCamera.transform.forward, out RaycastHit hit, range))
            {
                BookEntity book = hit.collider.GetComponentInParent<BookEntity>();
                Current = book;
            }
            if (Current != null && Input.GetKeyDown(KeyCode.E)) Current.Interact(this);
        }
    }
}
