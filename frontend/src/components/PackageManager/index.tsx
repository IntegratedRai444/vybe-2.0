import React, { useState, useEffect } from 'react';
import { Package, Search, AlertCircle, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '../ui/use-toast';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface PackageDependency {
  name: string;
  version: string;
  latestVersion?: string;
  description?: string;
  vulnerabilities?: Vulnerability[];
  isDev?: boolean;
}

interface Vulnerability {
  id: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  patchedIn?: string;
  url: string;
}

interface PackageManagerState {
  dependencies: PackageDependency[];
  devDependencies: PackageDependency[];
  isLoading: boolean;
  error: string | null;
  selectedPackage: PackageDependency | null;
  searchResults: PackageDependency[];
  isAuditing: boolean;
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
  onSuccess
}) => {
  const [state, setState] = useState<PackageManagerState>({
    dependencies: [],
    devDependencies: [],
    isLoading: false,
    error: null,
    selectedPackage: null,
    searchResults: [],
    isAuditing: false,
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState('dependencies');
  const [version, setVersion] = useState('latest');
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  
  const fetchPackages = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await fetch(
        `${API_BASE_URL}/api/packages/list?project_root=${encodeURIComponent(projectRoot)}&language=${language}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }
      
      const data = await response.json();
      setState(prev => ({
        ...prev,
        dependencies: data.dependencies || [],
        devDependencies: data.devDependencies || [],
        isLoading: false
      }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load packages';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
    }
  };
  
  useEffect(() => {
    if (projectRoot) {
      fetchPackages();
    }
  }, [projectRoot, language]);
  
  const handleInstall = async (pkg: string, isDev: boolean = false) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await fetch(`${API_BASE_URL}/api/packages/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_name: pkg,
          version: version === 'latest' ? undefined : version,
          is_dev: isDev,
          project_root: projectRoot,
          language
        })
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      await fetchPackages();
      onSuccess?.(`Successfully installed ${pkg}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Installation failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  const handleRemove = async (pkg: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await fetch(`${API_BASE_URL}/api/packages/uninstall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_name: pkg,
          project_root: projectRoot,
          language
        })
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      await fetchPackages();
      onSuccess?.(`Successfully removed ${pkg}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Removal failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  const handleUpdate = async (pkg: string, version: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await fetch(
        `${API_BASE_URL}/api/packages/update/${encodeURIComponent(pkg)}` +
        `?project_root=${encodeURIComponent(projectRoot)}` +
        `&language=${language}` +
        (version !== 'latest' ? `&version=${encodeURIComponent(version)}` : '')
      );
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      await fetchPackages();
      onSuccess?.(`Successfully updated ${pkg}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  const handleAudit = async () => {
    try {
      setState(prev => ({ ...prev, isAuditing: true, error: null }));
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
      // ... (implementation depends on your audit response structure)
      
      onSuccess?.('Security audit completed');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Audit failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    } finally {
      setState(prev => ({ ...prev, isAuditing: false }));
    }
  };
  
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, searchResults: [] }));
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
      setState(prev => ({
        ...prev,
        searchResults: results,
        error: null
      }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      setState(prev => ({ ...prev, error: errorMessage, searchResults: [] }));
      onError?.(errorMessage);
    }
  };

  const filteredPackages = state[tab as 'dependencies' | 'devDependencies']
    .filter(pkg => pkg.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const renderVulnerabilities = (vulnerabilities: Vulnerability[] = []) => {
    if (!vulnerabilities || !Array.isArray(vulnerabilities)) return null;
    if (!vulnerabilities.length) return null;
    
    return (
      <div className="mt-2 space-y-2">
        <h4 className="text-sm font-semibold text-red-600">Vulnerabilities</h4>
        {vulnerabilities.map((vuln) => (
          <div key={vuln.id} className="p-2 text-xs bg-red-50 dark:bg-red-900/20 rounded">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="font-medium">{vuln.title}</span>
              <Badge variant="destructive" className="text-xs">{vuln.severity}</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">{vuln.description}</p>
            {vuln.patchedIn && (
              <p className="mt-1 text-xs">
                Fixed in: <span className="font-mono">{vuln.patchedIn}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleAudit} 
        disabled={state.isAuditing || state.isLoading}
      >
        {state.isAuditing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <AlertCircle className="mr-2 h-4 w-4" />
        )}
        {state.isAuditing ? 'Auditing...' : 'Audit'}
      </Button>
    </div>

    <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
      <div className="flex items-center justify-between px-4 pt-2">
        <TabsList>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="devDependencies">Dev Dependencies</TabsTrigger>
        </TabsList>
        {state.isLoading && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading packages...
          </div>
        )}
      </div>
    </Tabs>
  </div>

  <div className="flex-1 overflow-hidden">
    <div className="h-full flex">
      <ScrollArea className="w-1/2 h-full border-r">
        <div className="divide-y">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.name}
              className={`p-3 cursor-pointer hover:bg-accent ${
                selectedPackage?.name === pkg.name ? 'bg-accent' : ''
              }`}
              onClick={() => setSelectedPackage(pkg)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{pkg.name}</div>
                  <div className="text-sm text-muted-foreground">{pkg.version}</div>
                </div>
                {pkg.isOutdated && (
                  <Badge variant="outline" className="text-xs">
                    Update to {pkg.latestVersion}
                  </Badge>
                )}
              </div>
              {pkg.vulnerabilities?.length > 0 && (
                <div className="mt-1">
                  <Badge variant="destructive" className="text-xs">
                    {pkg.vulnerabilities.length} vulns
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="w-1/2 p-4 overflow-auto">
        {selectedPackage ? (
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{selectedPackage.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">
                    {selectedPackage.version}
                  </span>
                  {selectedPackage.isOutdated && (
                    <span className="text-xs text-amber-500">
                      (latest: {selectedPackage.latestVersion})
                    </span>
                  )}
                </div>
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => onInstall(`${selectedPackage.name}@${version}`, tab === 'devDependencies')}
                      disabled={isInstalling}
                    >
                      {isInstalling ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Install
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                <Package className="w-12 h-12 mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-1">No package selected</h3>
                <p className="text-sm">Select a package to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}
    </div>
  );
};
