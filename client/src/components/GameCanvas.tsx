// Quiet Study Hall UI: واجهة نحاسية خفيفة فوق عالم المكتبة، لا تنافس المشهد وتظهر عند الحاجة.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Engine as BabylonEngine } from "@babylonjs/core/Engines/engine";
import type { BookScreenRect, GameHandle, PerformanceMode } from "@/game/scene";
import {
  applyProgressEvent,
  loadProgress,
  saveProgress,
  resetProgress,
  rankFor,
  OBJECTIVES,
  setCatalogSize,
  toArabicDigits,
  type GameEvent,
  type ProgressState,
  type Toast,
} from "@/game/progression";

// Style: Quiet Study Hall — the HUD stays quiet and literary while movement cues remain immediately readable.

type LiveToast = Toast & { key: number };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
declare global { interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor; } }

const SHELF_MAP_SPOTS = [
  { x: -8.0, z: -8.2 }, { x: -8.0, z: -2.7 }, { x: -8.0, z: 2.7 }, { x: -8.0, z: 8.2 },
  { x: 8.0, z: -8.2 }, { x: 8.0, z: -2.7 }, { x: 8.0, z: 2.7 }, { x: 8.0, z: 8.2 },
  { x: -8.0, z: -12.0 }, { x: -2.7, z: -12.0 }, { x: 2.7, z: -12.0 }, { x: 8.0, z: -12.0 },
  { x: -8.0, z: 12.0 }, { x: -2.7, z: 12.0 }, { x: 2.7, z: 12.0 }, { x: 8.0, z: 12.0 },
];

export default function GameCanvas() {
  const isDebug = useRef(new URLSearchParams(window.location.search).has("debug")).current;
  const [debugStats, setDebugStats] = useState<{ fps: number; drawCalls: number; activeMeshes: number; totalMeshes: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const [showHelp, setShowHelp] = useState(false);
  const [started, setStarted] = useState(false);
  const [bookRects, setBookRects] = useState<BookScreenRect[]>([]);
  const bookRectsRef = useRef<BookScreenRect[]>([]);
  const [hasActiveBook, setHasActiveBook] = useState(false);
  const [bookPreview, setBookPreview] = useState<{ title: string; section?: string; callNumber?: string } | null>(null);
  const [bookPage, setBookPage] = useState<{ pageIndex: number; pageCount: number; text: string } | null>(null);
  const [interactionTarget, setInteractionTarget] = useState<{ title: string; held: boolean; open: boolean } | null>(null);
  const [bookCount, setBookCount] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(() => (window.matchMedia("(max-width: 720px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4) ? "light" : "cinematic");
  const setPerformanceModeRef = useRef<(mode: PerformanceMode) => void>(() => undefined);
  const openNearestBookRef = useRef<() => boolean>(() => false);
  const openBookByMeshNameRef = useRef<(meshName: string) => boolean>(() => false);
  const takeNearestBookRef = useRef<() => boolean>(() => false);
  const releaseHeldBookRef = useRef<() => boolean>(() => false);
  const returnNearestBookRef = useRef<() => boolean>(() => false);
  const executeTextCommandRef = useRef<(raw: string) => boolean>(() => false);
  const returnActiveBookRef = useRef<() => boolean>(() => false);
  const turnActivePageRef = useRef<(direction: "rtl" | "ltr") => boolean>(() => false);
  const setTouchMoveRef = useRef<(x: number, y: number) => void>(() => undefined);
  const setTouchLookRef = useRef<(x: number, y: number) => void>(() => undefined);
  const setAudioEnabledRef = useRef<(enabled: boolean) => void>(() => undefined);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const joystickPointerRef = useRef<number | null>(null);
  const lookPointerRef = useRef<number | null>(null);
  const lookPointRef = useRef<{ x: number; y: number } | null>(null);
  const [audioEnabled, setAudioEnabledState] = useState(true);
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const progressRef = useRef(progress);
  const [toasts, setToasts] = useState<LiveToast[]>([]);
  const toastSequenceRef = useRef(0);
  const [playerMapPos, setPlayerMapPos] = useState<{ x: number; z: number } | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const [commandMessage, setCommandMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const pushToasts = useCallback((items: Toast[]) => {
    if (!items.length) return;
    const stamped: LiveToast[] = items.map((item) => ({ ...item, key: toastSequenceRef.current++ }));
    setToasts((current) => [...current, ...stamped].slice(-3));
    const keys = new Set(stamped.map((item) => item.key));
    items.forEach((item) => {
      window.dispatchEvent(new CustomEvent("library:chime", { detail: { kind: item.kind } }));
    });
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => !keys.has(item.key)));
    }, 4200);
  }, []);

  useEffect(() => {
    const onGameEvent = (event: Event) => {
      const detail = (event as CustomEvent<GameEvent>).detail;
      if (!detail) return;
      const result = applyProgressEvent(progressRef.current, detail);
      progressRef.current = result.state;
      setProgress(result.state);
      saveProgress(result.state);
      pushToasts(result.toasts);
    };
    const onPlayerMoved = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; z: number }>).detail;
      if (detail) setPlayerMapPos({ x: detail.x, z: detail.z });
    };
    const onCommandFailed = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message;
      if (!message) return;
      setCommandMessage(message);
      window.setTimeout(() => setCommandMessage(null), 3000);
    };
    const onBookTarget = (event: Event) => {
      const detail = (event as CustomEvent<{ title: string; held: boolean; open: boolean } | null>).detail;
      setInteractionTarget(detail ? { title: detail.title, held: detail.held, open: detail.open } : null);
    };
    window.addEventListener("library:book-opened", onGameEvent);
    window.addEventListener("library:page-turned", onGameEvent);
    window.addEventListener("library:walked", onGameEvent);
    window.addEventListener("library:player-moved", onPlayerMoved);
    window.addEventListener("library:command-failed", onCommandFailed);
    window.addEventListener("library:book-target", onBookTarget);
    return () => {
      window.removeEventListener("library:book-opened", onGameEvent);
      window.removeEventListener("library:page-turned", onGameEvent);
      window.removeEventListener("library:walked", onGameEvent);
      window.removeEventListener("library:player-moved", onPlayerMoved);
      window.removeEventListener("library:command-failed", onCommandFailed);
      window.removeEventListener("library:book-target", onBookTarget);
    };
  }, [pushToasts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    let engine: BabylonEngine | null = null;
    let handle: GameHandle | null = null;
    let disposed = false;
    const onBookState = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean }>).detail;
      setHasActiveBook(Boolean(detail?.active));
    };
    const onBookPreview = (event: Event) => setBookPreview((event as CustomEvent<{ title: string; section?: string; callNumber?: string } | null>).detail ?? null);
    const onBookPage = (event: Event) => setBookPage((event as CustomEvent<{ pageIndex: number; pageCount: number; text: string }>).detail ?? null);
    const onCatalogReady = (event: Event) => {
      const count = (event as CustomEvent<{ count: number }>).detail?.count ?? 0;
      setCatalogSize(count);
      setBookCount(count);
      setProgress({ ...progressRef.current });
    };
    window.addEventListener("library:book-state", onBookState);
    window.addEventListener("library:book-preview", onBookPreview);
    window.addEventListener("library:book-page", onBookPage);
    window.addEventListener("library:catalog-ready", onCatalogReady);
    Promise.all([
      import("@babylonjs/core/Engines/engine"),
      import("@/game/scene"),
    ]).then(([{ Engine }, { createGameScene }]) => {
      if (disposed) return;
      engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
      return createGameScene(engine, canvas);
    }).then((nextHandle) => {
      if (!nextHandle) return;
      if (disposed) { nextHandle.dispose(); return; }
      handle = nextHandle;
      openNearestBookRef.current = () => {
        const opened = nextHandle.openNearestBook();
        setHasActiveBook(nextHandle.hasActiveBook());
        return opened;
      };
      openBookByMeshNameRef.current = (meshName) => {
        const opened = nextHandle.openBookByMeshName(meshName);
        setHasActiveBook(nextHandle.hasActiveBook());
        return opened;
      };
      takeNearestBookRef.current = nextHandle.takeNearestBook;
      releaseHeldBookRef.current = nextHandle.releaseHeldBook;
      returnNearestBookRef.current = nextHandle.returnNearestBook;
      executeTextCommandRef.current = nextHandle.executeTextCommand;
      returnActiveBookRef.current = () => {
        const returned = nextHandle.returnActiveBook();
        setHasActiveBook(nextHandle.hasActiveBook());
        return returned;
      };
      turnActivePageRef.current = (direction) => nextHandle.turnActivePage(direction);
      setTouchMoveRef.current = nextHandle.setTouchMove;
      setTouchLookRef.current = nextHandle.setTouchLook;
      setPerformanceModeRef.current = nextHandle.setPerformanceMode;
      setAudioEnabledRef.current = nextHandle.setAudioEnabled;
      setAudioEnabledState(nextHandle.getAudioEnabled());
      nextHandle.setPerformanceMode(performanceMode);
      if (!engine) return;
      engine.runRenderLoop(() => {
        nextHandle.scene.render();
        const nextRects = nextHandle.getBookScreenRects();
        const previousRects = bookRectsRef.current;
        const changed = previousRects.length !== nextRects.length || nextRects.some((rect, index) => {
          const previous = previousRects[index];
          return !previous || previous.meshName !== rect.meshName || previous.x !== rect.x || previous.y !== rect.y || previous.width !== rect.width || previous.height !== rect.height;
        });
        if (changed) {
          bookRectsRef.current = nextRects;
          setBookRects(nextRects);
        }
      });
      setStarted(true);
    }).catch((error) => {
      console.error("3D Library initialization error:", error);
      setStarted(true);
    });
    const onResize = () => engine?.resize();
    window.addEventListener("resize", onResize);
    
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      openNearestBookRef.current = () => false;
      openBookByMeshNameRef.current = () => false;
      takeNearestBookRef.current = () => false;
      releaseHeldBookRef.current = () => false;
      returnNearestBookRef.current = () => false;
      executeTextCommandRef.current = () => false;
      returnActiveBookRef.current = () => false;
      turnActivePageRef.current = () => false;
      setTouchMoveRef.current = () => undefined;
      setTouchLookRef.current = () => undefined;
      setPerformanceModeRef.current = () => undefined;
      setAudioEnabledRef.current = () => undefined;
      window.removeEventListener("library:book-state", onBookState);
      window.removeEventListener("library:book-preview", onBookPreview);
      window.removeEventListener("library:book-page", onBookPage);
      window.removeEventListener("library:catalog-ready", onCatalogReady);
      bookRectsRef.current = [];
      setBookRects([]);
      setHasActiveBook(false);
      setBookPreview(null);
      setBookPage(null);
      setInteractionTarget(null);
      setBookCount(0);
      handle?.dispose();
      engine?.dispose();
      startedRef.current = false;
    };
  }, []);

  const updateJoystick = (clientX: number, clientY: number) => {
    const base = joystickRef.current;
    const knob = joystickKnobRef.current;
    if (!base || !knob) return;
    const rect = base.getBoundingClientRect();
    const radius = Math.max(rect.width / 2 - 18, 1);
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    const x = (dx * scale) / radius;
    const y = (dy * scale) / radius;
    knob.style.transform = `translate(${x * radius}px, ${y * radius}px)`;
    setTouchMoveRef.current(x, y);
  };
  const resetJoystick = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event && joystickPointerRef.current !== event.pointerId) return;
    joystickPointerRef.current = null;
    if (joystickKnobRef.current) joystickKnobRef.current.style.transform = "translate(0, 0)";
    setTouchMoveRef.current(0, 0);
  };
  const onJoystickPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    joystickPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateJoystick(event.clientX, event.clientY);
  };
  const onJoystickPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointerRef.current === event.pointerId) updateJoystick(event.clientX, event.clientY);
  };
  const onLookPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    lookPointerRef.current = event.pointerId;
    lookPointRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onLookPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (lookPointerRef.current !== event.pointerId || !lookPointRef.current) return;
    const dx = event.clientX - lookPointRef.current.x;
    const dy = event.clientY - lookPointRef.current.y;
    lookPointRef.current = { x: event.clientX, y: event.clientY };
    setTouchLookRef.current(dx, dy);
  };
  const resetLook = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event && lookPointerRef.current !== event.pointerId) return;
    lookPointerRef.current = null;
    lookPointRef.current = null;
  };
  const submitCommand = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raw = commandInput.trim();
    if (!raw) return;
    executeTextCommandRef.current(raw);
    setCommandInput("");
  };
  const startVoiceCommand = () => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setCommandMessage("التعرف الصوتي غير متوفر فهاد المتصفح.");
      window.setTimeout(() => setCommandMessage(null), 3000);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "ar-MA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      setCommandInput(transcript);
      if (transcript) executeTextCommandRef.current(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => { setIsListening(false); setCommandMessage("ماقدرناش نسمعو الأمر الصوتي."); };
    recognition.start();
  };

  const activeObjective = OBJECTIVES.find((objective) => !progress.completed.includes(objective.id));
  const activeProgress = activeObjective ? activeObjective.progress(progress) : null;
  const activePercent = activeProgress ? Math.round((activeProgress.current / activeProgress.target) * 100) : 100;
  const rank = rankFor(progress.xp);
  const discoveredCount = progress.openedBooks.length;

  const mapToSvg = (x: number, z: number) => ({ x: 140 + (x / 24) * 240, y: 10 + ((z + 13.5) / 27) * 250 });

  return (
    <main className="library-game" dir="rtl" aria-label="مكتبة ثلاثية الأبعاد تفاعلية">
      <canvas ref={canvasRef} className="game-canvas" style={{ touchAction: "none" }} />
      {!started && <div className="loading-overlay" role="status" aria-live="polite"><div className="loading-shelf-silhouette" aria-hidden="true" /><div className="loading-copy"><div className="loading-mark" aria-hidden="true">۞</div><div className="loading-kicker">قاعة الدراسة الهادئة</div><strong>يجري تجهيز القاعة</strong><span>لحظات، وتُضاء الرفوف أمامك</span></div></div>}
      <div className="hud-topline"><div className="brand-lockup"><img src="./library-mark.svg" alt="" /><span>قاعة الدراسة الهادئة</span></div><div className="status-pill"><i /> {started ? "مفتوحة للاستكشاف" : "يجري تجهيز القاعة"}</div></div>
      {started && <form className="command-console" onSubmit={submitCommand}><input value={commandInput} onChange={(event) => setCommandInput(event.target.value)} placeholder="اكتب أمراً: خذ الكتاب / رجّع الكتاب" aria-label="أمر نصي" /><button type="submit">تنفيذ</button><button type="button" onClick={startVoiceCommand} aria-label="أمر صوتي">{isListening ? "كيصنت..." : "ميكروفون"}</button>{commandMessage && <span role="status">{commandMessage}</span>}</form>}
      <div className="mobile-controls" aria-label="عناصر التحكم باللمس"><div ref={joystickRef} className="touch-joystick" onPointerDown={onJoystickPointerDown} onPointerMove={onJoystickPointerMove} onPointerUp={resetJoystick} onPointerCancel={resetJoystick}><div ref={joystickKnobRef} className="touch-joystick-knob" /></div></div>
      <div className="touch-look-area" aria-label="تحريك الكاميرا" onPointerDown={onLookPointerDown} onPointerMove={onLookPointerMove} onPointerUp={resetLook} onPointerCancel={resetLook}><span>اسحب للنظر</span></div>
      {started && <div className="mobile-interaction" aria-label="تفاعل الكتاب"><button onClick={() => takeNearestBookRef.current()}>خذ الكتاب</button><button onClick={() => openNearestBookRef.current()}>{hasActiveBook ? "فتح / إغلاق" : "افتح الكتاب"}</button><button onClick={() => returnNearestBookRef.current()}>رجّع</button></div>}
      {interactionTarget && <div className="interaction-prompt" role="status"><strong>{interactionTarget.open ? "حرّك السهمين لتقليب الصفحات" : interactionTarget.held ? "E · افتح الكتاب" : "E · خذ الكتاب"}</strong><span>{interactionTarget.title}</span></div>}
      <div className="hud-bottom"><div className="crosshair" aria-hidden="true">+</div><div className="controls"><span><b>W A S D</b> تحرّك</span><span><b>Shift</b> للجري</span><span><b>G</b> خذ الكتاب</span><span><b>F</b> أفلت</span><span><b>R</b> رجّع للرف</span><span><b>E</b> معاينة</span></div><div className="hud-actions"><button className="inspect-button" onClick={() => openNearestBookRef.current()}>فحص أقرب كتاب <span>↗</span></button><button className="help-button" onClick={() => takeNearestBookRef.current()}>خذ الكتاب</button><button className="help-button" onClick={() => releaseHeldBookRef.current()}>أفلت الكتاب</button><button className="help-button" onClick={() => returnNearestBookRef.current()}>رجّع للرف</button><div className="page-actions" aria-label="أزرار الكتاب"><button className="page-turn-button page-turn-left" hidden={!hasActiveBook} onClick={() => turnActivePageRef.current("ltr")}>اليسرى <span>→</span></button><button className="return-button" disabled={!hasActiveBook} onClick={() => returnActiveBookRef.current()}>إغلاق المعاينة <span>↩</span></button><button className="page-turn-button page-turn-right" hidden={!hasActiveBook} onClick={() => turnActivePageRef.current("rtl")}>اليمنى <span>←</span></button></div><button className="help-button" onClick={() => setShowHelp((value) => !value)}>{showHelp ? "إخفاء الدليل" : "إظهار الدليل"}</button><button className="help-button" onClick={() => setShowMap((value) => !value)}>{showMap ? "إخفاء الخريطة" : "خريطة القاعة"}</button><button className="help-button audio-button" onClick={() => { const next = !audioEnabled; setAudioEnabledState(next); setAudioEnabledRef.current(next); }} aria-label="تشغيل أو كتم الصوت">{audioEnabled ? "الصوت مفعّل" : "الصوت مكتوم"}</button><button className="help-button performance-button" onClick={() => { const nextMode = performanceMode === "light" ? "cinematic" : "light"; setPerformanceMode(nextMode); setPerformanceModeRef.current(nextMode); }} aria-label="تبديل جودة العرض">{performanceMode === "light" ? "أداء خفيف" : "جودة سينمائية"}</button></div></div>
      {started && <div className="book-hotspots" aria-label="كتب قابلة للتفاعل">{bookRects.map((rect) => <button key={rect.meshName} className="book-hotspot" style={{ left: rect.x - rect.width / 2, top: rect.y - rect.height / 2, width: rect.width, height: rect.height }} aria-label={`فتح ${rect.title}`} title={rect.title} onClick={() => { setShowHelp(false); openBookByMeshNameRef.current(rect.meshName); }}><span>{rect.title}</span></button>)}</div>}
      {bookPreview && <section className="book-preview-card" role="dialog" aria-label="معاينة الكتاب"><span className="eyebrow">كتاب مفتوح · صفحة {bookPage ? `${toArabicDigits(bookPage.pageIndex + 1)} / ${toArabicDigits(bookPage.pageCount)}` : "١"}</span><h2>{bookPreview.title}</h2><p className="book-preview-meta">{bookPreview.section ?? "الأرشيف"} · {bookPreview.callNumber ?? "REF-001"}</p><p className="book-page-text">{bookPage?.text ?? "افتح الكتاب لتبدأ القراءة."}</p><button className="return-button" onClick={() => returnActiveBookRef.current()}>إغلاق</button></section>}
      {started && <aside className="quest-card" aria-live="polite"><div className="quest-card-head"><span className="eyebrow">رحلة الباحث</span><span className="rank-pill">{rank.title} · {toArabicDigits(progress.xp)} نقطة</span></div>{activeObjective ? <><h2>{activeObjective.title}</h2><p>{activeObjective.description}</p><div className="quest-bar"><i style={{ width: `${activePercent}%` }} /></div><span className="quest-count">{activeProgress?.label}</span></> : <><h2>اكتملت جميع المهام</h2><p>القاعة كلها ملك لفضولك الآن — واصل القراءة والتأمل.</p></>}<div className="quest-card-foot"><span>اكتشفت {toArabicDigits(discoveredCount)} من {toArabicDigits(bookCount)} كتاباً</span><button className="reset-progress-button" onClick={() => { const fresh = resetProgress(); progressRef.current = fresh; setProgress(fresh); }}>إعادة ضبط التقدم</button></div></aside>}
      {showHelp && <section className="welcome-card"><div className="eyebrow">غرفة للفضوليين</div><h1>اختر رفاً،<br /><em>ودع المكان يروي حكايته.</em></h1><p>تجوّل بهدوء بين الرفوف. كل كتاب يقود إلى حكاية خفية في هذه القاعة، وكل صفحة تقرؤها تقرّبك من رتبة حكيم المكتبة.</p><div className="welcome-actions"><button className="enter-button" onClick={() => setShowHelp(false)}>ادخل إلى المكتبة <span>↗</span></button><button className="enter-button sample-book-button" onClick={() => { setShowHelp(false); window.setTimeout(() => openNearestBookRef.current(), 80); }}>افتح كتاباً مقترحاً <span>↗</span></button></div></section>}
      {showMap && <div className="library-map" aria-label="خريطة القاعة"><svg viewBox="0 0 280 270" role="img"><rect className="map-room" x="14" y="8" width="252" height="252" />{SHELF_MAP_SPOTS.map((spot) => { const { x, y } = mapToSvg(spot.x, spot.z); return <rect key={`${spot.x}-${spot.z}`} className="map-shelf" x={x - 7} y={y - 7} width="14" height="14" />; })}{playerMapPos && <><circle className="map-player" cx={mapToSvg(playerMapPos.x, playerMapPos.z).x} cy={mapToSvg(playerMapPos.x, playerMapPos.z).y} r="4.5" /><circle className="map-player-halo" cx={mapToSvg(playerMapPos.x, playerMapPos.z).x} cy={mapToSvg(playerMapPos.x, playerMapPos.z).y} r="9" /></>}<text className="map-label" x="140" y="266" textAnchor="middle">خريطة القاعة — أنت النقطة النحاسية</text></svg></div>}
      <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div key={toast.key} className={`game-toast game-toast-${toast.kind}`}><strong>{toast.title}</strong><span>{toast.body}</span></div>)}</div>
      <div className="corner-note">المجلد 01<br /><span>أرشيف الاكتشافات الصغيرة</span></div>
      <div className="copyright-note">© {new Date().getFullYear()} Abdel Aziz — جميع الحقوق محفوظة<br /><span>All Rights Reserved. Unauthorized copying, deployment, or reuse of this work or its source code is prohibited.</span></div>
    </main>
  );
}
