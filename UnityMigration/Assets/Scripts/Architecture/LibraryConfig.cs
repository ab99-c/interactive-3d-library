using UnityEngine;

namespace QuietStudyHall.Architecture
{
    public enum LibraryFloor { Basement, Ground, First, Second }

    [CreateAssetMenu(menuName = "Quiet Study Hall/Library Config")]
    public sealed class LibraryConfig : ScriptableObject
    {
        public Vector3 buildingSize = new(48f, 12.9f, 72f);
        public float floorHeight = 4.2f;
        public float floorThickness = 0.3f;
        public float wallThickness = 0.3f;
        public float corridorMain = 4f;
        public float corridorSecondary = 2f;
        public float shelfHeight = 2.1f;
        public int shelfLevels = 5;
        public int meshBudget = 2000;

        public float FloorY(LibraryFloor floor) => floor switch
        {
            LibraryFloor.Basement => -4.2f,
            LibraryFloor.Ground => 0f,
            LibraryFloor.First => 4.2f,
            LibraryFloor.Second => 8.4f,
            _ => 0f
        };
    }
}
