import React from 'react';
import DashboardLayout from '@/templates/dashboard/DashboardLayout';

const Dashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Recent Projects</h2>
            <p className="text-muted-foreground">No recent projects</p>
          </div>
          <div className="bg-card p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full text-left p-2 hover:bg-accent hover:text-accent-foreground rounded transition-colors">
                New File
              </button>
              <button className="w-full text-left p-2 hover:bg-accent hover:text-accent-foreground rounded transition-colors">
                Open Folder
              </button>
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Recent Activity</h2>
            <p className="text-muted-foreground">No recent activity</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
