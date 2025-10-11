import React from "react";
import { FileIcon } from "./FileIcon";

type Props = {
  filePath: string;
  projectRoot: string;
  onPathClick: (path: string) => void;
};

export const Breadcrumb: React.FC<Props> = ({ filePath, projectRoot, onPathClick }) => {
  if (!filePath) return null;

  const relativePath = filePath.replace(projectRoot, "").replace(/^[/\\]/, "");
  const pathParts = relativePath.split(/[/\\]/);
  
  let currentPath = projectRoot;
  const breadcrumbs = [
    {
      name: projectRoot.split(/[/\\]/).pop() || "Project",
      path: projectRoot,
      isFolder: true
    }
  ];

  pathParts.forEach((part, index) => {
    currentPath += `/${part}`;
    breadcrumbs.push({
      name: part,
      path: currentPath,
      isFolder: index < pathParts.length - 1
    });
  });

  return (
    <div className="flex items-center px-4 py-1 bg-gray-800 border-b border-gray-700 text-sm overflow-x-auto">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.path}>
          {index > 0 && (
            <span className="mx-2 text-gray-500">›</span>
          )}
          <button
            onClick={() => onPathClick(crumb.path)}
            className="flex items-center hover:bg-gray-700 px-2 py-1 rounded text-gray-300 hover:text-white whitespace-nowrap"
          >
            <FileIcon 
              fileName={crumb.name} 
              isFolder={crumb.isFolder}
              size="sm"
            />
            <span>{crumb.name}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};