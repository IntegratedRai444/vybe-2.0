import React, { useState, useCallback, useEffect } from "react";
import { TreeView, TreeItem } from "@mui/lab";
import { styled, alpha } from "@mui/material/styles";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  CircularProgress
} from "@mui/material";
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFileOutlined as FileIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { useMCP } from "../../contexts/MCPContext";
interface FileSystemItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileSystemItem[];
  path: string;
}

const StyledTreeItem = styled(TreeItem)(({ theme }) => ({
  '& .MuiTreeItem-content': {
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    margin: theme.spacing(0.25, 0),
    '&:hover': {
      backgroundColor: alpha(theme.palette.action.hover, 0.1),
    },
    '&.Mui-selected': {
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.15),
      },
    },
  },
  '& .MuiTreeItem-group': {
    marginLeft: theme.spacing(2),
    borderLeft: `1px dashed ${alpha(theme.palette.text.primary, 0.1)}`,
    paddingLeft: theme.spacing(1),
  },
}));

interface FileTreeItemProps {
  nodeId: string;
  label: string;
  isFile: boolean;
  isOpen: boolean;
  onSelect: (nodeId: string, isFile: boolean) => void;
  children?: React.ReactNode;
}

const FileTreeItem = (props: FileTreeItemProps) => {
  const { nodeId, label, isFile, isOpen, onSelect, children } = props;

  const handleClick = () => {
    onSelect(nodeId, isFile);
  };

  return (
    <TreeItem
      nodeId={nodeId}
      label={
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {isFile ? (
            <FileIcon color="action" fontSize="small" sx={{ mr: 1 }} />
          ) : isOpen ? (
            <FolderOpenIcon color="warning" sx={{ mr: 1 }} />
          ) : (
            <FolderIcon color="warning" sx={{ mr: 1 }} />
          )}
          <Typography variant="body2" noWrap>
            {label}
          </Typography>
        </Box>
      }
      onClick={handleClick}
    >
      {children}
    </TreeItem>
  );
};

interface MCPFileTreeProps {
  onFileSelect?: (filePath: string) => void;
  className?: string;
}

const MCPFileTree: React.FC<MCPFileTreeProps> = ({
  onFileSelect,
  className,
}) => {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTree, setFileTree] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { scanProject } = useMCP();

  // Fetch file tree data
  const fetchFileTree = useCallback(async () => {
    try {
      setIsLoading(true);
      // This would be an API call in a real implementation
      // const response = await fetch('/api/files/tree');
      // const data = await response.json();
      // setFileTree(data);

      // Mock data for now
      setFileTree([
        {
          name: "src",
          path: "/src",
          type: "directory",
          children: [
            {
              name: "components",
              path: "/src/components",
              type: "directory",
              children: [
                {
                  name: "App.tsx",
                  path: "/src/components/App.tsx",
                  type: "file",
                },
                {
                  name: "Header.tsx",
                  path: "/src/components/Header.tsx",
                  type: "file",
                },
              ],
            },
            {
              name: "pages",
              path: "/src/pages",
              type: "directory",
              children: [
                { name: "Home.tsx", path: "/src/pages/Home.tsx", type: "file" },
                {
                  name: "About.tsx",
                  path: "/src/pages/About.tsx",
                  type: "file",
                },
              ],
            },
            { name: "index.tsx", path: "/src/index.tsx", type: "file" },
            { name: "App.css", path: "/src/App.css", type: "file" },
          ],
        },
        {
          name: "public",
          path: "/public",
          type: "directory",
          children: [
            { name: "index.html", path: "/public/index.html", type: "file" },
            { name: "favicon.ico", path: "/public/favicon.ico", type: "file" },
          ],
        },
        { name: "package.json", path: "/package.json", type: "file" },
        { name: "tsconfig.json", path: "/tsconfig.json", type: "file" },
      ]);
    } catch (error) {
      console.error("Error fetching file tree:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFileTree();
  }, [fetchFileTree]);

  const handleToggle = (event: React.SyntheticEvent, nodeIds: string[]) => {
    setExpanded(nodeIds);
  };

  const handleSelect = (nodeId: string, isFile: boolean) => {
    setSelected(nodeId);
    if (isFile && onFileSelect) {
      onFileSelect(nodeId);
    }
  };

  const handleRefresh = () => {
    fetchFileTree();
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    // TODO: Implement search filtering
  };

  const renderTree = (nodes: FileSystemItem[]) => {
    return nodes.map((node) => {
      const isFile = node.type === "file";
      const isDir = node.type === "directory";
      const isExpanded = expanded.includes(node.path);

      // Filter children if search query exists
      let children = null;
      if (isDir && node.children) {
        children = renderTree(node.children);
      }

      // Skip this node and its children if it doesn't match search (unless a child does)
      if (
        searchQuery &&
        !node.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (!children || children.length === 0)
      ) {
        return null;
      }

      return (
        <FileTreeItem
          key={node.path}
          nodeId={node.path}
          label={node.name}
          isFile={isFile}
          isOpen={isExpanded}
          onToggle={() => {}}
          onSelect={handleSelect}
        >
          {children}
        </FileTreeItem>
      );
    });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        ...(className ? { className } : {}),
      }}
    >
      <Box sx={{ p: 1, borderBottom: "1px solid", borderColor: "divider" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search files..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Refresh file tree">
                  <IconButton
                    size="small"
                    onClick={handleRefresh}
                    disabled={isLoading}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : fileTree.length === 0 ? (
          <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
            <Typography variant="body2">No files found</Typography>
          </Box>
        ) : (
          <TreeView
            aria-label="file system navigator"
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            expanded={expanded}
            selected={selected}
            onNodeToggle={handleToggle}
            sx={{
              height: "100%",
              flexGrow: 1,
              maxWidth: "100%",
              overflowY: "auto",
            }}
          >
            {renderTree(fileTree)}
          </TreeView>
        )}
      </Box>
    </Box>
  );
};

export default MCPFileTree;
