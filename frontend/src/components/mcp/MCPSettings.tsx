import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Paper,
  Grid,
  Slider,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Alert,
  Collapse,
  CircularProgress,
  useTheme,
  alpha,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  FileOpen as FileOpenIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Search as SearchIcon,
  AutoFixHigh as AutoFixIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Tune as TuneIcon,
  Language as LanguageIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Code as RulesIcon,
  Extension as ExtensionIcon,
  Cloud as CloudIcon,
  CloudOff as CloudOffIcon,
  VpnKey as ApiKeyIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { useMCP } from '../../../contexts/MCPContext';

// Types
type SettingsTab = 'general' | 'rules' | 'extensions' | 'advanced';

const MCPSettings: React.FC = () => {
  const theme = useTheme();
  const { 
    settings, 
    saveSettings, 
    resetSettings, 
    isSaving, 
    isResetting,
    availableRules,
    availableExtensions,
    toggleRule,
    toggleExtension,
    testConnection,
    isTestingConnection,
    connectionStatus,
  } = useMCP();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [localSettings, setLocalSettings] = useState(settings);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    fileWatcher: true,
    performance: false,
    notifications: true,
    security: false,
    rules: true,
    extensions: false,
  });
  
  // Update local settings when context settings change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: SettingsTab) => {
    setActiveTab(newValue);
  };
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleNestedSettingChange = (parentKey: string, key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey],
        [key]: value
      }
    }));
  };
  
  const handleSave = async () => {
    await saveSettings(localSettings);
  };
  
  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to default? This cannot be undone.')) {
      await resetSettings();
    }
  };
  
  const renderGeneralSettings = () => (
    <Box>
      {/* File Watcher Settings */}
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 3, 
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: expandedSections.fileWatcher ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: alpha(theme.palette.action.hover, 0.05),
            },
          }}
          onClick={() => toggleSection('fileWatcher')}
        >
          <FolderOpenIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ flex: 1 }}>
            File Watcher
          </Typography>
          {expandedSections.fileWatcher ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        
        <Collapse in={expandedSections.fileWatcher}>
          <Box sx={{ p: 2, pt: 0 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.fileWatcher.enabled}
                      onChange={(e) => handleNestedSettingChange('fileWatcher', 'enabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable File Watcher"
                />
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1, ml: 4 }}>
                  Automatically scan files when they change
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Debounce Time (ms)"
                  type="number"
                  value={localSettings.fileWatcher.debounceMs}
                  onChange={(e) => handleNestedSettingChange('fileWatcher', 'debounceMs', parseInt(e.target.value) || 500)}
                  disabled={!localSettings.fileWatcher.enabled}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">ms</InputAdornment>,
                  }}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Include Patterns"
                  placeholder="e.g., **/*.js, **/*.ts, **/*.jsx, **/*.tsx"
                  value={localSettings.fileWatcher.includePatterns.join(', ')}
                  onChange={(e) => handleNestedSettingChange('fileWatcher', 'includePatterns', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  disabled={!localSettings.fileWatcher.enabled}
                  size="small"
                  multiline
                  rows={2}
                />
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                  Comma-separated glob patterns of files to watch
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Exclude Patterns"
                  placeholder="e.g., **/node_modules/**, **/.git/**, **/dist/**"
                  value={localSettings.fileWatcher.excludePatterns.join(', ')}
                  onChange={(e) => handleNestedSettingChange('fileWatcher', 'excludePatterns', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  disabled={!localSettings.fileWatcher.enabled}
                  size="small"
                  multiline
                  rows={2}
                />
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                  Comma-separated glob patterns of files to ignore
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max File Size"
                  type="number"
                  value={localSettings.fileWatcher.maxFileSizeMB}
                  onChange={(e) => handleNestedSettingChange('fileWatcher', 'maxFileSizeMB', parseInt(e.target.value) || 5)}
                  disabled={!localSettings.fileWatcher.enabled}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">MB</InputAdornment>,
                  }}
                  size="small"
                />
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                  Skip files larger than this size
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>
      
      {/* Performance Settings */}
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 3, 
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: expandedSections.performance ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: alpha(theme.palette.action.hover, 0.05),
            },
          }}
          onClick={() => toggleSection('performance')}
        >
          <SpeedIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ flex: 1 }}>
            Performance
          </Typography>
          {expandedSections.performance ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        
        <Collapse in={expandedSections.performance}>
          <Box sx={{ p: 2, pt: 0 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Max Concurrent Scans</InputLabel>
                  <Select
                    value={localSettings.performance.maxConcurrentScans}
                    onChange={(e) => handleNestedSettingChange('performance', 'maxConcurrentScans', e.target.value)}
                    label="Max Concurrent Scans"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <MenuItem key={num} value={num}>
                        {num} {num === 1 ? 'scan' : 'scans'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                  Higher values may improve performance but use more system resources
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>CPU Priority</InputLabel>
                  <Select
                    value={localSettings.performance.cpuPriority}
                    onChange={(e) => handleNestedSettingChange('performance', 'cpuPriority', e.target.value)}
                    label="CPU Priority"
                  >
                    <MenuItem value="low">Low (Use fewer resources)</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="high">High (Use more resources)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Memory Usage
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Slider
                    value={localSettings.performance.memoryLimitMB}
                    onChange={(_, value) => handleNestedSettingChange('performance', 'memoryLimitMB', value as number)}
                    min={256}
                    max={8192}
                    step={256}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value} MB`}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    value={localSettings.performance.memoryLimitMB}
                    onChange={(e) => handleNestedSettingChange('performance', 'memoryLimitMB', parseInt(e.target.value) || 2048)}
                    type="number"
                    size="small"
                    sx={{ width: 100 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">MB</InputAdornment>,
                    }}
                  />
                </Box>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                  Maximum memory to use for code analysis (restart required)
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.performance.cacheEnabled}
                      onChange={(e) => handleNestedSettingChange('performance', 'cacheEnabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable Caching"
                />
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1, ml: 4 }}>
                  Cache analysis results for better performance
                </Typography>
              </Grid>
              
              {localSettings.performance.cacheEnabled && (
                <Grid item xs={12}>
                  <Box sx={{ pl: 4 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.performance.cachePersist}
                          onChange={(e) => handleNestedSettingChange('performance', 'cachePersist', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Persist Cache Between Sessions"
                    />
                    <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                      Save cache to disk for faster startup
                    </Typography>
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {}}
                        startIcon={<DeleteIcon />}
                      >
                        Clear Cache
                      </Button>
                      
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="caption" color="textSecondary">
                          Cache size: 24.5 MB
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </Collapse>
      </Paper>
      
      {/* Notifications */}
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 3, 
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: expandedSections.notifications ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: alpha(theme.palette.action.hover, 0.05),
            },
          }}
          onClick={() => toggleSection('notifications')}
        >
          {localSettings.notifications.enabled ? (
            <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
          ) : (
            <NotificationsOffIcon sx={{ mr: 1, color: 'text.disabled' }} />
          )}
          <Typography variant="subtitle1" sx={{ flex: 1 }}>
            Notifications
          </Typography>
          {expandedSections.notifications ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        
        <Collapse in={expandedSections.notifications}>
          <Box sx={{ p: 2, pt: 0 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.notifications.enabled}
                      onChange={(e) => handleNestedSettingChange('notifications', 'enabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable Notifications"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Notification Types
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localSettings.notifications.types.errors}
                        onChange={(e) => handleNestedSettingChange('notifications', 'types', {
                          ...localSettings.notifications.types,
                          errors: e.target.checked
                        })}
                        color="primary"
                        disabled={!localSettings.notifications.enabled}
                      />
                    }
                    label="Errors"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localSettings.notifications.types.warnings}
                        onChange={(e) => handleNestedSettingChange('notifications', 'types', {
                          ...localSettings.notifications.types,
                          warnings: e.target.checked
                        })}
                        color="primary"
                        disabled={!localSettings.notifications.enabled}
                      />
                    }
                    label="Warnings"
                    sx={{ display: 'flex', alignItems: 'center', ml: 3 }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localSettings.notifications.types.info}
                        onChange={(e) => handleNestedSettingChange('notifications', 'types', {
                          ...localSettings.notifications.types,
                          info: e.target.checked
                        })}
                        color="primary"
                        disabled={!localSettings.notifications.enabled}
                      />
                    }
                    label="Info"
                    sx={{ display: 'flex', alignItems: 'center', ml: 3 }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.notifications.sound}
                      onChange={(e) => handleNestedSettingChange('notifications', 'sound', e.target.checked)}
                      color="primary"
                      disabled={!localSettings.notifications.enabled}
                    />
                  }
                  label="Enable Sound"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.notifications.toast}
                      onChange={(e) => handleNestedSettingChange('notifications', 'toast', e.target.checked)}
                      color="primary"
                      disabled={!localSettings.notifications.enabled}
                    />
                  }
                  label="Show Toast Notifications"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.notifications.onlyForActiveFile}
                      onChange={(e) => handleNestedSettingChange('notifications', 'onlyForActiveFile', e.target.checked)}
                      color="primary"
                      disabled={!localSettings.notifications.enabled}
                    />
                  }
                  label="Only show notifications for active file"
                />
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>
      
      {/* Security Settings */}
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 3, 
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: expandedSections.security ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: alpha(theme.palette.action.hover, 0.05),
            },
          }}
          onClick={() => toggleSection('security')}
        >
          <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ flex: 1 }}>
            Security
          </Typography>
          {expandedSections.security ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        
        <Collapse in={expandedSections.security}>
          <Box sx={{ p: 2, pt: 0 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.security.enableSecurityChecks}
                      onChange={(e) => handleNestedSettingChange('security', 'enableSecurityChecks', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable Security Checks"
                />
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1, ml: 4 }}>
                  Scan for potential security vulnerabilities in your code
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  value={localSettings.security.apiKey || ''}
                  onChange={(e) => handleNestedSettingChange('security', 'apiKey', e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ApiKeyIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                  API key for security scanning service
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.security.autoUpdate}
                      onChange={(e) => handleNestedSettingChange('security', 'autoUpdate', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Automatically update security rules"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<CloudIcon />}
                  onClick={() => testConnection()}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
                
                {connectionStatus && (
                  <Alert 
                    severity={connectionStatus.success ? 'success' : 'error'} 
                    sx={{ mt: 2 }}
                    icon={connectionStatus.success ? <CheckCircleIcon /> : <ErrorIcon />}
                  >
                    {connectionStatus.message}
                  </Alert>
                )}
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
  
  const renderRulesSettings = () => (
    <Box>
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Search rules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">
          {availableRules.filter(r => r.enabled).length} of {availableRules.length} rules enabled
        </Typography>
        <Box>
          <Button 
            size="small" 
            color="primary"
            onClick={() => {
              // Enable all rules
              availableRules.forEach(rule => toggleRule(rule.id, true));
            }}
          >
            Enable All
          </Button>
          <Button 
            size="small" 
            color="inherit"
            onClick={() => {
              // Disable all rules
              availableRules.forEach(rule => toggleRule(rule.id, false));
            }}
            sx={{ ml: 1 }}
          >
            Disable All
          </Button>
        </Box>
      </Box>
      
      <List dense>
        {availableRules
          .filter(rule => 
            rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rule.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rule.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((rule) => (
            <Paper 
              key={rule.id} 
              elevation={0} 
              sx={{ 
                mb: 1, 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  bgcolor: rule.enabled 
                    ? alpha(theme.palette.primary.main, 0.03)
                    : 'background.paper',
                  '&:hover': {
                    bgcolor: rule.enabled 
                      ? alpha(theme.palette.primary.main, 0.05)
                      : alpha(theme.palette.action.hover, 0.05),
                  },
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={rule.enabled}
                      onChange={(e) => toggleRule(rule.id, e.target.checked)}
                      color="primary"
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ ml: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                          {rule.name}
                        </Typography>
                        <Chip 
                          label={rule.severity} 
                          size="small" 
                          color={getSeverityColor(rule.severity as CodeIssueSeverity)}
                          sx={{ ml: 1, height: 18, '& .MuiChip-label': { px: 0.8 } }}
                        />
                        <Chip 
                          label={rule.category} 
                          size="small" 
                          variant="outlined"
                          sx={{ ml: 1, height: 18, '& .MuiChip-label': { px: 0.8 } }}
                        />
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        {rule.description}
                      </Typography>
                      {rule.documentation && (
                        <Button 
                          size="small" 
                          startIcon={<HelpIcon fontSize="small" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Open documentation
                            window.open(rule.documentation, '_blank');
                          }}
                          sx={{ mt: 0.5 }}
                        >
                          Learn more
                        </Button>
                      )}
                    </Box>
                  }
                  sx={{ flex: 1, m: 0 }}
                />
              </Box>
            </Paper>
          ))}
      </List>
    </Box>
  );
  
  const renderExtensionsSettings = () => (
    <Box>
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Search extensions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">
          Installed Extensions
        </Typography>
        <Button 
          variant="outlined" 
          size="small" 
          startIcon={<AddIcon />}
          onClick={() => {}}
        >
          Install Extension
        </Button>
      </Box>
      
      <List dense>
        {availableExtensions
          .filter(ext => 
            ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ext.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ext.author.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((ext) => (
            <Paper 
              key={ext.id} 
              elevation={0} 
              sx={{ 
                mb: 2, 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'flex-start',
                  bgcolor: ext.enabled 
                    ? alpha(theme.palette.primary.main, 0.03)
                    : 'background.paper',
                }}
              >
                <Box sx={{ mr: 2, textAlign: 'center' }}>
                  <ExtensionIcon 
                    color={ext.enabled ? 'primary' : 'disabled'} 
                    sx={{ fontSize: 40 }} 
                  />
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 500, mr: 1 }}>
                      {ext.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      v{ext.version}
                    </Typography>
                    {ext.official && (
                      <Chip 
                        label="Official" 
                        size="small" 
                        color="primary"
                        variant="outlined"
                        sx={{ ml: 1, height: 18, '& .MuiChip-label': { px: 0.8 } }}
                      />
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {ext.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    <Typography variant="caption" color="textSecondary">
                      by {ext.author}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      •
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Last updated: {ext.lastUpdated}
                    </Typography>
                    {ext.documentation && (
                      <>
                        <Typography variant="caption" color="textSecondary">
                          •
                        </Typography>
                        <Button 
                          size="small" 
                          startIcon={<HelpIcon fontSize="small" />}
                          onClick={() => window.open(ext.documentation, '_blank')}
                          sx={{ ml: -1 }}
                        >
                          Documentation
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', ml: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={ext.enabled}
                        onChange={(e) => toggleExtension(ext.id, e.target.checked)}
                        color="primary"
                        size="small"
                      />
                    }
                    label={ext.enabled ? 'Enabled' : 'Disabled'}
                    labelPlacement="start"
                    sx={{ m: 0 }}
                  />
                  
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    {ext.settings && (
                      <Button 
                        size="small" 
                        variant="outlined"
                        startIcon={<TuneIcon fontSize="small" />}
                        onClick={() => {}}
                        disabled={!ext.enabled}
                      >
                        Settings
                      </Button>
                    )}
                    
                    {ext.updateAvailable && (
                      <Button 
                        size="small" 
                        color="primary"
                        variant="contained"
                        onClick={() => {}}
                      >
                        Update
                      </Button>
                    )}
                    
                    <IconButton size="small" onClick={() => {}}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </Paper>
          ))}
      </List>
    </Box>
  );
  
  const renderAdvancedSettings = () => (
    <Box>
      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>Advanced Settings</AlertTitle>
        These settings are for advanced users only. Changing these may affect the stability and performance of the application.
      </Alert>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Debugging
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={localSettings.advanced.debugMode}
              onChange={(e) => handleNestedSettingChange('advanced', 'debugMode', e.target.checked)}
              color="primary"
            />
          }
          label="Enable Debug Mode"
          sx={{ mb: 1 }}
        />
        <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2, ml: 4 }}>
          Show detailed debug information in the console
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={localSettings.advanced.devTools}
              onChange={(e) => handleNestedSettingChange('advanced', 'devTools', e.target.checked)}
              color="primary"
            />
          }
          label="Enable Developer Tools"
          sx={{ mb: 1 }}
        />
        <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2, ml: 4 }}>
          Enable access to browser developer tools (requires restart)
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={localSettings.advanced.verboseLogging}
              onChange={(e) => handleNestedSettingChange('advanced', 'verboseLogging', e.target.checked)}
              color="primary"
            />
          }
          label="Enable Verbose Logging"
          sx={{ mb: 1 }}
        />
        <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2, ml: 4 }}>
          Log detailed information to the console (may impact performance)
        </Typography>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Experimental Features
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={localSettings.advanced.experimentalFeatures}
              onChange={(e) => handleNestedSettingChange('advanced', 'experimentalFeatures', e.target.checked)}
              color="primary"
            />
          }
          label="Enable Experimental Features"
          sx={{ mb: 1 }}
        />
        <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2, ml: 4 }}>
          Try out upcoming features that are still in development
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={localSettings.advanced.aiAssistedCoding}
              onChange={(e) => handleNestedSettingChange('advanced', 'aiAssistedCoding', e.target.checked)}
              color="primary"
              disabled={!localSettings.advanced.experimentalFeatures}
            />
          }
          label="AI-Assisted Coding (Beta)"
          sx={{ mb: 1, opacity: localSettings.advanced.experimentalFeatures ? 1 : 0.6 }}
        />
        <Typography 
          variant="caption" 
          color="textSecondary" 
          display="block" 
          sx={{ mb: 2, ml: 4 }}
          style={{ opacity: localSettings.advanced.experimentalFeatures ? 1 : 0.6 }}
        >
          Get AI-powered code suggestions as you type
        </Typography>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Reset Settings
        </Typography>
        
        <Button
          variant="outlined"
          color="error"
          startIcon={<RefreshIcon />}
          onClick={handleReset}
          disabled={isResetting}
          sx={{ mr: 2 }}
        >
          {isResetting ? 'Resetting...' : 'Reset to Defaults'}
        </Button>
        
        <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
          Warning: This will reset all settings to their default values and cannot be undone.
        </Typography>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          About
        </Typography>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          <strong>MCP Debugger</strong> v1.0.0
        </Typography>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          A powerful debugging and code analysis tool for modern web development.
        </Typography>
        
        <Button
          variant="outlined"
          size="small"
          onClick={() => {}}
          sx={{ mr: 1 }}
        >
          Check for Updates
        </Button>
        
        <Button
          variant="outlined"
          size="small"
          onClick={() => {}}
          sx={{ mr: 1 }}
        >
          View Changelog
        </Button>
        
        <Button
          variant="outlined"
          size="small"
          color="error"
          onClick={() => {}}
        >
          Uninstall
        </Button>
      </Box>
    </Box>
  );
  
  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            minHeight: 48,
          },
        }}
      >
        <Tab 
          label="General" 
          value="general" 
          icon={<TuneIcon />} 
          iconPosition="start"
        />
        <Tab 
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <RulesIcon sx={{ mr: 0.5 }} />
              <span>Rules</span>
              {availableRules.filter(r => !r.enabled).length > 0 && (
                <Chip 
                  label={availableRules.filter(r => !r.enabled).length}
                  size="small"
                  color="error"
                  sx={{ ml: 1, height: 18, minWidth: 18, '& .MuiChip-label': { px: 0.5 } }}
                />
              )}
            </Box>
          } 
          value="rules" 
          iconPosition="start"
        />
        <Tab 
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ExtensionIcon sx={{ mr: 0.5 }} />
              <span>Extensions</span>
              {availableExtensions.filter(e => e.updateAvailable).length > 0 && (
                <Chip 
                  label={availableExtensions.filter(e => e.updateAvailable).length}
                  size="small"
                  color="primary"
                  sx={{ ml: 1, height: 18, minWidth: 18, '& .MuiChip-label': { px: 0.5 } }}
                />
              )}
            </Box>
          } 
          value="extensions" 
          iconPosition="start"
        />
        <Tab 
          label="Advanced" 
          value="advanced" 
          icon={<CodeIcon />} 
          iconPosition="start"
        />
      </Tabs>
      
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'rules' && renderRulesSettings()}
        {activeTab === 'extensions' && renderExtensionsSettings()}
        {activeTab === 'advanced' && renderAdvancedSettings()}
      </Box>
      
      <Box 
        sx={{ 
          p: 2, 
          borderTop: 1, 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
        }}
      >
        <Button 
          variant="outlined" 
          color="inherit"
          onClick={handleReset}
          disabled={isResetting}
        >
          {isResetting ? 'Resetting...' : 'Reset'}
        </Button>
        
        <Button 
          variant="contained" 
          color="primary"
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </Box>
  );
};

export default MCPSettings;
