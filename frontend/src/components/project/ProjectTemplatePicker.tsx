import React, { useState } from "react";
import { FiPlus, FiX, FiCode, FiGlobe, FiServer } from "react-icons/fi";
import {
  ProjectTemplate,
  defaultTemplates,
} from "../../templates/projectTemplates";

interface ProjectTemplatePickerProps {
  onSelectTemplate: (template: ProjectTemplate) => void;
  onCancel: () => void;
}

const ProjectTemplatePicker: React.FC<ProjectTemplatePickerProps> = ({
  onSelectTemplate,
  onCancel,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Get all unique tags from templates
  const allTags = Array.from(
    new Set(
      defaultTemplates.flatMap((template: ProjectTemplate) => template.tags),
    ),
  ) as string[];

  // Filter templates based on search and category
  const filteredTemplates = defaultTemplates.filter(
    (template: ProjectTemplate) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase()),
        );

      const matchesCategory =
        selectedCategory === "all" || template.tags.includes(selectedCategory);

      return matchesSearch && matchesCategory;
    },
  );

  // Get icon based on template type
  const getTemplateIcon = (template: ProjectTemplate): JSX.Element => {
    if (template.tags.includes("react") || template.tags.includes("nextjs")) {
      return <FiGlobe className="text-blue-500" size={24} />;
    } else if (
      template.tags.includes("node") ||
      template.tags.includes("express")
    ) {
      return <FiServer className="text-green-500" size={24} />;
    }
    return <FiCode className="text-purple-500" size={24} />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Create New Project</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Search templates..."
              className="w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedCategory === "all"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedCategory(tag)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedCategory === tag
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tag.charAt(0).toUpperCase() + tag.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No templates found. Try a different search term or category.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col"
                >
                  <div className="p-4 border-b">
                    <div className="flex items-start">
                      <div className="mr-3 mt-1">
                        {getTemplateIcon(template)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex-1">
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {template.tags.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          +{template.tags.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 mb-4">
                      <div className="font-medium mb-1">Files included:</div>
                      <ul className="space-y-1">
                        {template.files
                          .slice(0, 3)
                          .map((file: { path: string }, idx: number) => (
                            <li key={idx} className="truncate">
                              <code className="bg-gray-50 px-1 py-0.5 rounded text-gray-700">
                                {file.path}
                              </code>
                            </li>
                          ))}
                        {template.files.length > 3 && (
                          <li className="text-gray-400">
                            +{template.files.length - 3} more files
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t">
                    <button
                      onClick={() => onSelectTemplate(template)}
                      className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FiPlus className="mr-2" />
                      Create Project
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <div className="text-sm text-gray-500">
            {filteredTemplates.length}{" "}
            {filteredTemplates.length === 1 ? "template" : "templates"} found
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTemplatePicker;
