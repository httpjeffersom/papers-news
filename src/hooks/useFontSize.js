import { useCallback, useEffect, useState } from "react";
import {
  applyFontSize,
  defaultFontSizeIndex,
  loadFontSize,
  normalizeFontSizeIndex,
  saveFontSize,
} from "../services/fontSize.js";

export function useFontSize() {
  const [fontSize, setFontSizeState] = useState(loadFontSize);

  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  useEffect(() => {
    saveFontSize(fontSize);
  }, [fontSize]);

  const setFontSize = useCallback((next) => {
    setFontSizeState(
      next === null || next === undefined
        ? defaultFontSizeIndex
        : normalizeFontSizeIndex(next),
    );
  }, []);

  return { fontSize, setFontSize };
}
