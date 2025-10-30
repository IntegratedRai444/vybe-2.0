import React, { useState } from 'react';
import { Cloud, Plus, ExternalLink, Trash2, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { DeploymentTarget, FileOperationResponse } from '../../types/fileSystem';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface DeploymentPanelProps {
  targets: DeploymentTarget[];
  currentTarget: DeploymentTarget | null;
  status: 'idle' | 'deploying' | 'success' | 'error';
  logs: string[];
  onDeploy: (targetId: string) => Promise<FileOperationResponse>;
  onAddTarget: (target: Omit<DeploymentTarget, 'id'>) => Promise<FileOperationResponse>;
  onRemoveTarget: (targetId: string) => Promise<FileOperationResponse>;
  onViewDeployment: (url: string) => void;
}

export const DeploymentPanel: React.FC<DeploymentPanelProps> = ({
  targets,
  currentTarget,
  status,
  logs,
  onDeploy,
  onAddTarget,
  onRemoveTarget,
  onViewDeployment,
}) => {
  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState<Omit<DeploymentTarget, 'id'>>({
    name: '',
    type: 'vercel',
    environment: {},
  });
  const [envKey, setEnvKey] = useState('');
  const [envValue, setEnvValue] = useState('');
  const [activeTab, setActiveTab] = useState('deploy');

  const handleAddEnvVar = () => {
    if (!envKey || !envValue) return;
    setNewTarget(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        [envKey]: envValue,
      },
    }));
    setEnvKey('');
    setEnvValue('');
  };

  const handleRemoveEnvVar = (key: string) => {
    const { [key]: _, ...rest } = newTarget.environment || {};
    setNewTarget(prev => ({
      ...prev,
      environment: rest,
    }));
  };

  const handleAddTarget = async () => {
    await onAddTarget(newTarget);
    setIsAddingTarget(false);
    setNewTarget({
      name: '',
      type: 'vercel',
      environment: {},
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">Deployed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in-progress':
        return <Badge variant="outline">In Progress</Badge>;
      default:
        return <Badge variant="outline">Not Deployed</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Deployment</h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deploy">Deploy</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <TabsContent value="deploy" className="space-y-4">
          {!isAddingTarget ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Deployment Targets</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingTarget(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Target
                </Button>
              </div>

              <div className="space-y-2">
                {targets.map((target) => (
                  <Card key={target.id} className="overflow-hidden">
                    <CardHeader className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{target.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            {target.type}
                            {target.url && (
                              <Button
                                variant="ghost"
                                size="xs"
                                className="h-6 px-2 text-xs"
                                onClick={() => onViewDeployment(target.url || '')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(target.status)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onRemoveTarget(target.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          {target.lastDeployed
                            ? `Last deployed: ${new Date(target.lastDeployed).toLocaleString()}`
                            : 'Not deployed yet'}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => onDeploy(target.id)}
                          disabled={status === 'deploying'}
                        >
                          {status === 'deploying' && target.id === currentTarget?.id ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          Deploy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {targets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Cloud className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No deployment targets configured</p>
                    <Button
                      variant="ghost"
                      className="mt-2"
                      onClick={() => setIsAddingTarget(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Deployment Target
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Add Deployment Target</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingTarget(false);
                    setNewTarget({
                      name: '',
                      type: 'vercel',
                      environment: {},
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="target-name">Name</Label>
                  <Input
                    id="target-name"
                    placeholder="Production"
                    value={newTarget.name}
                    onChange={(e) =>
                      setNewTarget({ ...newTarget, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-type">Provider</Label>
                  <Select
                    value={newTarget.type}
                    onValueChange={(value: DeploymentTarget['type']) =>
                      setNewTarget({ ...newTarget, type })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vercel">Vercel</SelectItem>
                      <SelectItem value="netlify">Netlify</SelectItem>
                      <SelectItem value="aws">AWS</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Environment Variables</Label>
                  <div className="space-y-2">
                    {Object.entries(newTarget.environment || {}).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <Input value={key} readOnly className="font-mono text-sm" />
                        <Input value={value} readOnly className="font-mono text-sm" />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEnvVar(key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Key"
                        value={envKey}
                        onChange={(e) => setEnvKey(e.target.value)}
                        className="font-mono text-sm"
                      />
                      <Input
                        placeholder="Value"
                        value={envValue}
                        onChange={(e) => setEnvValue(e.target.value)}
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddEnvVar}
                        disabled={!envKey || !envValue}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                <Button className="w-full" onClick={handleAddTarget}>
                  Save Deployment Target
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="h-full">
          <div className="h-full bg-black/5 dark:bg-white/5 rounded-md p-4 font-mono text-sm overflow-auto">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap break-words">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-center py-8">
                <p>No deployment logs yet</p>
                <p className="text-xs mt-2">
                  Deploy to see the logs here
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </div>

      {status === 'error' && (
        <div className="p-4 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Deployment failed. Check the logs for more details.</span>
        </div>
      )}
    </div>
  );
};
