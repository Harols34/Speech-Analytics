
import { useEffect, useState } from "react";
import { usePrompts, PromptType } from "./usePrompts";

export function usePromptLoader(type: PromptType, fallback: string) {
  const { activePrompt, loading } = usePrompts(type);
  const [loadedPrompt, setLoadedPrompt] = useState<string>(fallback);
  
  useEffect(() => {
    if (!loading && activePrompt) {
      setLoadedPrompt(activePrompt.content);
    } else if (!loading && !activePrompt) {
      setLoadedPrompt(fallback);
    }
  }, [activePrompt, fallback, loading]);

  return loadedPrompt;
}
