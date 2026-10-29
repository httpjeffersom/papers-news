import { useCallback, useEffect, useState } from "react";
import { normalizeArticleRetentionDays } from "../utils/articleRetention.js";
import { loadRetentionDays, saveRetentionDays } from "../services/retention.js";

export function useRetentionDays() {
  const [retentionDays, setRetentionDaysState] = useState(loadRetentionDays);

  useEffect(() => {
    saveRetentionDays(retentionDays);
  }, [retentionDays]);

  const setRetentionDays = useCallback((next) => {
    setRetentionDaysState(normalizeArticleRetentionDays(next));
  }, []);

  return { retentionDays, setRetentionDays };
}
