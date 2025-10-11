// src/components/FileTree.tsx
import React, { useEffect, useState } from "react";
import { Folder, File } from "../utils/api";
import { FaFolder, FaFile } from "react-icons/fa";

type Props = {
  root: string;                 // absolute path of the project
  onSelect: (file: File) => void;
};

export const FileTree: React.FC<Props> = ({ root, onSelect }) => {
  const [tree, setTree] = useState<Folder | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load folder recursively from backend
    fetch(`http://127.0.0.1:8000/folder?root=${encodeURIComponent(root)}`)
      .then((r) => r.json())
      .then(setTree);
  }, [root]);

  const toggle = (path: string) => {
    const copy = new Set(expanded);
    copy.has(path) ? copy.delete(path) : copy.add(path);
    setExpanded(copy);
  };

  const render = (node: Folder) => (
    <div key={node.path} className="ml-2">
      <div
        className="flex items-center cursor-pointer hover:bg-gray-200 p-1"
        onClick={() => toggle(node.path)}
      >
        <FaFolder className="mr-1" />
        <span>{node.name}</span>
      </div>
      {expanded.has(node.path) &&
        node.children?.map((c) =>
          c.type === "folder" ? render(c as Folder) : (
            <div
              key={c.path}
              className="flex items-center ml-4 cursor-pointer hover:bg-gray-100 p-1"
              onClick={() => onSelect(c as File)}
            >
              <FaFile className="mr-1" />
              <span>{c.name}</span>
            </div>
          )
        )}
    </div>
  );

  return <div className="overflow-y-auto h-full">{tree && render(tree)}</div>;
};
