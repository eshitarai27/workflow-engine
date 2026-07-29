import { useEffect, useState } from "react";

/** Tracks the `dark` class on <html>, for the rare component (ReactFlow
 * diagrams) that needs a real hex color rather than a Tailwind class. */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const target = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(target.classList.contains("dark")));
    observer.observe(target, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
