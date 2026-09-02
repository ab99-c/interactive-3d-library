import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Copyright watermark: a visible authorship record that does not affect interaction.
console.log(
  "%c© %s Abdel Aziz — قاعة الدراسة الهادئة\n%cAll Rights Reserved. Source is proprietary; unauthorized copying or redeployment is not permitted.",
  "color:#caa46a;font-weight:bold;font-size:13px;",
  new Date().getFullYear(),
  "color:#9a9a9a;font-size:11px;"
);

createRoot(document.getElementById("root")!).render(<App />);
