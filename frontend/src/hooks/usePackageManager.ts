import { useState, useEffect, useCallback } from 'react';
import { PackageDependency } from '../types/fileSystem';

interface UsePackageManagerProps {
  workspacePath: string;
}

export const usePackageManager = ({ workspacePath }: UsePackageManagerProps) => {
  const [packages, setPackages] = useState<{
    dependencies: PackageDependency[];
    devDependencies: PackageDependency[];
  }>({ dependencies: [], devDependencies: [] });
  const [selectedPackage, setSelectedPackage] = useState<PackageDependency | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load package.json when workspace changes
  const loadPackages = useCallback(async () => {
    if (!workspacePath) return;

    try {
      // In a real implementation, this would be an API call to the backend
      // const response = await fetch(`/api/workspace/${encodeURIComponent(workspacePath)}/packages`);
      // const data = await response.json();
      
      // Mock data for now
      const mockData = {
        dependencies: [
          { name: 'react', version: '^18.2.0', latestVersion: '18.2.0', isDev: false },
          { name: 'react-dom', version: '^18.2.0', latestVersion: '18.2.0', isDev: false },
        ],
        devDependencies: [
          { name: 'typescript', version: '^4.9.5', latestVersion: '5.0.0', isDev: true, isOutdated: true },
          { name: 'vite', version: '^4.3.9', latestVersion: '4.3.9', isDev: true },
        ],
      };
      
      setPackages(mockData);
      setError(null);
    } catch (err) {
      console.error('Failed to load packages:', err);
      setError('Failed to load package information');
    }
  }, [workspacePath]);

  // Install a new package
  const installPackage = useCallback(async (pkg: string, isDev: boolean = false) => {
    if (!workspacePath) return;
    
    setIsInstalling(true);
    setError(null);
    
    try {
      // In a real implementation, this would be an API call to the backend
      // const response = await fetch(`/api/workspace/${encodeURIComponent(workspacePath)}/packages/install`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ pkg, isDev }),
      // });
      // const result = await response.json();
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock success response
      const newPkg = {
        name: pkg.split('@')[0],
        version: pkg.includes('@') ? pkg.split('@')[1] : 'latest',
        latestVersion: pkg.includes('@') ? pkg.split('@')[1] : '1.0.0',
        isDev,
      };
      
      setPackages(prev => ({
        ...prev,
        [isDev ? 'devDependencies' : 'dependencies']: [
          ...(isDev ? prev.devDependencies : prev.dependencies),
          newPkg,
        ],
      }));
      
      return { success: true };
    } catch (err) {
      console.error('Failed to install package:', err);
      setError(`Failed to install package: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setIsInstalling(false);
    }
  }, [workspacePath]);

  // Remove a package
  const removePackage = useCallback(async (pkgName: string) => {
    if (!workspacePath) return;
    
    setIsInstalling(true);
    setError(null);
    
    try {
      // In a real implementation, this would be an API call to the backend
      // const response = await fetch(`/api/workspace/${encodeURIComponent(workspacePath)}/packages/remove`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ pkg: pkgName }),
      // });
      // const result = await response.json();
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update local state
      setPackages(prev => ({
        dependencies: prev.dependencies.filter(pkg => pkg.name !== pkgName),
        devDependencies: prev.devDependencies.filter(pkg => pkg.name !== pkgName),
      }));
      
      // Clear selected package if it was the one removed
      if (selectedPackage?.name === pkgName) {
        setSelectedPackage(null);
      }
      
      return { success: true };
    } catch (err) {
      console.error('Failed to remove package:', err);
      setError(`Failed to remove package: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setIsInstalling(false);
    }
  }, [workspacePath, selectedPackage]);

  // Update a package
  const updatePackage = useCallback(async (pkgName: string, version: string) => {
    if (!workspacePath) return;
    
    setIsInstalling(true);
    setError(null);
    
    try {
      // In a real implementation, this would be an API call to the backend
      // const response = await fetch(`/api/workspace/${encodeURIComponent(workspacePath)}/packages/update`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ pkg: pkgName, version }),
      // });
      // const result = await response.json();
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      const updatePkg = (pkg: PackageDependency) => 
        pkg.name === pkgName 
          ? { ...pkg, version, isOutdated: false, latestVersion: version } 
          : pkg;
      
      setPackages(prev => ({
        dependencies: prev.dependencies.map(updatePkg),
        devDependencies: prev.devDependencies.map(updatePkg),
      }));
      
      // Update selected package if it was the one updated
      if (selectedPackage?.name === pkgName) {
        setSelectedPackage(prev => prev ? updatePkg(prev) : null);
      }
      
      return { success: true };
    } catch (err) {
      console.error('Failed to update package:', err);
      setError(`Failed to update package: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setIsInstalling(false);
    }
  }, [workspacePath, selectedPackage]);

  // Run package audit
  const auditPackages = useCallback(async () => {
    if (!workspacePath) return;
    
    setIsInstalling(true);
    setError(null);
    
    try {
      // In a real implementation, this would be an API call to the backend
      // const response = await fetch(`/api/workspace/${encodeURIComponent(workspacePath)}/packages/audit`);
      // const result = await response.json();
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock vulnerabilities
      const mockVulnerabilities = [
        {
          id: '123',
          severity: 'high',
          title: 'Prototype Pollution',
          description: 'Prototype pollution vulnerability in package',
          patchedIn: '^4.17.20',
          url: 'https://npmjs.com/advisories/123'
        }
      ];
      
      // Update packages with vulnerabilities
      setPackages(prev => ({
        dependencies: prev.dependencies.map(pkg => 
          pkg.name === 'lodash' 
            ? { ...pkg, vulnerabilities: mockVulnerabilities }
            : pkg
        ),
        devDependencies: prev.devDependencies,
      }));
      
      return { success: true };
    } catch (err) {
      console.error('Failed to audit packages:', err);
      setError(`Failed to audit packages: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setIsInstalling(false);
    }
  }, [workspacePath]);

  // Load packages when workspace changes
  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  return {
    packages,
    selectedPackage,
    setSelectedPackage,
    installPackage,
    removePackage,
    updatePackage,
    auditPackages,
    isInstalling,
    error,
    reload: loadPackages,
  };
};

export default usePackageManager;
