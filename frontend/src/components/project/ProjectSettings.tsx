import React, { useState, useEffect, useRef } from 'react';
import { 
  FiSave, FiPlus, FiTrash2, FiPackage, FiCode, 
  FiLock, FiUnlock, FiCopy, FiGitBranch, 
  FiGitCommit, FiPlay, FiTerminal, FiRefreshCw,
  FiCheckCircle, FiAlertTriangle, FiGitMerge,
  FiSettings, FiExternalLink, FiSearch,
  FiFileText, FiCheck, FiInfo
} from 'react-icons/fi';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useProject } from '../../contexts/ProjectContext';
import { toast } from 'react-toastify';
import { gitService, GitStatus, GitBranchInfo, GitUserConfig, GitCommit } from '../../utils/gitUtils';
import { v4 as uuidv4 } from 'uuid';

// Types
type EnvVar = {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
};

type Dependency = {
  id: string;
  name: string;
  version: string;
  isDevDependency: boolean;
};

type BuildScript = {
  name: string;
  command: string;
  description: string;
};

export type ProjectSettings = {
  name: string;
  description: string;
  version: string;
  framework: string;
  buildScripts: {
    build: string;
    start: string;
    test: string;
    lint: string;
    custom: BuildScript[];
  };
  environment: 'development' | 'staging' | 'production';
  envVars: EnvVar[];
  dependencies: Dependency[];
  createdAt: string;
  updatedAt: string;
};

// Form validation schema
const projectSettingsSchema = yup.object().shape({
  name: yup.string().required('Project name is required'),
  description: yup.string(),
  version: yup.string().matches(
    /^\d+\.\d+\.\d+(-\w+\.\d+)?$/,
    'Must be a valid semver version (e.g., 1.0.0 or 1.0.0-beta.1)'
  ),
  framework: yup.string().required('Framework is required'),
  buildScripts: yup.object({
    build: yup.string().required('Build script is required'),
    start: yup.string().required('Start script is required'),
    test: yup.string().required('Test script is required'),
    lint: yup.string().required('Lint script is required'),
    custom: yup.array().of(
      yup.object({
        name: yup.string().required('Script name is required'),
        command: yup.string().required('Command is required'),
        description: yup.string()
      })
    )
  }),
  environment: yup.string().oneOf(
    ['development', 'staging', 'production'],
    'Invalid environment'
  ).required('Environment is required'),
  envVars: yup.array().of(
    yup.object({
      id: yup.string().required(),
      key: yup.string().required('Variable name is required'),
      value: yup.string(),
      isSecret: yup.boolean()
    })
  ),
  dependencies: yup.array().of(
    yup.object({
      id: yup.string().required(),
      name: yup.string().required('Package name is required'),
      version: yup.string().required('Version is required'),
      isDevDependency: yup.boolean()
    })
  )
});

// Add type for file status in the UI
interface FileStatus {
  path: string;
  status: 'modified' | 'staged' | 'untracked' | 'conflicted';
  diff?: string;
  isExpanded?: boolean;
}

// Types
type EnvVar = {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
};

type Dependency = {
  id: string;
  name: string;
  version: string;
  isDevDependency: boolean;
};

type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  framework: string;
  createdAt: string;
};

type BuildScript = {
  name: string;
  command: string;
  description: string;
};

type ProjectSettings = {
  name: string;
  description: string;
  version: string;
  framework: string;
  buildScripts: {
    build: string;
    start: string;
    test: string;
    lint: string;
    custom: BuildScript[];
  };
  environment: 'development' | 'staging' | 'production';
  envVars: EnvVar[];
  dependencies: Dependency[];
  createdAt: string;
  updatedAt: string;
};

const ProjectSettings: React.FC = () => {
  const { currentProject, updateProject } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form and state management
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddEnvVar, setShowAddEnvVar] = useState(false);
  const [showAddDependency, setShowAddDependency] = useState(false);
  const [showAddScript, setShowAddScript] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Git states
  const [gitStatus, setGitStatus] = useState<GitStatus>({
    branch: null,
    changes: 0,
    modified: [],
    staged: [],
    untracked: [],
    conflicted: [],
    ahead: 0,
    behind: 0
  });
  
  const [branches, setBranches] = useState<GitBranchInfo>({
    current: 'main',
    branches: ['main'],
    remote: null
  });
  
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [stagedFiles, setStagedFiles] = useState<string[]>([]);
  const [uncommittedChanges, setUncommittedChanges] = useState<string[]>([]);
  const [gitUser, setGitUser] = useState<GitUserConfig>({ name: '', email: '' });
  const [isGitInstalled, setIsGitInstalled] = useState(false);

  // Initialize form with react-hook-form
  const { 
    control, 
    handleSubmit, 
    register, 
    formState: { errors, isDirty }, 
    reset,
    watch,
    setValue,
    getValues
  } = useForm<ProjectSettings>({
    resolver: yupResolver(projectSettingsSchema),
    defaultValues: {
      name: currentProject?.name || 'my-project',
      description: currentProject?.description || '',
      version: currentProject?.version || '1.0.0',
      framework: 'react', // Default framework
      environment: 'development',
      envVars: [],
      dependencies: [],
      buildScripts: {
        build: currentProject?.scripts?.build || 'react-scripts build',
        start: currentProject?.scripts?.start || 'react-scripts start',
        test: currentProject?.scripts?.test || 'react-scripts test',
        lint: currentProject?.scripts?.lint || 'eslint src --ext .js,.jsx,.ts,.tsx',
        custom: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });

  // Watch for changes to environment variables and dependencies
  const envVars = watch('envVars') || [];
  const dependencies = watch('dependencies') || [];
  const customScripts = watch('buildScripts.custom') || [];
  const currentEnvironment = watch('environment') || 'development';

  // Load project data and Git status on mount
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        // Check if Git is initialized
        try {
          const status = await gitService.getStatus();
          setGitStatus(status);
          setIsGitInstalled(true);
          
          // Load branches and commits if Git is initialized
          const branchInfo = await gitService.getBranches();
          setBranches(branchInfo);
          setSelectedBranch(branchInfo.current);
          
          const commitHistory = await gitService.getCommits(5);
          setCommits(commitHistory);
          
          const userConfig = await gitService.getUserConfig();
          setGitUser(userConfig);
        } catch (error) {
          console.warn('Git not initialized:', error);
          setIsGitInstalled(false);
        }
        
        // Load project data if available
        if (currentProject) {
          // Load environment variables
          if (currentProject.envVars) {
            const envVars = Object.entries(currentProject.envVars).map(([key, value]) => ({
              id: uuidv4(),
              key,
              value: String(value),
              isSecret: key.toLowerCase().includes('secret') || 
                        key.toLowerCase().includes('key') || 
                        key.toLowerCase().includes('token') ||
                        key.toLowerCase().includes('password')
            }));
            setValue('envVars', envVars);
          }
          
          // Load dependencies
          const deps: Dependency[] = [];
          
          if (currentProject.dependencies) {
            Object.entries(currentProject.dependencies).forEach(([name, version]) => {
              deps.push({
                id: uuidv4(),
                name,
                version: String(version),
                isDevDependency: false
              });
            });
          }
          
          if (currentProject.devDependencies) {
            Object.entries(currentProject.devDependencies).forEach(([name, version]) => {
              deps.push({
                id: uuidv4(),
                name,
                version: String(version),
                isDevDependency: true
              });
            });
          }
          
          if (deps.length > 0) {
            setValue('dependencies', deps);
          }
          
          // Load custom scripts
          if (currentProject.scripts) {
            const customScripts = Object.entries(currentProject.scripts)
              .filter(([key]) => !['build', 'start', 'test', 'lint'].includes(key))
              .map(([name, command]) => ({
                name,
                command: String(command),
                description: ''
              }));
              
            if (customScripts.length > 0) {
              setValue('buildScripts.custom', customScripts);
            }
          }
        }
      } catch (error) {
        console.error('Error loading project data:', error);
        toast.error('Failed to load project data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProjectData();
  }, [currentProject, setValue]);

  // Handle form submission
  const onSubmit = async (data: ProjectSettings) => {
    try {
      setIsSaving(true);
      
      // Update project in context
      const updatedProject = {
        ...currentProject,
        name: data.name,
        description: data.description,
        version: data.version,
        scripts: {
          build: data.buildScripts.build,
          start: data.buildScripts.start,
          test: data.buildScripts.test,
          lint: data.buildScripts.lint,
          ...data.buildScripts.custom.reduce((acc, script) => ({
            ...acc,
            [script.name]: script.command
          }), {})
        },
        envVars: data.envVars.reduce((acc, { key, value }) => {
          if (key) acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
        dependencies: data.dependencies
          .filter(dep => !dep.isDevDependency)
          .reduce((acc, { name, version }) => {
            if (name) acc[name] = version;
            return acc;
          }, {} as Record<string, string>),
        devDependencies: data.dependencies
          .filter(dep => dep.isDevDependency)
          .reduce((acc, { name, version }) => {
            if (name) acc[name] = version;
            return acc;
          }, {} as Record<string, string>),
        updatedAt: new Date().toISOString()
      };
      
      await updateProject(updatedProject);
      
      // Update Git status if Git is initialized
      if (isGitInstalled && gitStatus) {
        const newStatus = await gitService.getStatus();
        setGitStatus(newStatus);
      }
      
      toast.success('Project settings saved successfully');
    } catch (error) {
      console.error('Error saving project settings:', error);
      toast.error('Failed to save project settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Git operations
  const handleGitInit = async () => {
    try {
      await gitService.initRepo();
      const status = await gitService.getStatus();
      setGitStatus(status);
      setIsGitInstalled(true);
      toast.success('Git repository initialized');
    } catch (error) {
      console.error('Error initializing Git repository:', error);
      toast.error('Failed to initialize Git repository');
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      toast.error('Please enter a commit message');
      return;
    }
    
    try {
      await gitService.commit(commitMessage);
      setCommitMessage('');
      
      // Refresh Git status and commits
      const [newStatus, newCommits] = await Promise.all([
        gitService.getStatus(),
        gitService.getCommits(5)
      ]);
      
      setGitStatus(newStatus);
      setCommits(newCommits);
      setStagedFiles([]);
      
      toast.success('Changes committed successfully');
    } catch (error) {
      console.error('Error committing changes:', error);
      toast.error('Failed to commit changes');
    }
  };

  const handleStageFiles = async (files: string[]) => {
    try {
      await gitService.stageFiles(files);
      const newStatus = await gitService.getStatus();
      setGitStatus(newStatus);
      setStagedFiles(prev => [...new Set([...prev, ...files])]);
      setUncommittedChanges(prev => prev.filter(f => !files.includes(f)));
    } catch (error) {
      console.error('Error staging files:', error);
      toast.error('Failed to stage files');
    }
  };

  const handleUnstageFiles = async (files: string[]) => {
    try {
      await gitService.unstageFiles(files);
      const newStatus = await gitService.getStatus();
      setGitStatus(newStatus);
      setStagedFiles(prev => prev.filter(f => !files.includes(f)));
      setUncommittedChanges(prev => [...new Set([...prev, ...files])]);
    } catch (error) {
      console.error('Error unstaging files:', error);
      toast.error('Failed to unstage files');
    }
  };

  // Handle environment variables
  const handleAddEnvVar = (envVar: Omit<EnvVar, 'id'>) => {
    const newEnvVar = { ...envVar, id: uuidv4() };
    setValue('envVars', [...envVars, newEnvVar], { shouldDirty: true });
    setShowAddEnvVar(false);
  };

  const handleRemoveEnvVar = (id: string) => {
    setValue('envVars', envVars.filter(env => env.id !== id), { shouldDirty: true });
  };

  // Handle dependencies
  const handleAddDependency = (dep: Omit<Dependency, 'id'>) => {
    const newDep = { ...dep, id: uuidv4() };
    setValue('dependencies', [...dependencies, newDep], { shouldDirty: true });
    setShowAddDependency(false);
  };

  const handleRemoveDependency = (id: string) => {
    setValue('dependencies', dependencies.filter(dep => dep.id !== id), { shouldDirty: true });
  };

  // Handle custom scripts
  const handleAddScript = (script: BuildScript) => {
    setValue('buildScripts.custom', [...customScripts, script], { shouldDirty: true });
    setShowAddScript(false);
  };

  const handleRemoveScript = (index: number) => {
    const updatedScripts = [...customScripts];
    updatedScripts.splice(index, 1);
    setValue('buildScripts.custom', updatedScripts, { shouldDirty: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Project Settings</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {['general', 'environment', 'dependencies', 'git', 'build'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium ${activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            {activeTab === 'general' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">General Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      {...register('name')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Version
                    </label>
                    <input
                      type="text"
                      {...register('version')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.version && (
                      <p className="mt-1 text-sm text-red-600">{errors.version.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      {...register('description')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Framework
                    </label>
                    <select
                      {...register('framework')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="react">React</option>
                      <option value="vue">Vue.js</option>
                      <option value="angular">Angular</option>
                      <option value="svelte">Svelte</option>
                      <option value="nextjs">Next.js</option>
                      <option value="nuxtjs">Nuxt.js</option>
                      <option value="gatsby">Gatsby</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Environment
                    </label>
                    <select
                      {...register('environment')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="development">Development</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'environment' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Environment Variables</h2>
                  <button
                    type="button"
                    onClick={() => setShowAddEnvVar(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FiPlus className="mr-2 h-4 w-4" />
                    Add Variable
                  </button>
                </div>

                {envVars.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <FiLock className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No environment variables</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Get started by adding a new environment variable.
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => setShowAddEnvVar(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                        New Variable
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {envVars.map((envVar) => (
                        <li key={envVar.id} className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {envVar.key}
                                {envVar.isSecret && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                                    Secret
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {envVar.isSecret ? '••••••••••••' : envVar.value}
                              </div>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRemoveEnvVar(envVar.id)}
                                className="font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dependencies' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Dependencies</h2>
                  <div className="flex space-x-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSearch className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search packages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddDependency(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FiPlus className="mr-2 h-4 w-4" />
                      Add Dependency
                    </button>
                  </div>
                </div>

                {dependencies.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No dependencies</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Get started by adding a dependency.
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => setShowAddDependency(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                        Add Dependency
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                    <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6">Package</div>
                        <div className="col-span-3">Version</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-1"></div>
                      </div>
                    </div>
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {dependencies
                        .filter(dep => 
                          searchTerm === '' || 
                          dep.name.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((dep) => (
                          <li key={dep.id} className="px-6 py-4">
                            <div className="grid grid-cols-12 gap-4 items-center">
                              <div className="col-span-6">
                                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  {dep.name}
                                </div>
                              </div>
                              <div className="col-span-3">
                                <div className="text-sm text-gray-900 dark:text-gray-200">
                                  {dep.version}
                                </div>
                              </div>
                              <div className="col-span-2">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${dep.isDevDependency ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'}`}>
                                  {dep.isDevDependency ? 'devDependency' : 'dependency'}
                                </span>
                              </div>
                              <div className="col-span-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDependency(dep.id)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <FiTrash2 className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'git' && (
              <div>
                {!isGitInstalled ? (
                  <div className="text-center py-12">
                    <FiGitBranch className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Git is not initialized</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Initialize a Git repository to start tracking changes to your project.
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={handleGitInit}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FiGitBranch className="-ml-1 mr-2 h-5 w-5" />
                        Initialize Git Repository
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Repository Status</h3>
                      <div className="mt-4 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                              <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                                    <FiGitBranch className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="ml-5 w-0 flex-1">
                                    <dl>
                                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Current Branch</dt>
                                      <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                          {branches?.current || 'main'}
                                        </div>
                                      </dd>
                                    </dl>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                              <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                                    <FiCheckCircle className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="ml-5 w-0 flex-1">
                                    <dl>
                                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Staged Changes</dt>
                                      <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                          {gitStatus?.staged?.length || 0}
                                        </div>
                                      </dd>
                                    </dl>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                              <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                                    <FiAlertTriangle className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="ml-5 w-0 flex-1">
                                    <dl>
                                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Unstaged Changes</dt>
                                      <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                          {gitStatus?.modified?.length + gitStatus?.untracked?.length || 0}
                                        </div>
                                      </dd>
                                    </dl>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                        <div className="px-4 py-5 sm:px-6">
                          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Changes</h3>
                          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            Review and stage your changes
                          </p>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-300">
                            <div className="flex items-center justify-between">
                              <span>Unstaged Changes</span>
                              <span className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                {gitStatus?.modified?.length + gitStatus?.untracked?.length || 0}
                              </span>
                            </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {gitStatus?.modified?.map((file) => (
                              <div key={`modified-${file}`} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <div className="flex items-center">
                                  <FiFileText className="h-4 w-4 text-yellow-500 mr-2" />
                                  <span className="text-sm font-mono text-gray-700 dark:text-gray-200">{file}</span>
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                                    Modified
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleStageFiles([file])}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700"
                                >
                                  Stage
                                </button>
                              </div>
                            ))}
                            {gitStatus?.untracked?.map((file) => (
                              <div key={`untracked-${file}`} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <div className="flex items-center">
                                  <FiFileText className="h-4 w-4 text-blue-500 mr-2" />
                                  <span className="text-sm font-mono text-gray-700 dark:text-gray-200">{file}</span>
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                                    Untracked
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleStageFiles([file])}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700"
                                >
                                  Stage
                                </button>
                              </div>
                            ))}
                            {(!gitStatus?.modified?.length && !gitStatus?.untracked?.length) && (
                              <div className="px-4 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                                No unstaged changes
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700">
                          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-300">
                            <div className="flex items-center justify-between">
                              <span>Staged Changes</span>
                              <span className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                {gitStatus?.staged?.length || 0}
                              </span>
                            </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {gitStatus?.staged?.map((file) => (
                              <div key={`staged-${file}`} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <div className="flex items-center">
                                  <FiFileText className="h-4 w-4 text-green-500 mr-2" />
                                  <span className="text-sm font-mono text-gray-700 dark:text-gray-200">{file}</span>
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                    Staged
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUnstageFiles([file])}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700"
                                >
                                  Unstage
                                </button>
                              </div>
                            ))}
                            {!gitStatus?.staged?.length && (
                              <div className="px-4 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                                No staged changes
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <label htmlFor="commit-message" className="sr-only">
                                Commit message
                              </label>
                              <div className="flex rounded-md shadow-sm">
                                <input
                                  type="text"
                                  name="commit-message"
                                  id="commit-message"
                                  value={commitMessage}
                                  onChange={(e) => setCommitMessage(e.target.value)}
                                  className="focus:ring-blue-500 focus:border-blue-500 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                  placeholder="Commit message"
                                />
                                <button
                                  type="button"
                                  onClick={handleCommit}
                                  disabled={!commitMessage.trim() || !gitStatus?.staged?.length}
                                  className={`-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-r-md ${!commitMessage.trim() || !gitStatus?.staged?.length ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500'}`}
                                >
                                  <FiGitCommit className="h-4 w-4" />
                                  <span>Commit</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                        <div className="px-4 py-5 sm:px-6">
                          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Recent Commits</h3>
                          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            Latest commits in this repository
                          </p>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {commits.length > 0 ? (
                              commits.map((commit) => (
                                <li key={commit.oid} className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <div className="flex items-center">
                                    <div className="min-w-0 flex-1 flex items-center">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex justify-between text-sm">
                                          <p className="font-medium text-blue-600 dark:text-blue-400 truncate">
                                            {commit.message}
                                          </p>
                                          <p className="ml-2 flex-shrink-0 text-gray-500 dark:text-gray-400">
                                            {new Date(commit.author.timestamp * 1000).toLocaleDateString()}
                                          </p>
                                        </div>
                                        <div className="mt-1 flex">
                                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <span className="truncate">
                                              {commit.author.name} &lt;{commit.author.email}&gt;
                                            </span>
                                            <span className="mx-1">·</span>
                                            <span className="font-mono text-xs">
                                              {commit.oid.substring(0, 7)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              ))
                            ) : (
                              <li className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                No commits yet
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                      <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Branches</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                          Manage your branches
                        </p>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700">
                        <div className="bg-white dark:bg-gray-800 overflow-hidden">
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center">
                              <div className="flex-1">
                                <label htmlFor="branch" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Current Branch
                                </label>
                                <select
                                  id="branch"
                                  name="branch"
                                  value={selectedBranch}
                                  onChange={(e) => setSelectedBranch(e.target.value)}
                                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
                                >
                                  {branches?.branches.map((branch) => (
                                    <option key={branch} value={branch}>
                                      {branch}
                                      {branch === branches?.current && ' (current)'}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="ml-4 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => gitService.switchBranch(selectedBranch)}
                                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  <FiGitBranch className="-ml-1 mr-2 h-5 w-5" />
                                  Switch Branch
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'build' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Build & Run</h2>
                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Scripts</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Configure the scripts that will be used to build, test, and run your application.
                    </p>

                    <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-2">
                        <label htmlFor="build" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Build Script
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiTerminal className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="build"
                            {...register('buildScripts.build')}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            placeholder="e.g. react-scripts build"
                          />
                        </div>
                        {errors.buildScripts?.build && (
                          <p className="mt-1 text-sm text-red-600">{errors.buildScripts.build.message}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="start" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Start Script
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiPlay className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="start"
                            {...register('buildScripts.start')}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            placeholder="e.g. react-scripts start"
                          />
                        </div>
                        {errors.buildScripts?.start && (
                          <p className="mt-1 text-sm text-red-600">{errors.buildScripts.start.message}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="test" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Test Script
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiCheckCircle className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="test"
                            {...register('buildScripts.test')}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            placeholder="e.g. react-scripts test"
                          />
                        </div>
                        {errors.buildScripts?.test && (
                          <p className="mt-1 text-sm text-red-600">{errors.buildScripts.test.message}</p>
                        )}
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="lint" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Lint Script
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiCheck className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="lint"
                            {...register('buildScripts.lint')}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            placeholder="e.g. eslint src --ext .js,.jsx,.ts,.tsx"
                          />
                        </div>
                        {errors.buildScripts?.lint && (
                          <p className="mt-1 text-sm text-red-600">{errors.buildScripts.lint.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-8">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Custom Scripts</h3>
                        <button
                          type="button"
                          onClick={() => setShowAddScript(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <FiPlus className="mr-2 h-4 w-4" />
                          Add Script
                        </button>
                      </div>

                      <div className="mt-4">
                        {customScripts.length > 0 ? (
                          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                              {customScripts.map((script, index) => (
                                <li key={index} className="px-6 py-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center">
                                        <FiTerminal className="flex-shrink-0 h-5 w-5 text-gray-400" />
                                        <p className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                                          {script.name}
                                        </p>
                                      </div>
                                      {script.description && (
                                        <p className="ml-8 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                          {script.description}
                                        </p>
                                      )}
                                      <div className="ml-8 mt-1">
                                        <code className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">
                                          {script.command}
                                        </code>
                                      </div>
                                    </div>
                                    <div className="ml-4 flex-shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveScript(index)}
                                        className="font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                            <FiCode className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No custom scripts</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Get started by adding a custom script.
                            </p>
                            <div className="mt-6">
                              <button
                                type="button"
                                onClick={() => setShowAddScript(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                                Add Script
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => reset()}
                disabled={!isDirty}
                className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${!isDirty ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={!isDirty || isSaving}
                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${!isDirty || isSaving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
        console.error('Error saving project:', error);
        toast.error('Failed to save project settings');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const exportProject = () => {
    if (!currentProject) return;
    
    const data = {
      ...currentProject,
      // Don't include sensitive data in export
      envVars: Object.fromEntries(
        Object.entries(currentProject.envVars || {}).map(([key]) => [key, ''])
      )
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name}-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data && currentProject) {
          // Merge with existing project data
          await updateProject(currentProject.id, {
            ...currentProject,
            ...data,
            // Don't overwrite the ID
            id: currentProject.id,
            // Preserve existing env vars unless explicitly set in import
            envVars: {
              ...currentProject.envVars,
              ...data.envVars
            }
          });
          toast.success('Project configuration imported successfully');
        }
      } catch (error) {
        console.error('Error importing project:', error);
        toast.error('Failed to import project configuration');
      }
    };
    reader.readAsText(file);
  };

  const saveAsTemplate = async () => {
    if (!currentProject) return;
    
    try {
      // In a real app, this would save to a templates database
      const templates = JSON.parse(localStorage.getItem('projectTemplates') || '[]');
      const template = {
        id: `template-${Date.now()}`,
        name: `${currentProject.name} Template`,
        description: currentProject.description || 'Project template',
        config: {
          buildCommand: currentProject.buildCommand,
          startCommand: currentProject.startCommand,
          testCommand: currentProject.testCommand,
          dependencies: currentProject.dependencies,
          devDependencies: currentProject.devDependencies,
          // Don't include env vars in templates
          envVars: {}
        },
        createdAt: new Date().toISOString()
      };
      
      templates.push(template);
      localStorage.setItem('projectTemplates', JSON.stringify(templates));
      toast.success('Project saved as template');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const checkGitStatus = async () => {
    try {
      setIsGitLoading(true);
      const status = await gitService.getStatus();
      setGitStatus(status);
      await updateFileStatuses(status);
      return status;
    } catch (error) {
      console.error('Error checking Git status:', error);
      toast.error('Failed to check Git status');
      throw error;
    } finally {
      setIsGitLoading(false);
    }
  };
  
  const toggleFileDiff = async (filePath: string) => {
    setFileStatuses(prev => 
      prev.map(file => 
        file.path === filePath 
          ? { 
              ...file, 
              isExpanded: !file.isExpanded,
              diff: file.isExpanded ? undefined : file.diff 
            } 
          : file
      )
    );
    
    if (!selectedFiles[filePath]) {
      try {
        const diff = await gitService.getFileDiff(filePath);
        setFileStatuses(prev =>
          prev.map(file =>
            file.path === filePath ? { ...file, diff } : file
          )
        );
      } catch (error) {
        console.error('Error loading diff:', error);
        toast.error('Failed to load file diff');
      }
    }
    
    setSelectedFiles(prev => ({
      ...prev,
      [filePath]: !prev[filePath]
    }));
  };
  
  const stageFiles = async (files: string[]) => {
    try {
      setIsGitLoading(true);
      await gitService.stage(files);
      await checkGitStatus();
      toast.success('Staged changes successfully');
    } catch (error) {
      console.error('Error staging files:', error);
      toast.error('Failed to stage changes');
    } finally {
      setIsGitLoading(false);
    }
  };
  
  const unstageFiles = async (files: string[]) => {
    try {
      setIsGitLoading(true);
      await gitService.unstage(files);
      await checkGitStatus();
      toast.success('Unstaged changes successfully');
    } catch (error) {
      console.error('Error unstaging files:', error);
      toast.error('Failed to unstage changes');
    } finally {
      setIsGitLoading(false);
    }
  };
  
  const handleStageAll = () => {
    const filesToStage = [
      ...gitStatus.modified,
      ...gitStatus.untracked,
      ...gitStatus.conflicted
    ];
    
    if (filesToStage.length > 0) {
      stageFiles(filesToStage);
    }
  };
  
  const handleUnstageAll = () => {
    if (gitStatus.staged.length > 0) {
      unstageFiles(gitStatus.staged);
    }
  };
  
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      toast.error('Please enter a branch name');
      return;
    }
    
    try {
      setIsGitLoading(true);
      await gitService.createBranch(newBranchName);
      await loadBranches();
      setNewBranchName('');
      toast.success(`Created and switched to branch '${newBranchName}'`);
    } catch (error) {
      console.error('Error creating branch:', error);
      toast.error('Failed to create branch');
    } finally {
      setIsGitLoading(false);
    }
  };
  
  const handleSwitchBranch = async (branch: string) => {
    if (branch === branches.current) return;
    
    try {
      setIsGitLoading(true);
      await gitService.switchBranch(branch);
      await Promise.all([checkGitStatus(), loadBranches(), loadCommits()]);
      toast.success(`Switched to branch '${branch}'`);
    } catch (error) {
      console.error('Error switching branch:', error);
      toast.error('Failed to switch branch');
    } finally {
      setIsGitLoading(false);
    }
  };
  
  const handleSaveConfig = async () => {
    try {
      setIsGitLoading(true);
      await gitService.setUserConfig(configForm.name, configForm.email);
      await loadUserConfig();
      setShowConfigModal(false);
      toast.success('Git configuration updated');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save Git configuration');
    } finally {
      setIsGitLoading(false);
    }
  };

  const handleGitInit = async () => {
    try {
      setIsGitLoading(true);
      await gitService.initRepo();
      await checkGitStatus();
      toast.success('Git repository initialized');
    } catch (error) {
      console.error('Error initializing Git repo:', error);
      toast.error('Failed to initialize Git repository');
    } finally {
      setIsGitLoading(false);
    }
  };

  const handleGitCommit = async () => {
    if (!commitMessage.trim()) {
      toast.error('Please enter a commit message');
      return;
    }

    try {
      setIsGitLoading(true);
      const sha = await gitService.commit(commitMessage);
      setCommitMessage('');
      await checkGitStatus();
      toast.success(`Committed successfully: ${sha.substring(0, 7)}`);
    } catch (error) {
      console.error('Error committing changes:', error);
      toast.error('Failed to commit changes');
    } finally {
      setIsGitLoading(false);
    }
  };

  const handleGitPush = async () => {
    try {
      setIsGitLoading(true);
      await gitService.push();
      toast.success('Pushed changes successfully');
    } catch (error) {
      console.error('Error pushing changes:', error);
      toast.error('Failed to push changes');
    } finally {
      setIsGitLoading(false);
    }
  };

  const handleGitPull = async () => {
    try {
      setIsGitLoading(true);
      await gitService.pull();
      await checkGitStatus();
      toast.success('Pulled latest changes');
    } catch (error) {
      console.error('Error pulling changes:', error);
      toast.error('Failed to pull changes');
    } finally {
      setIsGitLoading(false);
    }
  };

  const runCommand = async (command: string) => {
    try {
      setIsLoading(true);
      // In a real app, this would execute the command in the project directory
      console.log(`Running command: ${command}`);
      // Simulate command execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Command completed: ${command}`);
    } catch (error) {
      console.error(`Error running command ${command}:`, error);
      toast.error(`Failed to run command: ${command}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkForUpdates = async () => {
    try {
      setIsLoading(true);
      // In a real app, this would check npm registry for updates
      // For now, we'll simulate it
      setOutdatedDeps([
        { name: 'react', current: '^17.0.2', latest: '18.2.0' },
        { name: 'typescript', current: '^4.3.5', latest: '5.0.0' }
      ]);
    } catch (error) {
      console.error('Error checking for updates:', error);
      toast.error('Failed to check for updates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: checked !== undefined ? checked : value
    }));
  };
  
  const addEnvVar = () => {
    if (!newEnvVar.key) return;
    
    setFormData(prev => ({
      ...prev,
      envVars: [...prev.envVars, { ...newEnvVar }]
    }));
    
    setNewEnvVar({ key: '', value: '', isSecret: false });
  };
  
  const removeEnvVar = (index: number) => {
    setFormData(prev => ({
      ...prev,
      envVars: prev.envVars.filter((_, i) => i !== index)
    }));
  };
  
  const updateEnvVar = (index: number, field: keyof EnvVar, value: string | boolean) => {
    setFormData(prev => {
      const updated = [...prev.envVars];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, envVars: updated };
    });
  };
  
  const addDependency = () => {
    if (!newDependency.name) return;
    
    const depList = newDependency.isDev ? 'devDependencies' : 'dependencies';
    
    setFormData(prev => ({
      ...prev,
      [depList]: [...prev[depList], { ...newDependency }]
    }));
    
    setNewDependency({ name: '', version: 'latest', isDev: false });
    setIsAddingDependency(false);
  };
  
  const removeDependency = (name: string, isDev: boolean) => {
    const depList = isDev ? 'devDependencies' : 'dependencies';
    
    setFormData(prev => ({
      ...prev,
      [depList]: prev[depList].filter(dep => dep.name !== name)
    }));
  };
  
  const toggleDependencyType = (name: string, currentIsDev: boolean) => {
    const currentList = currentIsDev ? 'devDependencies' : 'dependencies';
    const targetList = currentIsDev ? 'dependencies' : 'devDependencies';
    
    setFormData(prev => {
      const dep = prev[currentList].find(d => d.name === name);
      if (!dep) return prev;
      
      return {
        ...prev,
        [currentList]: prev[currentList].filter(d => d.name !== name),
        [targetList]: [...prev[targetList], { ...dep, isDev: !currentIsDev }]
      };
    });
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };
  
  const filteredDependencies = (deps: Dependency[]) => {
    if (!dependencySearch) return deps;
    return deps.filter(dep => 
      dep.name.toLowerCase().includes(dependencySearch.toLowerCase()) ||
      dep.version.toLowerCase().includes(dependencySearch.toLowerCase())
    );
  };

  if (!currentProject) return null;

  // Update the Git status when the component mounts
  useEffect(() => {
    const initializeGit = async () => {
      if (!currentProject) return;
      
      try {
        setIsGitLoading(true);
        await checkGitStatus();
        await loadBranches();
        await loadCommits();
        await loadUserConfig();
      } catch (error) {
        console.error('Error initializing Git:', error);
      } finally {
        setIsGitLoading(false);
      }
    };
    
    initializeGit();
  }, [currentProject]);
  
  const loadBranches = async () => {
    try {
      const branchInfo = await gitService.getBranches();
      setBranches(branchInfo);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };
  
  const loadCommits = async () => {
    try {
      const commitList = await gitService.getCommits(10);
      setCommits(commitList);
    } catch (error) {
      console.error('Error loading commits:', error);
    }
  };
  
  const loadUserConfig = async () => {
    try {
      const config = await gitService.getUserConfig();
      setUserConfig(config);
      setConfigForm(config);
    } catch (error) {
      console.error('Error loading user config:', error);
    }
  };
  
  const updateFileStatuses = async (status: GitStatus) => {
    const files: FileStatus[] = [];
    
    status.staged.forEach(path => {
      files.push({ path, status: 'staged' });
    });
    
    status.modified.forEach(path => {
      files.push({ path, status: 'modified' });
    });
    
    status.untracked.forEach(path => {
      files.push({ path, status: 'untracked' });
    });
    
    status.conflicted.forEach(path => {
      files.push({ path, status: 'conflicted' });
    });
    
    setFileStatuses(files);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Project Settings</h1>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={exportProject}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Export project configuration"
          >
            <FiDownload className="mr-2" /> Export
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Import project configuration"
          >
            <FiUpload className="mr-2" /> Import
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={saveAsTemplate}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            title="Save as template"
          >
            <FiCopy className="mr-2" /> Save as Template
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {['general', 'environment', 'dependencies', 'version-control', 'build'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              {tab === 'version-control' && <FiGitBranch className="mr-1.5" />}
              {tab === 'build' && <FiTerminal className="mr-1.5" />}
              {tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </nav>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings Tab */}
        {activeTab === 'general' && (
        {/* Project Metadata */}
        <div className="space-y-6">
          {/* Project Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center">
              <FiGlobe className="mr-2" /> Project Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Version</label>
                <input
                  type="text"
                  name="version"
                  value={formData.version}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Build & Run Configurations */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center">
              <FiCpu className="mr-2" /> Build & Run
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Build Command</label>
                <input
                  type="text"
                  name="buildCommand"
                  value={formData.buildCommand}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Command</label>
                <input
                  type="text"
                  name="startCommand"
                  value={formData.startCommand}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Test Command</label>
                <input
                  type="text"
                  name="testCommand"
                  value={formData.testCommand}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiSave className="mr-2" /> Save Changes
            </button>
          </div>
        </div>
        )}

        {/* Environment Variables Tab */}
        {activeTab === 'environment' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center">
                <FiLock className="mr-2" /> Environment Variables
              </h2>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Environment variables are used to store sensitive information and configuration.
                  Variables marked as secret will be hidden by default.
                </p>
                
                <div className="grid grid-cols-12 gap-4 mb-4">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Variable name (e.g., API_KEY)"
                      value={newEnvVar.key}
                      onChange={(e) => setNewEnvVar({ ...newEnvVar, key: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="col-span-5">
                    <input
                      type={newEnvVar.isSecret ? 'password' : 'text'}
                      placeholder="Variable value"
                      value={newEnvVar.value}
                      onChange={(e) => setNewEnvVar({ ...newEnvVar, value: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex items-center space-x-2">
                    <label className="flex items-center text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={newEnvVar.isSecret}
                        onChange={(e) => setNewEnvVar({ ...newEnvVar, isSecret: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2">Secret</span>
                    </label>
                    <button
                      type="button"
                      onClick={addEnvVar}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FiPlus className="mr-1" /> Add
                    </button>
                  </div>
                </div>

                {formData.envVars.length > 0 ? (
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Variable
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Value
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.envVars.map((env, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {env.key}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                {env.isSecret ? (
                                  <span className="text-gray-400">••••••••</span>
                                ) : (
                                  <span>{env.value}</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(env.value)}
                                  className="ml-2 text-gray-400 hover:text-gray-600"
                                  title="Copy to clipboard"
                                >
                                  <FiCopy size={14} />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => updateEnvVar(index, 'isSecret', !env.isSecret)}
                                  className="text-gray-500 hover:text-gray-700"
                                  title={env.isSecret ? 'Make visible' : 'Hide value'}
                                >
                                  {env.isSecret ? <FiUnlock size={16} /> : <FiLock size={16} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeEnvVar(index)}
                                  className="text-red-500 hover:text-red-700"
                                  title="Remove variable"
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No environment variables added yet.</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-3">Environment Files</h3>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        For security, add <code className="font-mono bg-yellow-100 px-1 rounded">.env</code> to your <code className="font-mono bg-yellow-100 px-1 rounded">.gitignore</code> file.
                        These variables are stored in your project configuration and are not automatically synced with <code className="font-mono bg-yellow-100 px-1 rounded">.env</code> files.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiSave className="mr-2" /> Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Dependencies Tab */}
        {activeTab === 'dependencies' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium flex items-center">
                  <FiPackage className="mr-2" /> Dependencies
                </h2>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Search dependencies..."
                    value={dependencySearch}
                    onChange={(e) => setDependencySearch(e.target.value)}
                    className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setIsAddingDependency(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FiPlus className="mr-1" /> Add Dependency
                  </button>
                </div>
              </div>

              {isAddingDependency && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Dependency</h3>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder="Package name (e.g., lodash)"
                        value={newDependency.name}
                        onChange={(e) => setNewDependency({ ...newDependency, name: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Version (e.g., ^4.17.21)"
                        value={newDependency.version}
                        onChange={(e) => setNewDependency({ ...newDependency, version: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div className="col-span-2 flex items-center">
                      <label className="flex items-center text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={newDependency.isDev}
                          onChange={(e) => setNewDependency({ ...newDependency, isDev: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2">Dev</span>
                      </label>
                    </div>
                    <div className="col-span-2 flex space-x-2">
                      <button
                        type="button"
                        onClick={addDependency}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingDependency(false);
                          setNewDependency({ name: '', version: 'latest', isDev: false });
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Dependencies */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-md font-medium text-gray-900">Dependencies</h3>
                    <span className="text-xs text-gray-500">
                      {formData.dependencies.length} packages
                    </span>
                  </div>
                  
                  {formData.dependencies.length > 0 ? (
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Package
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Version
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredDependencies(formData.dependencies).map((dep, index) => (
                            <tr key={dep.name}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {dep.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {dep.version}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleDependencyType(dep.name, dep.isDev)}
                                    className="text-blue-500 hover:text-blue-700"
                                    title="Move to devDependencies"
                                  >
                                    <FiPackage size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeDependency(dep.name, dep.isDev)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Remove dependency"
                                  >
                                    <FiTrash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
                      <p>No dependencies added yet.</p>
                    </div>
                  )}
                </div>

                {/* Dev Dependencies */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-md font-medium text-gray-900">Dev Dependencies</h3>
                    <span className="text-xs text-gray-500">
                      {formData.devDependencies.length} packages
                    </span>
                  </div>
                  
                  {formData.devDependencies.length > 0 ? (
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Package
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Version
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredDependencies(formData.devDependencies).map((dep) => (
                            <tr key={`dev-${dep.name}`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {dep.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {dep.version}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleDependencyType(dep.name, dep.isDev)}
                                    className="text-blue-500 hover:text-blue-700"
                                    title="Move to dependencies"
                                  >
                                    <FiCode size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeDependency(dep.name, dep.isDev)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Remove dependency"
                                  >
                                    <FiTrash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
                      <p>No dev dependencies added yet.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-3">Package Management</h3>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        Changes to dependencies will be reflected in your project's <code className="font-mono bg-blue-100 px-1 rounded">package.json</code> file.
                        To install the dependencies, run <code className="font-mono bg-blue-100 px-1 rounded">npm install</code> in your project directory.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiSave className="mr-2" /> Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Version Control Tab */}
        {activeTab === 'version-control' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center">
                <FiGitBranch className="mr-2" /> Version Control
              </h2>
              
              {gitStatus.branch ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FiGitBranch className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          On branch <span className="font-mono font-bold">{gitStatus.branch}</span>
                          {gitStatus.changes > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              {gitStatus.changes} uncommitted changes
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="text-md font-medium text-gray-900">Commit Changes</h3>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          placeholder="Commit message"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          disabled={isGitLoading}
                        />
                        <button
                          type="button"
                          onClick={handleGitCommit}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          disabled={gitStatus.changes === 0 || isGitLoading}
                        >
                          {isGitLoading ? (
                            <FiRefreshCw className="mr-1.5 animate-spin" />
                          ) : (
                            <FiGitCommit className="mr-1.5" />
                          )}
                          {isGitLoading ? 'Committing...' : 'Commit'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-md font-medium text-gray-900">Remote Operations</h3>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={handleGitPull}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          disabled={isGitLoading}
                        >
                          {isGitLoading ? (
                            <FiRefreshCw className="mr-1.5 animate-spin" />
                          ) : (
                            <FiGitPull className="mr-1.5" />
                          )}
                          {isGitLoading ? 'Pulling...' : 'Pull'}
                        </button>
                        <button
                          type="button"
                          onClick={handleGitPush}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          disabled={isGitLoading || gitStatus.changes > 0}
                        >
                          {isGitLoading ? (
                            <FiRefreshCw className="mr-1.5 animate-spin" />
                          ) : (
                            <FiGitMerge className="mr-1.5" />
                          )}
                          {isGitLoading ? 'Pushing...' : 'Push'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiGitBranch className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Git repository</h3>
                  <p className="mt-1 text-sm text-gray-500">Initialize a Git repository to start tracking changes.</p>
                  <div className="mt-6">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      onClick={handleGitInit}
                      disabled={isGitLoading}
                    >
                      {isGitLoading ? (
                        <FiRefreshCw className="mr-2 animate-spin" />
                      ) : (
                        <FiGitBranch className="mr-2" />
                      )}
                      {isGitLoading ? 'Initializing...' : 'Initialize Repository'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Build & Run Tab */}
        {activeTab === 'build' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-6 flex items-center">
                <FiTerminal className="mr-2" /> Build & Run
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Available Scripts</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Build</h4>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {formData.buildCommand || 'Not set'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => runCommand(formData.buildCommand)}
                          className="mt-2 w-full inline-flex justify-center items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          disabled={!formData.buildCommand || isLoading}
                        >
                          <FiPlay className="mr-1.5" /> Run Build
                        </button>
                      </div>
                      
                      <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Start</h4>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {formData.startCommand || 'Not set'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => runCommand(formData.startCommand)}
                          className="mt-2 w-full inline-flex justify-center items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          disabled={!formData.startCommand || isLoading}
                        >
                          <FiPlay className="mr-1.5" /> Start Server
                        </button>
                      </div>
                      
                      <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Test</h4>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {formData.testCommand || 'Not set'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => runCommand(formData.testCommand)}
                          className="mt-2 w-full inline-flex justify-center items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                          disabled={!formData.testCommand || isLoading}
                        >
                          <FiCheckCircle className="mr-1.5" /> Run Tests
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Dependency Management</h3>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Outdated Packages</h4>
                      <button
                        type="button"
                        onClick={checkForUpdates}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        disabled={isLoading}
                      >
                        <FiRefreshCw className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Checking...' : 'Check for Updates'}
                      </button>
                    </div>
                    
                    {outdatedDeps.length > 0 ? (
                      <div className="overflow-hidden border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Package
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Current
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Latest
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {outdatedDeps.map((dep) => (
                              <tr key={dep.name}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {dep.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                    {dep.current}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    {dep.latest}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    type="button"
                                    className="text-blue-600 hover:text-blue-900"
                                    onClick={() => {
                                      // In a real app, this would update the dependency
                                      const deps = [...formData.dependencies];
                                      const depIndex = deps.findIndex(d => d.name === dep.name);
                                      if (depIndex !== -1) {
                                        deps[depIndex] = { ...deps[depIndex], version: `^${dep.latest}` };
                                        setFormData(prev => ({ ...prev, dependencies: deps }));
                                        toast.success(`Updated ${dep.name} to v${dep.latest}`);
                                      }
                                    }}
                                  >
                                    Update
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <FiCheckCircle className="mx-auto h-8 w-8 text-green-500" />
                        <p className="mt-2 text-sm text-gray-500">All dependencies are up to date</p>
                      </div>
                    )}
                    
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Install Dependencies</h4>
                          <p className="text-sm text-gray-500">Install or update all project dependencies</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => runCommand('npm install')}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          disabled={isLoading}
                        >
                          <FiPackage className="mr-2" /> Install Dependencies
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
      
      {/* Hidden file input for project import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        className="hidden"
      />
    </div>
  );
};

export default ProjectSettings;
