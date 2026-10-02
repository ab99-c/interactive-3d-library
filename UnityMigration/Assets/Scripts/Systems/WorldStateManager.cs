using System;
using System.Collections.Generic;
using UnityEngine;

namespace QuietStudyHall.Systems
{
    [Serializable]
    public sealed class WorldObjectState
    {
        public string id;
        public bool discovered;
        public bool open;
        public bool onShelf = true;
        public string floor;
        public string section;
    }

    [Serializable]
    public sealed class WorldStateSave
    {
        public List<WorldObjectState> objects = new List<WorldObjectState>();
        public List<string> visitedAreas = new List<string>();
    }

    public sealed class WorldStateManager : MonoBehaviour
    {
        public const string SaveKey = "quiet-study-hall:unity-world-state-v1";
        public static WorldStateManager Instance { get; private set; }
        public readonly LibraryEventBus Events = new LibraryEventBus();
        private WorldStateSave state = new WorldStateSave();

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            Load();
        }

        public WorldObjectState RegisterBook(string id, string floor, string section)
        {
            WorldObjectState existing = state.objects.Find(item => item.id == id);
            if (existing != null) return existing;
            existing = new WorldObjectState { id = id, floor = floor, section = section };
            state.objects.Add(existing);
            Save();
            return existing;
        }

        public void MarkDiscovered(string id)
        {
            WorldObjectState item = state.objects.Find(value => value.id == id);
            if (item == null) return;
            item.discovered = true;
            Save();
            Events.Publish("BookOpened", item);
        }

        public bool IsDiscovered(string id) { return state.objects.Exists(item => item.id == id && item.discovered); }
        public int DiscoveredCount() { return state.objects.FindAll(item => item.discovered).Count; }
        public void VisitArea(string area) { if (!state.visitedAreas.Contains(area)) state.visitedAreas.Add(area); Save(); Events.Publish("AreaEntered", area); }

        public void Save()
        {
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(state));
            PlayerPrefs.Save();
        }

        public void Load()
        {
            string raw = PlayerPrefs.GetString(SaveKey, string.Empty);
            state = string.IsNullOrEmpty(raw) ? new WorldStateSave() : JsonUtility.FromJson<WorldStateSave>(raw);
            if (state == null) state = new WorldStateSave();
        }

        public void ClearState() { state = new WorldStateSave(); Save(); Events.Publish("WorldStateCleared"); }
    }
}
