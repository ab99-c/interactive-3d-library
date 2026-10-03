using UnityEngine;
using UnityEngine.InputSystem;

namespace QuietStudyHall.Player
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class PlayerController : MonoBehaviour
    {
        [SerializeField] private Camera playerCamera;
        [SerializeField] private float walkSpeed = 2.35f;
        [SerializeField] private float sprintSpeed = 4.2f;
        [SerializeField] private float lookSensitivity = 2.5f;
        [SerializeField] private float gravity = -9.81f;
        private CharacterController controller;
        private float pitch;
        private float verticalVelocity;

        public void SetCamera(Camera cameraToUse) { playerCamera = cameraToUse; }

        private void Awake() { controller = GetComponent<CharacterController>(); }

        private void Update()
        {
            Vector2 input = ModernInput.Move();
            float x = input.x;
            float z = input.y;
            Vector3 direction = (transform.right * x + transform.forward * z).normalized;
            float speed = ModernInput.Held(Key.LeftShift) ? sprintSpeed : walkSpeed;

            if (controller.isGrounded && verticalVelocity < 0f) verticalVelocity = -1f;
            verticalVelocity += gravity * Time.deltaTime;
            controller.Move((direction * speed + Vector3.up * verticalVelocity) * Time.deltaTime);

            Vector2 mouse = ModernInput.MouseDelta() * lookSensitivity * 0.02f;
            float mouseX = mouse.x;
            float mouseY = mouse.y;
            transform.Rotate(Vector3.up * mouseX);
            pitch = Mathf.Clamp(pitch - mouseY, -80f, 80f);
            if (playerCamera != null) playerCamera.transform.localRotation = Quaternion.Euler(pitch, 0f, 0f);
        }
    }
}
