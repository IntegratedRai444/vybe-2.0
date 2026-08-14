import React, { useState } from "react";
import {
  FiFolder,
  FiPlus,
  FiX,
  FiChevronRight,
  FiChevronDown,
} from "react-icons/fi";
import { ProjectTemplate } from "../../templates/projectTemplates";
import { useProject } from "../../contexts/ProjectContext";
import ProjectTemplatePicker from "./ProjectTemplatePicker";

const ProjectManager: React.FC = () => {
  const {
    projects,
    currentProject,
    createProject,
    openProject,
    deleteProject,
  } = useProject();

  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleCreateProject = async (template?: ProjectTemplate) => {
    try {
      const projectName = prompt("Enter project name:");
      if (projectName) {
        await createProject(projectName, template?.id);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setShowTemplatePicker(false);
    }
  };

  const handleSelectTemplate = (template: ProjectTemplate) => {
    handleCreateProject(template);
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      deleteProject(projectId);
    }
  };

  return (
    <div className="h-full flex flex-col border-r border-gray-200 bg-white">
      <div className="p-3 border-b flex justify-between items-center">
        <h2 className="font-medium text-gray-800">Projects</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="p-1 text-gray-500 hover:text-blue-500 hover:bg-gray-100 rounded"
            title="New Project"
          >
            <FiPlus size={18} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-500 hover:text-blue-500 hover:bg-gray-100 rounded"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <FiChevronDown size={18} />
            ) : (
              <FiChevronRight size={18} />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {expanded && (
          <div className="py-2">
            {projects.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-gray-500 mb-4">No projects yet</p>
                <button
                  onClick={() => setShowTemplatePicker(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiPlus className="mr-1.5 h-4 w-4" />
                  Create Project
                </button>
              </div>
            ) : (
              <ul className="space-y-1">
                {projects.map((project) => (
                  <li
                    key={project.id}
                    className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${
                      currentProject?.id === project.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => openProject(project.id)}
                  >
                    <div className="flex items-center">
                      <FiFolder
                        className={`mr-2 ${
                          currentProject?.id === project.id
                            ? "text-blue-500"
                            : "text-gray-400"
                        }`}
                      />
                      <span className="truncate">{project.name}</span>
                    </div>
                    {currentProject?.id === project.id && (
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="text-gray-400 hover:text-red-500 p-1 -mr-1"
                        title="Delete project"
                      >
                        <FiX size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {showTemplatePicker && (
        <ProjectTemplatePicker
          onSelectTemplate={handleSelectTemplate}
          onCancel={() => setShowTemplatePicker(false)}
        />
      )}
    </div>
  );
};

export default ProjectManager;
