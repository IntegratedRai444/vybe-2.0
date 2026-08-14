// src/components/componentRegistry.ts
// This file serves as a central registry for all components in the application

// ===== LAYOUT COMPONENTS =====
import { Header } from "./Header";
import { MainLayout } from "./layout/MainLayout";

// ===== AI COMPONENTS =====
import { AIChatPanel } from "./ai/AIChatPanel";
import { AICodeEditor } from "./ai/AICodeEditor";
import { AIPanel } from "./ai/AIPanel";

// ===== EDITOR COMPONENTS =====
import { EditorLayout } from "./editor/EditorLayout";
import { CodeEditor } from "./editor/CodeEditor";
import { EditorTabs } from "./editor/EditorTabs";
import { EditorSettings } from "./editor/EditorSettings";
import { FormatSettings } from "./editor/FormatSettings";
import { InlineCompletion } from "./editor/InlineCompletion";

// ===== COMMON COMPONENTS =====
import { AnalysisButton } from "./common/AnalysisButton";
import { ConnectionStatus } from "./common/ConnectionStatus";
import { ErrorBoundary } from "./common/ErrorBoundary";
import { PanelContainer } from "./common/PanelContainer";
import { PanelSwitcher } from "./common/PanelSwitcher";
import { TerminalPane } from "./common/TerminalPane";

// ===== UI COMPONENTS =====
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Select } from "./ui/Select";
import { Tabs } from "./ui/Tabs";

// ===== EXPORT ALL COMPONENTS =====
const Components = {
  // Layout
  Header,
  MainLayout,

  // AI
  AIChatPanel,
  AICodeEditor,
  AIPanel,

  // Editor
  EditorLayout,
  CodeEditor,
  EditorTabs,
  EditorSettings,
  FormatSettings,
  InlineCompletion,

  // Common
  AnalysisButton,
  ConnectionStatus,
  ErrorBoundary,
  PanelContainer,
  PanelSwitcher,
  TerminalPane,

  // UI
  Button,
  Input,
  Label,
  Select,
  Tabs,
};

// Default export for backward compatibility
export const componentRegistry = Components;

export type ComponentName = keyof typeof Components;

// Named exports
export { componentRegistry };
export default componentRegistry;
