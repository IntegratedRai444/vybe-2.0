import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProjectTemplate, defaultTemplates } from '../templates/projectTemplates';

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  isDirty: boolean;
  language: string;
  isOpen?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  version?: string;
  path: string;
  files: ProjectFile[];
  createdAt: Date;
  updatedAt: Date;
  templateId?: string;
  buildCommand?: string;
  startCommand?: string;
  testCommand?: string;
  envVars?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  createProject: (name: string, templateId?: string) => Promise<Project>;
  openProject: (projectId: string) => void;
  closeProject: () => void;
  saveFile: (fileId: string, content: string) => void;
  createFile: (path: string, content?: string) => Promise<ProjectFile>;
  deleteFile: (fileId: string) => void;
  getFile: (fileId: string) => ProjectFile | undefined;
  updateFile: (fileId: string, updates: Partial<ProjectFile>) => void;
  moveFile: (fileId: string, newPath: string) => void;
  renameFile: (fileId: string, newName: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  getProjectTemplates: () => ProjectTemplate[];
  getProjectTemplate: (templateId: string) => ProjectTemplate | undefined;
  getFileLanguage: (filePath: string) => string;
  getFileByPath: (path: string) => ProjectFile | undefined;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Load projects from localStorage on initial load
  React.useEffect(() => {
    const savedProjects = localStorage.getItem('projects');
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        // Convert string dates back to Date objects
        const projectsWithDates = parsed.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          files: p.files.map((f: any) => ({
            ...f,
            createdAt: new Date(f.createdAt),
            updatedAt: new Date(f.updatedAt)
          }))
        }));
        setProjects(projectsWithDates);
      } catch (error) {
        console.error('Failed to load projects from localStorage', error);
      }
    }
  }, []);

  // Save projects to localStorage whenever they change
  React.useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('projects', JSON.stringify(projects));
    }
  }, [projects]);

  const createProject = useCallback(async (name: string, templateId?: string) => {
    const newProject: Project = {
      id: uuidv4(),
      name,
      path: `/projects/${name.toLowerCase().replace(/\s+/g, '-')}`,
      files: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      templateId
    };

    // If a template is provided, load the template files
    if (templateId) {
      const template = defaultTemplates.find(t => t.id === templateId);
      if (template) {
        newProject.files = template.files.map(file => ({
          id: uuidv4(),
          name: file.path.split('/').pop() || 'untitled',
          path: file.path,
          content: file.content,
          isDirty: false,
          language: getFileLanguage(file.path),
          isOpen: false
        }));
      }
    }

    setProjects(prev => [...prev, newProject]);
    setCurrentProject(newProject);
    return newProject;
  }, []);

  const openProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
    }
  }, [projects]);

  const closeProject = useCallback(() => {
    setCurrentProject(null);
  }, []);

  const saveFile = useCallback((fileId: string, content: string) => {
    if (!currentProject) return;

    setProjects(prev => 
      prev.map(project => {
        if (project.id === currentProject.id) {
          const updatedFiles = project.files.map(file => 
            file.id === fileId 
              ? { ...file, content, isDirty: false, updatedAt: new Date() }
              : file
          );
          
          const updatedProject = {
            ...project,
            files: updatedFiles,
            updatedAt: new Date()
          };
          
          // Update current project if it's the one being updated
          if (currentProject.id === project.id) {
            setCurrentProject(updatedProject);
          }
          
          return updatedProject;
        }
        return project;
      })
    );
  }, [currentProject]);

  const createFile = useCallback(async (path: string, content: string = '') => {
    if (!currentProject) throw new Error('No project is currently open');

    const newFile: ProjectFile = {
      id: uuidv4(),
      name: path.split('/').pop() || 'untitled',
      path,
      content,
      isDirty: true,
      language: getFileLanguage(path),
      isOpen: true
    };

    const updatedProject = {
      ...currentProject,
      files: [...currentProject.files, newFile],
      updatedAt: new Date()
    };

    setProjects(prev => 
      prev.map(p => p.id === currentProject.id ? updatedProject : p)
    );
    
    setCurrentProject(updatedProject);
    return newFile;
  }, [currentProject]);

  const deleteFile = useCallback((fileId: string) => {
    if (!currentProject) return;

    const updatedProject = {
      ...currentProject,
      files: currentProject.files.filter(file => file.id !== fileId),
      updatedAt: new Date()
    };

    setProjects(prev => 
      prev.map(p => p.id === currentProject.id ? updatedProject : p)
    );
    
    setCurrentProject(updatedProject);
  }, [currentProject]);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    setProjects(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { ...p, ...updates, updatedAt: new Date() } 
          : p
      )
    );
    
    if (currentProject?.id === projectId) {
      setCurrentProject(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null);
    }
  }, [currentProject]);

  const deleteProject = useCallback((projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
    }
  }, [currentProject]);

  const getFile = useCallback((fileId: string) => {
    if (!currentProject) return undefined;
    return currentProject.files.find(f => f.id === fileId);
  }, [currentProject]);

  const getFileByPath = useCallback((path: string) => {
    if (!currentProject) return undefined;
    return currentProject.files.find(f => f.path === path);
  }, [currentProject]);

  const updateFile = useCallback((fileId: string, updates: Partial<ProjectFile>) => {
    if (!currentProject) return;
    
    setCurrentProject(prev => {
      if (!prev) return null;
      
      const fileIndex = prev.files.findIndex(f => f.id === fileId);
      if (fileIndex === -1) return prev;
      
      const updatedFiles = [...prev.files];
      updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], ...updates };
      
      return {
        ...prev,
        files: updatedFiles,
        updatedAt: new Date()
      };
    });
  }, [currentProject]);

  const moveFile = useCallback((fileId: string, newPath: string) => {
    if (!currentProject) return;
    
    const file = getFile(fileId);
    if (!file) return;
    
    const newFileName = newPath.split('/').pop() || file.name;
    const newFile = {
      ...file,
      name: newFileName,
      path: newPath,
      language: getFileLanguage(newPath)
    };
    
    updateFile(fileId, newFile);
  }, [currentProject, getFile, updateFile]);

  const renameFile = useCallback((fileId: string, newName: string) => {
    if (!currentProject) return;
    
    const file = getFile(fileId);
    if (!file) return;
    
    const pathParts = file.path.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');
    
    updateFile(fileId, {
      name: newName,
      path: newPath,
      language: getFileLanguage(newPath)
    });
  }, [currentProject, getFile, updateFile]);

  const getProjectTemplates = useCallback(() => {
    return [...defaultTemplates];
  }, []);

  const getProjectTemplate = useCallback((templateId: string) => {
    return defaultTemplates.find(t => t.id === templateId);
  }, []);

  const value = {
    projects,
    currentProject,
    createProject,
    openProject,
    closeProject,
    saveFile,
    createFile,
    deleteFile,
    getFile,
    getFileByPath,
    updateFile,
    moveFile,
    renameFile,
    updateProject,
    deleteProject,
    getProjectTemplates,
    getProjectTemplate,
    getFileLanguage,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

// Helper function to determine file language based on extension
function getFileLanguage(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'rs': 'rust',
    'sh': 'shell',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'md': 'markdown',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sql': 'sql',
    'graphql': 'graphql',
    'vue': 'vue',
    'svelte': 'svelte',
    'dockerfile': 'dockerfile',
    'gitignore': 'gitignore'
  };

  return languageMap[extension] || 'plaintext';
}
