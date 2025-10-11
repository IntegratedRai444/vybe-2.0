// src/components/GitPanel.tsx
import React, { useEffect, useState } from "react";
import { FaFile, FaCheck, FaMinus, FaGitAlt, FaCodeBranch, FaUndo, FaPlay, FaDownload, FaUpload, FaEye, FaPlus, FaTrash } from "react-icons/fa";

type GitFile = {
  path: string;
  status: string; // "M", "A", "??", "D", "R", "C", "U"
};

type GitBranch = {
  name: string;
  current: boolean;
  ahead: number;
  behind: number;
  lastCommit: string;
  author: string;
};

type GitRemote = {
  name: string;
  url: string;
};

type MergeConflict = {
  file: string;
  status: string;
  conflicts: Array<{
    start: number;
    end: number;
    ours: string;
    theirs: string;
  }>;
};

type Props = {
  root: string;
  onSelectFile: (relPath: string) => void; // to show diff in terminal side‑panel
};

export const GitPanel: React.FC<Props> = ({ root, onSelectFile }) => {
  const [files, setFiles] = useState<GitFile[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'branches' | 'remotes' | 'conflicts'>('status');
  const [commitMessage, setCommitMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [conflicts, setConflicts] = useState<MergeConflict[]>([]);
  const [newBranchName, setNewBranchName] = useState("");
  const [showNewBranch, setShowNewBranch] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`http://127.0.0.1:8000/git/status?root=${encodeURIComponent(root)}`);
      const data = await resp.json();
      setFiles(data.files || []);
      setCurrentBranch(data.currentBranch || "");
    } catch (error) {
      console.error("Failed to load git status:", error);
    }
    setLoading(false);
  };

  const loadBranches = async () => {
    try {
      const resp = await fetch(`http://127.0.0.1:8000/git/branches?root=${encodeURIComponent(root)}`);
      const data = await resp.json();
      setBranches(data.branches || []);
    } catch (error) {
      console.error("Failed to load branches:", error);
    }
  };

  const loadRemotes = async () => {
    try {
      const resp = await fetch(`http://127.0.0.1:8000/git/remotes?root=${encodeURIComponent(root)}`);
      const data = await resp.json();
      setRemotes(data.remotes || []);
    } catch (error) {
      console.error("Failed to load remotes:", error);
    }
  };

  const loadConflicts = async () => {
    try {
      const resp = await fetch(`http://127.0.0.1:8000/git/conflicts?root=${encodeURIComponent(root)}`);
      const data = await resp.json();
      setConflicts(data.conflicts || []);
    } catch (error) {
      console.error("Failed to load conflicts:", error);
    }
  };

  useEffect(() => {
    if (root) {
      loadStatus();
      loadBranches();
      loadRemotes();
      loadConflicts();
    }
  }, [root]);

  const statusIcon = (s: string) => {
    switch (s) {
      case "M": return <FaMinus className="text-yellow-400" title="Modified" />;
      case "A": return <FaCheck className="text-green-400" title="Added" />;
      case "D": return <FaTrash className="text-red-400" title="Deleted" />;
      case "R": return <FaUndo className="text-blue-400" title="Renamed" />;
      case "C": return <FaCheck className="text-green-400" title="Copied" />;
      case "U": return <FaCodeBranch className="text-purple-400" title="Unmerged" />;
      case "??": return <FaFile className="text-gray-400" title="Untracked" />;
      default: return <FaFile />;
    }
  };

  const stageFile = async (filePath: string) => {
    try {
      await fetch(`http://127.0.0.1:8000/git/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root, files: [filePath] })
      });
      loadStatus();
    } catch (error) {
      console.error("Failed to stage file:", error);
    }
  };

  // Removed unused function

  const commitChanges = async () => {
    if (!commitMessage.trim()) return;
    try {
      await fetch(`http://127.0.0.1:8000/git/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root, message: commitMessage })
      });
      setCommitMessage("");
      loadStatus();
    } catch (error) {
      console.error("Failed to commit:", error);
    }
  };

  const pushChanges = async () => {
    try {
      await fetch(`http://127.0.0.1:8000/git/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root })
      });
      loadBranches();
    } catch (error) {
      console.error("Failed to push:", error);
    }
  };

  const pullChanges = async () => {
    try {
      await fetch(`http://127.0.0.1:8000/git/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root })
      });
      loadStatus();
      loadBranches();
    } catch (error) {
      console.error("Failed to pull:", error);
    }
  };

  const checkoutBranch = async (branchName: string) => {
    try {
      await fetch(`http://127.0.0.1:8000/git/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root, branch: branchName })
      });
      loadBranches();
      loadStatus();
    } catch (error) {
      console.error("Failed to checkout branch:", error);
    }
  };

  const createBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      await fetch(`http://127.0.0.1:8000/git/branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root, name: newBranchName })
      });
      setNewBranchName("");
      setShowNewBranch(false);
      loadBranches();
    } catch (error) {
      console.error("Failed to create branch:", error);
    }
  };

  const deleteBranch = async (branchName: string) => {
    try {
      await fetch(`http://127.0.0.1:8000/git/branch`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root, name: branchName })
      });
      loadBranches();
    } catch (error) {
      console.error("Failed to delete branch:", error);
    }
  };

  const resolveConflict = async (filePath: string, resolution: 'ours' | 'theirs' | 'manual') => {
    try {
      await fetch(`http://127.0.0.1:8000/git/resolve-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root, file: filePath, resolution })
      });
      loadConflicts();
      loadStatus();
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header with tabs */}
      <div className="p-2 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <FaGitAlt className="text-blue-400" />
            <span className="font-medium">Git</span>
            {currentBranch && (
              <span className="text-sm text-gray-400">({currentBranch})</span>
            )}
          </div>
          <button
            className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700 text-sm"
            onClick={() => {
              loadStatus();
              loadBranches();
              loadRemotes();
              loadConflicts();
            }}
          >
            ⟳ Refresh
          </button>
        </div>
        
        {/* Tab navigation */}
        <div className="flex space-x-1">
          {[
            { id: 'status', label: 'Status', icon: FaFile },
            { id: 'branches', label: 'Branches', icon: FaCodeBranch },
            { id: 'remotes', label: 'Remotes', icon: FaUpload },
            { id: 'conflicts', label: 'Conflicts', icon: FaCodeBranch }
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
        {loading ? (
          <div className="p-4 text-center">Loading…</div>
        ) : (
          <>
            {/* Status Tab */}
            {activeTab === 'status' && (
              <div className="p-2">
                {/* Quick actions */}
                <div className="flex space-x-2 mb-3">
                  <button
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center space-x-1"
                    onClick={pushChanges}
                  >
                    <FaUpload className="w-3 h-3" />
                    <span>Push</span>
                  </button>
                  <button
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center space-x-1"
                    onClick={pullChanges}
                  >
                    <FaDownload className="w-3 h-3" />
                    <span>Pull</span>
                  </button>
                </div>

                {/* Files list */}
                {files.length === 0 ? (
                  <div className="p-4 text-gray-500 text-center">Clean repo ✨</div>
                ) : (
                  <div className="space-y-1">
                    {files.map((f) => (
                      <div
                        key={f.path}
                        className="flex items-center p-2 hover:bg-gray-800 rounded group"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(f.path)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedFiles);
                            if (e.target.checked) {
                              newSelected.add(f.path);
                            } else {
                              newSelected.delete(f.path);
                            }
                            setSelectedFiles(newSelected);
                          }}
                          className="mr-2"
                        />
                        <span className="w-5">{statusIcon(f.status)}</span>
                        <span className="ml-2 flex-1 truncate" title={f.path}>{f.path}</span>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
                          <button
                            className="p-1 hover:bg-gray-700 rounded"
                            onClick={() => onSelectFile(f.path)}
                            title="View diff"
                          >
                            <FaEye className="w-3 h-3" />
                          </button>
                          {f.status !== 'A' && (
                            <button
                              className="p-1 hover:bg-gray-700 rounded"
                              onClick={() => stageFile(f.path)}
                              title="Stage"
                            >
                              <FaPlus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Commit section */}
                {files.some(f => f.status === 'A' || f.status === 'M') && (
                  <div className="mt-4 p-3 bg-gray-800 rounded">
                    <textarea
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Commit message..."
                      className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-sm resize-none"
                      rows={2}
                    />
                    <button
                      className="mt-2 px-4 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                      onClick={commitChanges}
                      disabled={!commitMessage.trim()}
                    >
                      Commit Changes
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Branches Tab */}
            {activeTab === 'branches' && (
              <div className="p-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Branches</h3>
                  <button
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center space-x-1"
                    onClick={() => setShowNewBranch(true)}
                  >
                    <FaPlus className="w-3 h-3" />
                    <span>New Branch</span>
                  </button>
                </div>

                {showNewBranch && (
                  <div className="mb-3 p-3 bg-gray-800 rounded">
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="Branch name..."
                      className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-sm"
                    />
                    <div className="flex space-x-2 mt-2">
                      <button
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                        onClick={createBranch}
                      >
                        Create
                      </button>
                      <button
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                        onClick={() => {
                          setShowNewBranch(false);
                          setNewBranchName("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  {branches.map((branch) => (
                    <div
                      key={branch.name}
                      className={`flex items-center p-2 rounded hover:bg-gray-800 ${
                        branch.current ? 'bg-blue-900' : ''
                      }`}
                    >
                      <FaCodeBranch className="w-4 h-4 mr-2" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={branch.current ? 'font-bold text-blue-300' : ''}>
                            {branch.name}
                          </span>
                          {branch.current && <span className="text-xs bg-blue-600 px-1 rounded">current</span>}
                        </div>
                        <div className="text-xs text-gray-400">
                          {branch.ahead > 0 && <span className="text-green-400">↑{branch.ahead}</span>}
                          {branch.behind > 0 && <span className="text-red-400">↓{branch.behind}</span>}
                          <span className="ml-2">{branch.lastCommit}</span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        {!branch.current && (
                          <>
                            <button
                              className="p-1 hover:bg-gray-700 rounded"
                              onClick={() => checkoutBranch(branch.name)}
                              title="Checkout"
                            >
                              <FaPlay className="w-3 h-3" />
                            </button>
                            <button
                              className="p-1 hover:bg-gray-700 rounded"
                              onClick={() => deleteBranch(branch.name)}
                              title="Delete"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remotes Tab */}
            {activeTab === 'remotes' && (
              <div className="p-2">
                <h3 className="font-medium mb-3">Remotes</h3>
                <div className="space-y-2">
                  {remotes.map((remote) => (
                    <div key={remote.name} className="p-2 bg-gray-800 rounded">
                      <div className="font-medium">{remote.name}</div>
                      <div className="text-sm text-gray-400">{remote.url}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conflicts Tab */}
            {activeTab === 'conflicts' && (
              <div className="p-2">
                <h3 className="font-medium mb-3">Merge Conflicts</h3>
                {conflicts.length === 0 ? (
                  <div className="p-4 text-gray-500 text-center">No conflicts ✨</div>
                ) : (
                  <div className="space-y-3">
                    {conflicts.map((conflict) => (
                      <div key={conflict.file} className="p-3 bg-red-900 rounded">
                        <div className="font-medium text-red-300">{conflict.file}</div>
                        <div className="text-sm text-gray-400 mb-2">{conflict.status}</div>
                        <div className="flex space-x-2">
                          <button
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                            onClick={() => resolveConflict(conflict.file, 'ours')}
                          >
                            Accept Ours
                          </button>
                          <button
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                            onClick={() => resolveConflict(conflict.file, 'theirs')}
                          >
                            Accept Theirs
                          </button>
                          <button
                            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
                            onClick={() => resolveConflict(conflict.file, 'manual')}
                          >
                            Manual Resolve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
