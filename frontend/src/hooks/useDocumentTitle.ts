import { useEffect } from "react";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · RoadSafe AI` : "RoadSafe AI";
    return () => {
      document.title = previous;
    };
  }, [title]);
}
