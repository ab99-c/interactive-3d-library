using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using QuietStudyHall.Books;
using QuietStudyHall.Interaction;
using QuietStudyHall.Systems;

namespace QuietStudyHall.UI
{
    public sealed class LibraryGameUI : MonoBehaviour
    {
        private PlayerInteractor interactor;
        private Text prompt, status, readerText, mapText, resultsText;
        private GameObject readerPanel, mapPanel, searchPanel;
        private InputField searchInput;
        private int page;
        private BookEntity activeBook;
        private BookContentProvider content;

        public void Bind(PlayerInteractor target) { interactor = target; }

        private void Awake()
        {
            Canvas canvas = gameObject.AddComponent<Canvas>(); canvas.renderMode = RenderMode.ScreenSpaceOverlay; canvas.sortingOrder = 100;
            gameObject.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            gameObject.AddComponent<GraphicRaycaster>();
            prompt = Label(canvas.transform, "", 22, new Vector2(0f, -70f), new Vector2(600f, 60f), TextAnchor.MiddleCenter);
            status = Label(canvas.transform, "Quiet Study Hall", 16, new Vector2(20f, -20f), new Vector2(500f, 50f), TextAnchor.UpperLeft);
            readerPanel = Panel(canvas.transform, new Vector2(0f, 0f), new Vector2(720f, 470f), new Color(.06f, .04f, .02f, .96f));
            readerText = Label(readerPanel.transform, "", 20, new Vector2(0f, 0f), new Vector2(650f, 310f), TextAnchor.UpperRight); ButtonAt(readerPanel.transform, "السابق", new Vector2(-170f, -185f), () => Turn(-1)); ButtonAt(readerPanel.transform, "التالي", new Vector2(170f, -185f), () => Turn(1)); ButtonAt(readerPanel.transform, "إغلاق", new Vector2(0f, -185f), CloseReader); readerPanel.SetActive(false);
            mapPanel = Panel(canvas.transform, new Vector2(0f, 0f), new Vector2(520f, 390f), new Color(.03f, .08f, .12f, .96f)); mapText = Label(mapPanel.transform, "", 22, Vector2.zero, new Vector2(470f, 300f), TextAnchor.MiddleCenter); ButtonAt(mapPanel.transform, "إغلاق الخريطة", new Vector2(0f, -155f), () => mapPanel.SetActive(false)); mapPanel.SetActive(false);
            searchPanel = Panel(canvas.transform, new Vector2(0f, 0f), new Vector2(720f, 470f), new Color(.04f, .05f, .04f, .97f)); searchInput = CreateSearchInput(searchPanel.transform, new Vector2(0f, 150f)); ButtonAt(searchPanel.transform, "بحث", new Vector2(0f, 100f), Search); resultsText = Label(searchPanel.transform, "اكتب عنواناً أو مؤلفاً ثم اضغط بحث", 18, new Vector2(0f, -20f), new Vector2(650f, 230f), TextAnchor.UpperRight); ButtonAt(searchPanel.transform, "إغلاق البحث", new Vector2(0f, -185f), () => searchPanel.SetActive(false)); searchPanel.SetActive(false);
        }

        private void Update()
        {
            if (interactor == null) return;
            if (Input.GetKeyDown(KeyCode.M)) { mapPanel.SetActive(!mapPanel.activeSelf); UpdateMap(); }
            if (Input.GetKeyDown(KeyCode.F)) searchPanel.SetActive(!searchPanel.activeSelf);
            if (Input.GetKeyDown(KeyCode.Escape)) { readerPanel.SetActive(false); mapPanel.SetActive(false); searchPanel.SetActive(false); }
            activeBook = interactor.HeldBook;
            if (content == null) content = GetComponent<BookContentProvider>();
            if (activeBook != null && activeBook.state == BookState.Open) { readerPanel.SetActive(true); UpdateReader(); }
            else if (readerPanel.activeSelf && (activeBook == null || activeBook.state != BookState.Open)) readerPanel.SetActive(false);
            if (interactor.Current != null) prompt.text = "[E] " + interactor.Current.GetInteractionPrompt(); else if (activeBook != null) prompt.text = "[E] فتح الكتاب    [R] إرجاعه إلى الرف"; else prompt.text = "WASD حركة | Mouse نظر | E تفاعل | F بحث | M خريطة | F5 حفظ | F9 تحميل";
            int discovered = WorldStateManager.Instance == null ? 0 : WorldStateManager.Instance.DiscoveredCount(); int xp = ProgressionManager.Instance == null ? 0 : ProgressionManager.Instance.State.xp; status.text = "Quiet Study Hall  |  مكتشف: " + discovered + "  |  XP: " + xp;
        }

        private void UpdateReader() { string body = content == null ? string.Empty : content.Page(page); if (string.IsNullOrEmpty(body)) body = "هذا الكتاب لا يحتوي على محتوى مقروء حالياً."; readerText.text = "《 " + activeBook.title + " 》\n\n" + "الصفحة " + (page + 1) + "\n\n" + body; }
        private void Turn(int delta) { page = Mathf.Max(0, page + delta); if (ProgressionManager.Instance != null) ProgressionManager.Instance.PageTurned(activeBook == null ? "" : activeBook.bookId); UpdateReader(); }
        private void CloseReader() { if (activeBook != null) activeBook.Close(); readerPanel.SetActive(false); }
        private void UpdateMap() { mapText.text = "خريطة Quiet Study Hall\n\n[الطابق الثاني] — قاعات البحث\n        ↑ المصعد / الدرج\n[الطابق الأول] — العلوم والآداب\n        ↑ المصعد / الدرج\n[الطابق الأرضي] — الاستقبال والقراءة\n        ↓ المصعد / الدرج\n[القبو] — الأرشيف والمخازن"; }
        private void Search() { string q = searchInput.text.Trim().ToLowerInvariant(); List<BookEntity> books = FindObjectsByType<BookEntity>().Where(book => string.IsNullOrEmpty(q) || Contains(book.title, q) || Contains(book.author, q) || Contains(book.category, q)).Take(20).ToList(); resultsText.text = books.Count == 0 ? "لا توجد نتائج" : string.Join("\n", books.Select(book => "• " + book.title + " — " + book.floor + " / " + book.shelfId)); }
        private static bool Contains(string value, string query) { return !string.IsNullOrEmpty(value) && value.ToLowerInvariant().Contains(query); }

        private static GameObject Panel(Transform parent, Vector2 position, Vector2 size, Color color) { GameObject panel = new GameObject("Panel"); panel.transform.SetParent(parent, false); RectTransform rect = panel.AddComponent<RectTransform>(); rect.sizeDelta = size; rect.anchoredPosition = position; Image image = panel.AddComponent<Image>(); image.color = color; return panel; }
        private static Text Label(Transform parent, string value, int size, Vector2 position, Vector2 dimensions, TextAnchor anchor) { GameObject obj = new GameObject("Text"); obj.transform.SetParent(parent, false); RectTransform rect = obj.AddComponent<RectTransform>(); rect.sizeDelta = dimensions; rect.anchoredPosition = position; Text text = obj.AddComponent<Text>(); text.text = value; text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); text.fontSize = size; text.color = Color.white; text.alignment = anchor; text.horizontalOverflow = HorizontalWrapMode.Wrap; text.verticalOverflow = VerticalWrapMode.Overflow; return text; }
        private static InputField CreateSearchInput(Transform parent, Vector2 position) { GameObject obj = new GameObject("SearchInput"); obj.transform.SetParent(parent, false); RectTransform rect = obj.AddComponent<RectTransform>(); rect.sizeDelta = new Vector2(520f, 55f); rect.anchoredPosition = position; Image image = obj.AddComponent<Image>(); image.color = Color.white; InputField field = obj.AddComponent<InputField>(); Text text = Label(obj.transform, "", 20, Vector2.zero, new Vector2(500f, 50f), TextAnchor.MiddleRight); text.color = Color.black; field.textComponent = text; return field; }
        private static void ButtonAt(Transform parent, string caption, Vector2 position, UnityEngine.Events.UnityAction action) { GameObject obj = new GameObject(caption); obj.transform.SetParent(parent, false); RectTransform rect = obj.AddComponent<RectTransform>(); rect.sizeDelta = new Vector2(160f, 50f); rect.anchoredPosition = position; Image image = obj.AddComponent<Image>(); image.color = new Color(.55f, .32f, .12f); Button button = obj.AddComponent<Button>(); button.onClick.AddListener(action); Text text = Label(obj.transform, caption, 18, Vector2.zero, new Vector2(150f, 45f), TextAnchor.MiddleCenter); }
    }
}
