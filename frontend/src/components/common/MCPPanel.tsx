import React, { useState, useEffect, useCallback } from 'react';
import { Box, Tabs, Tab, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Refresh, BugReport, Code, Build, Settings } from '@mui/icons-material';
import MCPIssuesList from './mcp/MCPIssuesList';
import MCPFileTree from './mcp/MCPFileTree';
import MCPFixPanel from './mcp/MCPFixPanel';
import MCPSettings from './mcp/MCPSettings';
import { useMCP } from '../../hooks/useMCP';

const PanelContainer = styled(Box)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.paper,
  borderLeft: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
}));

const PanelHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: theme.palette.background.default,
}));

const PanelContent = styled(Box)({
  flex: 1,
  overflow: 'auto',
  padding: '8px',
});

const TabPanel = (props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`mc-panel-${index}`}
      aria-labelledby={`mc-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 1, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const MCPPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const { scanProject, issues, refreshIssues } = useMCP();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleScanClick = useCallback(async () => {
    try {
      setIsScanning(true);
      await scanProject();
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  }, [scanProject]);

  return (
    <PanelContainer>
      <PanelHeader>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="MCP tabs"
          sx={{ minHeight: '40px' }}
        >
          <Tab 
            icon={<BugReport fontSize="small" />} 
            label="Issues" 
            id="mc-tab-0" 
            aria-controls="mc-panel-0" 
          />
          <Tab 
            icon={<Code fontSize="small" />} 
            label="Files" 
            id="mc-tab-1" 
            aria-controls="mc-panel-1" 
          />
          <Tab 
            icon={<Build fontSize="small" />} 
            label="Fixes" 
            id="mc-tab-2" 
            aria-controls="mc-panel-2" 
          />
          <Tab 
            icon={<Settings fontSize="small" />} 
            aria-label="Settings" 
            id="mc-tab-3" 
            aria-controls="mc-panel-3" 
          />
        </Tabs>
        <Box>
          <Tooltip title="Rescan project">
            <IconButton 
              size="small" 
              onClick={handleScanClick}
              disabled={isScanning}
            >
              {isScanning ? (
                <CircularProgress size={20} />
              ) : (
                <Refresh fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </PanelHeader>

      <PanelContent>
        <TabPanel value={activeTab} index={0}>
          <MCPIssuesList issues={issues} />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <MCPFileTree />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <MCPFixPanel />
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          <MCPSettings />
        </TabPanel>
      </PanelContent>
    </PanelContainer>
  );
};

export default MCPPanel;
