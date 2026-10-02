namespace QuietStudyHall.Interaction
{
    public interface IInteractable
    {
        string GetInteractionPrompt();
        void Interact(PlayerInteractor player);
    }
}
