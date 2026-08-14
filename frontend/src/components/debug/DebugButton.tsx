import React, { useState } from "react";
import * as api from "../utils/api";

interface DebugButtonProps {
  projectRoot: string;
  onDebugComplete?: (results: any) => void;
}

export const DebugButton: React.FC<DebugButtonProps> = ({
  projectRoot,
  onDebugComplete,
}) => {
  const [isDebugging, setIsDebugging] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);

  const handleDebug = async (autoFix: boolean = false) => {
    if (!projectRoot) {
      alert("Please load a project first");
      return;
    }

    setIsDebugging(true);
    try {
      const results = await api.debugProject(projectRoot, autoFix);
      setDebugResults(results);
      setShowResults(true);
      if (onDebugComplete) {
        onDebugComplete(results);
      }
    } catch (error) {
      console.error("Debug failed:", error);
      alert(
        `Debug failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setIsDebugging(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "text-red-500";
      case "warning":
        return "text-yellow-500";
      case "info":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <>
      {/* Debug Button */}
      <div className="flex gap-2">
        <button
          onClick={() => handleDebug(false)}
          disabled={isDebugging || !projectRoot}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium flex items-center gap-2 transition-colors"
          title="Scan project for issues"
        >
          {isDebugging ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Scanning...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Debug
            </>
          )}
        </button>

        <button
          onClick={() => handleDebug(true)}
          disabled={isDebugging || !projectRoot}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium flex items-center gap-2 transition-colors"
          title="Scan and auto-fix issues"
        >
          {isDebugging ? "Fixing..." : "Auto-Fix"}
        </button>
      </div>

      {/* Results Modal */}
      {showResults && debugResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Debug Results
              </h2>
              <button
                onClick={() => setShowResults(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-750 border-b border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {debugResults.summary?.total_files || 0}
                  </div>
                  <div className="text-sm text-gray-400">Files Scanned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {debugResults.summary?.by_severity?.error || 0}
                  </div>
                  <div className="text-sm text-gray-400">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">
                    {debugResults.summary?.by_severity?.warning || 0}
                  </div>
                  <div className="text-sm text-gray-400">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {debugResults.summary?.by_severity?.info || 0}
                  </div>
                  <div className="text-sm text-gray-400">Info</div>
                </div>
              </div>

              {debugResults.fixes && (
                <div className="mt-4 p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded">
                  <div className="text-green-400 font-medium">
                    ✓ Fixed {debugResults.fixes.fixed_issues} /{" "}
                    {debugResults.fixes.total_issues} issues
                  </div>
                </div>
              )}
            </div>

            {/* Issues List */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Top Issues
              </h3>
              {debugResults.summary?.top_issues?.length > 0 ? (
                <div className="space-y-2">
                  {debugResults.summary.top_issues.map(
                    (issue: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-gray-750 p-3 rounded border border-gray-700 hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`font-mono text-xs px-2 py-1 rounded ${getSeverityColor(
                              issue.severity,
                            )} bg-opacity-20`}
                          >
                            {issue.severity.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-300 font-medium truncate">
                              {issue.file}:{issue.line}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              {issue.message}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Category: {issue.category}
                            </div>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-lg font-medium text-white">
                    No issues found!
                  </p>
                  <p className="text-sm">Your code looks great 🎉</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Scan completed in {debugResults.scan?.scan_time?.toFixed(2)}s
              </div>
              <button
                onClick={() => setShowResults(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Exports
export { DebugButton };
