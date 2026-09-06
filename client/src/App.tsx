// Quiet Study Hall shell: React هو الإطار، وBabylon.js هو العالم الكامل.
import GameCanvas from "./components/GameCanvas";
import "./orientation.css";

export default function App() {
  return (
    <>
      <GameCanvas />
      <div className="orientation-lock" aria-live="polite">
        <div className="orientation-lock-card">
          <div className="orientation-lock-icon" aria-hidden="true" />
          <strong>أدر الهاتف بالعرض</strong>
          <span>المكتبة ثلاثية الأبعاد مصممة لتملأ شاشة الهاتف في الوضع الأفقي.</span>
          <small>↻ ثم استمتع باستكشاف المكتبة</small>
        </div>
      </div>
    </>
  );
}
