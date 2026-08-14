import React, { useState } from "react";
import { useGit } from "../../contexts/GitContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  GitBranch,
  GitCommit,
  Plus,
  RefreshCw,
  X,
  Upload,
  Download,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const GitSettings: React.FC = () => {
  const {
    status = {
      changes: {
        staged: [],
        unstaged: [],
        untracked: [],
      },
      ahead: 0,
      behind: 0,
    },
    isLoading,
    error,
    refreshStatus,
    stageFiles,
    unstageFiles,
    commit: commitChanges,
    pull,
    push,
    createBranch,
    checkoutBranch,
    fetchBranches,
    currentBranch = "",
    branches = [],
    lastUpdated,
    isInitialized = false,
  } = useGit();

  const [commitMessage, setCommitMessage] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [showNewBranchInput, setShowNewBranchInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<
    Record<string, "staged" | "unstaged">
  >({});

  // Format last updated time
  const lastUpdatedText = lastUpdated
    ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}`
    : "Never updated";

  // Handle file selection
  const toggleFileSelection = (filePath: string, isStaged: boolean) => {
    setSelectedFiles((prev) => ({
      ...prev,
      [filePath]: isStaged ? "unstaged" : "staged",
    }));
  };

  // Handle stage/unstage all
  const handleStageAll = async () => {
    try {
      if (!status) return;
      const filesToStage = [
        ...status.changes.unstaged,
        ...status.changes.untracked,
      ];
      await stageFiles(filesToStage);
      setSelectedFiles({});
    } catch (error) {
      console.error("Failed to stage all files:", error);
    }
  };

  // Handle commit
  const handleCommit = async () => {
    if (!commitMessage.trim() || !status?.changes.staged.length) return;

    try {
      setIsCommitting(true);
      const success = await commitChanges(commitMessage);
      if (success) {
        setCommitMessage("");
      }
    } catch (error) {
      console.error("Failed to commit:", error);
    } finally {
      setIsCommitting(false);
    }
  };

  // Handle pull
  const handlePull = async () => {
    try {
      setIsSubmitting(true);
      await pull();
    } catch (error) {
      console.error("Failed to pull:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle push
  const handlePush = async () => {
    try {
      setIsSubmitting(true);
      await push();
    } catch (error) {
      console.error("Failed to push:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle create branch
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    try {
      setIsCreatingBranch(true);
      setIsSubmitting(true);
      const success = await createBranch(newBranchName);
      if (success) {
        setNewBranchName("");
        setShowNewBranchInput(false);
        await fetchBranches();
      }
    } catch (error) {
      console.error("Failed to create branch:", error);
    } finally {
      setIsCreatingBranch(false);
      setIsSubmitting(false);
    }
  };

  // Handle branch selection
  const handleBranchChange = async (branchName: string) => {
    if (branchName === currentBranch) return;

    try {
      setIsSubmitting(true);
      await checkoutBranch(branchName);
    } catch (error) {
      console.error("Failed to checkout branch:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Apply selected changes
  const applySelectedChanges = async () => {
    const filesToStage = [];
    const filesToUnstage = [];

    for (const [filePath, action] of Object.entries(selectedFiles)) {
      if (action === "staged") {
        filesToStage.push(filePath);
      } else {
        filesToUnstage.push(filePath);
      }
    }

    try {
      if (filesToStage.length > 0) {
        await stageFiles(filesToStage);
      }

      if (filesToUnstage.length > 0) {
        await unstageFiles(filesToUnstage);
      }

      setSelectedFiles({});
    } catch (error) {
      console.error("Failed to apply changes:", error);
    }
  };

  // Toggle all files in a section
  const toggleAllFiles = (files: string[], isStaged: boolean) => {
    const newSelection = { ...selectedFiles };

    // Check if all files are already selected
    const allSelected = files.every(
      (file) => selectedFiles[file] === (isStaged ? "staged" : "unstaged"),
    );

    if (allSelected) {
      // Deselect all
      files.forEach((file) => {
        delete newSelection[file];
      });
    } else {
      // Select all
      files.forEach((file) => {
        newSelection[file] = isStaged ? "staged" : "unstaged";
      });
    }

    setSelectedFiles(newSelection);
  };

  if (isLoading && !isInitialized) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
        <h3 className="font-medium">Error loading Git repository</h3>
        <p className="text-sm mt-1">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={refreshStatus}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Version Control</h3>
          {currentBranch && (
            <div className="flex items-center mt-1 text-sm text-muted-foreground">
              <GitBranch className="w-3.5 h-3.5 mr-1.5" />
              <span className="font-mono text-xs">{currentBranch}</span>
              <span className="mx-2">•</span>
              <span className="text-xs">{lastUpdatedText}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStatus}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Branch Selector */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Current Branch
            </label>
            <div className="flex space-x-2">
              <Select
                value={currentBranch || ""}
                onValueChange={checkoutBranch}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center">
                    <GitBranch className="w-4 h-4 mr-2 text-blue-400" />
                    <SelectValue placeholder="Select a branch" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowNewBranchInput(true)}
                disabled={isSubmitting || isCreatingBranch}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Branch
              </Button>
            </div>
          </div>

          {showNewBranchInput && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Create Branch
              </label>
              <div className="flex space-x-2">
                <Input
                  placeholder="New branch name"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  disabled={isCreatingBranch}
                />
                <Button
                  onClick={handleCreateBranch}
                  disabled={!newBranchName.trim() || isCreatingBranch}
                >
                  {isCreatingBranch ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Changes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-300">Changes</h4>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStageAll}
                disabled={
                  !status?.changes.unstaged?.length &&
                  !status?.changes.untracked?.length
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Stage All
              </Button>
            </div>
          </div>

          <div className="border border-gray-700 rounded-md divide-y divide-gray-700 max-h-60 overflow-y-auto">
            {status.changes.staged.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                No staged changes
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {status.changes.staged.map((file) => (
                  <div
                    key={file}
                    className={`flex items-center p-2 hover:bg-gray-800/50 ${
                      selectedFiles[file] === "staged" ? "bg-blue-500/10" : ""
                    }`}
                    onClick={() => toggleFileSelection(file, true)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles[file] === "staged"}
                      onChange={() => toggleFileSelection(file, true)}
                      className="h-4 w-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 mr-3"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {file}
                      </p>
                      <p className="text-xs text-gray-400">Staged</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        className="text-gray-400 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          unstageFiles([file]);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Unstaged Changes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Unstaged Changes</h4>
            {(status?.changes.unstaged.length > 0 ||
              status?.changes.untracked.length > 0) && (
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allFiles = [
                      ...(status?.changes.unstaged || []),
                      ...(status?.changes.untracked || []),
                    ];
                    toggleAllFiles(allFiles, true);
                  }}
                  className="h-7 text-xs"
                >
                  {[
                    ...(status?.changes.unstaged || []),
                    ...(status?.changes.untracked || []),
                  ].every((f) => selectedFiles[f] === "staged")
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
            )}
          </div>
          <div
            className={`border rounded-md overflow-hidden ${
              status?.changes.unstaged.length ||
              status?.changes.untracked.length
                ? "border-amber-200 dark:border-amber-900/50"
                : "border-gray-200 dark:border-gray-800"
            }`}
          >
            {status?.changes.unstaged.length ||
            status?.changes.untracked.length ? (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {status.changes.unstaged.map((file) => (
                  <li
                    key={file}
                    className={`flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      selectedFiles[file] === "staged"
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                    onClick={() => toggleFileSelection(file, false)}
                  >
                    <div className="flex items-center space-x-2">
                      <GitCommit className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-mono truncate max-w-xs">
                        {file}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        stageFiles([file]);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                ))}
                {status.changes.untracked.map((file) => (
                  <li
                    key={file}
                    className={`flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      selectedFiles[file] === "staged"
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                    onClick={() => toggleFileSelection(file, false)}
                  >
                    <div className="flex items-center space-x-2">
                      <Plus className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-mono truncate max-w-xs">
                        {file}
                        <span className="ml-2 text-xs text-muted-foreground">
                          (untracked)
                        </span>
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        stageFiles([file]);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No unstaged changes
              </div>
            )}
          </div>
        </div>

        {/* Selected Changes Actions */}
        {Object.keys(selectedFiles).length > 0 && (
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFiles({})}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={applySelectedChanges}>
              Apply Changes
            </Button>
          </div>
        )}

        {/* Commit */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Commit Message
          </label>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter commit message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              disabled={isCommitting || !status?.changes.staged.length}
            />
            <Button
              onClick={handleCommit}
              disabled={
                !commitMessage.trim() ||
                isCommitting ||
                !status?.changes.staged.length
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCommitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Committing...
                </>
              ) : (
                "Commit"
              )}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePull}
            disabled={isSubmitting || isLoading}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Pull
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePush}
            disabled={isSubmitting || isLoading || !status?.ahead}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Push {status?.ahead ? `(${status.ahead}↑)` : ""}
          </Button>
          {status && (status.behind > 0 || status.ahead > 0) && (
            <div className="flex items-center text-sm text-muted-foreground">
              {status.behind > 0 && (
                <span className="flex items-center mr-4">
                  <ArrowDown className="w-4 h-4 mr-1 text-amber-500" />
                  {status.behind}
                </span>
              )}
              {status.ahead > 0 && (
                <span className="flex items-center">
                  <ArrowUp className="w-4 h-4 mr-1 text-green-500" />
                  {status.ahead}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GitSettings;
