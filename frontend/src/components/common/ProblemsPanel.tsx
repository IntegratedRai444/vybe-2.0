import React, { useState } from "react";

type Problem = {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
  source?: string;
};

type Props = {
  problems: Problem[];
  onProblemClick: (file: string, line: number, column: number) => void;
};

export const ProblemsPanel: React.FC<Props> = ({
  problems,
  onProblemClick,
}) => {
  const [filter, setFilter] = useState<"all" | "errors" | "warnings">("all");

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <span className="text-red-400">❌</span>;
      case "warning":
        return <span className="text-yellow-400">⚠️</span>;
      case "info":
        return <span className="text-blue-400">ℹ️</span>;
      default:
        return <span className="text-gray-400">•</span>;
    }
  };

  const filteredProblems = problems.filter((p) => {
    if (filter === "errors") return p.severity === "error";
    if (filter === "warnings") return p.severity === "warning";
    return true;
  });

  const errorCount = problems.filter((p) => p.severity === "error").length;
  const warningCount = problems.filter((p) => p.severity === "warning").length;

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="p-2 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-sm font-medium">Problems</h3>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-red-400">{errorCount} errors</span>
            <span className="text-yellow-400">{warningCount} warnings</span>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center space-x-1">
          {["all", "errors", "warnings"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-2 py-1 text-xs rounded ${
                filter === f ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              {f === "all" ? "All" : f === "errors" ? "Errors" : "Warnings"}
            </button>
          ))}
        </div>
      </div>

      {/* Problems List */}
      <div className="flex-1 overflow-y-auto">
        {filteredProblems.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {problems.length === 0
              ? "No problems detected ✨"
              : `No ${filter} found`}
          </div>
        ) : (
          filteredProblems.map((problem, index) => (
            <div
              key={index}
              className="p-2 border-b border-gray-800 hover:bg-gray-800 cursor-pointer"
              onClick={() =>
                onProblemClick(problem.file, problem.line, problem.column)
              }
            >
              <div className="flex items-start space-x-2">
                <div className="mt-0.5">
                  {getSeverityIcon(problem.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white mb-1">
                    {problem.message}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center space-x-2">
                    <span className="truncate">
                      {problem.file.split(/[/\\]/).pop()}
                    </span>
                    <span>
                      Line {problem.line}, Column {problem.column}
                    </span>
                    {problem.source && (
                      <span className="bg-gray-700 px-1 rounded">
                        {problem.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {filteredProblems.length > 0 && (
        <div className="p-2 border-t border-gray-700 text-xs text-gray-400">
          Showing {filteredProblems.length} of {problems.length} problems
        </div>
      )}
    </div>
  );
};

// Exports
export { ProblemsPanel };
