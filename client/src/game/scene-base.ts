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
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { AUDIO_STORAGE_KEY } from "./progression";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
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
export type GameHandle = { scene: Scene; dispose: () => void; openNearestBook: () => boolean; openBookById: (bookId: string) => boolean; openBookByMeshName: (meshName: string) => boolean; returnActiveBook: () => boolean; turnActivePage: (direction: "rtl" | "ltr") => boolean; hasActiveBook: () => boolean; getBookScreenRects: () => BookScreenRect[]; setTouchMove: (x: number, y: number) => void; setPerformanceMode: (mode: PerformanceMode) => void; setAudioEnabled: (enabled: boolean) => void; getAudioEnabled: () => boolean };

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

function material(scene: Scene, name: string, color: Color3, specularOrUrl?: Color3 | string, emissive?: Color3) {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.ambientColor = color.scale(0.38);
  mat.emissiveColor = emissive ?? color.scale(0.045);
  if (specularOrUrl instanceof Color3) {
    mat.specularColor = specularOrUrl;
  } else {
    mat.specularColor = new Color3(0.12, 0.09, 0.06);
    if (typeof specularOrUrl === "string" && !specularOrUrl.startsWith("/manus-storage")) {
      try {
        const texture = new Texture(specularOrUrl, scene);
        texture.uScale = 2;
        texture.vScale = 2;
        mat.diffuseTexture = texture;
        mat.bumpTexture = texture;
        mat.bumpTexture.level = 0.22;
      } catch {
        // Fall back gracefully to procedural color
      }
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

type ThirdPersonCharacter = {
  root: TransformNode;
  mesh: Mesh;
  head: Mesh;
  leftArm: Mesh;
  rightArm: Mesh;
  leftLeg: Mesh;
  rightLeg: Mesh;
  dispose: () => void;
};

function createThirdPersonCharacter(scene: Scene): ThirdPersonCharacter {
  const root = new TransformNode("third-person-root", scene);
  
  // A collider mesh for the player to move with collisions
  const mesh = MeshBuilder.CreateBox("player-collider", { width: 0.6, height: 1.6, depth: 0.6 }, scene);
  mesh.parent = root;
  mesh.position.y = 0.8;
  mesh.isVisible = false;
  mesh.checkCollisions = true;
  mesh.ellipsoid = new Vector3(0.3, 0.8, 0.3);
  mesh.ellipsoidOffset = new Vector3(0, 0.8, 0);

  const bodyMat = material(scene, "tp-body", new Color3(0.15, 0.22, 0.35)); // Navy/Blue
  const skinMat = material(scene, "tp-skin", new Color3(0.80, 0.62, 0.50)); // Warm skin
  const pantsMat = material(scene, "tp-pants", new Color3(0.24, 0.16, 0.12)); // Warm brown
  
  // Head
  const head = MeshBuilder.CreateBox("tp-head", { size: 0.35 }, scene);
  head.parent = mesh;
  head.position.y = 0.8 + 0.175;
  head.material = skinMat;
  
  // Torso
  const torso = MeshBuilder.CreateBox("tp-torso", { width: 0.45, height: 0.7, depth: 0.25 }, scene);
  torso.parent = mesh;
  torso.position.y = 0.8 - 0.35;
  torso.material = bodyMat;

  // Arms
  const leftArm = MeshBuilder.CreateBox("tp-l-arm", { width: 0.15, height: 0.65, depth: 0.15 }, scene);
  leftArm.parent = torso;
  leftArm.position = new Vector3(-0.3, 0.1, 0);
  leftArm.setPivotPoint(new Vector3(0, 0.25, 0));
  leftArm.material = skinMat;
  
  const rightArm = MeshBuilder.CreateBox("tp-r-arm", { width: 0.15, height: 0.65, depth: 0.15 }, scene);
  rightArm.parent = torso;
  rightArm.position = new Vector3(0.3, 0.1, 0);
  rightArm.setPivotPoint(new Vector3(0, 0.25, 0));
  rightArm.material = skinMat;

  // Legs
  const leftLeg = MeshBuilder.CreateBox("tp-l-leg", { width: 0.18, height: 0.75, depth: 0.18 }, scene);
  leftLeg.parent = mesh;
  leftLeg.position = new Vector3(-0.12, -0.4, 0);
  leftLeg.setPivotPoint(new Vector3(0, 0.3, 0));
  leftLeg.material = pantsMat;

  const rightLeg = MeshBuilder.CreateBox("tp-r-leg", { width: 0.18, height: 0.75, depth: 0.18 }, scene);
  rightLeg.parent = mesh;
  rightLeg.position = new Vector3(0.12, -0.4, 0);
  rightLeg.setPivotPoint(new Vector3(0, 0.3, 0));
  rightLeg.material = pantsMat;

  const parts = [head, torso, leftArm, rightArm, leftLeg, rightLeg];
  parts.forEach(p => {
    p.isPickable = false;
    p.checkCollisions = false;
    p.receiveShadows = true;
  });

  return {
    root,
    mesh,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    dispose: () => {
      parts.forEach(p => p.dispose(false, true));
      mesh.dispose(false, true);
      root.dispose(false, true);
      bodyMat.dispose();
      skinMat.dispose();
      pantsMat.dispose();
    }
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

function getCobblestoneMaterial(scene: Scene): StandardMaterial {
  const existing = scene.getMaterialByName("cobblestone-wall-mat");
  if (existing instanceof StandardMaterial) return existing;

  const mat = new StandardMaterial("cobblestone-wall-mat", scene);
  const tex = new DynamicTexture("cobblestone-wall-tex", { width: 256, height: 256 }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Dark charcoal stone mortar
  ctx.fillStyle = "#15171a";
  ctx.fillRect(0, 0, 256, 256);

  const stoneColors = ["#282b32", "#353943", "#1e2126", "#3d4350", "#2c3038", "#23252c", "#343944"];
  const rows = 9;
  const rowHeight = 256 / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * rowHeight + 2;
    const h = rowHeight - 4;
    const offset = (r % 2) * 18;
    let x = -offset;
    while (x < 256) {
      const w = 22 + ((r * 11 + Math.floor(x + 100) * 7) % 24);
      const color = stoneColors[(r * 5 + Math.floor(x + 100) * 3) % stoneColors.length];
      ctx.fillStyle = color;
      ctx.beginPath();
      if ("roundRect" in ctx && typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, 4);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();

      // Stone top highlight
      ctx.strokeStyle = "rgba(130, 140, 160, 0.28)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + w - 2, y + 2);
      ctx.stroke();

      // Stone bottom shadow
      ctx.strokeStyle = "rgba(8, 10, 13, 0.65)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + h - 2);
      ctx.lineTo(x + w - 2, y + h - 2);
      ctx.stroke();

      x += w + 4;
    }
  }

  tex.uScale = 2.4;
  tex.vScale = 4.2;
  tex.update();

  mat.diffuseTexture = tex;
  mat.specularColor = new Color3(0.04, 0.04, 0.04);
  mat.ambientColor = new Color3(0.24, 0.26, 0.30);
  return mat;
}

function addShelfCandleSconce(scene: Scene, root: Mesh, pos: Vector3, brassMat: StandardMaterial, lightId: string) {
  const ironMat = material(scene, "sconce-iron-mat", new Color3(0.12, 0.11, 0.10));
  const waxMat = material(scene, "sconce-wax-mat", new Color3(0.94, 0.90, 0.82), new Color3(0.1, 0.1, 0.08), new Color3(0.22, 0.16, 0.08));
  const flameMat = material(scene, "sconce-flame-mat", new Color3(1.0, 0.70, 0.22), new Color3(0.1, 0.1, 0.1), new Color3(1.0, 0.65, 0.20));

  // Wrought iron curved wall bracket
  const bracket = box(scene, `sconce-bracket-${lightId}`, { width: 0.08, height: 0.12, depth: 0.24 }, pos, ironMat, false);
  bracket.parent = root;

  // Drip pan
  const pan = MeshBuilder.CreateCylinder(`sconce-pan-${lightId}`, { diameter: 0.14, height: 0.02, tessellation: 8 }, scene);
  pan.position = new Vector3(pos.x, pos.y + 0.06, pos.z + 0.10);
  pan.material = brassMat;
  pan.parent = root;

  // Wax candle pillar
  const candle = MeshBuilder.CreateCylinder(`sconce-candle-${lightId}`, { diameter: 0.05, height: 0.14, tessellation: 8 }, scene);
  candle.position = new Vector3(pos.x, pos.y + 0.13, pos.z + 0.10);
  candle.material = waxMat;
  candle.parent = root;

  // Flame
  const flame = MeshBuilder.CreateSphere(`sconce-flame-${lightId}`, { diameterX: 0.032, diameterY: 0.052, diameterZ: 0.032, segments: 4 }, scene);
  flame.position = new Vector3(pos.x, pos.y + 0.22, pos.z + 0.10);
  flame.material = flameMat;
  flame.parent = root;

  // Candle warm PointLight
  const light = new PointLight(`sconce-light-${lightId}`, new Vector3(pos.x, pos.y + 0.25, pos.z + 0.14), scene);
  light.parent = root;
  light.diffuse = new Color3(1.0, 0.64, 0.22);
  light.intensity = 0.28;
  light.range = 4.0;
}

function addShelf(scene: Scene, shelfIndex: number, x: number, z: number, rotationY: number, wood: StandardMaterial, olive: StandardMaterial, brass: StandardMaterial, shadow: ShadowGenerator, titleMaterials: Map<string, StandardMaterial>) {
  const root = new Mesh("shelf-root", scene);
  root.position = new Vector3(x, 0, z);
  root.rotation.y = rotationY;
  const cobblestoneMat = getCobblestoneMaterial(scene);
  const rusticWood = material(scene, "rustic-timber-wood", new Color3(0.38, 0.18, 0.08), new Color3(0.08, 0.05, 0.03), new Color3(0.12, 0.06, 0.02));
  const shelfTrimMat = material(scene, "rustic-shelf-trim", new Color3(0.48, 0.25, 0.12), new Color3(0.12, 0.08, 0.04), new Color3(0.14, 0.07, 0.03));

  const shelfBoardsY = [0.48, 1.38, 2.28, 3.18, 4.08];
  const parts = [
    // Rustic cobblestone masonry backing wall matching image
    box(scene, `shelf-back-${shelfIndex}`, { width: 4.45, height: 5.2, depth: 0.10 }, new Vector3(0, 2.6, -0.56), cobblestoneMat, false),
    // Chunky rustic timber side uprights
    box(scene, `shelf-side-l-${shelfIndex}`, { width: 0.30, height: 5.2, depth: 1.22 }, new Vector3(-2.15, 2.6, 0), rusticWood),
    box(scene, `shelf-side-r-${shelfIndex}`, { width: 0.30, height: 5.2, depth: 1.22 }, new Vector3(2.15, 2.6, 0), rusticWood),
    // Top carved timber cornice
    box(scene, `shelf-top-${shelfIndex}`, { width: 4.60, height: 0.26, depth: 1.25 }, new Vector3(0, 5.15, 0), rusticWood),
    // Horizontal rustic wooden boards
    ...shelfBoardsY.map((y, bIdx) => box(scene, `shelf-board-${shelfIndex}-${bIdx}`, { width: 4.35, height: 0.14, depth: 1.15 }, new Vector3(0, y, 0), wood)),
    // Front edge timber trim strips with warm golden-brown highlights
    ...shelfBoardsY.map((y, bIdx) => box(scene, `shelf-trim-${shelfIndex}-${bIdx}`, { width: 4.35, height: 0.06, depth: 0.05 }, new Vector3(0, y, 0.58), shelfTrimMat, false)),
    box(scene, `shelf-marker-${shelfIndex}`, { width: 0.7, height: 0.28, depth: 0.05 }, new Vector3(0, 4.85, -0.62), olive, false),
  ];
  const shelfCollider = box(scene, `shelf-collider-${shelfIndex}`, { width: 4.65, height: 5.25, depth: 1.30 }, new Vector3(0, 2.6, 0), wood);
  shelfCollider.parent = root;
  shelfCollider.isVisible = false;
  shelfCollider.isPickable = false;
  shelfCollider.receiveShadows = false;
  shelfCollider.freezeWorldMatrix();
  parts.forEach((part) => {
    part.parent = root;
    part.checkCollisions = false;
    part.isPickable = false;
    part.freezeWorldMatrix();
    shadow.addShadowCaster(part);
  });
  const shelfBack = parts[0];
  if (shelfBack) shelfBack.occlusionType = AbstractMesh.OCCLUSION_TYPE_OPTIMISTIC;

  // Candle Sconces mounted directly on the wooden shelf uprights (as in reference image)
  addShelfCandleSconce(scene, root, new Vector3(-2.15, 3.2, 0.30), brass, `${shelfIndex}-l`);
  addShelfCandleSconce(scene, root, new Vector3(2.15, 2.3, 0.30), brass, `${shelfIndex}-r`);

  // Rich bright and warm palette to make it vibrant and full
  const bookColors = [
    new Color3(0.95, 0.95, 0.95), // White
    new Color3(0.20, 0.70, 0.30), // Green
    new Color3(0.90, 0.50, 0.10), // Orange
    new Color3(0.90, 0.40, 0.60), // Pink
    new Color3(0.10, 0.50, 0.80), // Blue
    new Color3(0.10, 0.20, 0.40), // Dark Blue
    new Color3(0.58, 0.16, 0.14), // Antique Brick Red
    new Color3(0.74, 0.52, 0.18), // Vintage Ochre
    new Color3(0.85, 0.76, 0.62), // Aged Cream Parchment
    new Color3(0.32, 0.18, 0.10), // Dark Walnut Leather
    new Color3(0.28, 0.36, 0.22), // Moss Green
  ];

  const rowBookYs = [0.63, 1.53, 2.43, 3.33, 4.23];
  rowBookYs.forEach((y, row) => {
    // Brass bookends on both ends of each shelf board
    const bookendLeft = box(scene, `bookend-l-${shelfIndex}-${row}`, { width: 0.05, height: 0.38, depth: 0.44 }, new Vector3(-2.04, y - 0.15 + 0.22, -0.04), brass, false);
    bookendLeft.parent = root;
    const bookendRight = box(scene, `bookend-r-${shelfIndex}-${row}`, { width: 0.05, height: 0.38, depth: 0.44 }, new Vector3(2.04, y - 0.15 + 0.22, -0.04), brass, false);
    bookendRight.parent = root;

    for (let i = 0; i < 34; i += 1) {
      const format = BOOK_FORMATS[(shelfIndex + row + i) % BOOK_FORMATS.length];
      const heightFactor = 0.86 + (((i * 7 + row * 11 + shelfIndex * 3) % 9) / 9) * 0.28;
      const widthFactor = 0.84 + (((i * 5 + row * 7) % 5) / 5) * 0.36;
      const bookWidth = format.width * widthFactor;
      const bookHeight = format.height * heightFactor;
      const bookDepth = format.depth;
      const bookLean = (i % 12 === 2) ? 0.05 : (i % 11 === 5) ? -0.05 : 0;
      const bookIndex = (shelfIndex * 34 + row * 7 + i) % BOOK_CATALOG.length;
      const bookInfo = BOOK_CATALOG[bookIndex];
      const leatherColor = bookColors[(i + row * 3 + shelfIndex) % bookColors.length];
      const bookMaterial = material(scene, `book-mat-${shelfIndex}-${row}-${i}`, leatherColor);
      const leatherMaterial = material(scene, `book-leather-${shelfIndex}-${row}-${i}`, leatherColor);
      leatherMaterial.specularColor = new Color3(0.22, 0.17, 0.12);
      // Place the book directly on the board below this row, with only a tiny clearance.
      const shelfTopY = y - 0.15 + 0.07;
      const bookPosition = new Vector3(-1.95 + i * 0.117, shelfTopY + bookHeight * 0.5 + 0.008, -0.04);
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
      const titlePlate = MeshBuilder.CreatePlane(`book-title-${shelfIndex}-${row}-${i}`, { width: Math.max(bookWidth * 0.9, 0.20), height: bookHeight * 0.86, sideOrientation: Mesh.DOUBLESIDE }, scene);
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
  const shelfLight = new PointLight(`shelf-light-${shelfIndex}`, new Vector3(x, 4.8, z), scene);
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
  let dustSystem: ParticleSystem | null = null;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const applyPerformanceMode = (mode: PerformanceMode) => {
    performanceMode = mode;
    engine.setHardwareScalingLevel(mode === "light" ? 1.35 : 1);
    engine.resize();
    camera.fov = mode === "light" ? 0.92 : 0.78;
    scene.skipPointerMovePicking = mode === "light";
    const shadowMap = shadow.getShadowMap();
    if (shadowMap) shadowMap.refreshRate = mode === "light" ? 4 : 1;
    shadow.blurKernel = mode === "light" ? 8 : 24;
    if (dustSystem) {
      if (mode === "cinematic" && !prefersReducedMotion) dustSystem.start();
      else dustSystem.stop();
    }
  };
  scene.clearColor = new Color4(0.035, 0.028, 0.024, 1);
  scene.collisionsEnabled = true;
  scene.gravity = new Vector3(0, -0.11, 0);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.018;
  scene.fogColor = new Color3(0.07, 0.055, 0.04);

  const player = createThirdPersonCharacter(scene);
  player.mesh.position = new Vector3(0, 0.8, 8.6);
  player.root.rotation.y = Math.PI;

  const camera = new UniversalCamera("player-camera", new Vector3(0, 1.75, 8.6), scene);
  scene.activeCamera = camera;
  camera.minZ = 0.1;
  camera.maxZ = 50;
  camera.fov = 0.78;
  camera.rotation.y = Math.PI;
  
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

  let movementAmount = 0;
  let isRunning = false;
  let handMotionPhase = 0;
  let handInteraction = 0;
  let handInteractionTarget = 0;
  const handMotionObserver = scene.onBeforeRenderObservable.add(() => {
    const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const walkBlend = movementAmount;
    handMotionPhase += deltaSeconds * (2.0 + walkBlend * (isRunning ? 11.5 : 8.5));
    
    // Animate third person character limbs
    const swing = Math.sin(handMotionPhase) * 0.8 * walkBlend;
    player.leftArm.rotation.x = swing;
    player.rightArm.rotation.x = -swing;
    player.leftLeg.rotation.x = -swing;
    player.rightLeg.rotation.x = swing;
    
    // Bob the torso slightly
    const bob = Math.abs(Math.sin(handMotionPhase)) * 0.04 * walkBlend;
    player.head.position.y = 0.8 + 0.175 + bob;
    player.leftArm.parent!.position.y = 0.8 - 0.35 + bob;
  });
  
  const movementVelocity = new Vector3(0, 0, 0);
  let stepDistanceAccumulator = 0;
  let walkedSinceLastEvent = 0;
  let lastWalkEventAt = 0;
  let lastPlayerMapEventAt = 0;
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
    movementAmount += (Math.min(1, Math.hypot(movementVelocity.x, movementVelocity.z) / walkSpeed) - movementAmount) * Math.min(1, deltaSeconds * 12);
    
    // Character rotation to face movement direction
    if (hasMovementInput) {
      const targetAngle = Math.atan2(movementVelocity.x, movementVelocity.z);
      let currentAngle = player.root.rotation.y;
      let diff = targetAngle - currentAngle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      player.root.rotation.y += diff * Math.min(1, deltaSeconds * 12);
    }
    
    // Move the player mesh with gravity
    const velocityWithGravity = movementVelocity.clone();
    velocityWithGravity.y = -2.0; // gravity
    if (movementVelocity.lengthSquared() > 0.000001 || velocityWithGravity.y !== 0) {
      player.mesh.moveWithCollisions(velocityWithGravity.scale(deltaSeconds));
    }
    
    // خطوات اللاعب: صوت خفيف يتناسب مع سرعة المشي والجري.
    const travelled = Math.hypot(movementVelocity.x, movementVelocity.z) * deltaSeconds;
    stepDistanceAccumulator += travelled;
    const stepStride = isRunning ? 2.1 : 1.35;
    if (stepDistanceAccumulator >= stepStride && movementAmount > 0.22) {
      stepDistanceAccumulator = 0;
      playStep(isRunning);
    }
    // حدث المسافة المقطوعة يصل إلى واجهة الأهداف بدون إغراقها بالتحديثات.
    walkedSinceLastEvent += travelled;
    const now = performance.now();
    if (now - lastWalkEventAt >= 600 && walkedSinceLastEvent >= 0.35) {
      lastWalkEventAt = now;
      window.dispatchEvent(new CustomEvent("library:walked", { detail: { type: "walked", delta: walkedSinceLastEvent } }));
      walkedSinceLastEvent = 0;
    }
    // موضع اللاعب على خريطة القاعة — يُرسل فقط عند التحرك فعلياً.
    if (now - lastPlayerMapEventAt >= 400 && travelled > 0.001) {
      lastPlayerMapEventAt = now;
      window.dispatchEvent(new CustomEvent("library:player-moved", { detail: { x: player.mesh.position.x, z: player.mesh.position.z } }));
    }
    const targetFov = performanceMode === "light" ? (isRunning ? 0.96 : 0.92) : (isRunning ? 0.82 : 0.78);
    camera.fov += (targetFov - camera.fov) * Math.min(1, deltaSeconds * 7);
  });
  
  // Update camera to follow player mesh, keep inside room
  const roomBounds = { minX: -10.3, maxX: 10.3, minY: 1.15, maxY: 4.7, minZ: -11.9, maxZ: 10.2 };
  scene.onBeforeRenderObservable.add(() => {
    const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, 0.05);
    // Over the shoulder offset: right, up, back
    const camOffset = new Vector3(0.5, 0.4, -2.5);
    const rotationMatrix = Matrix.RotationYawPitchRoll(camera.rotation.y, camera.rotation.x, 0);
    const rotatedOffset = Vector3.TransformCoordinates(camOffset, rotationMatrix);
    const targetCamPos = player.mesh.position.add(new Vector3(0, 0.8, 0)).add(rotatedOffset);
    camera.position = Vector3.Lerp(camera.position, targetCamPos, Math.min(1, deltaSeconds * 15));

    // Bounds for player mesh
    const before = player.mesh.position.clone();
    player.mesh.position.x = Math.max(roomBounds.minX, Math.min(roomBounds.maxX, player.mesh.position.x));
    // player.mesh.position.y is grounded via collisions
    player.mesh.position.z = Math.max(roomBounds.minZ, Math.min(roomBounds.maxZ, player.mesh.position.z));
    if (player.mesh.position.x !== before.x) movementVelocity.x = 0;
    if (player.mesh.position.z !== before.z) movementVelocity.z = 0;
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

  // ذرات غبار ضوئية بطيئة: عمق سينمائي بدون أصول خارجية، وتُعطَّل تلقائياً في وضع الأداء الخفيف.
  dustSystem = new ParticleSystem("dust-motes", 90, scene);
  const dustTexture = new DynamicTexture("dust-mote-texture", { width: 64, height: 64 }, scene, true);
  dustTexture.hasAlpha = true;
  {
    const dustContext = dustTexture.getContext() as unknown as CanvasRenderingContext2D;
    const dustGradient = dustContext.createRadialGradient(32, 32, 0, 32, 32, 32);
    dustGradient.addColorStop(0, "rgba(255, 238, 200, 0.9)");
    dustGradient.addColorStop(0.45, "rgba(255, 226, 170, 0.28)");
    dustGradient.addColorStop(1, "rgba(255, 226, 170, 0)");
    dustContext.fillStyle = dustGradient;
    dustContext.fillRect(0, 0, 64, 64);
    dustTexture.update();
  }
  dustSystem.particleTexture = dustTexture;
  dustSystem.emitter = new Vector3(0, 1.9, 0);
  dustSystem.minEmitBox = new Vector3(-10, -1.4, -11.5);
  dustSystem.maxEmitBox = new Vector3(10, 4.4, 9.5);
  dustSystem.color1 = new Color4(1, 0.9, 0.72, 0.32);
  dustSystem.color2 = new Color4(1, 0.84, 0.6, 0.5);
  dustSystem.colorDead = new Color4(1, 0.8, 0.55, 0);
  dustSystem.minSize = 0.02;
  dustSystem.maxSize = 0.075;
  dustSystem.minLifeTime = 6;
  dustSystem.maxLifeTime = 12;
  dustSystem.emitRate = 6;
  dustSystem.direction1 = new Vector3(0.008, 0.022, 0.006);
  dustSystem.direction2 = new Vector3(-0.008, 0.05, -0.006);
  dustSystem.minEmitPower = 0.1;
  dustSystem.maxEmitPower = 0.4;
  dustSystem.updateSpeed = 0.012;
  dustSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
  if (performanceMode === "cinematic" && !prefersReducedMotion) dustSystem.start();

  const wood = material(scene, "walnut", COLORS.walnut);
  const woodLight = material(scene, "wood-light", COLORS.walnutLight);
  const floor = material(scene, "floor", new Color3(0.12, 0.065, 0.032));
  const wall = material(scene, "plaster", new Color3(0.42, 0.34, 0.23));
  const ivory = material(scene, "ivory", COLORS.ivory);
  const olive = material(scene, "olive", COLORS.olive);
  const brass = material(scene, "brass", COLORS.brass);
  const titleMaterials = new Map<string, StandardMaterial>();

  const floorMesh = box(scene, "floor", { width: 24, height: 0.25, depth: 28 }, new Vector3(0, -0.15, 0), floor);
  floorMesh.freezeWorldMatrix();
  floorMesh.isPickable = false;
  const backWall = box(scene, "back-wall", { width: 24, height: 7, depth: 0.3 }, new Vector3(0, 3.5, -13.5), wall);
  backWall.freezeWorldMatrix();
  backWall.occlusionType = AbstractMesh.OCCLUSION_TYPE_OPTIMISTIC;
  backWall.isPickable = false;
  const leftWall = box(scene, "left-wall", { width: 0.3, height: 7, depth: 28 }, new Vector3(-12, 3.5, 0), wall);
  leftWall.freezeWorldMatrix();
  leftWall.occlusionType = AbstractMesh.OCCLUSION_TYPE_OPTIMISTIC;
  leftWall.isPickable = false;
  const rightWall = box(scene, "right-wall", { width: 0.3, height: 7, depth: 28 }, new Vector3(12, 3.5, 0), wall);
  rightWall.freezeWorldMatrix();
  rightWall.occlusionType = AbstractMesh.OCCLUSION_TYPE_OPTIMISTIC;
  rightWall.isPickable = false;
  const ceilingMesh = box(scene, "ceiling", { width: 24, height: 0.25, depth: 28 }, new Vector3(0, 7, 0), woodLight, false);
  ceilingMesh.freezeWorldMatrix();
  ceilingMesh.isPickable = false;
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
  table.freezeWorldMatrix();
  shadow.addShadowCaster(table);
  [-1.8, 1.8].forEach((x) => [-0.72, 0.72].forEach((z) => {
    const leg = box(scene, `table-leg-${x}-${z}`, { width: 0.22, height: 2, depth: 0.22 }, new Vector3(x, 1, z), woodLight, false);
    leg.freezeWorldMatrix();
    leg.isPickable = false;
  }));
  const tableCollider = box(scene, "reading-table-collider", { width: 4.95, height: 2.05, depth: 2.35 }, new Vector3(0, 1.02, 0), woodLight);
  tableCollider.isVisible = false;
  tableCollider.isPickable = false;
  tableCollider.receiveShadows = false;
  tableCollider.freezeWorldMatrix();
  const catalog = box(scene, "catalog", { width: 1.1, height: 0.13, depth: 0.75 }, new Vector3(0, 2.2, 0), ivory, false);
  catalog.freezeWorldMatrix();
  catalog.isPickable = false;
  const tableLamp = new PointLight("reading-lamp", new Vector3(0, 3.3, 0), scene);
  tableLamp.diffuse = COLORS.brass; tableLamp.intensity = 1.2; tableLamp.range = 6;
  const lampShade = MeshBuilder.CreateCylinder("lamp-shade", { diameterTop: 0.3, diameterBottom: 0.75, height: 0.55 }, scene);
  lampShade.position = new Vector3(0, 3.05, 0); lampShade.material = brass; lampShade.isPickable = false;
  lampShade.freezeWorldMatrix();

  const rug = box(scene, "rug", { width: 8, height: 0.03, depth: 5 }, new Vector3(0, 0.02, 1.2), material(scene, "rug-mat", new Color3(0.18, 0.19, 0.12)), false);
  rug.rotation.y = 0.02;
  rug.isPickable = false;
  rug.freezeWorldMatrix();
  const plaque = box(scene, "welcome-plaque", { width: 3.4, height: 1.2, depth: 0.08 }, new Vector3(0, 4.3, -13.28), ivory, false);
  plaque.metadata = { decorative: true };
  plaque.isPickable = false;
  plaque.freezeWorldMatrix();

  let activeBookParts: any[] | null = null;
  let activeBookId: string | null = null;
  let activePullObserver: any = null;
  let activeOpenObserver: any = null;
  let activeTurnObserver: any = null;
  let audioContext: AudioContext | null = null;
  let audioMasterGain: GainNode | null = null;
  let audioAmbientStarted = false;
  let audioEnabled = (() => {
    try {
      return window.localStorage.getItem(AUDIO_STORAGE_KEY) !== "off";
    } catch {
      return true;
    }
  })();
  const emitBookState = () => window.dispatchEvent(new CustomEvent("library:book-state", { detail: { active: Boolean(activeBookParts), bookId: activeBookId } }));
  const getAudioContext = () => {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!audioContext) {
      try {
        audioContext = new AudioContextConstructor();
        audioMasterGain = audioContext.createGain();
        audioMasterGain.gain.value = audioEnabled ? 0.9 : 0;
        audioMasterGain.connect(audioContext.destination);
      } catch {
        audioContext = null;
        audioMasterGain = null;
        return null;
      }
    }
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  };
  // أول إيماءة من المستخدم تفتح الصوت (سياسة التشغيل التلقائي في المتصفحات).
  const unlockAudioOnGesture = () => {
    if (!audioEnabled) return;
    getAudioContext();
    startAmbient();
  };
  window.addEventListener("pointerdown", unlockAudioOnGesture, { once: true });
  window.addEventListener("keydown", unlockAudioOnGesture, { once: true });
  // نغمة طقطقة الشموع الهادئة: ضجيج بني مرشح يعطي حضور الغرفة دون أصول خارجية.
  const createNoiseBuffer = (context: AudioContext, seconds: number) => {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.2;
    }
    return buffer;
  };
  const startAmbient = () => {
    const context = getAudioContext();
    if (!context || !audioMasterGain || audioAmbientStarted || !audioEnabled) return;
    audioAmbientStarted = true;
    const ambient = context.createBufferSource();
    ambient.buffer = createNoiseBuffer(context, 4);
    ambient.loop = true;
    const ambientFilter = context.createBiquadFilter();
    ambientFilter.type = "lowpass";
    ambientFilter.frequency.value = 340;
    const ambientGain = context.createGain();
    ambientGain.gain.value = 0.05;
    // نفَس خفيف في الإضاءة: تمايل بطيء في مستوى الصوت.
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(ambientGain.gain);
    ambient.connect(ambientFilter);
    ambientFilter.connect(ambientGain);
    ambientGain.connect(audioMasterGain);
    ambient.start();
    lfo.start();
  };
  const playStep = (running: boolean) => {
    const context = getAudioContext();
    if (!context || !audioMasterGain || !audioEnabled) return;
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = createNoiseBuffer(context, 0.12);
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = running ? 520 : 380;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(running ? 0.055 : 0.04, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioMasterGain);
    source.start(now);
    source.stop(now + 0.16);
  };
  // نغمة الإنجاز: ثلاث نغمات نحاسية دافئة قصيرة.
  const playChime = (kind: "discovery" | "objective" | "rank") => {
    const context = getAudioContext();
    if (!context || !audioMasterGain || !audioEnabled) return;
    const master = audioMasterGain;
    const notes = kind === "rank" ? [523.25, 659.25, 783.99] : kind === "objective" ? [440, 554.37, 659.25] : [392, 523.25];
    const now = context.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const gain = context.createGain();
      const startAt = now + index * 0.11;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.06, startAt + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.42);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.46);
    });
  };
  const setAudioEnabled = (enabled: boolean) => {
    audioEnabled = enabled;
    try {
      window.localStorage.setItem(AUDIO_STORAGE_KEY, enabled ? "on" : "off");
    } catch {
      // يبقى الاختيار داخل الجلسة عندما يعطّل المتصفح التخزين.
    }
    if (enabled) {
      getAudioContext();
      startAmbient();
    }
    if (audioContext && audioMasterGain) {
      audioMasterGain.gain.setTargetAtTime(enabled ? 0.9 : 0, audioContext.currentTime, 0.05);
    }
  };
  const onChimeRequest = (event: Event) => {
    const detail = (event as CustomEvent<{ kind?: "discovery" | "objective" | "rank" }>).detail;
    if (detail?.kind) playChime(detail.kind);
  };
  window.addEventListener("library:chime", onChimeRequest);
  const playBookSound = (kind: "pull" | "return") => {
    const context = getAudioContext();
    if (!context || !audioEnabled) return;
    const master = audioMasterGain ?? context.destination;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "pull" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(kind === "pull" ? 180 : 300, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "pull" ? 420 : 150, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "pull" ? 0.055 : 0.04, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.connect(gain).connect(master);
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
        if (currentBook) {
          window.dispatchEvent(new CustomEvent("library:page-turned", { detail: { type: "page-turned", bookId: currentBook.id, direction } }));
        }
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
    const pulledBook = parts.find((part) => part.metadata?.book)?.metadata?.book as BookInfo | undefined;
    if (pulledBook) {
      window.dispatchEvent(new CustomEvent("library:book-opened", { detail: { type: "book-opened", bookId: pulledBook.id, title: pulledBook.title } }));
    }
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
    const nearest = candidates.reduce((closest, candidate) => Vector3.DistanceSquared(candidate.getAbsolutePosition(), player.mesh.position) < Vector3.DistanceSquared(closest.getAbsolutePosition(), player.mesh.position) ? candidate : closest);
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

  const dispose = () => { window.clearTimeout(progressiveLoadTimer); window.clearTimeout(pagePreloadTimer); scene.onBeforeRenderObservable.remove(handMotionObserver); player.dispose(); window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onWindowBlur); window.removeEventListener("pointerdown", unlockAudioOnGesture); window.removeEventListener("keydown", unlockAudioOnGesture); window.removeEventListener("library:chime", onChimeRequest); canvas.removeEventListener("click", onCanvasClick); canvas.removeEventListener("mousemove", onMouseMove); canvas.removeEventListener("mouseleave", resetMouseReference); canvas.removeEventListener("touchstart", onTouchStart); canvas.removeEventListener("touchmove", onTouchMove); canvas.removeEventListener("touchend", onTouchEnd); canvas.removeEventListener("touchcancel", onTouchEnd); dustSystem.dispose(); if (audioContext) { void audioContext.close().catch(() => undefined); audioContext = null; } scene.onPointerObservable.clear(); scene.dispose(); };
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
  return { scene, dispose, openNearestBook, openBookById, openBookByMeshName, returnActiveBook, turnActivePage, hasActiveBook, getBookScreenRects, setTouchMove, setPerformanceMode: applyPerformanceMode, setAudioEnabled, getAudioEnabled: () => audioEnabled };
}
