import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryProvider } from "./lib/query";
import { router } from "./routes/router";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </StrictMode>,
  );
}
