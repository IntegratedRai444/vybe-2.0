import React from "react";
import { useParams } from "react-router-dom";
import { FileExplorer } from "@/components/FileExplorer";
import { MonacoEditor } from "@/components/MonacoEditor";
import { Terminal } from "@/components/Terminal";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export const EditorPage: React.FC = () => {
  const { filePath } = useParams<{ filePath?: string }>();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4">
        <FileExplorer />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <PanelGroup direction="vertical" className="flex-1">
          {/* Editor Area */}
          <Panel defaultSize={70} minSize={30} className="bg-white">
            <MonacoEditor filePath={filePath} />
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="h-2 bg-gray-200 hover:bg-blue-500 transition-colors" />

          {/* Terminal Area */}
          <Panel
            defaultSize={30}
            minSize={10}
            className="bg-gray-900 text-white"
          >
            <Terminal />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};

export default EditorPage;
