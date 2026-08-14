import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { DebuggerToolbar } from "./DebuggerToolbar";
import { Button } from "../ui/button";
import {
  X,
  Maximize2,
  Minimize2,
  Eye,
  Bug,
  List,
  Code,
  Terminal,
  AlertTriangle,
} from "lucide-react";
import { useDebugger } from "../../contexts/DebuggerContext";
import { WatchExpressions } from "./WatchExpressions";
import { ExceptionsPanel } from "./ExceptionsPanel";

interface DebuggerPanelProps {
  onClose?: () => void;
  className?: string;
}

export const DebuggerPanel: React.FC<DebuggerPanelProps> = ({
  onClose,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { isDebugging, isPaused, callStack, variables, output } = useDebugger();

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isDebugging && !isExpanded) {
    return (
      <div className={`fixed bottom-0 right-0 m-4 z-50 ${className}`}>
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleExpand}
          className="flex items-center space-x-2"
        >
          <Maximize2 className="h-4 w-4" />
          <span>Show Debugger</span>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-0 right-0 left-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg flex flex-col ${
        isExpanded ? "h-1/2" : "h-12"
      } ${className}`}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium">Debugger</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpand}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          <DebuggerToolbar />

          <div className="flex-1 overflow-hidden">
            <Tabs
              defaultValue="variables"
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex border-b">
                <TabsList className="rounded-none bg-transparent p-0">
                  <TabsTrigger
                    value="variables"
                    className="flex items-center gap-2"
                  >
                    <List className="h-4 w-4" /> Variables
                  </TabsTrigger>
                  <TabsTrigger
                    value="watch"
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" /> Watch
                  </TabsTrigger>
                  <TabsTrigger
                    value="exceptions"
                    className="flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" /> Exceptions
                  </TabsTrigger>
                  <TabsTrigger
                    value="callstack"
                    className="flex items-center gap-2"
                  >
                    <Code className="h-4 w-4" /> Call Stack
                  </TabsTrigger>
                  <TabsTrigger
                    value="breakpoints"
                    className="flex items-center gap-2"
                  >
                    <Bug className="h-4 w-4" /> Breakpoints
                  </TabsTrigger>
                  <TabsTrigger
                    value="console"
                    className="flex items-center gap-2"
                  >
                    <Terminal className="h-4 w-4" /> Console
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-auto">
                <TabsContent value="variables" className="m-0 h-full p-4">
                  <VariablesPanel variables={variables} />
                </TabsContent>

                <TabsContent value="watch" className="m-0 h-full p-0">
                  <WatchExpressions />
                </TabsContent>

                <TabsContent value="exceptions" className="m-0 h-full p-0">
                  <ExceptionsPanel />
                </TabsContent>

                <TabsContent value="callstack" className="m-0 h-full p-4">
                  <CallStackPanel callStack={callStack} />
                </TabsContent>

                <TabsContent value="breakpoints" className="m-0 h-full p-4">
                  <BreakpointsPanel />
                </TabsContent>

                <TabsContent value="console" className="m-0 h-full">
                  <ConsolePanel output={output} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
};

// Helper components for each tab
const VariablesPanel: React.FC<{ variables: Record<string, any> }> = ({
  variables,
}) => {
  if (!variables || Object.keys(variables).length === 0) {
    return (
      <div className="text-gray-500 text-sm p-2">No variables available</div>
    );
  }

  return (
    <div className="font-mono text-sm">
      {Object.entries(variables).map(([name, value]) => (
        <div key={name} className="flex items-baseline py-1">
          <span className="text-blue-600 dark:text-blue-400 mr-2">{name}:</span>
          <span className="text-gray-800 dark:text-gray-200">
            {typeof value === "object"
              ? JSON.stringify(value, null, 2)
              : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CallStackPanel: React.FC<{
  callStack: Array<{ name: string; file: string; line: number }>;
}> = ({ callStack }) => {
  if (!callStack || callStack.length === 0) {
    return <div className="text-gray-500 text-sm p-2">Call stack is empty</div>;
  }

  return (
    <div className="space-y-1">
      {callStack.map((frame, index) => (
        <div
          key={index}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <div className="font-medium">{frame.name || "(anonymous)"}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {frame.file}:{frame.line}
          </div>
        </div>
      ))}
    </div>
  );
};

const BreakpointsPanel: React.FC = () => {
  // This would be connected to the actual breakpoints state
  return (
    <div className="text-gray-500 text-sm p-2">
      No breakpoints set. Click in the gutter to add a breakpoint.
    </div>
  );
};

const ConsolePanel: React.FC<{ output: string[] }> = ({ output = [] }) => {
  if (output.length === 0) {
    return <div className="text-gray-500 text-sm p-2">No output yet</div>;
  }

  return (
    <div className="font-mono text-sm whitespace-pre-wrap">
      {output.map((line, i) => (
        <div key={i} className="py-0.5">
          {line}
        </div>
      ))}
    </div>
  );
};

// Exports
export { DebuggerPanel };
