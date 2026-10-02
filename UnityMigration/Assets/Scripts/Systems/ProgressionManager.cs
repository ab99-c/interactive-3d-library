using System;
using UnityEngine;

namespace QuietStudyHall.Systems
{
    [Serializable]
    public sealed class ProgressionSave
    {
        public int xp;
        public float walked;
        public int openedBooks;
        public int pagesTurned;
        public int hayyTurns;
    }

    public sealed class ProgressionManager : MonoBehaviour
    {
        public const string SaveKey = "quiet-study-hall:unity-progression-v1";
        public static ProgressionManager Instance { get; private set; }
        public ProgressionSave State { get; private set; } = new ProgressionSave();
        public event Action<ProgressionSave> Changed;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            Load();
        }

        public void AddWalked(float distance) { State.walked += Mathf.Max(0f, distance); SaveAndNotify(); }
        public void BookOpened() { State.openedBooks++; State.xp += 10; SaveAndNotify(); }
        public void PageTurned(string bookId) { State.pagesTurned++; State.xp += 2; if (bookId == "hayy-ibn-yaqdhan") State.hayyTurns++; SaveAndNotify(); }
        public string RankTitle()
        {
            if (State.xp >= 600) return "حكيم المكتبة";
            if (State.xp >= 300) return "عالِم";
            if (State.xp >= 150) return "باحث";
            if (State.xp >= 50) return "قارئ";
            return "زائر القاعة";
        }

        private void SaveAndNotify()
        {
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(State));
            PlayerPrefs.Save();
            Changed?.Invoke(State);
        }

        private void Load()
        {
            string raw = PlayerPrefs.GetString(SaveKey, string.Empty);
            if (!string.IsNullOrEmpty(raw)) State = JsonUtility.FromJson<ProgressionSave>(raw) ?? new ProgressionSave();
        }

        public void ResetProgress() { State = new ProgressionSave(); SaveAndNotify(); }
    }
}
