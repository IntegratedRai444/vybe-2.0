import React, { useState } from 'react';
import { Shield, AlertTriangle, Lock, Key, Bug } from 'lucide-react';
import { runSecurityScan } from '../utils/api';

interface SecurityResult {
  vulnerabilities: {
    total_vulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    python?: any;
    npm?: any;
  };
  secrets: {
    total_count: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    secrets: Array<{
      type: string;
      description: string;
      severity: string;
      file: string;
      line: number;
      line_content: string;
    }>;
  };
  total_issues: number;
  status: string;
  summary: {
    vulnerabilities: number;
    secrets: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const SecurityButton: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<SecurityResult | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const data = await runSecurityScan();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Security scan failed:', error);
      alert('Security scan failed. Check console for details.');
    } finally {
      setIsScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean':
        return 'text-green-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getFilteredResults = () => {
    if (!results) return { vulnerabilities: [], secrets: [] };
    
    let filteredVulns: any[] = [];
    let filteredSecrets: any[] = [];
    
    // Filter vulnerabilities
    if (results.vulnerabilities.python?.vulnerabilities) {
      filteredVulns = [...results.vulnerabilities.python.vulnerabilities];
    }
    if (results.vulnerabilities.npm?.vulnerabilities) {
      filteredVulns = [...filteredVulns, ...results.vulnerabilities.npm.vulnerabilities];
    }
    
    // Filter secrets
    if (results.secrets.secrets) {
      filteredSecrets = [...results.secrets.secrets];
    }
    
    // Apply severity filter
    if (filterSeverity !== 'all') {
      filteredVulns = filteredVulns.filter(v => v.severity?.toLowerCase() === filterSeverity);
      filteredSecrets = filteredSecrets.filter(s => s.severity?.toLowerCase() === filterSeverity);
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      if (filterType === 'vulnerabilities') {
        filteredSecrets = [];
      } else if (filterType === 'secrets') {
        filteredVulns = [];
      }
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredVulns = filteredVulns.filter(v => 
        v.package?.toLowerCase().includes(query) ||
        v.description?.toLowerCase().includes(query)
      );
      filteredSecrets = filteredSecrets.filter(s => 
        s.description?.toLowerCase().includes(query) ||
        s.file?.toLowerCase().includes(query) ||
        s.line_content?.toLowerCase().includes(query)
      );
    }
    
    return { vulnerabilities: filteredVulns, secrets: filteredSecrets };
  };

  return (
    <>
      <button
        onClick={handleScan}
        disabled={isScanning}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Run Security Scan"
      >
        <Shield size={18} />
        {isScanning ? 'Scanning...' : 'Security Scan'}
      </button>

      {showResults && results && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="text-purple-600" size={28} />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Security Scan Results</h2>
                    <p className={`text-sm font-medium ${getStatusColor(results.status)}`}>
                      Status: {results.status.toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResults(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="text-red-600" size={20} />
                    <span className="text-sm font-medium text-gray-600">Vulnerabilities</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{results.summary.vulnerabilities}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="text-orange-600" size={20} />
                    <span className="text-sm font-medium text-gray-600">Secrets</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{results.summary.secrets}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="text-red-600" size={20} />
                    <span className="text-sm font-medium text-gray-600">Critical</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{results.summary.critical}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="text-orange-600" size={20} />
                    <span className="text-sm font-medium text-gray-600">High</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{results.summary.high}</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Severity:</label>
                  <select 
                    value={filterSeverity} 
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    title="Filter by severity level"
                  >
                    <option value="all">All</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Type:</label>
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    title="Filter by issue type"
                  >
                    <option value="all">All</option>
                    <option value="vulnerabilities">Vulnerabilities</option>
                    <option value="secrets">Secrets</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Search:</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search issues..."
                    className="px-2 py-1 border border-gray-300 rounded text-sm w-48"
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const filtered = getFilteredResults();
                const hasFilteredResults = filtered.vulnerabilities.length > 0 || filtered.secrets.length > 0;
                
                if (!hasFilteredResults && (filterSeverity !== 'all' || filterType !== 'all' || searchQuery)) {
                  return (
                    <div className="text-center py-12">
                      <Shield className="mx-auto text-gray-400 mb-4" size={64} />
                      <h3 className="text-xl font-bold text-gray-800 mb-2">No Results</h3>
                      <p className="text-gray-600">No issues match your current filters.</p>
                    </div>
                  );
                }
                
                return (
                  <>
                    {/* Vulnerabilities Section */}
                    {filtered.vulnerabilities.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Bug size={20} />
                          Dependency Vulnerabilities ({filtered.vulnerabilities.length})
                        </h3>
                        <div className="space-y-2">
                          {filtered.vulnerabilities.map((vuln: any, idx: number) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-sm font-bold text-gray-800">
                                      {vuln.package}@{vuln.version || ''}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(vuln.severity)}`}>
                                      {vuln.severity}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{vuln.description}</p>
                                  {vuln.fixed_version && (
                                    <p className="text-xs text-green-600">
                                      Fix: Update to version {vuln.fixed_version}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Secrets Section */}
                    {filtered.secrets.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Key size={20} />
                          Hardcoded Secrets ({filtered.secrets.length})
                        </h3>
                        <div className="space-y-2">
                          {filtered.secrets.map((secret, idx) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Lock size={16} className="text-red-600" />
                                    <span className="font-medium text-sm text-gray-800">{secret.description}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(secret.severity)}`}>
                                      {secret.severity}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mb-1">
                                    {secret.file}:{secret.line}
                                  </p>
                                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                    {secret.line_content}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clean State */}
                    {results.total_issues === 0 && (
                      <div className="text-center py-12">
                        <Shield className="mx-auto text-green-600 mb-4" size={64} />
                        <h3 className="text-xl font-bold text-gray-800 mb-2">All Clear!</h3>
                        <p className="text-gray-600">No security issues found in your project.</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowResults(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SecurityButton;