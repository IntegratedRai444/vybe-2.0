// src/components/Debugger.tsx
import React, { useState, useEffect } from "react";
import { FaPlay, FaPause, FaStop, FaBug, FaCodeBranch, FaEye } from "react-icons/fa";

type Breakpoint = {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
  condition?: string;
  hitCount?: number;
};

type DebugSession = {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  currentFile?: string;
  currentLine?: number;
  variables: Array<{
    name: string;
    value: string;
    type: string;
    scope: string;
  }>;
  callStack: Array<{
    file: string;
    line: number;
    function: string;
  }>;
};

type Props = {
  filePath: string;
  onBreakpointToggle: (file: string, line: number) => void;
  onDebugStart: () => void;
  onDebugStop: () => void;
};

export const Debugger: React.FC<Props> = ({ filePath, onBreakpointToggle, onDebugStart, onDebugStop }) => {
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [debugSession, setDebugSession] = useState<DebugSession | null>(null);
  const [activeTab, setActiveTab] = useState<'breakpoints' | 'variables' | 'callstack' | 'watch'>('breakpoints');
  const [watchExpressions, setWatchExpressions] = useState<string[]>(['']);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugOutput] = useState<string[]>([]);

  useEffect(() => {
    loadBreakpoints();
    loadDebugSession();
  }, [filePath]);

  const loadBreakpoints = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/debug/breakpoints?file=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      setBreakpoints(data.breakpoints || []);
    } catch (error) {
      console.error('Failed to load breakpoints:', error);
    }
  };

  const loadDebugSession = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/debug/session');
      const data = await response.json();
      setDebugSession(data.session);
      setIsDebugging(data.session?.status === 'running' || data.session?.status === 'paused');
    } catch (error) {
      console.error('Failed to load debug session:', error);
    }
  };

  const toggleBreakpoint = async (file: string, line: number) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/debug/breakpoint/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, line })
      });
      
      if (response.ok) {
        onBreakpointToggle(file, line);
        loadBreakpoints();
      }
    } catch (error) {
      console.error('Failed to toggle breakpoint:', error);
    }
  };

  const startDebugging = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/debug/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: filePath })
      });
      
      if (response.ok) {
        setIsDebugging(true);
        onDebugStart();
        loadDebugSession();
      }
    } catch (error) {
      console.error('Failed to start debugging:', error);
    }
  };

  const stopDebugging = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/debug/stop', {
        method: 'POST'
      });
      
      if (response.ok) {
        setIsDebugging(false);
        onDebugStop();
        setDebugSession(null);
      }
    } catch (error) {
      console.error('Failed to stop debugging:', error);
    }
  };

  const pauseDebugging = async () => {
    try {
      await fetch('http://127.0.0.1:8000/debug/pause', { method: 'POST' });
      loadDebugSession();
    } catch (error) {
      console.error('Failed to pause debugging:', error);
    }
  };

  const resumeDebugging = async () => {
    try {
      await fetch('http://127.0.0.1:8000/debug/resume', { method: 'POST' });
      loadDebugSession();
    } catch (error) {
      console.error('Failed to resume debugging:', error);
    }
  };

  const stepOver = async () => {
    try {
      await fetch('http://127.0.0.1:8000/debug/step-over', { method: 'POST' });
      loadDebugSession();
    } catch (error) {
      console.error('Failed to step over:', error);
    }
  };

  const stepInto = async () => {
    try {
      await fetch('http://127.0.0.1:8000/debug/step-into', { method: 'POST' });
      loadDebugSession();
    } catch (error) {
      console.error('Failed to step into:', error);
    }
  };

  const stepOut = async () => {
    try {
      await fetch('http://127.0.0.1:8000/debug/step-out', { method: 'POST' });
      loadDebugSession();
    } catch (error) {
      console.error('Failed to step out:', error);
    }
  };

  const addWatchExpression = () => {
    setWatchExpressions([...watchExpressions, '']);
  };

  const updateWatchExpression = (index: number, value: string) => {
    const newExpressions = [...watchExpressions];
    newExpressions[index] = value;
    setWatchExpressions(newExpressions);
  };

  const removeWatchExpression = (index: number) => {
    const newExpressions = watchExpressions.filter((_, i) => i !== index);
    setWatchExpressions(newExpressions);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="p-2 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <FaBug className="text-red-400" />
            <span className="font-medium">Debugger</span>
            {debugSession && (
              <span className={`text-xs px-2 py-1 rounded ${
                debugSession.status === 'running' ? 'bg-green-600' :
                debugSession.status === 'paused' ? 'bg-yellow-600' :
                debugSession.status === 'stopped' ? 'bg-gray-600' :
                'bg-red-600'
              }`}>
                {debugSession.status}
              </span>
            )}
          </div>
          
          {/* Debug controls */}
          <div className="flex space-x-1">
            {!isDebugging ? (
              <button
                className="p-1 bg-green-600 hover:bg-green-700 rounded"
                onClick={startDebugging}
                title="Start Debugging"
              >
                <FaPlay className="w-3 h-3" />
              </button>
            ) : (
              <>
                <button
                  className="p-1 bg-yellow-600 hover:bg-yellow-700 rounded"
                  onClick={debugSession?.status === 'paused' ? resumeDebugging : pauseDebugging}
                  title={debugSession?.status === 'paused' ? 'Resume' : 'Pause'}
                >
                  {debugSession?.status === 'paused' ? <FaPlay className="w-3 h-3" /> : <FaPause className="w-3 h-3" />}
                </button>
                <button
                  className="p-1 bg-blue-600 hover:bg-blue-700 rounded"
                  onClick={stepOver}
                  title="Step Over"
                >
                  <FaPlay className="w-3 h-3" />
                </button>
                <button
                  className="p-1 bg-blue-600 hover:bg-blue-700 rounded"
                  onClick={stepInto}
                  title="Step Into"
                >
                  <FaPlay className="w-3 h-3" />
                </button>
                <button
                  className="p-1 bg-blue-600 hover:bg-blue-700 rounded"
                  onClick={stepOut}
                  title="Step Out"
                >
                  <FaPlay className="w-3 h-3" />
                </button>
                <button
                  className="p-1 bg-red-600 hover:bg-red-700 rounded"
                  onClick={stopDebugging}
                  title="Stop Debugging"
                >
                  <FaStop className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex space-x-1">
          {[
            { id: 'breakpoints', label: 'Breakpoints', icon: FaCodeBranch },
            { id: 'variables', label: 'Variables', icon: FaEye },
            { id: 'callstack', label: 'Call Stack', icon: FaCodeBranch },
            { id: 'watch', label: 'Watch', icon: FaEye }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`px-3 py-1 rounded text-sm flex items-center space-x-1 ${
                activeTab === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
              onClick={() => setActiveTab(id as any)}
            >
              <Icon className="w-3 h-3" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {/* Breakpoints Tab */}
        {activeTab === 'breakpoints' && (
          <div className="p-2">
            <div className="space-y-1">
              {breakpoints.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">No breakpoints set</div>
              ) : (
                breakpoints.map((bp) => (
                  <div
                    key={bp.id}
                    className="flex items-center p-2 hover:bg-gray-800 rounded group"
                  >
                    <input
                      type="checkbox"
                      checked={bp.enabled}
                      onChange={() => toggleBreakpoint(bp.file, bp.line)}
                      className="mr-2"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{bp.file}</div>
                      <div className="text-xs text-gray-400">Line {bp.line}</div>
                      {bp.condition && (
                        <div className="text-xs text-blue-400">Condition: {bp.condition}</div>
                      )}
                      {bp.hitCount && (
                        <div className="text-xs text-green-400">Hit: {bp.hitCount}</div>
                      )}
                    </div>
                    <button
                      className="p-1 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100"
                      onClick={() => toggleBreakpoint(bp.file, bp.line)}
                    >
                      <FaCodeBranch className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Variables Tab */}
        {activeTab === 'variables' && (
          <div className="p-2">
            {debugSession?.variables.length === 0 ? (
              <div className="p-4 text-gray-500 text-center">No variables available</div>
            ) : (
              <div className="space-y-1">
                {debugSession?.variables.map((variable, index) => (
                  <div key={index} className="p-2 bg-gray-800 rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{variable.name}</span>
                      <span className="text-xs text-gray-400">{variable.type}</span>
                    </div>
                    <div className="text-sm text-gray-300 mt-1">{variable.value}</div>
                    <div className="text-xs text-gray-500">{variable.scope}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call Stack Tab */}
        {activeTab === 'callstack' && (
          <div className="p-2">
            {debugSession?.callStack.length === 0 ? (
              <div className="p-4 text-gray-500 text-center">No call stack available</div>
            ) : (
              <div className="space-y-1">
                {debugSession?.callStack.map((frame, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded ${
                      index === 0 ? 'bg-blue-900' : 'bg-gray-800'
                    }`}
                  >
                    <div className="text-sm font-medium">{frame.function}</div>
                    <div className="text-xs text-gray-400">{frame.file}:{frame.line}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Watch Tab */}
        {activeTab === 'watch' && (
          <div className="p-2">
            <div className="space-y-2">
              {watchExpressions.map((expression, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={expression}
                    onChange={(e) => updateWatchExpression(index, e.target.value)}
                    placeholder="Enter expression to watch..."
                    className="flex-1 p-2 bg-gray-800 border border-gray-600 rounded text-sm"
                  />
                  <button
                    className="p-2 bg-red-600 hover:bg-red-700 rounded"
                    onClick={() => removeWatchExpression(index)}
                  >
                    <FaStop className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                onClick={addWatchExpression}
              >
                Add Watch Expression
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Debug Output */}
      {debugOutput.length > 0 && (
        <div className="border-t border-gray-700 p-2">
          <div className="text-xs text-gray-400 mb-1">Debug Output:</div>
          <div className="text-xs font-mono max-h-20 overflow-y-auto">
            {debugOutput.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
