import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Game from "./pages/Game";
import "./styles.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
