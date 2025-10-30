import React from 'react';
import { List, ListItem, ListItemText, ListItemIcon, Typography, Chip, Box, Tooltip } from '@mui/material';
import { BugReport, Warning, Info, Error as ErrorIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { CodeIssue, IssueSeverity } from '../../../types/mcp';

const StyledList = styled(List)({
  width: '100%',
  padding: 0,
});

const IssueItem = styled(ListItem)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  padding: theme.spacing(1, 2),
  cursor: 'pointer',
}));

const SeverityIcon = ({ severity }: { severity: IssueSeverity }) => {
  switch (severity) {
    case 'error':
      return <ErrorIcon color="error" fontSize="small" />;
    case 'warning':
      return <Warning color="warning" fontSize="small" />;
    case 'hint':
      return <Info color="info" fontSize="small" />;
    default:
      return <BugReport color="action" fontSize="small" />;
  }
};

interface MCPIssuesListProps {
  issues: CodeIssue[];
  onIssueClick?: (issue: CodeIssue) => void;
}

const MCPIssuesList: React.FC<MCPIssuesListProps> = ({ 
  issues = [], 
  onIssueClick = () => {} 
}) => {
  if (issues.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        color: 'text.secondary',
        p: 2,
        textAlign: 'center'
      }}>
        <BugReport sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
        <Typography variant="body2">No issues found</Typography>
        <Typography variant="caption">Your code looks good!</Typography>
      </Box>
    );
  }

  return (
    <StyledList>
      {issues.map((issue, index) => (
        <IssueItem 
          key={`${issue.filePath}-${issue.lineNumber}-${index}`}
          onClick={() => onIssueClick(issue)}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <SeverityIcon severity={issue.severity} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" component="span" noWrap>
                  {issue.message}
                </Typography>
                <Chip 
                  label={`${Path.basename(issue.filePath)}:${issue.lineNumber}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              </Box>
            }
            secondary={
              <Tooltip title={issue.filePath} arrow>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  noWrap
                  sx={{ 
                    display: 'block',
                    maxWidth: '100%',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}
                >
                  {issue.ruleId && `${issue.ruleId} • `}{issue.category}
                </Typography>
              </Tooltip>
            }
            primaryTypographyProps={{
              sx: {
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              },
            }}
          />
        </IssueItem>
      ))}
    </StyledList>
  );
};

export default MCPIssuesList;
