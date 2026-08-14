import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Collapse,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  useTheme,
  Alert,
  CircularProgress,
  List,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ErrorOutline as ErrorIcon,
  WarningAmber as WarningIcon,
  InfoOutlined as InfoIcon,
  LightbulbOutlined as HintIcon,
  Search as SearchIcon,
  AutoFixHigh as FixIcon,
  Code as CodeIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Visibility as PreviewIcon,
  Undo as RevertIcon,
  CodeOff as NoFixesIcon,
} from "@mui/icons-material";
import { useMCP } from "../../contexts/MCPContext";
import { CodeIssue, IssueSeverity } from "../../types/mcp";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
type FixStatus = "suggested" | "applied" | "rejected";
type IssueCategory = "syntax" | "type" | "security" | "style" | "performance" | "bug" | "complexity" | "import";

interface FixPanelProps {
  selectedFile?: string;
  className?: string;
}

interface CodeFix extends Omit<CodeIssue, 'id' | 'category'> {
  id: string;
  status: FixStatus;
  category: IssueCategory;
  explanation?: string;
  changes: Array<{
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    newText: string;
    explanation?: string;
  }>;
}

// Helper function to safely get a category
const getSafeCategory = (category?: string): IssueCategory => {
  const validCategories: IssueCategory[] = [
    "syntax", "type", "security", "style", 
    "performance", "bug", "complexity", "import"
  ];
  return validCategories.includes(category as IssueCategory) 
    ? category as IssueCategory 
    : "style";
};

const getSeverityIcon = (severity: IssueSeverity) => {
  const icons: Record<IssueSeverity, JSX.Element> = {
    error: <ErrorIcon color="error" />,
    warning: <WarningIcon color="warning" />,
    info: <InfoIcon color="info" />,
    hint: <HintIcon color="action" />,
  };
  return icons[severity] || <InfoIcon color="inherit" />;
};

const getSeverityColor = (severity: IssueSeverity) => {
  const theme = useTheme();
  const severityColors: Record<IssueSeverity, string> = {
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
    hint: theme.palette.text.secondary,
  };
  return severityColors[severity] || theme.palette.text.primary;
};

const FixPanel: React.FC<FixPanelProps> = ({ selectedFile, className }) => {
  const theme = useTheme();
  // Use the available methods and state from MCP context
  const { issues, fixIssues, scanProject } = useMCP();
  
  // Local state for UI
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [isFetchingFixes, setIsFetchingFixes] = useState(false);
  
  // Map CodeIssue[] to CodeFix[] with required properties
  const fixes = React.useMemo<CodeFix[]>(() => {
    return issues.map(issue => ({
      ...issue,
      id: `${issue.filePath}:${issue.lineNumber}:${issue.column || 0}`,
      status: 'suggested' as const,
      category: getSafeCategory(issue.category as string),
      explanation: issue.message,
      changes: [{
        range: {
          start: { line: issue.lineNumber, character: issue.column || 0 },
          end: { line: issue.lineNumber, character: (issue.column || 0) + 10 },
        },
        newText: '', // This would be populated with the actual fix
        explanation: issue.message,
      }],
    }));
  }, [issues]);
  
  // Implementation of applyFix
  const handlePreviewFix = useCallback((fix: CodeFix) => {
    // Implementation for previewing a fix
    console.log('Previewing fix:', fix);
  }, []);

  const handleApplyAllFixes = async () => {
    try {
      setIsApplyingFix(true);
      const fixesToApply = fixes.filter(fix => fix.status === 'suggested');
      for (const fix of fixesToApply) {
        await fixIssues({
          filePath: fix.filePath,
          issues: [{
            filePath: fix.filePath,
            message: fix.message,
            severity: fix.severity,
            ruleId: fix.ruleId || '',
            lineNumber: fix.lineNumber,
            column: fix.column || 0,
            category: fix.category,
            analyzer: fix.analyzer || 'typescript',
            fix: {
              range: [fix.column || 0, (fix.column || 0) + 10],
              text: ''
            }
          }],
          autoApply: true,
          dryRun: false,
        });
      }
    } finally {
      setIsApplyingFix(false);
    }
  };

  const applyFix = async (fix: CodeFix) => {
    try {
      setIsApplyingFix(true);
      await fixIssues({
        issues: [{
          filePath: fix.filePath,
          message: fix.message,
          severity: fix.severity,
          ruleId: fix.ruleId,
          lineNumber: fix.lineNumber,
          category: fix.category || 'style',
          analyzer: 'mcp',
        }],
        autoApply: true,
        dryRun: false,
      });
    } finally {
      setIsApplyingFix(false);
    }
  };
  
  // Helper to get file name from path
  const getFileName = (filePath: string) => {
    const parts = filePath.split(/[\\/]/);
    return parts[parts.length - 1] || filePath;
  };

  const getFixesForFile = async (filePath: string) => {
    try {
      setIsFetchingFixes(true);
      await scanProject({ filePath, scanType: 'on-save' });
    } finally {
      setIsFetchingFixes(false);
    }
  };

  const [activeTab, setActiveTab] = useState<FixStatus>("suggested");
  const [expandedFix, setExpandedFix] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [localFixes, setLocalFixes] = useState<CodeFix[]>([]);
  // Preview state for code fixes (commented out as it's not currently used)
  // const [previewState] = useState<{
  //   fix: CodeFix | null;
  //   originalCode: string;
  // }>({ fix: null, originalCode: '' });

  // Filter fixes based on active tab and search query
  useEffect(() => {
    if (!fixes) return;

    let filtered = [...fixes];

    // Filter by selected file if any
    if (selectedFile) {
      filtered = filtered.filter((fix) => fix.filePath === selectedFile);
    }

    // Filter fixes based on status
    const filteredFixes = React.useMemo(() => {
      return fixes.filter((fix: CodeFix) => fix.status === activeTab);
    }, [fixes, activeTab]);

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filteredFixes.filter(
        (fix) =>
          fix.message.toLowerCase().includes(query) ||
          fix.ruleId?.toLowerCase().includes(query) ||
          fix.category?.toLowerCase().includes(query),
      );
    }

    setLocalFixes(filtered);
  }, [fixes, selectedFile, activeTab, searchQuery]);

  // Load fixes when selected file changes
  useEffect(() => {
    if (selectedFile) {
      getFixesForFile(selectedFile);
    }
  }, [selectedFile, getFixesForFile]);

  const handleTabChange = (
    event: React.SyntheticEvent,
    newValue: FixStatus,
  ) => {
    setActiveTab(newValue);
  };

  const handleFixToggle = (fixId: string) => {
    setExpandedFix(expandedFix === fixId ? null : fixId);
  };

  const handleApplyFix = async (fix: CodeFix) => {
    try {
      await applyFix(fix);
      // Refresh fixes after applying
      if (selectedFile) {
        getFixesForFile(selectedFile);
      }
    } catch (error) {
      console.error("Failed to apply fix:", error);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const renderFixContent = (fix: CodeFix) => {
    if (!fix.changes || fix.changes.length === 0) {
      return (
        <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
          No code changes available for this fix.
        </Alert>
      );
    }

    return (
      <Box sx={{ mt: 1 }}>
        {fix.changes.map((change, idx) => (
          <Box key={idx} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Change {idx + 1}: {change.explanation || "Code modification"}
            </Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Original
                </Typography>
                <SyntaxHighlighter
                  language="typescript"
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderRadius: theme.shape.borderRadius,
                    fontSize: "0.8rem",
                    maxHeight: "200px",
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  {change.explanation || "// No code changes"}
                </SyntaxHighlighter>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Fixed
                </Typography>
                <SyntaxHighlighter
                  language="typescript"
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderRadius: theme.shape.borderRadius,
                    fontSize: "0.8rem",
                    maxHeight: "200px",
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  {change.newText || "// No code changes"}
                </SyntaxHighlighter>
              </Box>
            </Box>

            {change.explanation && (
              <Box sx={{ 
                p: 2, 
                bgcolor: 'info.light', 
                color: 'info.contrastText',
                borderRadius: 1,
                mb: 2
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Why this fix?
                </Typography>
                <Typography variant="body2">
                  {change.explanation}
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  const renderFixItem = (fix: CodeFix) => {
    const isExpanded = expandedFix === fix.id;
    const Icon = getSeverityIcon(fix.severity);

    return (
      <Paper
        key={fix.id}
        variant="outlined"
        sx={{
          mb: 1,
          overflow: "hidden",
          borderColor: isExpanded ? "primary.main" : "divider",
          transition: theme.transitions.create(["border-color", "box-shadow"]),
          "&:hover": {
            borderColor: "primary.main",
            boxShadow: theme.shadows[1],
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2,
            py: 1,
            bgcolor: isExpanded
              ? alpha(theme.palette.primary.main, 0.05)
              : "background.paper",
            cursor: "pointer",
          }}
          onClick={() => handleFixToggle(fix.id)}
        >
          <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
            <Box sx={{ mr: 1 }}>{Icon}</Box>
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {fix.message}
            </Typography>
            <Chip
              label={fix.ruleId || "custom"}
              size="small"
              sx={{ ml: 1, fontSize: "0.6rem", height: 20 }}
              color={getSeverityColor(fix.severity)}
              variant="outlined"
            />
          </Box>
          <Box>
            {fix.status === "applied" ? (
              <Chip
                icon={<CheckCircleIcon fontSize="small" />}
                label="Applied"
                size="small"
                color="success"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            ) : fix.status === "rejected" ? (
              <Chip
                label="Dismissed"
                size="small"
                color="default"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            ) : (
              <Chip
                label={fix.status}
                size="small"
                color={
                  fix.status === 'applied' 
                    ? 'success' as const
                    : fix.status === 'rejected' 
                      ? 'error' as const
                      : 'default' as const
                }
                variant="outlined"
                sx={{ 
                  ml: 1, 
                  textTransform: 'capitalize',
                  color: getSeverityColor(fix.severity),
                  borderColor: getSeverityColor(fix.severity)
                }}
              />
            )}
            <IconButton size="small" sx={{ ml: 1 }}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Divider />
          <Box sx={{ p: 2 }}>
            {renderFixContent(fix)}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                mt: 2,
              }}
            >
              {fix.status !== "applied" && (
                <>
                  <Tooltip title="Preview changes">
                    <Button
                      size="small"
                      startIcon={<PreviewIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewFix(fix);
                      }}
                    >
                      Preview
                    </Button>
                  </Tooltip>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<FixIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyFix(fix);
                    }}
                    disabled={isApplyingFix}
                  >
                    {isApplyingFix ? "Applying..." : "Apply Fix"}
                  </Button>
                </>
              )}
              {fix.status === "applied" && (
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<RevertIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle revert
                  }}
                >
                  Revert
                </Button>
              )}
            </Box>
          </Box>
        </Collapse>
      </Paper>
    );
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
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            "& .MuiTab-root": {
              minHeight: 48,
            },
          }}
        >
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CodeIcon sx={{ mr: 0.5 }} fontSize="small" />
                <span>Suggested</span>
                {fixes?.some((f) => !f.status || f.status === "suggested") && (
                  <Chip
                    label={
                      fixes.filter((f) => !f.status || f.status === "suggested")
                        .length
                    }
                    size="small"
                    color="primary"
                    sx={{
                      ml: 1,
                      height: 18,
                      minWidth: 18,
                      "& .MuiChip-label": { px: 0.5 },
                    }}
                  />
                )}
              </Box>
            }
            value="suggested"
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CheckCircleIcon sx={{ mr: 0.5 }} fontSize="small" />
                <span>Applied</span>
                {fixes?.some((f) => f.status === "applied") && (
                  <Chip
                    label={fixes.filter((f) => f.status === "applied").length}
                    size="small"
                    color="success"
                    sx={{
                      ml: 1,
                      height: 18,
                      minWidth: 18,
                      "& .MuiChip-label": { px: 0.5 },
                    }}
                  />
                )}
              </Box>
            }
            value="applied"
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <ErrorIcon sx={{ mr: 0.5 }} fontSize="small" />
                <span>Dismissed</span>
                {fixes?.some((f) => f.status === "rejected") && (
                  <Chip
                    label={fixes.filter((f) => f.status === "rejected").length}
                    size="small"
                    color="default"
                    sx={{
                      ml: 1,
                      height: 18,
                      minWidth: 18,
                      "& .MuiChip-label": { px: 0.5 },
                    }}
                  />
                )}
              </Box>
            }
            value="rejected"
          />
        </Tabs>
      </Box>

      <Box sx={{ p: 1, borderBottom: 1, borderColor: "divider" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search fixes..."
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
                <Tooltip title="Refresh fixes">
                  <IconButton
                    size="small"
                    onClick={() =>
                      selectedFile && getFixesForFile(selectedFile)
                    }
                    disabled={isFetchingFixes}
                  >
                    <RefreshIcon
                      fontSize="small"
                      className={isFetchingFixes ? "spin" : ""}
                      sx={{
                        "@keyframes spin": {
                          "0%": { transform: "rotate(0deg)" },
                          "100%": { transform: "rotate(360deg)" },
                        },
                        "&.spin": {
                          animation: "spin 1s linear infinite",
                        },
                      }}
                    />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
        {isFetchingFixes ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : localFixes.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
              p: 3,
              color: "text.secondary",
            }}
          >
            <NoFixesIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="subtitle1" gutterBottom>
              {activeTab === "suggested"
                ? "No suggested fixes found"
                : activeTab === "applied"
                  ? "No applied fixes yet"
                  : "No dismissed fixes"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activeTab === "suggested"
                ? "Try selecting a file with issues or run a scan to find potential fixes."
                : activeTab === "applied"
                  ? "Applied fixes will appear here."
                  : "Dismissed fixes will appear here."}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {localFixes.map((fix) => renderFixItem(fix))}
          </List>
        )}
      </Box>

      {/* Preview Dialog would go here */}
    </Box>
  );
};

export default FixPanel;
