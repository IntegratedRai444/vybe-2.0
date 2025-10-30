import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  AlertTitle,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  useTheme,
  Paper,
  Tabs,
  Tab,
  Badge,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Code as CodeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  AutoFixHigh as FixIcon,
  CodeOff as NoFixesIcon,
  ArrowRightAlt as ApplyIcon,
  Visibility as PreviewIcon,
  ContentCopy as CopyIcon,
  Undo as RevertIcon,
} from '@mui/icons-material';
import { useMCP } from '../../../contexts/MCPContext';
import { CodeFix, CodeIssueSeverity, CodeIssue } from '../../../types/mcp';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type FixCategory = 'all' | 'suggested' | 'applied' | 'rejected';

interface FixPanelProps {
  selectedFile?: string;
  className?: string;
}

const severityIcons = {
  error: <ErrorIcon color="error" />,
  warning: <WarningIcon color="warning" />,
  info: <InfoIcon color="info" />,
  hint: <InfoIcon color="action" />,
};

const getSeverityColor = (severity: CodeIssueSeverity) => {
  switch (severity) {
    case 'error': return 'error';
    case 'warning': return 'warning';
    case 'info': return 'info';
    default: return 'default';
  }
};

const FixPanel: React.FC<FixPanelProps> = ({ selectedFile, className }) => {
  const theme = useTheme();
  const { fixes, applyFix, getFixesForFile, isApplyingFix, isFetchingFixes } = useMCP();
  
  const [activeTab, setActiveTab] = useState<FixCategory>('suggested');
  const [expandedFix, setExpandedFix] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localFixes, setLocalFixes] = useState<CodeFix[]>([]);
  const [previewFix, setPreviewFix] = useState<{ fix: CodeFix; originalCode: string } | null>(null);
  
  // Filter fixes based on active tab and search query
  useEffect(() => {
    if (!fixes) return;
    
    let filtered = [...fixes];
    
    // Filter by selected file if any
    if (selectedFile) {
      filtered = filtered.filter(fix => fix.filePath === selectedFile);
    }
    
    // Filter by tab
    switch (activeTab) {
      case 'applied':
        filtered = filtered.filter(fix => fix.status === 'applied');
        break;
      case 'rejected':
        filtered = filtered.filter(fix => fix.status === 'rejected');
        break;
      case 'suggested':
      default:
        filtered = filtered.filter(fix => !fix.status || fix.status === 'suggested');
        break;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(fix => 
        fix.message.toLowerCase().includes(query) ||
        fix.ruleId?.toLowerCase().includes(query) ||
        fix.category?.toLowerCase().includes(query)
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
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: FixCategory) => {
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
      console.error('Failed to apply fix:', error);
    }
  };
  
  const handlePreviewFix = (fix: CodeFix) => {
    // In a real app, this would fetch the original code
    const originalCode = '// Original code would appear here\n' + 
      'function example() {\n  console.log("Hello, world!");\n}';
    setPreviewFix({ fix, originalCode });
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
              Change {idx + 1}: {change.description || 'Code modification'}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
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
                    fontSize: '0.8rem',
                    maxHeight: '200px',
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  {change.originalCode || '// No code changes'}
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
                    fontSize: '0.8rem',
                    maxHeight: '200px',
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  {change.fixedCode || '// No code changes'}
                </SyntaxHighlighter>
              </Box>
            </Box>
            
            {change.explanation && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <AlertTitle>Why this fix?</AlertTitle>
                {change.explanation}
              </Alert>
            )}
          </Box>
        ))}
      </Box>
    );
  };
  
  const renderFixItem = (fix: CodeFix) => {
    const isExpanded = expandedFix === fix.id;
    const Icon = severityIcons[fix.severity] || <InfoIcon />;
    
    return (
      <Paper 
        key={fix.id} 
        variant="outlined" 
        sx={{ 
          mb: 1,
          overflow: 'hidden',
          borderColor: isExpanded ? 'primary.main' : 'divider',
          transition: theme.transitions.create(['border-color', 'box-shadow']),
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: theme.shadows[1],
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 1,
            bgcolor: isExpanded 
              ? alpha(theme.palette.primary.main, 0.05)
              : 'background.paper',
            cursor: 'pointer',
          }}
          onClick={() => handleFixToggle(fix.id)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Box sx={{ mr: 1 }}>{Icon}</Box>
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {fix.message}
            </Typography>
            <Chip 
              label={fix.ruleId || 'custom'}
              size="small"
              sx={{ ml: 1, fontSize: '0.6rem', height: 20 }}
              color={getSeverityColor(fix.severity)}
              variant="outlined"
            />
          </Box>
          <Box>
            {fix.status === 'applied' ? (
              <Chip 
                icon={<CheckCircleIcon fontSize="small" />}
                label="Applied" 
                size="small" 
                color="success"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            ) : fix.status === 'rejected' ? (
              <Chip 
                label="Dismissed" 
                size="small" 
                color="default"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            ) : null}
            <IconButton size="small" sx={{ ml: 1 }}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>
        
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Divider />
          <Box sx={{ p: 2 }}>
            {renderFixContent(fix)}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              {fix.status !== 'applied' && (
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
                    {isApplyingFix ? 'Applying...' : 'Apply Fix'}
                  </Button>
                </>
              )}
              {fix.status === 'applied' && (
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
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        ...(className ? { className } : {})
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
            },
          }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CodeIcon sx={{ mr: 0.5 }} fontSize="small" />
                <span>Suggested</span>
                {fixes?.some(f => !f.status || f.status === 'suggested') && (
                  <Chip 
                    label={fixes.filter(f => !f.status || f.status === 'suggested').length}
                    size="small" 
                    color="primary"
                    sx={{ ml: 1, height: 18, minWidth: 18, '& .MuiChip-label': { px: 0.5 } }}
                  />
                )}
              </Box>
            } 
            value="suggested" 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ mr: 0.5 }} fontSize="small" />
                <span>Applied</span>
                {fixes?.some(f => f.status === 'applied') && (
                  <Chip 
                    label={fixes.filter(f => f.status === 'applied').length}
                    size="small" 
                    color="success"
                    sx={{ ml: 1, height: 18, minWidth: 18, '& .MuiChip-label': { px: 0.5 } }}
                  />
                )}
              </Box>
            } 
            value="applied" 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ErrorIcon sx={{ mr: 0.5 }} fontSize="small" />
                <span>Dismissed</span>
                {fixes?.some(f => f.status === 'rejected') && (
                  <Chip 
                    label={fixes.filter(f => f.status === 'rejected').length}
                    size="small" 
                    color="default"
                    sx={{ ml: 1, height: 18, minWidth: 18, '& .MuiChip-label': { px: 0.5 } }}
                  />
                )}
              </Box>
            } 
            value="rejected" 
          />
        </Tabs>
      </Box>
      
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
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
                    onClick={() => selectedFile && getFixesForFile(selectedFile)}
                    disabled={isFetchingFixes}
                  >
                    <RefreshIcon 
                      fontSize="small" 
                      className={isFetchingFixes ? 'spin' : ''} 
                      sx={{
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' },
                        },
                        '&.spin': {
                          animation: 'spin 1s linear infinite',
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
      
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {isFetchingFixes ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : localFixes.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            p: 3,
            color: 'text.secondary',
          }}>
            <NoFixesIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="subtitle1" gutterBottom>
              {activeTab === 'suggested' 
                ? 'No suggested fixes found' 
                : activeTab === 'applied'
                ? 'No applied fixes yet'
                : 'No dismissed fixes'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activeTab === 'suggested' 
                ? 'Try selecting a file with issues or run a scan to find potential fixes.'
                : activeTab === 'applied'
                ? 'Applied fixes will appear here.'
                : 'Dismissed fixes will appear here.'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {localFixes.map(fix => renderFixItem(fix))}
          </List>
        )}
      </Box>
      
      {/* Preview Dialog would go here */}
    </Box>
  );
};

export default FixPanel;
