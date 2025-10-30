import React, { useState } from "react";

interface AnalysisButtonProps {
  projectRoot: string;
  currentFile?: string;
}

interface AnalysisResults {
  fileAnalysis?: any;
  projectAnalysis?: any;
  codeSmells?: any;
  complexity?: any;
  testResults?: any;
  profilingResults?: any;
}

export const AnalysisButton: React.FC<AnalysisButtonProps> = ({ projectRoot, currentFile }) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults>({});
  const [activeTab, setActiveTab] = useState<string>("overview");

  const runFullAnalysis = async () => {
    setLoading(true);
    setShowModal(true);
    const newResults: AnalysisResults = {};

    try {
      const projectAnalysis = await fetch("http://localhost:8000/analysis/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_path: projectRoot }),
      }).then(r => r.json());
      newResults.projectAnalysis = projectAnalysis;

      if (currentFile) {
        const fileAnalysis = await fetch("http://localhost:8000/analysis/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_path: projectRoot, file_path: currentFile }),
        }).then(r => r.json());
        newResults.fileAnalysis = fileAnalysis;

        const smells = await fetch("http://localhost:8000/analysis/code-smells", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_path: projectRoot, file_path: currentFile }),
        }).then(r => r.json());
        newResults.codeSmells = smells;

        const complexity = await fetch("http://localhost:8000/analysis/complexity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_path: projectRoot, file_path: currentFile }),
        }).then(r => r.json());
        newResults.complexity = complexity;
      }

      const testDiscovery = await fetch("http://localhost:8000/testing/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_path: projectRoot }),
      }).then(r => r.json());
      newResults.testResults = testDiscovery;

      setResults(newResults);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };



  const renderMetricValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    if (value === undefined || value === null) {
      return 'N/A';
    }
    return value.toString();
  };

  return (
    <>
      <button
        onClick={runFullAnalysis}
        className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm font-medium transition-colors"
        title="Run Code Analysis"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>Analyze</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-100 flex items-center space-x-2">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Code Analysis Results</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex border-b border-gray-700 px-4">
              {["overview", "metrics", "smells", "complexity", "tests"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Analyzing code...</p>
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === "overview" && results.projectAnalysis && (
                    <div className="space-y-4">
                      {/* Content for overview tab */}
                    </div>
                  )}

                  {activeTab === "metrics" && results.projectAnalysis && (
                    <div className="space-y-4">
                      <div className="bg-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-100 mb-3">Project Metrics</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {Object.entries(results.projectAnalysis.total_metrics || {}).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                              <span className="text-gray-200 font-mono">{renderMetricValue(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Rest of the tabs content */}
                </>
              )}
            </div>

            <div className="p-4 border-t border-gray-700 flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 text-sm font-medium"
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