import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Import emergency fix to allow multiple project placement
import "./fixes/fix-bay-drag-drop";

createRoot(document.getElementById("root")!).render(<App />);
