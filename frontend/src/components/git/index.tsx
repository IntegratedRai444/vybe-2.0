import React, { useState } from 'react';
import { GitBranch, GitCommit, GitPullRequest, GitMerge, GitFork, Plus, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';

interface GitFile {
  path: string;
  status: 'staged' | 'unstaged' | 'untracked' | 'conflicted';
  changes: {
    added: number;
    deleted: number;
  };
}

interface GitCommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  isHead?: boolean;
}

interface GitOperationsProps {
  branch: string;
  branches: string[];
  status: 'clean' | 'dirty' | 'uncommitted' | 'conflict';
  stagedFiles: GitFile[];
  unstagedFiles: GitFile[];
  commits: GitCommitInfo[];
  currentCommit: GitCommitInfo | null;
  onStage: (files: string[]) => Promise<void>;
  onUnstage: (files: string[]) => Promise<void>;
  onCommit: (message: string) => Promise<{ success: boolean; error?: string }>;
  onPush: () => Promise<{ success: boolean; error?: string }>;
  onPull: () => Promise<{ success: boolean; error?: string }>;
  onCreateBranch: (name: string) => Promise<{ success: boolean; error?: string }>;
  onSwitchBranch: (name: string) => Promise<{ success: boolean; error?: string }>;
  onMerge: (branch: string) => Promise<{ success: boolean; error?: string }>;
  onResolveConflict: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  onRefresh: () => void;
  className?: string;
}

export const GitOperations: React.FC<GitOperationsProps> = ({
  branch,
  branches = [],
  status,
  stagedFiles = [],
  unstagedFiles = [],
  commits = [],
  currentCommit,
  onStage,
  onUnstage,
  onCommit,
  onPush,
  onPull,
  onCreateBranch,
  onSwitchBranch,
  onMerge,
  onResolveConflict,
  onRefresh,
  className,
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [activeTab, setActiveTab] = useState('changes');
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeBranch, setMergeBranch] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  const handleStage = (filePath: string) => {
    onStage([filePath]).catch(console.error);
  };

  const handleUnstage = (filePath: string) => {
    onUnstage([filePath]).catch(console.error);
  };

  const handleStageAll = () => {
    const files = unstagedFiles.map(f => f.path);
    if (files.length > 0) {
      onStage(files).catch(console.error);
    }
  };

  const handleUnstageAll = () => {
    const files = stagedFiles.map(f => f.path);
    if (files.length > 0) {
      onUnstage(files).catch(console.error);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    
    const { success, error } = await onCommit(commitMessage);
    if (success) {
      setCommitMessage('');
      setError(null);
    } else {
      setError(error || 'Failed to commit changes');
    }
  };

  const handlePush = async () => {
    try {
      setIsPushing(true);
      setError(null);
      const { success, error } = await onPush();
      if (!success) {
        setError(error || 'Failed to push changes');
      }
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    try {
      setIsPulling(true);
      setError(null);
      const { success, error } = await onPull();
      if (!success) {
        setError(error || 'Failed to pull changes');
      }
    } finally {
      setIsPulling(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    
    const { success, error } = await onCreateBranch(newBranchName);
    if (success) {
      setNewBranchName('');
      setIsCreatingBranch(false);
      setError(null);
    } else {
      setError(error || 'Failed to create branch');
    }
  };

  const handleMerge = async () => {
    if (!mergeBranch) return;
    
    try {
      setIsMerging(true);
      setError(null);
      const { success, error } = await onMerge(mergeBranch);
      if (!success) {
        setError(error || 'Failed to merge branch');
      } else {
        setMergeBranch('');
      }
    } finally {
      setIsMerging(false);
    }
  };

  const renderFileStatus = (file: GitFile) => {
    const { added, deleted } = file.changes || { added: 0, deleted: 0 };
    
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {file.status === 'conflicted' && (
          <span className="text-destructive">
            <AlertCircle className="inline w-3 h-3 mr-1" />
            Conflicts
          </span>
        )}
        {added > 0 && <span className="text-green-600">+{added}</span>}
        {deleted > 0 && <span className="text-red-600">-{deleted}</span>}
      </div>
    );
  };

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Git</h2>
            <div className="ml-2">
              <Badge variant={status === 'clean' ? 'outline' : 'secondary'}>  
                {branch}
                {status !== 'clean' && (
                  <span className="ml-2">
                    {status === 'uncommitted' && 'Uncommitted changes'}
                    {status === 'conflict' && 'Merge conflict'}
                    {status === 'dirty' && 'Modified'}
                  </span>
                )}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isPushing || isPulling}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", (isPushing || isPulling) && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="changes">Changes</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        <TabsContent value="changes" className="h-full p-0">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Staged Changes</h3>
                {stagedFiles.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnstageAll}
                    className="h-7 text-xs"
                  >
                    Unstage All
                  </Button>
                )}
              </div>
              
              <ScrollArea className={cn("border rounded-md", stagedFiles.length === 0 ? 'h-10' : 'h-32')}>
                {stagedFiles.length > 0 ? (
                  <div className="divide-y">
                    {stagedFiles.map((file) => (
                      <div key={file.path} className="px-3 py-2 text-sm flex justify-between items-center hover:bg-accent">
                        <div className="flex-1 truncate">{file.path}</div>
                        <div className="flex items-center gap-2">
                          {renderFileStatus(file)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleUnstage(file.path)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No staged changes
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="p-4 border-b flex-1">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Unstaged Changes</h3>
                {unstagedFiles.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStageAll}
                    className="h-7 text-xs"
                  >
                    Stage All
                  </Button>
                )}
              </div>
              
              <ScrollArea className={cn("border rounded-md", unstagedFiles.length === 0 ? 'h-10' : 'h-32')}>
                {unstagedFiles.length > 0 ? (
                  <div className="divide-y">
                    {unstagedFiles.map((file) => (
                      <div key={file.path} className="px-3 py-2 text-sm flex justify-between items-center hover:bg-accent">
                        <div className="flex-1 truncate">{file.path}</div>
                        <div className="flex items-center gap-2">
                          {renderFileStatus(file)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleStage(file.path)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No unstaged changes
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="p-4 border-t">
              <div className="space-y-2">
                <Input
                  placeholder="Commit message"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
                  disabled={stagedFiles.length === 0}
                />
                <div className="flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCommit}
                      disabled={stagedFiles.length === 0 || !commitMessage.trim()}
                    >
                      <GitCommit className="w-4 h-4 mr-2" />
                      Commit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePush}
                      disabled={isPushing || status === 'clean'}
                    >
                      {isPushing ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <GitPullRequest className="w-4 h-4 mr-2" />
                      )}
                      Push
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePull}
                      disabled={isPulling}
                    >
                      {isPulling ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <GitPullRequest className="w-4 h-4 mr-2 transform rotate-180" />
                      )}
                      Pull
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stagedFiles.length} staged • {unstagedFiles.length} unstaged
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="branches" className="h-full p-4">
          <div className="space-y-4 h-full flex flex-col">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-medium">Branches</h3>
                <div className="flex-1"></div>
                {!isCreatingBranch ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreatingBranch(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Branch
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Branch name"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleCreateBranch}
                      disabled={!newBranchName.trim()}
                    >
                      Create
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCreatingBranch(false);
                        setNewBranchName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <ScrollArea className="border rounded-md h-48">
                {branches.length > 0 ? (
                  <div className="divide-y">
                    {branches.map((b) => (
                      <div
                        key={b}
                        className={cn(
                          "px-3 py-2 text-sm flex justify-between items-center cursor-pointer hover:bg-accent",
                          b === branch && "bg-accent font-medium"
                        )}
                        onClick={() => b !== branch && onSwitchBranch(b)}
                      >
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{b}</span>
                          {b === branch && (
                            <Badge variant="outline" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        {b !== branch && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMergeBranch(b);
                            }}
                          >
                            <GitMerge className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No branches found
                  </div>
                )}
              </ScrollArea>
            </div>

            {mergeBranch && (
              <div className="mt-4 p-4 border rounded-md bg-muted/50">
                <h4 className="font-medium mb-2">Merge into {branch}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Merge changes from <span className="font-mono">{mergeBranch}</span> into <span className="font-mono">{branch}</span>?
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleMerge}
                    disabled={isMerging}
                  >
                    {isMerging ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <GitMerge className="w-4 h-4 mr-2" />
                    )}
                    Merge
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMergeBranch('')}
                    disabled={isMerging}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="h-full p-4">
          <ScrollArea className="h-full">
            {commits.length > 0 ? (
              <div className="space-y-4">
                {commits.map((commit) => (
                  <div
                    key={commit.hash}
                    className={cn(
                      "p-3 border rounded-md",
                      commit.isHead && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{commit.message}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {commit.author} • {new Date(commit.date).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {commit.hash.substring(0, 7)}
                        </code>
                        {commit.isHead && (
                          <Badge variant="secondary">HEAD</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <GitCommit className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No commit history</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm flex items-center gap-2 border-t">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
