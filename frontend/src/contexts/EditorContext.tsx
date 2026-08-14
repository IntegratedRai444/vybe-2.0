import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from "react";

interface EditorState {
  content: string;
  language: string;
  theme: string;
  fontSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: "on" | "off" | "relative" | "interval";
  // Add other editor-specific states as needed
}

interface EditorContextType extends EditorState {
  setContent: (content: string) => void;
  setLanguage: (language: string) => void;
  setTheme: (theme: string) => void;
  setFontSize: (size: number) => void;
  toggleWordWrap: () => void;
  toggleMinimap: () => void;
  // Add other editor actions as needed
}

const defaultState: EditorState = {
  content: "",
  language: "typescript",
  theme: "vs-dark",
  fontSize: 14,
  wordWrap: true,
  minimap: true,
  lineNumbers: "on",
};

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<EditorState>(defaultState);

  const setContent = useCallback((content: string) => {
    setState((prev) => ({ ...prev, content }));
  }, []);

  const setLanguage = useCallback((language: string) => {
    setState((prev) => ({ ...prev, language }));
  }, []);

  const setTheme = useCallback((theme: string) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    setState((prev) => ({ ...prev, fontSize }));
  }, []);

  const toggleWordWrap = useCallback(() => {
    setState((prev) => ({ ...prev, wordWrap: !prev.wordWrap }));
  }, []);

  const toggleMinimap = useCallback(() => {
    setState((prev) => ({ ...prev, minimap: !prev.minimap }));
  }, []);

  return (
    <EditorContext.Provider
      value={{
        ...state,
        setContent,
        setLanguage,
        setTheme,
        setFontSize,
        toggleWordWrap,
        toggleMinimap,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
};
