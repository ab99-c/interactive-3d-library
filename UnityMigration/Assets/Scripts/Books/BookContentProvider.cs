using System;
using UnityEngine;

namespace QuietStudyHall.Books
{
    [Serializable]
    public sealed class HayyPagesPayload
    {
        public int pageCount;
        public string[] pages;
    }

    public sealed class BookContentProvider : MonoBehaviour
    {
        [SerializeField] private TextAsset hayyPagesJson;
        private HayyPagesPayload hayy;

        public bool Load()
        {
            if (hayyPagesJson == null) hayyPagesJson = Resources.Load<TextAsset>("hayy-pages-data");
            if (hayyPagesJson == null || string.IsNullOrEmpty(hayyPagesJson.text)) return false;
            try
            {
                hayy = JsonUtility.FromJson<HayyPagesPayload>(hayyPagesJson.text);
                return hayy != null && hayy.pages != null;
            }
            catch (Exception error)
            {
                Debug.LogWarning("Book content could not be loaded: " + error.Message);
                return false;
            }
        }

        public int PageCount()
        {
            if (hayy == null) Load();
            return hayy == null || hayy.pages == null ? 0 : hayy.pages.Length;
        }

        public string Page(int index)
        {
            if (hayy == null) Load();
            if (hayy == null || hayy.pages == null || index < 0 || index >= hayy.pages.Length) return string.Empty;
            return hayy.pages[index];
        }
    }
}
