import React, { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useDebugger } from "../../contexts/DebuggerContext";

export interface ExceptionBreakpoint {
  id: string;
  filter: string;
  label: string;
  enabled: boolean;
}

const DEFAULT_EXCEPTIONS: ExceptionBreakpoint[] = [
  { id: "all", filter: "*", label: "All Exceptions", enabled: true },
  {
    id: "uncaught",
    filter: "uncaught",
    label: "Uncaught Exceptions",
    enabled: true,
  },
  {
    id: "user",
    filter: "user-unhandled",
    label: "User Unhandled Exceptions",
    enabled: false,
  },
];

export const ExceptionsPanel: React.FC = () => {
  const [exceptions, setExceptions] =
    useState<ExceptionBreakpoint[]>(DEFAULT_EXCEPTIONS);
  const [customException, setCustomException] = useState("");
  const { isDebugging } = useDebugger();

  const toggleException = useCallback((id: string) => {
    setExceptions((prev) =>
      prev.map((exp) =>
        exp.id === id ? { ...exp, enabled: !exp.enabled } : exp,
      ),
    );
  }, []);

  const addCustomException = useCallback(() => {
    if (!customException.trim()) return;

    const id = `custom-${Date.now()}`;
    setExceptions((prev) => [
      ...prev,
      {
        id,
        filter: customException.trim(),
        label: `Custom: ${customException.trim()}`,
        enabled: true,
      },
    ]);
    setCustomException("");
  }, [customException]);

  const removeException = useCallback((id: string) => {
    setExceptions((prev) => prev.filter((exp) => exp.id !== id));
  }, []);

  const applyExceptionFilters = useCallback(() => {
    if (!isDebugging) return;

    // Here you would typically send the exception filters to the debugger
    const activeFilters = exceptions
      .filter((exp) => exp.enabled)
      .map((exp) => exp.filter);

    console.log("Setting exception filters:", activeFilters);
    // TODO: Implement actual debugger API call
    // debuggerApi.setExceptionBreakpoints(activeFilters);
  }, [exceptions, isDebugging]);

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Exception Breakpoints</h3>
          <Button
            size="sm"
            onClick={applyExceptionFilters}
            disabled={!isDebugging}
          >
            Apply
          </Button>
        </div>

        <div className="space-y-2">
          {exceptions.map((exp) => (
            <div key={exp.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={exp.id}
                checked={exp.enabled}
                onChange={() => toggleException(exp.id)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor={exp.id} className="flex-1 ml-2">
                {exp.label}
              </label>
              {exp.id.startsWith("custom-") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeException(exp.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <div className="flex space-x-2">
            <select
              className="w-[180px] h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue=""
            >
              <option value="" disabled>
                Add exception...
              </option>
              <option value="uncaught">Uncaught Exceptions</option>
              <option value="user-unhandled">User Unhandled</option>
              <option value="all">All Exceptions</option>
            </select>
            <Input
              value={customException}
              onChange={(e) => setCustomException(e.target.value)}
              placeholder="Or enter custom filter..."
              className="flex-1"
            />
            <Button
              onClick={addCustomException}
              disabled={!customException.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>Configure which exceptions will break the debugger.</p>
      </div>
    </div>
  );
};

// Exports
export { ExceptionsPanel };
