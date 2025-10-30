import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, Loader2, Package, Check, X, Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '../ui/use-toast';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export interface PackageDependency {
  name: string;
  version: string;
  latestVersion?: string;
  description?: string;
  vulnerabilities?: Vulnerability[];
  isDev?: boolean;
  isOutdated?: boolean;
}

interface Vulnerability {
  id: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  patchedIn?: string;
  url: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface PackageManagerProps {
  projectRoot?: string;
  language?: string;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export const PackageManager: React.FC<PackageManagerProps> = ({
  projectRoot = '',
  language = 'python',
  onError,
  onSuccess,
}) => {
  const [dependencies, setDependencies] = useState<PackageDependency[]>([]);
  const [devDependencies, setDevDependencies] = useState<PackageDependency[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageDependency | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dependencies');
  const [isAuditing, setIsAuditing] = useState(false);
  
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();

  // Fetch packages from the API
  const fetchPackages = useCallback(async () => {
    if (!projectRoot) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/packages/list?project_root=${encodeURIComponent(projectRoot)}&language=${language}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }
      
      const data = await response.json();
      setDependencies(data.dependencies || []);
      setDevDependencies(data.devDependencies || []);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load packages';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectRoot, language, onError, toast]);

  // Load packages on mount and when projectRoot/language changes
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Handle package installation
  const handleInstall = async (pkgName: string, isDev: boolean = false) => {
    if (!pkgName) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/packages/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_name: pkgName,
          version: 'latest',
          is_dev: isDev,
          project_root: projectRoot,
          language,
        }),
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      await fetchPackages();
      onSuccess?.(`Successfully installed ${pkgName}`);
      toast({
        title: 'Success',
        description: `Successfully installed ${pkgName}`,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Installation failed';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle package removal
  const handleRemove = async (pkgName: string) => {
    if (!pkgName) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/packages/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_name: pkgName,
          project_root: projectRoot,
          language,
        }),
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      await fetchPackages();
      setSelectedPackage(null);
      onSuccess?.(`Successfully removed ${pkgName}`);
      toast({
        title: 'Success',
        description: `Successfully removed ${pkgName}`,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Removal failed';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle package update
  const handleUpdate = async (pkgName: string, version: string = 'latest') => {
    if (!pkgName) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/packages/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_name: pkgName,
          version,
          project_root: projectRoot,
          language,
        }),
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      await fetchPackages();
      onSuccess?.(`Successfully updated ${pkgName}`);
      toast({
        title: 'Success',
        description: `Successfully updated ${pkgName}`,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle security audit
  const handleAudit = async () => {
    if (!projectRoot) return;
    
    setIsAuditing(true);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/packages/audit?project_root=${encodeURIComponent(projectRoot)}&language=${language}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to audit packages');
      }
      
      const data = await response.json();
      
      // Update packages with vulnerability info
      if (data.vulnerabilities) {
        const updatePackages = (pkgs: PackageDependency[]) => 
            pkgs.map(pkg => ({
              ...pkg,
              vulnerabilities: data.vulnerabilities[pkg.name] || [],
            }));
        
        setDependencies(updatePackages(dependencies));
        setDevDependencies(updatePackages(devDependencies));
      }
      
      onSuccess?.('Security audit completed');
      toast({
        title: 'Audit Complete',
        description: 'Security audit completed successfully',
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Audit failed';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: 'Audit Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAuditing(false);
    }
  };

  // Filter packages based on search term
  const filteredDependencies = dependencies.filter(pkg => 
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredDevDependencies = devDependencies.filter(pkg => 
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render vulnerability information
  const renderVulnerabilities = (vulnerabilities: Vulnerability[] = []) => {
    if (!vulnerabilities.length) return null;
    
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Vulnerabilities</h4>
        <div className="space-y-2">
          {vulnerabilities.map((vuln) => (
            <div key={vuln.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{vuln.title}</p>
                  <p className="text-sm text-muted-foreground">{vuln.description}</p>
                </div>
                <Badge variant="destructive">{vuln.severity}</Badge>
              </div>
              {vuln.patchedIn && (
                <p className="mt-2 text-xs">
                  Fixed in: <span className="font-mono">{vuln.patchedIn}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render package details panel
  const renderPackageDetails = () => {
    if (!selectedPackage) return null;
    
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium">{selectedPackage.name}</h3>
            <div className="text-sm text-muted-foreground">
              v{selectedPackage.version}
              {selectedPackage.latestVersion && selectedPackage.isOutdated && (
                <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                  (Latest: v{selectedPackage.latestVersion})
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedPackage(null)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {selectedPackage.description && (
          <p className="text-sm mb-4">{selectedPackage.description}</p>
        )}
        
        <div className="flex space-x-2 mb-4">
          {selectedPackage.isOutdated && (
            <Button
              size="sm"
              onClick={() => handleUpdate(selectedPackage.name, selectedPackage.latestVersion)}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Update to v{selectedPackage.latestVersion}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRemove(selectedPackage.name)}
            disabled={isLoading}
          >
            <X className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>
        
        {selectedPackage.vulnerabilities?.length > 0 && (
          renderVulnerabilities(selectedPackage.vulnerabilities)
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Package Manager</h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPackages}
              disabled={isLoading || isAuditing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAudit}
              disabled={isAuditing || isLoading}
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              {isAuditing ? 'Auditing...' : 'Audit'}
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs 
        defaultValue="dependencies" 
        className="flex-1 flex flex-col overflow-hidden"
        onValueChange={(value) => setActiveTab(value as 'dependencies' | 'devDependencies')}
      >
        <TabsList className="rounded-none border-b border-gray-200 dark:border-gray-700 bg-transparent p-0">
          <TabsTrigger 
            value="dependencies" 
            className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-4 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Dependencies
            {dependencies.length > 0 && (
              <span className="ml-2 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                {dependencies.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="devDependencies" 
            className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-4 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Dev Dependencies
            {devDependencies.length > 0 && (
              <span className="ml-2 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                {devDependencies.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dependencies" className="flex-1 overflow-auto">
          {isLoading && dependencies.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDependencies.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Package className="mb-4 h-12 w-12" />
              <p>No dependencies found</p>
              <p className="text-sm">
                {searchTerm ? 'Try a different search term' : 'Add dependencies to get started'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDependencies.map((pkg) => (
                  <div
                    key={pkg.name}
                    className={`flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                      selectedPackage?.name === pkg.name ? 'bg-gray-100 dark:bg-gray-800' : ''
                    }`}
                    onClick={() => setSelectedPackage(pkg)}
                  >
                    <div>
                      <div className="font-medium">{pkg.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {pkg.version}
                        {pkg.isOutdated && pkg.latestVersion && (
                          <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                            → v{pkg.latestVersion} available
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {pkg.vulnerabilities?.length > 0 && (
                        <Badge variant="destructive" className="h-5">
                          {pkg.vulnerabilities.length} vuln{pkg.vulnerabilities.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {pkg.isOutdated && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdate(pkg.name, pkg.latestVersion);
                          }}
                          disabled={isLoading}
                        >
                          Update
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
        
        <TabsContent value="devDependencies" className="flex-1 overflow-auto">
          {isLoading && devDependencies.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDevDependencies.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Package className="mb-4 h-12 w-12" />
              <p>No dev dependencies found</p>
              <p className="text-sm">
                {searchTerm ? 'Try a different search term' : 'Add dev dependencies to get started'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDevDependencies.map((pkg) => (
                  <div
                    key={pkg.name}
                    className={`flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                      selectedPackage?.name === pkg.name ? 'bg-gray-100 dark:bg-gray-800' : ''
                    }`}
                    onClick={() => setSelectedPackage(pkg)}
                  >
                    <div>
                      <div className="font-medium">{pkg.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {pkg.version}
                        {pkg.isOutdated && pkg.latestVersion && (
                          <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                            → v{pkg.latestVersion} available
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {pkg.vulnerabilities?.length > 0 && (
                        <Badge variant="destructive" className="h-5">
                          {pkg.vulnerabilities.length} vuln{pkg.vulnerabilities.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {pkg.isOutdated && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdate(pkg.name, pkg.latestVersion);
                          }}
                          disabled={isLoading}
                        >
                          Update
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
      
      {renderPackageDetails()}
    </div>
  );
};
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/packages/list?project_root=${encodeURIComponent(projectRoot)}&language=${language}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }
      
      const data = await response.json();
      setDependencies(data.dependencies || []);
      setDevDependencies(data.devDependencies || []);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load packages';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectRoot, language, onError, toast]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleInstall = async (pkgName: string, isDev: boolean = false) => {
    if (!pkgName) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/packages/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_name: pkgName,
          version: version === 'latest' ? undefined : version,
          is_dev: isDev,
          project_root: projectRoot,
          language,
        }),
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      await fetchPackages();
      onSuccess?.(`Successfully installed ${pkgName}`);
      toast({
        title: 'Success',
        description: `Successfully installed ${pkgName}`,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Installation failed';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUninstall = async (pkgName: string) => {
    if (!pkgName) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/packages/uninstall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_name: pkgName,
          project_root: projectRoot,
          language,
        }),
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      await fetchPackages();
      onSuccess?.(`Successfully uninstalled ${pkgName}`);
      toast({
        title: 'Success',
        description: `Successfully uninstalled ${pkgName}`,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Uninstall failed';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (pkgName: string, targetVersion: string = 'latest') => {
    if (!pkgName) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/packages/update/${encodeURIComponent(pkgName)}` +
        `?project_root=${encodeURIComponent(projectRoot)}` +
        `&language=${language}` +
        (targetVersion !== 'latest' ? `&version=${encodeURIComponent(targetVersion)}` : '')
      );
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      await fetchPackages();
      onSuccess?.(`Successfully updated ${pkgName}`);
      toast({
        title: 'Success',
        description: `Successfully updated ${pkgName}`,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudit = async () => {
    if (!projectRoot) return;
    
    setIsAuditing(true);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/packages/audit` +
        `?project_root=${encodeURIComponent(projectRoot)}` +
        `&language=${language}`
      );
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const auditResults = await response.json();
      
      // Update packages with vulnerability info
      if (auditResults.vulnerabilities) {
        const updatePackages = (pkgList: PackageDependency[]) => 
          pkgList.map(pkg => ({
            ...pkg,
            vulnerabilities: auditResults.vulnerabilities[pkg.name] || [],
          }));
        
        setDependencies(prev => updatePackages(prev));
        setDevDependencies(prev => updatePackages(prev));
      }
      
      onSuccess?.('Security audit completed');
      toast({
        title: 'Audit Complete',
        description: 'Security audit completed successfully',
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Audit failed';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: 'Audit Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchTerm('');
      return;
    }
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/packages/search` +
        `?query=${encodeURIComponent(query)}` +
        `&language=${language}` +
        `&project_root=${encodeURIComponent(projectRoot)}`
      );
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const results = await response.json();
      setSearchTerm(query);
      
      // Handle search results (you might want to display these differently)
      console.log('Search results:', results);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: 'Search Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const renderVulnerabilities = (vulnerabilities: Vulnerability[] = []) => {
    if (!vulnerabilities || !vulnerabilities.length) return null;
    
    return (
      <div className="mt-2 space-y-2">
        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">Vulnerabilities</h4>
        {vulnerabilities.map((vuln) => (
          <div key={vuln.id} className="p-2 text-xs bg-red-50 dark:bg-red-900/20 rounded">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="font-medium">{vuln.title}</span>
              <Badge 
                variant="outline" 
                className={`ml-2 ${
                  vuln.severity === 'critical' ? 'bg-red-500 text-white' : 
                  vuln.severity === 'high' ? 'bg-orange-500 text-white' :
                  vuln.severity === 'moderate' ? 'bg-yellow-500 text-white' :
                  'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {vuln.severity}
              </Badge>
            </div>
            <p className="mt-1 text-gray-700 dark:text-gray-300">{vuln.description}</p>
            {vuln.patchedIn && (
              <p className="mt-1 text-xs">
                Fixed in: <span className="font-mono">{vuln.patchedIn}</span>
              </p>
            )}
            {vuln.url && (
              <a 
                href={vuln.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-xs mt-1 inline-block"
              >
                More details
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  const currentPackages = activeTab === 'dependencies' ? dependencies : devDependencies;
  const filteredPackages = currentPackages.filter(pkg => 
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and actions */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search packages..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
              disabled={isLoading || isAuditing}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAudit}
            disabled={isLoading || isAuditing}
          >
            {isAuditing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <AlertCircle className="mr-2 h-4 w-4" />
            )}
            {isAuditing ? 'Auditing...' : 'Run Audit'}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPackages}
            disabled={isLoading || isAuditing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="h-full flex flex-col"
        >
          <TabsList className="px-4 pt-2">
            <TabsTrigger value="dependencies">
              Dependencies
              <Badge variant="secondary" className="ml-2">
                {dependencies.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="devDependencies">
              Dev Dependencies
              <Badge variant="secondary" className="ml-2">
                {devDependencies.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="dependencies" className="h-full">
              <PackageList 
                packages={filteredPackages}
                isLoading={isLoading}
                onSelect={setSelectedPackage}
                selectedPackage={selectedPackage}
                onInstall={handleInstall}
                onUninstall={handleUninstall}
                onUpdate={handleUpdate}
                isDev={false}
              />
            </TabsContent>
            
            <TabsContent value="devDependencies" className="h-full">
              <PackageList 
                packages={filteredPackages}
                isLoading={isLoading}
                onSelect={setSelectedPackage}
                selectedPackage={selectedPackage}
                onInstall={handleInstall}
                onUninstall={handleUninstall}
                onUpdate={handleUpdate}
                isDev={true}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Package details panel */}
      {selectedPackage && (
        <div className="border-t p-4 bg-muted/10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">{selectedPackage.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  v{selectedPackage.version}
                </span>
                {selectedPackage.latestVersion && selectedPackage.isOutdated && (
                  <Badge variant="outline" className="text-xs">
                    Update to v{selectedPackage.latestVersion} available
                  </Badge>
                )}
              </div>
              
              {selectedPackage.description && (
                <p className="mt-2 text-sm">{selectedPackage.description}</p>
              )}
              
              {renderVulnerabilities(selectedPackage.vulnerabilities)}
            </div>
            
            <div className="flex space-x-2">
              {selectedPackage.latestVersion && selectedPackage.isOutdated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdate(selectedPackage.name, selectedPackage.latestVersion)}
                  disabled={isLoading || isAuditing}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUninstall(selectedPackage.name)}
                disabled={isLoading || isAuditing}
              >
                <X className="mr-2 h-4 w-4" />
                Uninstall
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Install new package */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <Input
              placeholder="Package name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading || isAuditing}
            />
          </div>
          
          <div className="w-32">
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || isAuditing}
            >
              <option value="latest">Latest</option>
              <option value="1.0.0">1.0.0</option>
              <option value="0.1.0">0.1.0</option>
            </select>
          </div>
          
          <Button
            onClick={() => handleInstall(searchTerm, activeTab === 'devDependencies')}
            disabled={!searchTerm || isLoading || isAuditing}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Package className="mr-2 h-4 w-4" />
            )}
            Install
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helper component for the package list
interface PackageListProps {
  packages: PackageDependency[];
  isLoading: boolean;
  selectedPackage: PackageDependency | null;
  onSelect: (pkg: PackageDependency) => void;
  onInstall: (name: string, isDev: boolean) => Promise<void>;
  onUninstall: (name: string) => Promise<void>;
  onUpdate: (name: string, version: string) => Promise<void>;
  isDev: boolean;
}

const PackageList: React.FC<PackageListProps> = ({
  packages,
  isLoading,
  selectedPackage,
  onSelect,
  onInstall,
  onUninstall,
  onUpdate,
  isDev,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading packages...</span>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
        <Package className="h-12 w-12 mb-4 opacity-30" />
        <h3 className="text-lg font-medium">No packages found</h3>
        <p className="text-sm mt-1">
          {isDev 
            ? 'No development dependencies installed.'
            : 'No production dependencies installed.'}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {packages.map((pkg) => (
          <div 
            key={pkg.name}
            className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
              selectedPackage?.name === pkg.name ? 'bg-muted/30' : ''
            }`}
            onClick={() => onSelect(pkg)}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{pkg.name}</div>
                <div className="text-sm text-muted-foreground">
                  {pkg.version}
                  {pkg.latestVersion && pkg.isOutdated && (
                    <span className="ml-2 text-amber-500">
                      (latest: {pkg.latestVersion})
                    </span>
                  )}
                </div>
                
                {pkg.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {pkg.description}
                  </p>
                )}
                
                {pkg.vulnerabilities?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pkg.vulnerabilities.map((vuln) => (
                      <Badge 
                        key={vuln.id}
                        variant="outline"
                        className={`text-xs ${
                          vuln.severity === 'critical' ? 'bg-red-500 text-white' : 
                          vuln.severity === 'high' ? 'bg-orange-500 text-white' :
                          vuln.severity === 'moderate' ? 'bg-yellow-500 text-white' :
                          'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        {vuln.severity}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {pkg.latestVersion && pkg.isOutdated && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(pkg.name, pkg.latestVersion!);
                    }}
                    className="h-8"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Update
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUninstall(pkg.name);
                  }}
                  className="h-8"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default PackageManager;
