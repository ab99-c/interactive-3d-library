// Quiet Study Hall UI: واجهة نحاسية خفيفة فوق عالم المكتبة، لا تنافس المشهد وتظهر عند الحاجة.
import { useEffect, useRef, useState } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { BOOK_CATALOG, createGameScene, type BookScreenRect, type GameHandle } from "@/game/scene";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const [showHelp, setShowHelp] = useState(true);
  const [started, setStarted] = useState(false);
  const [bookRects, setBookRects] = useState<BookScreenRect[]>([]);
  const [hasActiveBook, setHasActiveBook] = useState(false);
  const openNearestBookRef = useRef<() => boolean>(() => false);
  const openBookByIdRef = useRef<(bookId: string) => boolean>(() => false);
  const openBookByMeshNameRef = useRef<(meshName: string) => boolean>(() => false);
  const returnActiveBookRef = useRef<() => boolean>(() => false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    let handle: GameHandle | null = null;
    let disposed = false;
    createGameScene(engine, canvas).then((nextHandle) => {
      if (disposed) { nextHandle.dispose(); return; }
      handle = nextHandle;
      openNearestBookRef.current = () => {
        const opened = nextHandle.openNearestBook();
        setHasActiveBook(nextHandle.hasActiveBook());
        return opened;
      };
      openBookByIdRef.current = (bookId) => {
        const opened = nextHandle.openBookById(bookId);
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
      engine.runRenderLoop(() => { nextHandle.scene.render(); setBookRects(nextHandle.getBookScreenRects()); });
      setStarted(true);
    });
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      openNearestBookRef.current = () => false;
      openBookByIdRef.current = () => false;
      openBookByMeshNameRef.current = () => false;
      returnActiveBookRef.current = () => false;
      setBookRects([]);
      setHasActiveBook(false);
      handle?.dispose();
      engine.dispose();
      startedRef.current = false;
    };
  }, []);

  return (
    <main className="library-game" aria-label="مكتبة 3D تفاعلية">
      <canvas ref={canvasRef} className="game-canvas" style={{ touchAction: "none" }} />
      <div className="hud-topline"><div className="brand-lockup"><img src="/manus-storage/library-mark_887f68d8.png" alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/library-mark.svg"; }} /><span>QUIET STUDY HALL</span></div><div className="status-pill"><i /> {started ? "OPEN FOR EXPLORATION" : "PREPARING THE HALL"}</div></div>
      <div className="hud-bottom"><div className="crosshair" aria-hidden="true">+</div><div className="controls"><span><b>W A S D</b> move</span><span><b>MOUSE</b> look</span><span><b>CLICK / E</b> inspect</span></div><div className="hud-actions"><button className="inspect-button" onClick={() => openNearestBookRef.current()}>Inspect nearest book <span>↗</span></button><button className="return-button" disabled={!hasActiveBook} onClick={() => returnActiveBookRef.current()}>Return book <span>↩</span></button><button className="help-button" onClick={() => setShowHelp((value) => !value)}>{showHelp ? "Hide guide" : "Guide"}</button></div></div>
      <nav className="book-picker" aria-label="Choose a book"><span className="book-picker-label">CHOOSE A BOOK</span><div className="book-picker-list">{BOOK_CATALOG.map((item) => <button key={item.id} onClick={() => { setShowHelp(false); openBookByIdRef.current(item.id); }}>{item.title}</button>)}</div></nav>
      {started && <div className="book-hotspots" aria-label="Clickable books">{bookRects.map((rect) => <button key={rect.meshName} className="book-hotspot" style={{ left: rect.x - rect.width / 2, top: rect.y - rect.height / 2, width: rect.width, height: rect.height }} aria-label={`Open ${rect.title}`} title={rect.title} onClick={() => { setShowHelp(false); openBookByMeshNameRef.current(rect.meshName); }}><span>{rect.title}</span></button>)}</div>}
      {showHelp && <section className="welcome-card"><div className="eyebrow">A ROOM FOR THE CURIOUS</div><h1>اختار رفاً،<br /><em>وخلي المكان يحكي.</em></h1><p>تجول بهدوء بين الرفوف. كل كتاب كيشير لحكاية مخبية فهاد القاعة.</p><div className="welcome-actions"><button className="enter-button" onClick={() => setShowHelp(false)}>Enter the library <span>↗</span></button><button className="enter-button sample-book-button" onClick={() => { setShowHelp(false); window.setTimeout(() => openNearestBookRef.current(), 80); }}>Open a sample book <span>↗</span></button></div></section>}
      <div className="corner-note">VOL. 01<br /><span>THE ARCHIVE OF SMALL DISCOVERIES</span></div>
    </main>
  );
}
