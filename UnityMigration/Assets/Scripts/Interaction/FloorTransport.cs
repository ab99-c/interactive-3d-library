using UnityEngine;
using QuietStudyHall.Interaction;

namespace QuietStudyHall.Interaction
{
    public sealed class FloorTransport : MonoBehaviour, IInteractable
    {
        [SerializeField] private string prompt = "E — استعمال المصعد / الدرج";
        [SerializeField] private Vector3 destination;
        public string GetInteractionPrompt() { return prompt; }
        public void Configure(Vector3 target, string label) { destination = target; prompt = label; }
        public void Interact(PlayerInteractor player)
        {
            if (player == null) return;
            player.transform.position = destination;
        }
    }
}
