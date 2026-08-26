// Quiet Study Hall UI: واجهة نحاسية خفيفة فوق عالم المكتبة، لا تنافس المشهد وتظهر عند الحاجة.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Engine as BabylonEngine } from "@babylonjs/core/Engines/engine";
import type { BookScreenRect, GameHandle } from "@/game/scene";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const [showHelp, setShowHelp] = useState(true);
  const [started, setStarted] = useState(false);
  const [bookRects, setBookRects] = useState<BookScreenRect[]>([]);
  const bookRectsRef = useRef<BookScreenRect[]>([]);
  const [hasActiveBook, setHasActiveBook] = useState(false);
  const openNearestBookRef = useRef<() => boolean>(() => false);
  const openBookByMeshNameRef = useRef<(meshName: string) => boolean>(() => false);
  const returnActiveBookRef = useRef<() => boolean>(() => false);
  const turnActivePageRef = useRef<(direction: "rtl" | "ltr") => boolean>(() => false);
  const setTouchMoveRef = useRef<(x: number, y: number) => void>(() => undefined);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const joystickPointerRef = useRef<number | null>(null);

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
    window.addEventListener("library:book-state", onBookState);
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
      returnActiveBookRef.current = () => {
        const returned = nextHandle.returnActiveBook();
        setHasActiveBook(nextHandle.hasActiveBook());
        return returned;
      };
      turnActivePageRef.current = (direction) => nextHandle.turnActivePage(direction);
      setTouchMoveRef.current = nextHandle.setTouchMove;
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
    });
    const onResize = () => engine?.resize();
    window.addEventListener("resize", onResize);
    
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      openNearestBookRef.current = () => false;
      openBookByMeshNameRef.current = () => false;
      returnActiveBookRef.current = () => false;
      turnActivePageRef.current = () => false;
      setTouchMoveRef.current = () => undefined;
      window.removeEventListener("library:book-state", onBookState);
      bookRectsRef.current = [];
      setBookRects([]);
      setHasActiveBook(false);
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

  return (
    <main className="library-game" dir="rtl" aria-label="مكتبة ثلاثية الأبعاد تفاعلية">
      <canvas ref={canvasRef} className="game-canvas" style={{ touchAction: "none" }} />
      <div className="hud-topline"><div className="brand-lockup"><img src="/manus-storage/library-mark_887f68d8.png" alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/library-mark.svg"; }} /><span>قاعة الدراسة الهادئة</span></div><div className="status-pill"><i /> {started ? "مفتوحة للاستكشاف" : "يجري تجهيز القاعة"}</div></div>
      <div className="mobile-controls" aria-label="عناصر التحكم باللمس"><div ref={joystickRef} className="touch-joystick" onPointerDown={onJoystickPointerDown} onPointerMove={onJoystickPointerMove} onPointerUp={resetJoystick} onPointerCancel={resetJoystick}><div ref={joystickKnobRef} className="touch-joystick-knob" /></div></div>
      <div className="hud-bottom"><div className="crosshair" aria-hidden="true">+</div><div className="controls"><span><b>W A S D</b> تحرّك</span><span><b>حرّك الفأرة</b> لتدوير المشهد</span><span><b>نقر / E</b> للتفاعل</span></div><div className="hud-actions"><button className="inspect-button" onClick={() => openNearestBookRef.current()}>فحص أقرب كتاب <span>↗</span></button><div className="page-actions" aria-label="أزرار الكتاب"><button className="page-turn-button page-turn-left" hidden={!hasActiveBook} onClick={() => turnActivePageRef.current("ltr")}>اليسرى <span>→</span></button><button className="return-button" disabled={!hasActiveBook} onClick={() => returnActiveBookRef.current()}>إرجاع الكتاب <span>↩</span></button><button className="page-turn-button page-turn-right" hidden={!hasActiveBook} onClick={() => turnActivePageRef.current("rtl")}>اليمنى <span>←</span></button></div><button className="help-button" onClick={() => setShowHelp((value) => !value)}>{showHelp ? "إخفاء الدليل" : "إظهار الدليل"}</button></div></div>
      {started && <div className="book-hotspots" aria-label="كتب قابلة للتفاعل">{bookRects.map((rect) => <button key={rect.meshName} className="book-hotspot" style={{ left: rect.x - rect.width / 2, top: rect.y - rect.height / 2, width: rect.width, height: rect.height }} aria-label={`فتح ${rect.title}`} title={rect.title} onClick={() => { setShowHelp(false); openBookByMeshNameRef.current(rect.meshName); }}><span>{rect.title}</span></button>)}</div>}
      {showHelp && <section className="welcome-card"><div className="eyebrow">غرفة للفضوليين</div><h1>اختر رفاً،<br /><em>ودع المكان يروي حكايته.</em></h1><p>تجوّل بهدوء بين الرفوف. كل كتاب يقود إلى حكاية خفية في هذه القاعة.</p><div className="welcome-actions"><button className="enter-button" onClick={() => setShowHelp(false)}>ادخل إلى المكتبة <span>↗</span></button><button className="enter-button sample-book-button" onClick={() => { setShowHelp(false); window.setTimeout(() => openNearestBookRef.current(), 80); }}>افتح كتاباً مقترحاً <span>↗</span></button></div></section>}
      <div className="corner-note">المجلد 01<br /><span>أرشيف الاكتشافات الصغيرة</span></div>
    </main>
  );
}
