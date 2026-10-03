using UnityEngine;
using QuietStudyHall.Interaction;

namespace QuietStudyHall.Player
{
    public static class PlayerFactory
    {
        public static GameObject Create(Vector3 position)
        {
            GameObject player = new GameObject("Player");
            player.transform.position = position;
            CharacterController controller = player.AddComponent<CharacterController>();
            controller.height = 1.8f; controller.radius = .35f; controller.stepOffset = .35f; controller.slopeLimit = 45f;
            PlayerController movement = player.AddComponent<PlayerController>();
            GameObject cameraObject = new GameObject("PlayerCamera"); cameraObject.transform.SetParent(player.transform, false); cameraObject.transform.localPosition = new Vector3(0f, .7f, 0f);
            Camera camera = cameraObject.AddComponent<Camera>(); camera.tag = "MainCamera"; movement.SetCamera(camera);
            GameObject hand = new GameObject("BookHand"); hand.transform.SetParent(cameraObject.transform, false); hand.transform.localPosition = new Vector3(.42f, -.35f, .65f);
            PlayerInteractor interactor = player.AddComponent<PlayerInteractor>(); interactor.SetCamera(camera); interactor.SetBookHand(hand.transform);
            return player;
        }
    }
}
