using System;
using UnityEngine;
using QuietStudyHall.Player;
using UnityEngine.InputSystem;

namespace QuietStudyHall.Systems
{
    [Serializable]
    public sealed class PlayerSaveData
    {
        public int version = 1;
        public Vector3 position;
        public float yaw;
        public string floor = "Ground";
    }

    public sealed class LibrarySaveManager : MonoBehaviour
    {
        public const string Key = "quiet-study-hall:unity-player-save-v1";
        [SerializeField] private Transform player;
        public void Bind(Transform target) { player = target; }

        private void Update()
        {
            if (ModernInput.Down(Key.F5)) Save();
            if (ModernInput.Down(Key.F9)) Load();
        }

        public void Save()
        {
            if (player == null) return;
            PlayerSaveData data = new PlayerSaveData { position = player.position, yaw = player.eulerAngles.y, floor = ResolveFloor(player.position.y) };
            PlayerPrefs.SetString(Key, JsonUtility.ToJson(data));
            PlayerPrefs.Save();
            if (WorldStateManager.Instance != null) WorldStateManager.Instance.Save();
            Debug.Log("Quiet Study Hall saved at " + data.floor);
        }

        public bool Load()
        {
            if (player == null || !PlayerPrefs.HasKey(Key)) return false;
            try
            {
                PlayerSaveData data = JsonUtility.FromJson<PlayerSaveData>(PlayerPrefs.GetString(Key));
                if (data == null) return false;
                CharacterController controller = player.GetComponent<CharacterController>();
                if (controller != null) controller.enabled = false;
                player.position = data.position; player.eulerAngles = new Vector3(0f, data.yaw, 0f);
                if (controller != null) controller.enabled = true;
                Debug.Log("Quiet Study Hall save loaded from " + data.floor);
                return true;
            }
            catch (Exception error) { Debug.LogWarning("Save could not be loaded: " + error.Message); return false; }
        }

        private static string ResolveFloor(float y) { if (y < -2f) return "Basement"; if (y > 6.3f) return "Second"; if (y > 2f) return "First"; return "Ground"; }
    }
}
