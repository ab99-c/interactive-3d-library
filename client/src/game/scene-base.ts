// Quiet Study Hall: مشهد دافئ وسينمائي؛ الخشب والعاج والزيتوني والنحاسي، والعالم 3D هو البطل.
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import "@babylonjs/core/Collisions/collisionCoordinator";
// Style: Quiet Study Hall — walnut, ivory, olive, and brass; first-person details stay tactile, quiet, and low-poly.
// Register Ray before scene picking APIs are used; Babylon otherwise logs a side-effect warning at runtime.
import "@babylonjs/core/Culling/ray";
// Register Babylon's built-in shader sources in the bundle; otherwise Vite may serve index.html for /src/Shaders/*.fx.
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/default.fragment";
import "@babylonjs/core/Shaders/shadowMap.vertex";
import "@babylonjs/core/Shaders/shadowMap.fragment";
type HayyPagesPayload = { pageCount: number; pages: string[] };

const FALLBACK_HAYY_PAGE_COUNT = 387;
const HAYY_PAGE_STORAGE_KEY = "quiet-study-hall:hayy-page-index";
const HAYY_PAGE_FALLBACKS = [
  "ذكر سلفنا الصالح أن حي بن يقظان نشأ في جزيرة منفردة، فتأمل العالم من حوله بعين الباحث الهادئ.",
  "وكان يطلب حقيقة الأشياء بالنظر والتجربة، حتى صار لكل سؤال عنده طريق من التأمل والمعرفة.",
];
let hayyPages: readonly string[] = [];
let hayyPagesPromise: Promise<readonly string[]> | null = null;

const toArabicPageNumber = (value: number) => String(value).replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
const clampSpreadPageIndex = (value: number, pageCount: number) => {
  const maxSpreadStart = Math.max(0, pageCount - 2);
  const clamped = Math.max(0, Math.min(Math.floor(value), maxSpreadStart));
  return clamped - (clamped % 2);
};
const readSavedPageIndex = (pageCount: number) => {
  try {
    const stored = Number.parseInt(window.localStorage.getItem(HAYY_PAGE_STORAGE_KEY) ?? "0", 10);
    return clampSpreadPageIndex(Number.isFinite(stored) ? stored : 0, pageCount);
  } catch {
    return 0;
  }
};
const savePageIndex = (pageIndex: number) => {
  try {
    window.localStorage.setItem(HAYY_PAGE_STORAGE_KEY, String(pageIndex));
  } catch {
    // Reading remains available when storage is disabled by the browser.
  }
};
const loadHayyPages = () => {
  if (!hayyPagesPromise) {
    hayyPagesPromise = import("./hayy-pages-data.json")
      .then((module) => module.default as HayyPagesPayload)
      .then((payload) => {
        if (!Array.isArray(payload.pages) || !payload.pages.length) throw new Error("بيانات صفحات الكتاب غير صالحة");
        hayyPages = payload.pages;
        return hayyPages;
      })
      .catch((error) => {
        hayyPagesPromise = null;
        throw error;
      });
  }
  return hayyPagesPromise;
};

export type PerformanceMode = "cinematic" | "light";
export type BookInfo = {
  id: string;
  title: string;
  category: string;
  description: string;
  spineTitle: string;
  volume: string;
  author?: string;
  pages?: string[];
};
export type BookScreenRect = { meshName: string; bookId: string; title: string; x: number; y: number; width: number; height: number };
export type GameHandle = { scene: Scene; dispose: () => void; openNearestBook: () => boolean; openBookById: (bookId: string) => boolean; openBookByMeshName: (meshName: string) => boolean; returnActiveBook: () => boolean; turnActivePage: (direction: "rtl" | "ltr") => boolean; hasActiveBook: () => boolean; getBookScreenRects: () => BookScreenRect[]; setTouchMove: (x: number, y: number) => void; setPerformanceMode: (mode: PerformanceMode) => void };

const BOOK_FORMATS = [
  { name: "Pocket", width: 0.17, height: 0.43, depth: 0.12 },
  { name: "A5", width: 0.19, height: 0.50, depth: 0.14 },
  { name: "Trade Paperback", width: 0.20, height: 0.53, depth: 0.15 },
  { name: "B5", width: 0.22, height: 0.56, depth: 0.16 },
  { name: "A4 Reference", width: 0.23, height: 0.58, depth: 0.17 },
  { name: "Square", width: 0.23, height: 0.40, depth: 0.14 },
  { name: "Planner", width: 0.20, height: 0.54, depth: 0.16 },
  { name: "Notebook", width: 0.20, height: 0.48, depth: 0.14 },
];

const COLORS = {
  walnut: new Color3(0.18, 0.09, 0.045),
  walnutLight: new Color3(0.34, 0.18, 0.08),
  ivory: new Color3(0.88, 0.82, 0.68),
  olive: new Color3(0.25, 0.31, 0.18),
  brass: new Color3(0.79, 0.58, 0.29),
  ink: new Color3(0.035, 0.028, 0.024),
};

export const BOOK_CATALOG: BookInfo[] = [
  {
    id: "ibn-battuta",
    title: "تحفة النظار في غرائب الأمصار",
    spineTitle: "رحلة ابن بطوطة",
    author: "ابن بطوطة الطنجي",
    category: "الرحلات والتراث",
    volume: "١",
    description: "أعظم رحلة استكشافية جغرافية في العصر الوسيط انطلقت من طنجة وجابت العالم.",
    pages: [
      "خرجتُ من طنجة مسقط رأسي معتمداً حج بيت الله الحرام وزيارة قبر الرسول عليه الصلاة والسلام، منفرداً عن رفيق آنس به.",
      "وكان خروجي من طنجة في يوم الخميس الثاني من رجب سنة خمس وعشرين وسبعمائة، ولم أبلغ الثانية والعشرين من عمري.",
      "ثم سرت إلى مدينة فاس حرسها الله، فدخلت أزقتها العتيقة وجوامعها الكبرى، ورأيت من حسن عمرانها وجمال أسواقها ما يبهج النفس.",
      "وقصدت بلاد المشرق والهند والصين، وكلما حللت بأرض لقيت أهلها بالبشر والمحبة، فكانت الأرض كلها لي وطناً واسعاً.",
    ],
  },
  {
    id: "ibn-khaldun",
    title: "مقدمة ابن خلدون",
    spineTitle: "مقدمة ابن خلدون",
    author: "عبد الرحمن بن خلدون",
    category: "العمران والاجتماع",
    volume: "٢",
    description: "التأسيس العلمي الأول لعلم الاجتماع البشري وفلسفة التاريخ وحركة الحضارات.",
    pages: [
      "إن فن التاريخ من الفنون التي تتداولها الأمم والأجيال، وتشد إليها الركائب، وتسمو إلى معرفته النفوس النبيلة.",
      "إذ هو في ظاهره لا يزيد على أخبار عن الأيام والدول، وفي باطنه نظر وتحقيق، وتعليل للكائنات ومباديها دقيق.",
      "واعلم أن الاجتماع الإنساني ضروري؛ فالإنسان مدني بالطبع، ولا بد له من التعاون لسد حاجات معاشه وعمارة الأرض.",
      "وعلى قدر تماسك العصبية والعدل يزدهر العمران، فإذا تطرق الظلم وانحلت العزائم آذنت الحضارة بالزوال والغروب.",
    ],
  },
  {
    id: "ibn-rushd",
    title: "فصل المقال فيما بين الحكمة والشريعة",
    spineTitle: "فصل المقال",
    author: "ابن رشد القرطبي",
    category: "الفلسفة والبرهان",
    volume: "٣",
    description: "دفاع عقلاني فلسفي رصين يبرهن على التوافق التام بين الحكمة العقلية والنص الشرعي.",
    pages: [
      "فإن الغرض من هذا القول أن نفحص، على جهة النظر، هل النظر في الفلسفة وعلوم المنطق مباح بالشرع أم مأمور به؟",
      "فنقول: إن كان فعل الفلسفة ليس شيئاً أكثر من النظر في الموجودات واعتبارها، فإن الشرع دعا إلى ذلك وحث عليه.",
      "فقال تعالى: {فاعتبروا يا أولي الأبصار}، وهذا برهان على وجوب استعمال العقل والنظر في آيات الكون لمعرفة الحق.",
      "وإذا كانت الحكمة حقاً، والشريعة حقاً، فإن الحق لا يضاد الحق، بل يوافقه ويشهد له بالدليل القاطع.",
    ],
  },
  {
    id: "ibn-hazm",
    title: "طوق الحمامة في الألفة والأُلاَّف",
    spineTitle: "طوق الحمامة",
    author: "ابن حزم الأندلسي",
    category: "الأدب والوجدانيات",
    volume: "٤",
    description: "رسالة أدبية ونفسية فريدة في تحليل المحبة وطبائع القلوب في الأندلس.",
    pages: [
      "الحب - أعزك الله - أوله هزل وآخره جد، دقت معانيه عن أن توصف، فلا تدرك حقيقته إلا بالمعاناة وتأمل أحوال القلوب.",
      "وقد اختلف الناس في ماهيته، والذي أذهب إليه أنه اتصال بين أجزاء النفوس المقسومة في أصل عنصرها الرفيع.",
      "وللحب علامات يقفوها الفطن: فأولها إدمان النظر؛ فالعين مرآة النفس المعبرة عن مكنون السرائر ومكامن الصدق.",
      "وترى المحب إذا دنا ممن يحب أخذته روعة وسكينة، فإن نقاء الود سلطان قاهر يعلو فوق مظاهر التكلف.",
    ],
  },
  {
    id: "kalila-wa-dimna",
    title: "كليلة ودمنة",
    spineTitle: "كليلة ودمنة",
    author: "عبد الله بن المقفع",
    category: "الحكم والأمثال",
    volume: "٥",
    description: "حكم سياسية وإنسانية خالدة صيغت بأسلوب رمزي ساحر على ألسنة الحيوان والطير.",
    pages: [
      "هذا كتاب كليلة ودمنة، وضعه الحكماء أمثالاً نطقوا بها على ألسن البهائم والطير، صيانةً للحكمة واجتذاباً للعقول.",
      "فينبغي لمن قرأ هذا الكتاب أن يعرف باطن غايته، ولا يقف عند ظاهر حكاياته دون تدبر مغازيها الخفية.",
      "قال دمنة: لا يستصغرن عاقل شأن أحد، فإن الحبة الصغيرة تنبت شجرة باسقة، وإن الحكمة قد تلتقط من كل موضع.",
      "وما من عمل أحمد عاقبة ولا أبقى ذكراً من الصدق والوفاء ومشاورة ذوي الألباب في كل نازلة وخطة.",
    ],
  },
  {
    id: "alf-layla",
    title: "ألف ليلة وليلة",
    spineTitle: "ألف ليلة وليلة",
    author: "روائع التراث الشعبي",
    category: "الأساطير والقصص",
    volume: "٦",
    description: "موسوعة الخيال الإنساني الكبرى والرحلة الليلية المشوقة في حكايات الشرق الساحر.",
    pages: [
      "بلغني أيها الملك السعيد، ذو الرأي الرشيد، أن ملكاً كان في سالف الزمان حكيماً عادلاً تحبه الرعية وتطيعه الآفاق.",
      "وكانت شهرزاد قد قرأت كتب الأوائل وتواريخ الأمم وأخبار الشعراء، وكانت ذات فصاحة وعقل وحكمة نادرة.",
      "فقالت: إني عازمة على مداواة النفوس بحسن الحديث، وسرد عجائب البلدان وما فيها من عبر وسير.",
      "وأدرك شهرزاد الصباح، فسكتت عن الكلام المباح، فتشوق الملك لسماع البقية فتركها لليلة القابلة طلباً للحكمة.",
    ],
  },
  {
    id: "diwan-al-mutanabbi",
    title: "ديوان المتنبي",
    spineTitle: "ديوان المتنبي",
    author: "أبو الطيب المتنبي",
    category: "الشعر العربي",
    volume: "٧",
    description: "روائع شعر الحكمة والفخر والطموح الإنساني الذي شغل الناس وملأ الدنيا.",
    pages: [
      "على قدر أهل العزم تأتي العزائمُ ... وتأتي على قدر الكرام المكارمُ\nوتعظم في عين الصغير صغارها ... وتصغر في عين العظيم العظائمُ.",
      "الخيل والليل والبيداء تعرفني ... والسيف والرمح والقرطاس والقلمُ\nصحبتُ في الفلوات الوحش منفرداً ... حتى تعجب مني القور والأكمُ.",
      "أعز مكان في الدنى سرج سابحٍ ... وخير جليس في الزمان كتابُ\nوما الدهر إلا من رواة قصائدي ... إذا قلتُ شعراً أصبح الدهر منشداً.",
      "ذو العقل يشقى في النعيم بعقله ... وأخو الجهالة في الشقاوة ينعمُ\nوإذا كانت النفوس كباراً ... تعبت في مرادها الأجسامُ.",
    ],
  },
  {
    id: "ibn-sina",
    title: "القانون في الطب",
    spineTitle: "القانون في الطب",
    author: "ابن سينا (الشيخ الرئيس)",
    category: "الطب والشفاء",
    volume: "٨",
    description: "المرجع الطبي العالمي الخالد في تشريح البدن وحفظ الصحة وتدبير العلل.",
    pages: [
      "الطب علم يُتعرف منه أحوال بدن الإنسان من جهة ما يصح ويزول عن الصحة، لحفظ الصحة واسترداد العافية.",
      "وأسباب الصحة والمرض تدور على الهواء، والماكول والمشروب، والعمل والراحة، والنوم وتوازن حركات النفس.",
      "واعلم أن الغم والهم يورثان علل البدن، كما أن صفاء الروح واعتدال العيش ينعشان القوة ويدفعان السقم.",
      "والحكيم الحاذق من رعى قوانين الطبيعة، واكتفى بالغذاء والراحة والتدبير اللطيف ما أمكنه ذلك.",
    ],
  },
  {
    id: "al-manadhir",
    title: "كتاب المناظر",
    spineTitle: "كتاب المناظر",
    author: "الحسن بن الهيثم",
    category: "البصريات والفيزياء",
    volume: "٩",
    description: "ثورة المنهج العلمي التجريبي في دراسة الضوء والعدسات وانعكاسات البصر.",
    pages: [
      "إن الشكوك هي طريق اليقين، والباحث عن الحق ليس هو من يقلد السابقين، بل من يتهم ظنه فيهم ويتفحص براهينهم.",
      "وقد برهنا بالتجربة أن الإبصار يتم بورود أشعة الضوء من الأجسام المضيئة أو المنعكسة إلى العين لا العكس.",
      "واختبرنا مسار الأشعة في الخطوط المستقيمة عبر الثقوب والبيوت المظلمة، فشاهدنا انطباع الصور الهندسية بدقة.",
      "فالواجب على ناظر العلوم أن يجعل التجربة والبرهان الرياضي حَكمه الأول ومرشده في كل مسألة.",
    ],
  },
  {
    id: "al-jabr",
    title: "كتاب الجبر والمقابلة",
    spineTitle: "الجبر والمقابلة",
    author: "محمد بن موسى الخوارزمي",
    category: "الرياضيات والحساب",
    volume: "١٠",
    description: "الكتاب المؤسس لعلم الجبر في العالم، مقدماً حل المعادلات والحسابات الهندسية.",
    pages: [
      "ألفتُ من كتاب الجبر والمقابلة كتاباً مختصراً، حاصراً للطيف الحساب وجليله، لما يلزم الناس من الحاجة إليه.",
      "ووجدت الأعداد التي يحتاج إليها في حساب الجبر ثلاثة أضرب: جذور، وأموال، وعدد مفرد لا ينسب إليها.",
      "فالجذر كل شيء مضروب في نفسه، والمال ما اجتمع من ضرب الجذر في نفسه، والعدد هو المفرد المجرد.",
      "وقد جعلنا لكل مسألة برهاناً بالأشكال الهندسية، ليقف المتأمل على علل الحساب ويسهل عليه استخراج المجهول.",
    ],
  },
  {
    id: "hayy-ibn-yaqdhan",
    title: "حي بن يقظان",
    spineTitle: "حي بن يقظان",
    author: "ابن طفيل الأندلسي",
    category: "الفلسفة والتأمل",
    volume: "١١",
    description: "رحلة فكرية كلاسيكية عن الإنسان والطبيعة والبحث عن الحقيقة بالتجربة والتأمل.",
    pages: [
      "ذكر سلفنا الصالح أن حي بن يقظان نشأ في جزيرة منفردة، فتأمل العالم من حوله بعين الباحث المتأمل.",
      "وكان يطلب حقيقة الأشياء بالنظر والتجربة، حتى صار لكل سؤال عنده طريق من التأمل والمعرفة الصافية.",
      "وتدرج في معرفة عناصر الطبيعة ونظام الكون، حتى أدرك وحدة الوجود وعظمة الصانع المدبر الحكيم.",
      "فعاش في أنس الحكمة وسكينة الفكر، شاهداً على أن العقل السليم يهتدي إلى النور بفطرته النقية.",
    ],
  },
  {
    id: "al-bukhala",
    title: "كتاب البخلاء",
    spineTitle: "البخلاء للجاحظ",
    author: "عمرو بن بحر الجاحظ",
    category: "الأدب والنوادر",
    volume: "١٢",
    description: "تحفة أدبية ساخرة تصور طبائع الناس ونوادرهم الاجتماعية بأسلوب لغوي ساحر.",
    pages: [
      "ينبغي لمن قرأ كتابنا هذا أن يعلم أنا لم نودعه إلا ظرف الأخبار، ونوادر الكلام، ولطائف حيل التدبير.",
      "قال أبو عثمان: ولقد رأيت من مذاهبهم في حفظ المال ما يستجلب الضحك ويشحذ الفطنة والذكاء في آن.",
      "وكان أحدهم يقول: الدرهم درع المروءة، وحصن الأيام، وذخر المغارم، فلا تضيع منه شيئاً فتكون من النادمين.",
      "وليس إعجابنا بحيلهم بأعظم من إعجابنا بفصاحة ألسنتهم وحسن دفاعهم عن مذاهبهم بالحجج الطريفة المبتكرة.",
    ],
  },
  {
    id: "maqamat-al-hariri",
    title: "مقامات الحريري",
    spineTitle: "مقامات الحريري",
    author: "القاسم بن علي الحريري",
    category: "البلاغة والبيان",
    volume: "١٣",
    description: "قمة الفصاحة والبلاغة العربية في سرد مغامرات أبي زيد السروجي اللغوية والقصصية.",
    pages: [
      "حدث الحارث بن همام قال: ألممتُ بصنعاء اليمن، وجرابي نفاض، فطفقت أجوب شوارعها كالهائم المستطلع.",
      "فإذا أنا برجل عذب المنطق، ساحر البيان، قد انثال الناس عليه كالفراش المتهافت على المصباح المنير.",
      "فأنشأ ينشد أبياتاً في صروف الدهر، تلعب بالألباب وتفيض حكمة وفصاحة لا عهد للمتقدمين بمثلها.",
      "فعلمت أنه أبو زيد السروجي، صاحب النوادر والفرائد التي لا تنقضي عجائبها على مر العصور.",
    ],
  },
  {
    id: "suwar-al-kawakib",
    title: "صور الكواكب الثابتة",
    spineTitle: "صور الكواكب",
    author: "عبد الرحمن الصوفي",
    category: "الفلك والنجوم",
    volume: "١٤",
    description: "الأطلس الفلكي المصور البديع لرصد نجوم السماء والأبراج السماوية بدقة متناهية.",
    pages: [
      "ذكرنا في هذا الكتاب مواضع الكواكب الثابتة في السماء، وأقدارها وألوانها وصورها على ما حققناه بالرصد والعيان.",
      "وقد رسمنا لكل كوكبة صورتين: إحداهما كما تُرى في القبة السماوية، والأخرى كما تُرى على الكرة المصنوعة.",
      "وتتبعنا منازل القمر وأسماء النجوم عند العرب، فبيّنا مواقع الثريا وسهيل والشعرى والعيوق في مساراتها.",
      "فسبحان من زين السماء بالنجوم الزاهرة، وجعلها معالم يهتدي بها السائرون في ظلمات البر والبحر.",
    ],
  },
  {
    id: "ikhwan-al-safa",
    title: "رسائل إخوان الصفا",
    spineTitle: "إخوان الصفا",
    author: "جماعة إخوان الصفا",
    category: "الموسوعات الفلسفية",
    volume: "١٥",
    description: "موسوعة العلوم الطبيعية والرياضية والفلسفية الشاملة التي تبحث في انسجام الكون.",
    pages: [
      "اعلم يا أخي أن أول درجات الحكمة رياضة الفكر بالعلوم الرياضية، فإن الحساب مدخل إلى الهندسة والنظام.",
      "ومن الهندسة يرتقي العقل إلى علم الفلك والموسيقى، فيدرك التناغم البديع المبثوث في أرجاء الوجود.",
      "وقد جعلنا رسائلنا سبيلاً لتنوير النفوس، لترتفع من تدبر المحسوسات إلى استيعاب المعاني الروحية السامية.",
      "فإن غاية المعرفة هي إشاعة المحبة والتضامن، ونشر الفضيلة والعدل والارتقاء بالإنسان إلى كماله المنشود.",
    ],
  },
  {
    id: "tawq-al-anwar",
    title: "أصوات الرفوف وسكينة المكان",
    spineTitle: "أصوات الرفوف",
    author: "أرشيف قاعة الدراسة",
    category: "التأمل والسكينة",
    volume: "١٦",
    description: "تأملات هادئة بين خشب الرفوف ونور المصابيح في خبايا المعرفة وأسرار القراءة الهادئة.",
    pages: [
      "في هذا الركن الدافئ من المكتبة، حيث يتسلل الضوء النحاسي بهدوء، تتنفس الكتب عبق القرون وتنتظر من يصغي.",
      "ليس الكتاب مجرد صفحات مصفوفة، بل هو نبض عقول عبرت الزمان، يربط بين قلم خَطَّ في قرطبة وقارئ في قاعتنا اليوم.",
      "كل رف في هذه القاعة يحمل قبساً من الحكمة الإنسانية، وكل لحظة تأمل توقظ فكرة جديدة في سكون الروح.",
      "اقرأ بتمهل ودع المكان يروي حكايته؛ فإن أعظم كنز يظفر به الباحث هو صفاء القلب ونور المعرفة المتجدد.",
    ],
  },
];

function material(scene: Scene, name: string, color: Color3, textureUrl?: string) {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.ambientColor = color.scale(0.38);
  mat.emissiveColor = color.scale(0.045);
  mat.specularColor = new Color3(0.12, 0.09, 0.06);
  if (textureUrl && !textureUrl.startsWith("/manus-storage")) {
    try {
      const texture = new Texture(textureUrl, scene);
      texture.uScale = 2;
      texture.vScale = 2;
      mat.diffuseTexture = texture;
      mat.bumpTexture = texture;
      mat.bumpTexture.level = 0.22;
    } catch {
      // Fall back gracefully to procedural color
    }
  }
  return mat;
}

function box(scene: Scene, name: string, size: { width: number; height: number; depth: number }, position: Vector3, mat: StandardMaterial, collidable = true) {
  const mesh = MeshBuilder.CreateBox(name, size, scene);
  mesh.position = position;
  mesh.material = mat;
  mesh.checkCollisions = collidable;
  mesh.receiveShadows = true;
  return mesh;
}

type FirstPersonHands = {
  root: TransformNode;
  left: TransformNode;
  right: TransformNode;
  dispose: () => void;
};

function createFirstPersonHands(scene: Scene, camera: UniversalCamera): FirstPersonHands {
  const root = new TransformNode("first-person-hands", scene);
  root.parent = camera;

  // Realistic human skin tone with warm undertones and soft natural specular
  const skin = material(scene, "realistic-hand-skin", new Color3(0.80, 0.62, 0.50));
  skin.specularColor = new Color3(0.18, 0.14, 0.12);
  skin.ambientColor = new Color3(0.46, 0.28, 0.22);

  // Keratin fingernails
  const nailMat = material(scene, "realistic-nail-mat", new Color3(0.92, 0.78, 0.70));
  nailMat.specularColor = new Color3(0.45, 0.40, 0.36);

  // Scholar's midnight robe with gold embroidery cuff
  const sleeve = material(scene, "scholar-sleeve-cloth", new Color3(0.11, 0.13, 0.19));
  const goldCuff = material(scene, "scholar-cuff-gold", new Color3(0.85, 0.68, 0.32));

  const handParts: Mesh[] = [];

  const createHand = (side: -1 | 1, label: string) => {
    const hand = new TransformNode(`hand-${label}`, scene);
    hand.parent = root;
    hand.position = new Vector3(side * 0.38, -0.34, 0.88);
    hand.scaling = new Vector3(0.66, 0.66, 0.66);
    hand.rotation = new Vector3(-0.16, side * 0.09, side * 0.13);

    // 1. Forearm in scholarly cloth sleeve
    const arm = MeshBuilder.CreateCylinder(`hand-${label}-arm`, { height: 0.32, diameterTop: 0.12, diameterBottom: 0.16, tessellation: 16 }, scene);
    arm.parent = hand;
    arm.position = new Vector3(0, -0.19, -0.06);
    arm.rotation.x = 0.22;
    arm.material = sleeve;
    arm.isPickable = false;
    arm.receiveShadows = false;
    handParts.push(arm);

    // 2. Gold embroidered cuff ring
    const cuffRing = MeshBuilder.CreateTorus(`hand-${label}-cuff-gold`, { diameter: 0.13, thickness: 0.016, tessellation: 24 }, scene);
    cuffRing.parent = hand;
    cuffRing.position = new Vector3(0, -0.065, -0.02);
    cuffRing.rotation.x = 0.22;
    cuffRing.material = goldCuff;
    cuffRing.isPickable = false;
    cuffRing.receiveShadows = false;
    handParts.push(cuffRing);

    // 3. Anatomical Wrist
    const wrist = MeshBuilder.CreateBox(`hand-${label}-wrist-base`, { width: 0.088, height: 0.055, depth: 0.046 }, scene);
    wrist.parent = hand;
    wrist.position = new Vector3(0, -0.035, 0);
    wrist.material = skin;
    wrist.isPickable = false;
    wrist.receiveShadows = false;
    handParts.push(wrist);

    // 4. Palm - Sculpted main body
    const palm = MeshBuilder.CreateBox(`hand-${label}-palm-body`, { width: 0.108, height: 0.118, depth: 0.044 }, scene);
    palm.parent = hand;
    palm.position = new Vector3(0, 0.046, 0.005);
    palm.material = skin;
    palm.isPickable = false;
    palm.receiveShadows = false;
    handParts.push(palm);

    // Thenar eminence (thumb base muscle mound)
    const thenar = MeshBuilder.CreateSphere(`hand-${label}-thenar`, { segments: 10, diameter: 1 }, scene);
    thenar.parent = hand;
    thenar.scaling = new Vector3(0.048, 0.068, 0.042);
    thenar.position = new Vector3(side * 0.038, 0.025, 0.016);
    thenar.material = skin;
    thenar.isPickable = false;
    thenar.receiveShadows = false;
    handParts.push(thenar);

    // Hypothenar mound (pinky side)
    const hypothenar = MeshBuilder.CreateSphere(`hand-${label}-hypothenar`, { segments: 8, diameter: 1 }, scene);
    hypothenar.parent = hand;
    hypothenar.scaling = new Vector3(0.034, 0.062, 0.038);
    hypothenar.position = new Vector3(-side * 0.040, 0.028, 0.012);
    hypothenar.material = skin;
    hypothenar.isPickable = false;
    hypothenar.receiveShadows = false;
    handParts.push(hypothenar);

    // 5. Articulated 4 Fingers (Index, Middle, Ring, Pinky) with natural resting curvature
    const fingerSpecs = [
      { name: "index", posX: side * 0.034, length1: 0.044, length2: 0.032, length3: 0.024, thickness: 0.021, curl: 0.28 },
      { name: "middle", posX: side * 0.011, length1: 0.048, length2: 0.036, length3: 0.026, thickness: 0.022, curl: 0.24 },
      { name: "ring", posX: -side * 0.012, length1: 0.044, length2: 0.032, length3: 0.024, thickness: 0.020, curl: 0.32 },
      { name: "pinky", posX: -side * 0.034, length1: 0.036, length2: 0.026, length3: 0.020, thickness: 0.018, curl: 0.38 },
    ];

    fingerSpecs.forEach((f) => {
      // Knuckle (Metacarpophalangeal joint)
      const knuckle = MeshBuilder.CreateSphere(`hand-${label}-knuckle-${f.name}`, { segments: 8, diameter: f.thickness * 1.15 }, scene);
      knuckle.parent = hand;
      knuckle.position = new Vector3(f.posX, 0.106, 0.006);
      knuckle.material = skin;
      knuckle.isPickable = false;
      handParts.push(knuckle);

      // Phalanx 1 (Proximal)
      const p1 = MeshBuilder.CreateCylinder(`hand-${label}-${f.name}-p1`, { height: f.length1, diameter: f.thickness, tessellation: 10 }, scene);
      p1.parent = hand;
      p1.position = new Vector3(f.posX, 0.106 + f.length1 * 0.48, 0.008 + f.curl * 0.012);
      p1.rotation.x = f.curl * 0.55;
      p1.material = skin;
      p1.isPickable = false;
      handParts.push(p1);

      // Joint 1
      const joint1 = MeshBuilder.CreateSphere(`hand-${label}-${f.name}-j1`, { segments: 8, diameter: f.thickness * 1.05 }, scene);
      joint1.parent = hand;
      joint1.position = new Vector3(f.posX, 0.106 + f.length1 * 0.94, 0.016 + f.curl * 0.025);
      joint1.material = skin;
      joint1.isPickable = false;
      handParts.push(joint1);

      // Phalanx 2 (Intermediate)
      const p2 = MeshBuilder.CreateCylinder(`hand-${label}-${f.name}-p2`, { height: f.length2, diameter: f.thickness * 0.92, tessellation: 10 }, scene);
      p2.parent = hand;
      p2.position = new Vector3(f.posX, 0.106 + f.length1 * 0.94 + f.length2 * 0.46, 0.028 + f.curl * 0.052);
      p2.rotation.x = f.curl * 1.15;
      p2.material = skin;
      p2.isPickable = false;
      handParts.push(p2);

      // Joint 2
      const joint2 = MeshBuilder.CreateSphere(`hand-${label}-${f.name}-j2`, { segments: 8, diameter: f.thickness * 0.95 }, scene);
      joint2.parent = hand;
      joint2.position = new Vector3(f.posX, 0.106 + f.length1 * 0.94 + f.length2 * 0.92, 0.042 + f.curl * 0.082);
      joint2.material = skin;
      joint2.isPickable = false;
      handParts.push(joint2);

      // Phalanx 3 (Distal fingertip)
      const p3 = MeshBuilder.CreateCylinder(`hand-${label}-${f.name}-p3`, { height: f.length3, diameterTop: f.thickness * 0.65, diameterBottom: f.thickness * 0.88, tessellation: 10 }, scene);
      p3.parent = hand;
      p3.position = new Vector3(f.posX, 0.106 + f.length1 * 0.94 + f.length2 * 0.92 + f.length3 * 0.44, 0.056 + f.curl * 0.115);
      p3.rotation.x = f.curl * 1.65;
      p3.material = skin;
      p3.isPickable = false;
      handParts.push(p3);

      // Fingernail
      const nail = MeshBuilder.CreateBox(`hand-${label}-${f.name}-nail`, { width: f.thickness * 0.62, height: f.length3 * 0.48, depth: 0.004 }, scene);
      nail.parent = hand;
      nail.position = new Vector3(f.posX, 0.106 + f.length1 * 0.94 + f.length2 * 0.92 + f.length3 * 0.48, 0.056 + f.curl * 0.115 - f.thickness * 0.38);
      nail.rotation.x = f.curl * 1.65;
      nail.material = nailMat;
      nail.isPickable = false;
      handParts.push(nail);
    });

    // 6. Realistic Thumb (Opposed, 2 articulated phalanges + nail)
    const thumbKnuckle = MeshBuilder.CreateSphere(`hand-${label}-thumb-knuckle`, { segments: 8, diameter: 0.034 }, scene);
    thumbKnuckle.parent = hand;
    thumbKnuckle.position = new Vector3(side * 0.054, 0.036, 0.022);
    thumbKnuckle.material = skin;
    thumbKnuckle.isPickable = false;
    handParts.push(thumbKnuckle);

    const thumbP1 = MeshBuilder.CreateCylinder(`hand-${label}-thumb-p1`, { height: 0.046, diameter: 0.027, tessellation: 10 }, scene);
    thumbP1.parent = hand;
    thumbP1.position = new Vector3(side * 0.076, 0.058, 0.032);
    thumbP1.rotation = new Vector3(0.24, -side * 0.32, -side * 0.58);
    thumbP1.material = skin;
    thumbP1.isPickable = false;
    handParts.push(thumbP1);

    const thumbP2 = MeshBuilder.CreateCylinder(`hand-${label}-thumb-p2`, { height: 0.038, diameterTop: 0.021, diameterBottom: 0.026, tessellation: 10 }, scene);
    thumbP2.parent = hand;
    thumbP2.position = new Vector3(side * 0.098, 0.078, 0.044);
    thumbP2.rotation = new Vector3(0.42, -side * 0.48, -side * 0.72);
    thumbP2.material = skin;
    thumbP2.isPickable = false;
    handParts.push(thumbP2);

    // Thumb nail
    const thumbNail = MeshBuilder.CreateBox(`hand-${label}-thumb-nail`, { width: 0.018, height: 0.019, depth: 0.004 }, scene);
    thumbNail.parent = hand;
    thumbNail.position = new Vector3(side * 0.096, 0.082, 0.035);
    thumbNail.rotation = new Vector3(0.42, -side * 0.48, -side * 0.72);
    thumbNail.material = nailMat;
    thumbNail.isPickable = false;
    handParts.push(thumbNail);

    return hand;
  };

  const left = createHand(-1, "left");
  const right = createHand(1, "right");
  return {
    root,
    left,
    right,
    dispose: () => {
      handParts.forEach((part) => part.dispose(false, true));
      skin.dispose();
      nailMat.dispose();
      sleeve.dispose();
      goldCuff.dispose();
      root.dispose(false, true);
    },
  };
}

function createTitleMaterial(scene: Scene, book: BookInfo, cache: Map<string, StandardMaterial>) {
  const existing = cache.get(book.id);
  if (existing) return existing;
  const texture = new DynamicTexture(`book-title-${book.id}`, { width: 256, height: 512 }, scene, true);
  texture.hasAlpha = true;
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  context.clearRect(0, 0, 256, 512);
  context.fillStyle = "#29140d";
  context.fillRect(8, 8, 240, 496);
  context.strokeStyle = "#e4b96f";
  context.lineWidth = 8;
  context.strokeRect(12, 12, 232, 488);
  context.fillStyle = "#0b0b0a";
  context.fillRect(12, 12, 232, 62);
  context.fillRect(12, 438, 232, 62);
  context.strokeStyle = "#d3a34e";
  context.lineWidth = 5;
  context.strokeRect(22, 22, 212, 42);
  context.strokeRect(22, 448, 212, 42);
  context.fillStyle = "#d9aa55";
  context.font = "bold 28px Georgia";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("۞  ۞  ۞", 128, 43);
  context.fillText("۞  ۞  ۞", 128, 469);
  context.save();
  context.translate(128, 255);
  context.rotate(-Math.PI / 2);
  context.direction = "rtl";
  context.fillStyle = "#f4d486";
  const fontSize = book.spineTitle.length > 15 ? 20 : book.spineTitle.length > 10 ? 25 : 29;
  context.font = `bold ${fontSize}px "Noto Sans Arabic", Georgia, serif`;
  context.fillText(book.spineTitle, 0, -4);
  context.restore();
  context.fillStyle = "#f1cc72";
  context.font = "bold 22px Georgia";
  context.fillText(`الجزء ${book.volume}`, 128, 405);
  context.fillStyle = "#1a0d08";
  context.fillRect(62, 365, 132, 48);
  context.strokeStyle = "#d8aa58";
  context.lineWidth = 4;
  context.strokeRect(62, 365, 132, 48);
  context.fillStyle = "#f4d486";
  context.font = "bold 25px Georgia";
  context.fillText(book.volume, 128, 389);
  texture.update();
  const titleMaterial = new StandardMaterial(`book-title-mat-${book.id}`, scene);
  titleMaterial.diffuseTexture = texture;
  titleMaterial.emissiveColor = new Color3(0.42, 0.24, 0.08);
  titleMaterial.specularColor = new Color3(0.05, 0.03, 0.02);
  titleMaterial.backFaceCulling = false;
  titleMaterial.useAlphaFromDiffuseTexture = true;
  cache.set(book.id, titleMaterial);
  return titleMaterial;
}

function addShelf(scene: Scene, shelfIndex: number, x: number, z: number, rotationY: number, wood: StandardMaterial, olive: StandardMaterial, brass: StandardMaterial, shadow: ShadowGenerator, titleMaterials: Map<string, StandardMaterial>) {
  const root = new Mesh("shelf-root", scene);
  root.position = new Vector3(x, 0, z);
  root.rotation.y = rotationY;
  const parts = [
    box(scene, "shelf-back", { width: 4.45, height: 4.7, depth: 0.10 }, new Vector3(0, 2.35, -0.56), wood, false),
    box(scene, "shelf-side", { width: 0.25, height: 4.7, depth: 1.2 }, new Vector3(-2.1, 2.35, 0), wood),
    box(scene, "shelf-side", { width: 0.25, height: 4.7, depth: 1.2 }, new Vector3(2.1, 2.35, 0), wood),
    box(scene, "shelf-top", { width: 4.45, height: 0.24, depth: 1.2 }, new Vector3(0, 4.62, 0), wood),
    ...[0.55, 1.55, 2.55, 3.55].map((y) => box(scene, "shelf-board", { width: 4.35, height: 0.16, depth: 1.12 }, new Vector3(0, y, 0), wood)),
    box(scene, "shelf-marker", { width: 0.7, height: 0.28, depth: 0.05 }, new Vector3(0, 4.25, -0.62), olive, false),
  ];
  // One simple collision volume avoids snagging on individual boards while keeping the shelf bank solid.
  const shelfCollider = box(scene, "shelf-collider", { width: 4.58, height: 4.72, depth: 1.28 }, new Vector3(0, 2.35, 0), wood);
  shelfCollider.parent = root;
  shelfCollider.isVisible = false;
  shelfCollider.isPickable = false;
  shelfCollider.receiveShadows = false;
  parts.forEach((part) => { part.parent = root; part.checkCollisions = false; shadow.addShadowCaster(part); });
      const bookColors = [
        new Color3(0.34, 0.075, 0.045), // Deep Burgundy
        new Color3(0.24, 0.075, 0.035), // Dark Mahogany
        new Color3(0.32, 0.11, 0.055),  // Warm Moroccan Leather
        new Color3(0.075, 0.17, 0.12),  // Forest Olive Green
        new Color3(0.28, 0.055, 0.075), // Dark Wine
        new Color3(0.08, 0.14, 0.24),   // Andalusian Royal Blue
        new Color3(0.20, 0.16, 0.08),   // Antique Gilded Ochre
        new Color3(0.12, 0.12, 0.13),   // Classic Dark Ebony Leather
      ];
      [0.72, 1.72, 2.72, 3.72].forEach((y, row) => {
        // Brass bookends on both ends of each shelf board
        const bookendLeft = box(scene, `bookend-l-${shelfIndex}-${row}`, { width: 0.05, height: 0.38, depth: 0.44 }, new Vector3(-2.04, y - 0.17 + 0.22, -0.04), brass, false);
        bookendLeft.parent = root;
        const bookendRight = box(scene, `bookend-r-${shelfIndex}-${row}`, { width: 0.05, height: 0.38, depth: 0.44 }, new Vector3(2.04, y - 0.17 + 0.22, -0.04), brass, false);
        bookendRight.parent = root;

        for (let i = 0; i < 18; i += 1) {
          const format = BOOK_FORMATS[(shelfIndex + row + i) % BOOK_FORMATS.length];
          const bookWidth = format.width;
          const bookHeight = format.height;
          const bookDepth = format.depth;
          const bookLean = (i === 0 || i === 17) ? 0 : (((i * 7) % 7) - 3) * 0.012;
          const bookIndex = (shelfIndex * 18 + row * 7 + i) % BOOK_CATALOG.length;
          const bookInfo = BOOK_CATALOG[bookIndex];
          const leatherColor = bookColors[(i + row * 2 + shelfIndex) % bookColors.length];
          const bookMaterial = material(scene, `book-mat-${shelfIndex}-${row}-${i}`, leatherColor);
          const leatherMaterial = material(scene, `book-leather-${shelfIndex}-${row}-${i}`, leatherColor);
          leatherMaterial.specularColor = new Color3(0.22, 0.17, 0.12);
          // Place the book directly on the board below this row, with only a tiny clearance.
          const shelfTopY = y - 0.17 + 0.08;
          const bookPosition = new Vector3(-1.95 + i * 0.23, shelfTopY + bookHeight * 0.5 + 0.008, -0.04);
          const book = box(scene, `book-${shelfIndex}-${row}-${i}`, { width: bookWidth, height: bookHeight, depth: bookDepth }, bookPosition, bookMaterial, false);
          book.parent = root;
          const roundedSpine = MeshBuilder.CreateCylinder(`book-rounded-spine-${shelfIndex}-${row}-${i}`, { diameter: Math.min(bookDepth * 0.9, 0.28), height: bookHeight * 0.94, tessellation: 10 }, scene);
          roundedSpine.position = new Vector3(bookPosition.x - bookWidth * 0.46, bookPosition.y, bookPosition.z);
          roundedSpine.material = leatherMaterial;
          roundedSpine.parent = root;
          roundedSpine.isPickable = false;

          const frontCover = box(scene, `book-front-cover-${shelfIndex}-${row}-${i}`, { width: bookWidth * 1.04, height: bookHeight * 1.02, depth: 0.035 }, new Vector3(bookPosition.x, bookPosition.y, bookPosition.z + bookDepth * 0.5 + 0.014), leatherMaterial, false);
          frontCover.parent = root;
      // Closed books carry a hidden physical reading spread that unfolds in front of the cover.
      const pageRenderers: { left?: (pageIndex: number) => void; right?: (pageIndex: number) => void } = {};
      const makeReadingMaterial = (bookToRead: BookInfo, _initialPageIndex: number, side: "left" | "right") => {
        const pageMaterial = material(scene, `book-reading-pages-${shelfIndex}-${row}-${i}-${side}`, new Color3(0.96, 0.88, 0.70));
        let pageTexture: DynamicTexture | null = null;
        const renderPage = (pageIndex: number) => {
          if (!pageTexture) {
            pageTexture = new DynamicTexture(`book-reading-text-${shelfIndex}-${row}-${i}-${side}`, { width: 512, height: 512 }, scene, true);
            pageMaterial.diffuseTexture = pageTexture;
          }
          const pageContext = pageTexture.getContext() as unknown as CanvasRenderingContext2D;
          pageContext.fillStyle = "#f1dfb3"; pageContext.fillRect(0, 0, 512, 512);
          pageContext.strokeStyle = "#9a6b35"; pageContext.lineWidth = 7; pageContext.strokeRect(16, 16, 480, 480);
          pageContext.direction = "rtl"; pageContext.textAlign = "right"; pageContext.fillStyle = "#3a2014";
          
          const titleFont = bookToRead.title.length > 20 ? "bold 23px" : "bold 27px";
          pageContext.font = `${titleFont} "Noto Sans Arabic", Georgia, serif`;
          pageContext.fillText(bookToRead.title, 462, 58);
          
          pageContext.fillStyle = "#745032";
          pageContext.font = "bold 13px \"Noto Sans Arabic\", Georgia, serif";
          pageContext.fillText(`${bookToRead.author ?? "تراث عربي"} — ${bookToRead.category}`, 462, 86);
          
          pageContext.strokeStyle = "#c49a5a";
          pageContext.lineWidth = 2;
          pageContext.beginPath();
          pageContext.moveTo(52, 102);
          pageContext.lineTo(460, 102);
          pageContext.stroke();
          
          pageContext.fillStyle = "#28150d";
          pageContext.font = "bold 17px \"Noto Sans Arabic\", Georgia, serif";
          
          const pagesList = bookToRead.pages && bookToRead.pages.length > 0
            ? bookToRead.pages
            : (bookToRead.id === "hayy-ibn-yaqdhan" && hayyPages.length ? hayyPages : [bookToRead.description]);
          const pageCount = pagesList.length;
          const text = pagesList[Math.max(0, Math.min(pageIndex, pageCount - 1))] ?? bookToRead.description;
          const lines: string[] = (text.match(/.{1,28}/g) ?? []).slice(0, 8);
          lines.forEach((line: string, lineIndex: number) => pageContext.fillText(line.trim(), 462, 142 + lineIndex * 33));
          
          if (!pagesList.length && bookToRead.id === "hayy-ibn-yaqdhan" && !hayyPages.length) {
            pageContext.fillStyle = "#8e6b43";
            pageContext.font = "500 12px \"Noto Sans Arabic\", Georgia, serif";
            pageContext.fillText("يجري تجهيز بقية صفحات الكتاب…", 462, 404);
            pageContext.fillStyle = "#28150d";
          }
          
          pageContext.strokeStyle = "#c49a5a";
          pageContext.lineWidth = 2;
          pageContext.beginPath();
          pageContext.moveTo(52, 420);
          pageContext.lineTo(460, 420);
          pageContext.stroke();
          
          pageContext.textAlign = "center";
          pageContext.font = "bold 23px serif";
          pageContext.fillText(toArabicPageNumber(pageIndex + 1), 256, 466);
          
          pageTexture.uScale = -1;
          pageTexture.uOffset = 1;
          pageTexture.update();
        };
        pageRenderers[side] = renderPage;
        return pageMaterial;
      };
      const leftReadingMaterial = makeReadingMaterial(bookInfo, 0, "left");
      const rightReadingMaterial = makeReadingMaterial(bookInfo, 1, "right");
      // The reading spread uses square pages, like a compact illuminated manuscript.
      const openPageSize = Math.max(bookHeight * 1.02, 0.48);
      const openPageWidth = openPageSize;
      const openPageHeight = openPageSize;
      const openLeftPage = MeshBuilder.CreatePlane(`book-open-left-${shelfIndex}-${row}-${i}`, { width: openPageWidth, height: openPageHeight, sideOrientation: Mesh.DOUBLESIDE }, scene);
      openLeftPage.position = new Vector3(bookPosition.x, bookPosition.y, bookPosition.z + bookDepth * 0.5 + 0.12); openLeftPage.material = leftReadingMaterial;
      const openRightPage = MeshBuilder.CreatePlane(`book-open-right-${shelfIndex}-${row}-${i}`, { width: openPageWidth, height: openPageHeight, sideOrientation: Mesh.DOUBLESIDE }, scene);
      openRightPage.position = new Vector3(bookPosition.x, bookPosition.y, bookPosition.z + bookDepth * 0.5 + 0.125); openRightPage.material = rightReadingMaterial;
      const turningPage = MeshBuilder.CreatePlane(`book-turning-page-${shelfIndex}-${row}-${i}`, { width: openPageWidth, height: openPageHeight, sideOrientation: Mesh.DOUBLESIDE }, scene);
      turningPage.position = new Vector3(bookPosition.x, bookPosition.y, bookPosition.z + bookDepth * 0.5 + 0.14); turningPage.material = rightReadingMaterial;
      [openLeftPage, openRightPage, turningPage].forEach((page) => { page.parent = root; page.isVisible = false; page.isPickable = false; });
      const titlePlate = MeshBuilder.CreatePlane(`book-title-${row}-${i}`, { width: Math.max(bookWidth * 0.9, 0.20), height: bookHeight * 0.86, sideOrientation: Mesh.DOUBLESIDE }, scene);
      titlePlate.position = new Vector3(bookPosition.x, bookPosition.y, bookPosition.z + bookDepth * 0.5 + 0.046);
      titlePlate.material = createTitleMaterial(scene, bookInfo, titleMaterials);
      titlePlate.parent = root;
      const bookParts = [book, roundedSpine, frontCover, openLeftPage, openRightPage, turningPage, titlePlate];
      const pageState = { pageIndex: 0, pageCount: bookInfo.pages?.length || (bookInfo.id === "hayy-ibn-yaqdhan" ? FALLBACK_HAYY_PAGE_COUNT : 1), pageRenderers };
      bookParts.forEach((target) => {
        target.rotation.y = bookLean;
        target.metadata = { book: bookInfo, format: format.name, openPageWidth, openPageHeight, bookParts, pageState, bookRestPosition: target.position.clone(), bookRestRotation: target.rotation.clone(), bookRestVisible: target.isVisible, bookPulled: false, bookOpened: false, bookDetail: target !== book && target !== openLeftPage && target !== openRightPage && target !== turningPage, readingPage: target === openLeftPage || target === openRightPage, pageSide: target === openLeftPage ? "left" : target === openRightPage ? "right" : undefined, turningPage: target === turningPage, closedCover: target === frontCover || target === titlePlate };
        // Only the main volume is pickable; decorative binding parts move with it but do not create duplicate hits.
        target.isPickable = target === book || target === openLeftPage || target === openRightPage;
      });
      shadow.addShadowCaster(book);
    }
  });
  const shelfLight = new PointLight("shelf-light", new Vector3(x, 4.4, z), scene);
  shelfLight.parent = root;
  shelfLight.diffuse = COLORS.brass;
  shelfLight.intensity = 0.12;
  shelfLight.range = 5;
  root.metadata = { shelfIndex, shelfPosition: root.position.clone() };
  return root;
}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine);
  let performanceMode: PerformanceMode = (window.matchMedia("(max-width: 720px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4) ? "light" : "cinematic";
  const applyPerformanceMode = (mode: PerformanceMode) => {
    performanceMode = mode;
    engine.setHardwareScalingLevel(mode === "light" ? 1.35 : 1);
    engine.resize();
    camera.fov = mode === "light" ? 0.92 : 0.78;
    scene.skipPointerMovePicking = mode === "light";
    const shadowMap = shadow.getShadowMap();
    if (shadowMap) shadowMap.refreshRate = mode === "light" ? 4 : 1;
    shadow.blurKernel = mode === "light" ? 8 : 24;
  };
  scene.clearColor = new Color4(0.035, 0.028, 0.024, 1);
  scene.collisionsEnabled = true;
  scene.gravity = new Vector3(0, -0.11, 0);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.018;
  scene.fogColor = new Color3(0.07, 0.055, 0.04);

  const camera = new UniversalCamera("player-camera", new Vector3(0, 1.75, 8.6), scene);
  scene.activeCamera = camera;
  camera.minZ = 0.1;
  // Keep desktop framing close to the mobile composition: a tighter, readable vertical view instead of a distant wide room shot.
  camera.fov = 0.78;
  camera.rotation.y = Math.PI;
  camera.attachControl(canvas, true);
  // Mouse-look tuning: keyboard input stays with Babylon, while passive mouse movement turns the view without click or pointer lock.
  camera.inputs.removeByType("FreeCameraMouseInput");
  camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
  // Movement tuning: responsive starts/stops, comfortable walking speed, and easier mouse look in every direction.
  camera.speed = 0.3;
  camera.angularSensibility = 2500;
  camera.inertia = 0.42;
  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new Vector3(0.6, 0.9, 0.6);
  camera.keysUp = [87, 38]; camera.keysDown = [83, 40]; camera.keysLeft = [65, 37]; camera.keysRight = [68, 39];
  let lastMouseX: number | null = null;
  let lastMouseY: number | null = null;
  const touchMove = new Vector3(0, 0, 0);
  const pressedKeys = new Set<string>();
  const onMouseMove = (event: MouseEvent) => {
    const deltaX = event.movementX || (lastMouseX === null ? 0 : event.clientX - lastMouseX);
    const deltaY = event.movementY || (lastMouseY === null ? 0 : event.clientY - lastMouseY);
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    camera.rotation.y += deltaX * 0.0025;
    camera.rotation.x = Math.max(-1.25, Math.min(1.25, camera.rotation.x + deltaY * 0.0025));
  };
  const resetMouseReference = () => { lastMouseX = null; lastMouseY = null; };
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", resetMouseReference);
  let touchLookId: number | null = null;
  let lastTouchX = 0;
  let lastTouchY = 0;
  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchLookId = touch.identifier;
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
  };
  const onTouchMove = (event: TouchEvent) => {
    if (touchLookId === null) return;
    const touch = Array.from(event.touches).find((item) => item.identifier === touchLookId);
    if (!touch) return;
    const deltaX = touch.clientX - lastTouchX;
    const deltaY = touch.clientY - lastTouchY;
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
    camera.rotation.y += deltaX * 0.004;
    camera.rotation.x = Math.max(-1.25, Math.min(1.25, camera.rotation.x + deltaY * 0.004));
    event.preventDefault();
  };
  const onTouchEnd = (event: TouchEvent) => {
    if (!Array.from(event.touches).some((touch) => touch.identifier === touchLookId)) touchLookId = null;
  };
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });
  const hands = createFirstPersonHands(scene, camera);
  let movementAmount = 0;
  let isRunning = false;
  let handMotionPhase = 0;
  let handInteraction = 0;
  let handInteractionTarget = 0;
  const handMotionObserver = scene.onBeforeRenderObservable.add(() => {
    const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const walkBlend = movementAmount;
    handMotionPhase += deltaSeconds * (2.0 + walkBlend * (isRunning ? 11.5 : 8.5));
    handInteraction += (handInteractionTarget - handInteraction) * Math.min(1, deltaSeconds * 8);
    // Subtle living breathing oscillation when idle
    const breathY = Math.sin(handMotionPhase * 0.75) * 0.007;
    const breathX = Math.cos(handMotionPhase * 0.38) * 0.005;
    const bob = Math.abs(Math.sin(handMotionPhase)) * 0.030 * walkBlend * (isRunning ? 1.25 : 1);
    const sway = Math.sin(handMotionPhase * 0.5) * 0.024 * walkBlend * (isRunning ? 1.18 : 1);
    const reach = handInteraction;
    hands.left.position.x = -0.38 - reach * 0.08 + sway + breathX;
    hands.left.position.y = -0.34 + bob + reach * 0.07 + breathY;
    hands.left.position.z = 0.88 + reach * 0.12;
    hands.left.rotation.x = -0.16 - reach * 0.18 + Math.sin(handMotionPhase) * 0.035 * walkBlend;
    hands.left.rotation.y = -0.09 - reach * 0.12;
    hands.left.rotation.z = -0.13 + sway * 0.75;
    hands.right.position.x = 0.38 + reach * 0.12 + sway + breathX;
    hands.right.position.y = -0.34 + bob + reach * 0.11 + breathY;
    hands.right.position.z = 0.88 + reach * 0.22;
    hands.right.rotation.x = -0.16 - reach * 0.32 + Math.sin(handMotionPhase + Math.PI) * 0.035 * walkBlend;
    hands.right.rotation.y = 0.09 + reach * 0.16;
    hands.right.rotation.z = 0.13 + sway * 0.75;
  });
  const movementVelocity = new Vector3(0, 0, 0);
  scene.onBeforeRenderObservable.add(() => {
    let moveX = touchMove.x;
    let moveZ = touchMove.z;
    if (pressedKeys.has("w") || pressedKeys.has("arrowup")) moveZ += 1;
    if (pressedKeys.has("s") || pressedKeys.has("arrowdown")) moveZ -= 1;
    if (pressedKeys.has("a") || pressedKeys.has("arrowleft")) moveX -= 1;
    if (pressedKeys.has("d") || pressedKeys.has("arrowright")) moveX += 1;
    const length = Math.hypot(moveX, moveZ);
    const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const hasMovementInput = length >= 0.001;
    if (length > 1) { moveX /= length; moveZ /= length; }
    const forward = camera.getDirection(Vector3.Forward());
    forward.y = 0;
    if (forward.lengthSquared() > 0.001) forward.normalize();
    const right = camera.getDirection(Vector3.Right());
    right.y = 0;
    if (right.lengthSquared() > 0.001) right.normalize();
    isRunning = hasMovementInput && (pressedKeys.has("shift") || Math.hypot(touchMove.x, touchMove.z) > 0.84);
    const walkSpeed = 2.7;
    const targetSpeed = hasMovementInput ? (isRunning ? 4.15 : walkSpeed) : 0;
    const desiredVelocity = hasMovementInput ? forward.scale(moveZ * targetSpeed).addInPlace(right.scale(moveX * targetSpeed)) : Vector3.Zero();
    const response = Math.min(1, deltaSeconds * (hasMovementInput ? 13 : 17));
    movementVelocity.x += (desiredVelocity.x - movementVelocity.x) * response;
    movementVelocity.z += (desiredVelocity.z - movementVelocity.z) * response;
    movementAmount += (Math.min(1, movementVelocity.length() / walkSpeed) - movementAmount) * Math.min(1, deltaSeconds * 12);
    if (movementVelocity.lengthSquared() > 0.000001) camera.cameraDirection.addInPlace(movementVelocity.scale(deltaSeconds));
    const targetFov = performanceMode === "light" ? (isRunning ? 0.96 : 0.92) : (isRunning ? 0.82 : 0.78);
    camera.fov += (targetFov - camera.fov) * Math.min(1, deltaSeconds * 7);
  });
  // Keep every control scheme inside the playable library floor, including the mobile joystick.
  const roomBounds = { minX: -10.3, maxX: 10.3, minY: 1.15, maxY: 4.7, minZ: -11.9, maxZ: 10.2 };
  scene.onBeforeRenderObservable.add(() => {
    const before = camera.position.clone();
    camera.position.x = Math.max(roomBounds.minX, Math.min(roomBounds.maxX, camera.position.x));
    camera.position.y = Math.max(roomBounds.minY, Math.min(roomBounds.maxY, camera.position.y));
    camera.position.z = Math.max(roomBounds.minZ, Math.min(roomBounds.maxZ, camera.position.z));
    if (camera.position.x !== before.x && Math.sign(camera.cameraDirection.x) === Math.sign(camera.position.x - before.x)) camera.cameraDirection.x = 0;
    if (camera.position.y !== before.y && Math.sign(camera.cameraDirection.y) === Math.sign(camera.position.y - before.y)) camera.cameraDirection.y = 0;
    if (camera.position.z !== before.z && Math.sign(camera.cameraDirection.z) === Math.sign(camera.position.z - before.z)) camera.cameraDirection.z = 0;
  });

  const hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.86; hemi.diffuse = COLORS.ivory; hemi.groundColor = new Color3(0.12, 0.08, 0.05);
  const ceilingLight = new PointLight("ceiling-light", new Vector3(0, 5.4, 1), scene);
  ceilingLight.diffuse = COLORS.brass; ceilingLight.intensity = 3.8; ceilingLight.range = 22;
  const aisleLight = new PointLight("aisle-fill", new Vector3(0, 3.7, -6), scene);
  aisleLight.diffuse = new Color3(1, 0.78, 0.5); aisleLight.intensity = 1.7; aisleLight.range = 15;
  const shadow = new ShadowGenerator(1024, ceilingLight);
  shadow.useBlurExponentialShadowMap = true; shadow.blurKernel = 24;
  applyPerformanceMode(performanceMode);

  const wood = material(scene, "walnut", COLORS.walnut);
  const woodLight = material(scene, "wood-light", COLORS.walnutLight);
  const floor = material(scene, "floor", new Color3(0.12, 0.065, 0.032));
  const wall = material(scene, "plaster", new Color3(0.42, 0.34, 0.23));
  const ivory = material(scene, "ivory", COLORS.ivory);
  const olive = material(scene, "olive", COLORS.olive);
  const brass = material(scene, "brass", COLORS.brass);
  const titleMaterials = new Map<string, StandardMaterial>();

  box(scene, "floor", { width: 24, height: 0.25, depth: 28 }, new Vector3(0, -0.15, 0), floor);
  box(scene, "back-wall", { width: 24, height: 7, depth: 0.3 }, new Vector3(0, 3.5, -13.5), wall);
  box(scene, "left-wall", { width: 0.3, height: 7, depth: 28 }, new Vector3(-12, 3.5, 0), wall);
  box(scene, "right-wall", { width: 0.3, height: 7, depth: 28 }, new Vector3(12, 3.5, 0), wall);
  box(scene, "ceiling", { width: 24, height: 0.25, depth: 28 }, new Vector3(0, 7, 0), woodLight, false);
  const shelfRoots: Mesh[] = [];
  const addTrackedShelf = (shelfIndex: number, x: number, z: number, rotationY: number) => {
    const root = addShelf(scene, shelfIndex, x, z, rotationY, woodLight, olive, brass, shadow, titleMaterials);
    shelfRoots.push(root);
    return root;
  };
  // Initialize 8 grand bookcases immediately for a dense, majestic historic library
  for (let s = 0; s < 8; s += 1) {
    addTrackedShelf(s, 0, 0, 0);
  }
  const progressiveLoadTimer = 0;
  // Keep the 174 KB literary text out of the initial scene chunk while warming it shortly after the room appears.
  const pagePreloadTimer = window.setTimeout(() => {
    void loadHayyPages().catch(() => undefined);
  }, 900);
  let lastDetailUpdate = 0;
  scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    const updateInterval = performanceMode === "light" ? 180 : 90;
    if (now - lastDetailUpdate < updateInterval) return;
    lastDetailUpdate = now;
    const detailRadius = 150.0;
    const detailRadiusSquared = detailRadius * detailRadius;
    shelfRoots.forEach((root) => {
      const nearby = Vector3.DistanceSquared(root.getAbsolutePosition(), camera.globalPosition) <= detailRadiusSquared;
      root.getChildMeshes().forEach((part) => {
        if (!part.metadata?.bookDetail) return;
        part.isVisible = nearby || Boolean(part.metadata.bookPulled || part.metadata.bookOpened);
      });
    });
  });

  const table = box(scene, "reading-table", { width: 4.8, height: 0.26, depth: 2.2 }, new Vector3(0, 2, 0), woodLight, false);
  shadow.addShadowCaster(table);
  [-1.8, 1.8].forEach((x) => [-0.72, 0.72].forEach((z) => box(scene, "table-leg", { width: 0.22, height: 2, depth: 0.22 }, new Vector3(x, 1, z), woodLight, false)));
  const tableCollider = box(scene, "reading-table-collider", { width: 4.95, height: 2.05, depth: 2.35 }, new Vector3(0, 1.02, 0), woodLight);
  tableCollider.isVisible = false;
  tableCollider.isPickable = false;
  tableCollider.receiveShadows = false;
  box(scene, "catalog", { width: 1.1, height: 0.13, depth: 0.75 }, new Vector3(0, 2.2, 0), ivory, false);
  const tableLamp = new PointLight("reading-lamp", new Vector3(0, 3.3, 0), scene);
  tableLamp.diffuse = COLORS.brass; tableLamp.intensity = 1.2; tableLamp.range = 6;
  const lampShade = MeshBuilder.CreateCylinder("lamp-shade", { diameterTop: 0.3, diameterBottom: 0.75, height: 0.55 }, scene);
  lampShade.position = new Vector3(0, 3.05, 0); lampShade.material = brass; lampShade.isPickable = false;

  const rug = box(scene, "rug", { width: 8, height: 0.03, depth: 5 }, new Vector3(0, 0.02, 1.2), material(scene, "rug-mat", new Color3(0.18, 0.19, 0.12)), false);
  rug.rotation.y = 0.02;
  const plaque = box(scene, "welcome-plaque", { width: 3.4, height: 1.2, depth: 0.08 }, new Vector3(0, 4.3, -13.28), ivory, false);
  plaque.metadata = { decorative: true };

  let activeBookParts: any[] | null = null;
  let activeBookId: string | null = null;
  let activePullObserver: any = null;
  let activeOpenObserver: any = null;
  let activeTurnObserver: any = null;
  let audioContext: AudioContext | null = null;
  const emitBookState = () => window.dispatchEvent(new CustomEvent("library:book-state", { detail: { active: Boolean(activeBookParts), bookId: activeBookId } }));
  const getAudioContext = () => {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!audioContext) audioContext = new AudioContextConstructor();
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  };
  const playBookSound = (kind: "pull" | "return") => {
    const context = getAudioContext();
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "pull" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(kind === "pull" ? 180 : 300, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "pull" ? 420 : 150, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "pull" ? 0.055 : 0.04, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.24);
  };
  const returnActiveBookToShelf = () => {
    if (activePullObserver) {
      scene.onBeforeRenderObservable.remove(activePullObserver);
      activePullObserver = null;
    }
    if (activeOpenObserver) {
      scene.onBeforeRenderObservable.remove(activeOpenObserver);
      activeOpenObserver = null;
    }
    if (activeTurnObserver) {
      scene.onBeforeRenderObservable.remove(activeTurnObserver);
      activeTurnObserver = null;
    }
    if (!activeBookParts) {
      handInteractionTarget = 0;
      return false;
    }
    handInteractionTarget = 0;
    activeBookParts.forEach((part) => {
      const restPosition = part.metadata?.bookRestPosition;
      const restRotation = part.metadata?.bookRestRotation;
      if (restPosition) part.position = restPosition.clone();
      if (restRotation) part.rotation = restRotation.clone();
      if (typeof part.metadata?.bookRestVisible === "boolean") part.isVisible = part.metadata.bookRestVisible;
      part.metadata = { ...part.metadata, bookPulled: false, bookOpened: false };
    });
    activeBookParts = null;
    activeBookId = null;
    emitBookState();
    return true;
  };
  const openBookSpread = (parts: any[]) => {
    const pages = parts.filter((part) => part.metadata?.readingPage);
    const closedCoverParts = parts.filter((part) => part.metadata?.closedCover);
    const pageState = parts[0]?.metadata?.pageState;
    const currentBook: BookInfo | undefined = parts[0]?.metadata?.book;
    if (pageState && currentBook) {
      const isHayy = currentBook.id === "hayy-ibn-yaqdhan";
      const customPageCount = currentBook.pages?.length ?? 0;
      pageState.pageCount = isHayy ? (hayyPages.length || FALLBACK_HAYY_PAGE_COUNT) : (customPageCount || 1);
      pageState.pageIndex = isHayy ? readSavedPageIndex(pageState.pageCount) : 0;
      pageState.pageRenderers.left?.(pageState.pageIndex);
      pageState.pageRenderers.right?.(pageState.pageIndex + 1);
      if (isHayy) {
        void loadHayyPages().then((loadedPages) => {
          pageState.pageCount = loadedPages.length;
          pageState.pageIndex = clampSpreadPageIndex(pageState.pageIndex, loadedPages.length);
          if (activeBookParts === parts) {
            pageState.pageRenderers.left?.(pageState.pageIndex);
            pageState.pageRenderers.right?.(pageState.pageIndex + 1);
          }
        }).catch(() => undefined);
      }
    }
    if (!pages.length) return;
    const center = parts[0].position.clone().add(new Vector3(0, 0, 0.12));
    const width = Number(parts[0].metadata?.openPageWidth ?? (parts[0].metadata?.format === "Pocket" ? 0.22 : 0.25));
    const pageTargets = [center.add(new Vector3(-width * 0.58, 0, 0.02)), center.add(new Vector3(width * 0.58, 0, 0.025))];
    const pageStarts = pages.map((page) => page.position.clone());
    const startedAt = performance.now();
    closedCoverParts.forEach((part) => { part.isVisible = false; });
    pages.forEach((page) => { page.isVisible = true; page.metadata = { ...page.metadata, bookOpened: true }; });
    activeOpenObserver = scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min((performance.now() - startedAt) / 420, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      pages.forEach((page, index) => { page.position = Vector3.Lerp(pageStarts[index], pageTargets[index], eased); });
      if (progress >= 1 && activeOpenObserver) {
        pages.forEach((page, index) => { page.position = pageTargets[index].clone(); });
        scene.onBeforeRenderObservable.remove(activeOpenObserver);
        activeOpenObserver = null;
        handInteractionTarget = 0.28;
      }
    });
  };

  const turnActivePage = (direction: "rtl" | "ltr") => {
    if (!activeBookParts || activeOpenObserver || activeTurnObserver) return false;
    const turningPage = activeBookParts.find((part) => part.metadata?.turningPage);
    const rightPage = activeBookParts.find((part) => part.metadata?.readingPage && part.name.includes("open-right"));
    const leftPage = activeBookParts.find((part) => part.metadata?.readingPage && part.name.includes("open-left"));
    const pageState = activeBookParts[0]?.metadata?.pageState;
    if (!turningPage || !rightPage || !leftPage || !pageState) return false;
    handInteractionTarget = 0.72;
    const currentBook: BookInfo | undefined = activeBookParts[0]?.metadata?.book;
    const isHayy = currentBook?.id === "hayy-ibn-yaqdhan";
    if (isHayy && !hayyPages.length) {
      void loadHayyPages().then((loadedPages) => {
        if (activeBookParts?.[0]?.metadata?.pageState === pageState) {
          pageState.pageCount = loadedPages.length;
          pageState.pageRenderers.left?.(pageState.pageIndex);
          pageState.pageRenderers.right?.(pageState.pageIndex + 1);
          turnActivePage(direction);
        }
      }).catch(() => undefined);
      return true;
    }
    const pageCount = pageState.pageCount || (isHayy ? (hayyPages.length || FALLBACK_HAYY_PAGE_COUNT) : (currentBook?.pages?.length ?? 1));
    const nextPageIndex = direction === "rtl" ? pageState.pageIndex + 2 : pageState.pageIndex - 2;
    if (nextPageIndex < 0 || nextPageIndex >= pageCount) return false;
    const start = (direction === "rtl" ? rightPage : leftPage).position.clone();
    const end = (direction === "rtl" ? leftPage : rightPage).position.clone();
    const startedAt = performance.now();
    turningPage.position = start.clone();
    turningPage.rotation.y = 0;
    turningPage.isVisible = true;
    activeTurnObserver = scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min((performance.now() - startedAt) / 620, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      turningPage.position = Vector3.Lerp(start, end, eased);
      turningPage.rotation.y = (direction === "rtl" ? -1 : 1) * Math.PI * eased;
      if (progress >= 1 && activeTurnObserver) {
        turningPage.position = end.clone();
        turningPage.rotation.y = 0;
        turningPage.isVisible = false;
        scene.onBeforeRenderObservable.remove(activeTurnObserver);
        activeTurnObserver = null;
        pageState.pageIndex = nextPageIndex;
        savePageIndex(nextPageIndex);
        pageState.pageRenderers.left?.(nextPageIndex);
        pageState.pageRenderers.right?.(nextPageIndex + 1);
        handInteractionTarget = 0.42;
        playBookSound("pull");
      }
    });
    return true;
  };

  const pullBookOut = (parts: any[]) => {
    if (!parts?.length || activeBookParts === parts) return;
    if (returnActiveBookToShelf()) playBookSound("return");
    const startPositions = parts.map((part) => part.position.clone());
    const bookWorldPosition = parts[0].getAbsolutePosition();
    const towardPlayerWorld = camera.globalPosition.subtract(bookWorldPosition);
    towardPlayerWorld.y = 0;
    if (towardPlayerWorld.lengthSquared() < 0.0001) towardPlayerWorld.z = 1;
    towardPlayerWorld.normalize();
    const pullDistance = 1.35;
    const verticalToFace = Math.max(-0.45, Math.min(0.55, camera.globalPosition.y - bookWorldPosition.y - 0.15));
    const pullVectorWorld = towardPlayerWorld.scale(pullDistance);
    pullVectorWorld.y = verticalToFace;
    const root = parts[0].parent;
    const rootInverse = root?.getWorldMatrix().clone().invert();
    const towardPlayerLocal = rootInverse ? Vector3.TransformNormal(pullVectorWorld, rootInverse) : pullVectorWorld;
    const targetPositions = startPositions.map((start) => start.add(towardPlayerLocal));
    const startedAt = performance.now();
    activeBookParts = parts;
    activeBookId = parts.find((part) => part.metadata?.book)?.metadata?.book?.id ?? null;
    handInteractionTarget = 1;
    emitBookState();
    playBookSound("pull");
    parts.forEach((part) => { part.metadata = { ...part.metadata, bookPulled: true }; });
    activePullObserver = scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min((performance.now() - startedAt) / 360, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      parts.forEach((part, index) => {
        part.position = Vector3.Lerp(startPositions[index], targetPositions[index], eased);
      });
      if (progress >= 1 && activePullObserver) {
        // Keep the selected book pulled out after the animation; only explicit return or a new selection resets it.
        parts.forEach((part, index) => {
          part.position = targetPositions[index].clone();
          part.metadata = { ...part.metadata, bookPulled: true };
        });
        scene.onBeforeRenderObservable.remove(activePullObserver);
        activePullObserver = null;
        handInteractionTarget = 0.44;
        openBookSpread(parts);
      }
    });
  };

  const openBook = (mesh: any) => {
    let current = mesh;
    while (current) {
      if (current.metadata?.book && current.metadata?.pageSide && activeBookId === current.metadata.book.id) {
        return turnActivePage(current.metadata.pageSide === "right" ? "rtl" : "ltr");
      }
      if (current.metadata?.book) {
        if (activeBookId === current.metadata.book.id) {
          const returned = returnActiveBookToShelf();
          if (returned) playBookSound("return");
          return returned;
        }
        pullBookOut(current.metadata.bookParts ?? [current]);
        return true;
      }
      current = current.parent;
    }
    return false;
  };
  const isBookMesh = (mesh: any) => {
    let current = mesh;
    while (current) {
      if (current.metadata?.book) return true;
      current = current.parent;
    }
    return false;
  };
  const pickBookAt = (x: number, y: number) => {
    const hits = scene.multiPick(x, y, isBookMesh) ?? [];
    const firstBookHit = hits.find((hit) => hit.hit && hit.pickedMesh);
    if (firstBookHit?.pickedMesh) return firstBookHit.pickedMesh;
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const screenCandidates = scene.meshes.filter((mesh) => /^book-\d+-\d+-\d+$/.test(mesh.name) && mesh.metadata?.book);
    let closest: any = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    screenCandidates.forEach((mesh) => {
      const screen = Vector3.Project(mesh.getAbsolutePosition(), Matrix.Identity(), scene.getTransformMatrix(), viewport);
      const distance = Math.hypot(screen.x - x, screen.y - y);
      if (distance < closestDistance && distance < 92) { closest = mesh; closestDistance = distance; }
    });
    return closest;
  };
  const inspectAt = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = engine.getRenderWidth() / Math.max(rect.width, 1);
    const scaleY = engine.getRenderHeight() / Math.max(rect.height, 1);
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const activeSpread = activeBookParts?.some((part) => part.metadata?.bookOpened && part.metadata?.readingPage);
    if (activeSpread && activeBookParts?.[0]) {
      const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
      const projectedCenter = Vector3.Project(activeBookParts[0].getAbsolutePosition(), Matrix.Identity(), scene.getTransformMatrix(), viewport);
      const spreadRadius = Math.max(150, Number(activeBookParts[0].metadata?.openPageWidth ?? 0.5) * 420);
      if (Math.hypot(projectedCenter.x - x, projectedCenter.y - y) < spreadRadius) {
        return turnActivePage(x >= projectedCenter.x ? "rtl" : "ltr");
      }
    }
    const pickedBook = pickBookAt(x, y);
    if (pickedBook) return openBook(pickedBook);
    return false;
  };
  const onCanvasClick = (event: MouseEvent) => inspectAt(event.clientX, event.clientY);
  canvas.addEventListener("click", onCanvasClick);
  const onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(key)) {
      pressedKeys.add(key);
      event.preventDefault();
      return;
    }
    if (!["e", "E", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const centerBook = pickBookAt(engine.getRenderWidth() / 2, engine.getRenderHeight() / 2);
    if (centerBook && openBook(centerBook)) return;
    openNearestBook();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    pressedKeys.delete(event.key.toLowerCase());
  };
  const onWindowBlur = () => {
    pressedKeys.clear();
    touchMove.set(0, 0, 0);
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onWindowBlur);

  const openNearestBook = () => {
    const candidates = scene.meshes.filter((mesh) => /^book-\d+-\d+-\d+$/.test(mesh.name) && mesh.metadata?.book);
    if (!candidates.length) return false;
    const nearest = candidates.reduce((closest, candidate) => Vector3.DistanceSquared(candidate.getAbsolutePosition(), camera.position) < Vector3.DistanceSquared(closest.getAbsolutePosition(), camera.position) ? candidate : closest);
    return openBook(nearest);
  };
  const openBookById = (bookId: string) => {
    const target = scene.meshes.find((mesh) => /^book-\d+-\d+-\d+$/.test(mesh.name) && mesh.metadata?.book?.id === bookId);
    return openBook(target);
  };
  const openBookByMeshName = (meshName: string) => openBook(scene.getMeshByName(meshName));
  const returnActiveBook = () => {
    const returned = returnActiveBookToShelf();
    if (returned) playBookSound("return");
    return returned;
  };
  const hasActiveBook = () => Boolean(activeBookParts);
  const getBookScreenRects = (): BookScreenRect[] => {
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    return scene.meshes.filter((mesh) => /^book-\d+-\d+-\d+$/.test(mesh.name) && mesh.metadata?.book).map((mesh) => {
      const projected = Vector3.Project(mesh.getAbsolutePosition(), Matrix.Identity(), scene.getTransformMatrix(), viewport);
      const distance = Vector3.Distance(mesh.getAbsolutePosition(), camera.position);
      const scale = Math.min(2.4, Math.max(0.7, 4.2 / Math.max(distance, 1)));
      return { meshName: mesh.name, bookId: mesh.metadata.book.id, title: mesh.metadata.book.title, x: projected.x / engine.getRenderWidth() * canvas.clientWidth, y: projected.y / engine.getRenderHeight() * canvas.clientHeight, width: 28 * scale, height: 58 * scale };
    }).filter((rect) => rect.x > -rect.width && rect.x < canvas.clientWidth + rect.width && rect.y > -rect.height && rect.y < canvas.clientHeight + rect.height);
  };

  const demo = new URLSearchParams(window.location.search).has("demo");
  if (demo) {
    let t = 0;
    let demoBookOpened = false;
    scene.onBeforeRenderObservable.add(() => {
      t += engine.getDeltaTime() / 1000;
      if (!demoBookOpened) {
        camera.position.x = Math.sin(t * 0.16) * 4.2;
        camera.position.z = 7.5 - t * 0.12;
        camera.rotation.y = Math.PI + Math.sin(t * 0.16) * 0.24;
        camera.rotation.x = -0.04;
        if (t >= 0.08) demoBookOpened = openNearestBook();
        return;
      }
      const readingPages = activeBookParts?.filter((part) => part.metadata?.readingPage && part.isVisible) ?? [];
      if (readingPages.length >= 2 && t >= 0.9) {
        const leftPage = readingPages[0].getAbsolutePosition();
        const rightPage = readingPages[1].getAbsolutePosition();
        const readingTarget = Vector3.Center(leftPage, rightPage);
        // Open-page planes face the positive Z side; use that exact face for a readable deterministic demo view.
        const readingDistance = window.matchMedia("(max-width: 720px)").matches ? 2.25 : 1.45;
        const readingPosition = readingTarget.add(new Vector3(0, 0, readingDistance));
        camera.position = Vector3.Lerp(camera.position, readingPosition, Math.min(1, engine.getDeltaTime() / 1000 * 6));
        camera.cameraDirection.copyFromFloats(0, 0, 0);
        camera.setTarget(readingTarget);
      }
    });
  }

  const dispose = () => { window.clearTimeout(progressiveLoadTimer); window.clearTimeout(pagePreloadTimer); scene.onBeforeRenderObservable.remove(handMotionObserver); hands.dispose(); window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onWindowBlur); canvas.removeEventListener("click", onCanvasClick); canvas.removeEventListener("mousemove", onMouseMove); canvas.removeEventListener("mouseleave", resetMouseReference); canvas.removeEventListener("touchstart", onTouchStart); canvas.removeEventListener("touchmove", onTouchMove); canvas.removeEventListener("touchend", onTouchEnd); canvas.removeEventListener("touchcancel", onTouchEnd); scene.onPointerObservable.clear(); scene.dispose(); };
  const setTouchMove = (x: number, y: number) => { touchMove.x = Math.max(-1, Math.min(1, x)); touchMove.z = Math.max(-1, Math.min(1, y)); };
  // Ensure scene readiness without blocking indefinitely if any remote resource is delayed.
  try {
    await Promise.race([
      scene.whenReadyAsync(),
      new Promise((resolve) => window.setTimeout(resolve, 150)),
    ]);
  } catch (err) {
    console.warn("whenReadyAsync non-blocking fallback:", err);
  }
  return { scene, dispose, openNearestBook, openBookById, openBookByMeshName, returnActiveBook, turnActivePage, hasActiveBook, getBookScreenRects, setTouchMove, setPerformanceMode: applyPerformanceMode };
}
