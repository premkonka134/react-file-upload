import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { fileService } from '../services/fileService';

interface DashboardStats {
  completed: number;
  inProgress: number;
  error: number;
  byDocumentType: {
    [key: string]: {
      total: number;
      done: number;
      successRate: number;
      avgTime: number;
    };
  };
}

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    completed: 0,
    inProgress: 0,
    error: 0,
    byDocumentType: {}
  });
  const [filters, setFilters] = useState({
    status: 'All',
    documentType: 'All',
    createdTime: 'All'
  });

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      let files = await fileService.getMyFiles();

      if (filters.status !== 'All') {
        files = files.filter(f => f.status === filters.status);
      }

      if (filters.documentType !== 'All') {
        files = files.filter(f => f.type === filters.documentType);
      }

      if (filters.createdTime !== 'All') {
        const now = new Date();
        files = files.filter(file => {
          const createdDate = new Date(file.createdAt);
          const daysDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

          if (filters.createdTime === 'Today') return daysDiff < 1;
          if (filters.createdTime === 'Week') return daysDiff < 7;
          if (filters.createdTime === 'Month') return daysDiff < 30;
          return true;
        });
      }

      const completed = files.filter(f => f.status === 'DONE').length;
      const inProgress = files.filter(f => f.status === 'PENDING' || f.status === 'uploading').length;
      const error = files.filter(f => f.status === 'FAILED').length;

      const byType: { [key: string]: any } = {};

      files.forEach(file => {
        const docType = file.type || 'unknown';
        if (!byType[docType]) {
          byType[docType] = {
            total: 0,
            done: 0,
            times: []
          };
        }
        byType[docType].total++;
        if (file.status === 'DONE') {
          byType[docType].done++;
          if (file.sapCreatedAt && file.sapFinishedAt) {
            const start = new Date(file.sapCreatedAt).getTime();
            const end = new Date(file.sapFinishedAt).getTime();
            byType[docType].times.push((end - start) / 1000);
          }
        }
      });

      Object.keys(byType).forEach(type => {
        byType[type].successRate = byType[type].total > 0
          ? Math.round((byType[type].done / byType[type].total) * 100)
          : 0;
        byType[type].avgTime = byType[type].times.length > 0
          ? (byType[type].times.reduce((a: number, b: number) => a + b, 0) / byType[type].times.length).toFixed(2)
          : 0;
      });

      setStats({
        completed,
        inProgress,
        error,
        byDocumentType: byType
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const totalInvoices = stats.completed + stats.inProgress + stats.error;
  const overallSuccessRate = totalInvoices > 0
    ? Math.round((stats.completed / totalInvoices) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-0">
              Invoices Processing Report
            </h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 touch-manipulation"
              title="Refresh Report Data"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="All">All</option>
                <option value="DONE">Completed</option>
                <option value="PENDING">In Progress</option>
                <option value="FAILED">Error</option>
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
              <select
                value={filters.documentType}
                onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="All">All</option>
                {Object.keys(stats.byDocumentType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Created Time</label>
              <select
                value={filters.createdTime}
                onChange={(e) => setFilters({ ...filters, createdTime: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="All">All</option>
                <option value="Today">Today</option>
                <option value="Week">This Week</option>
                <option value="Month">This Month</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center">
              <div className="text-5xl font-bold text-gray-900 mb-2">{stats.completed}</div>
              <div className="text-gray-600">Invoices Completed</div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center">
              <div className="text-5xl font-bold text-gray-900 mb-2">{stats.inProgress}</div>
              <div className="text-gray-600">Invoices In Progress</div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center">
              <div className="text-5xl font-bold text-gray-900 mb-2">{stats.error}</div>
              <div className="text-gray-600">Invoices Error</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 font-semibold">Document Type</th>
                      <th className="text-center py-3 font-semibold">Total Invoices Done</th>
                      <th className="text-center py-3 font-semibold">Success Rate</th>
                      <th className="text-center py-3 font-semibold">Avg Time Taken (secs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.byDocumentType).map(([type, data]) => (
                      <tr key={type} className="border-b border-gray-100">
                        <td className="py-3">{type}</td>
                        <td className="py-3 text-center">{data.done}</td>
                        <td className="py-3 text-center">{data.successRate}%</td>
                        <td className="py-3 text-center">{data.avgTime}</td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-gray-50">
                      <td className="py-3">Total</td>
                      <td className="py-3 text-center">{stats.completed}</td>
                      <td className="py-3 text-center">{overallSuccessRate}%</td>
                      <td className="py-3 text-center">
                        {Object.values(stats.byDocumentType).length > 0
                          ? (Object.values(stats.byDocumentType)
                              .reduce((sum, d) => sum + parseFloat(d.avgTime as any), 0) /
                              Object.values(stats.byDocumentType).length).toFixed(2)
                          : 0}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Processing Status Breakdown by Document Type</h3>
              <div className="flex items-end justify-center space-x-8 h-64">
                {Object.entries(stats.byDocumentType).map(([type, data]) => {
                  const maxHeight = Math.max(...Object.values(stats.byDocumentType).map(d => d.total));
                  const height = maxHeight > 0 ? (data.total / maxHeight) * 100 : 0;

                  return (
                    <div key={type} className="flex flex-col items-center">
                      <div className="relative w-20 flex flex-col-reverse" style={{ height: '200px' }}>
                        <div
                          className="bg-blue-500 w-full rounded-t"
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className="absolute -top-6 left-0 right-0 text-center text-sm font-medium">
                          {data.total}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">{type}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>Invoices Done</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>Invoices In Progress</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span>Invoices Error</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-center">Success Rate</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="#e5e7eb"
                      strokeWidth="20"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="#22c55e"
                      strokeWidth="20"
                      fill="none"
                      strokeDasharray={`${(overallSuccessRate / 100) * 502.4} 502.4`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-900">{overallSuccessRate}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-between text-sm text-gray-600">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Daily Volume of Processed Invoices by Document Type</h3>
              <div className="h-64 flex items-end justify-between px-4">
                {[...Array(8)].map((_, i) => {
                  const height = Math.random() * 80 + 20;
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 mx-1">
                      <div className="w-full flex flex-col-reverse" style={{ height: '200px' }}>
                        <div
                          className="bg-blue-400 w-full rounded-t"
                          style={{ height: `${height}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        {`${5 + i * 2}:00 ${i < 4 ? 'AM' : 'PM'}`}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                  <span>credit_note</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                  <span>invoice</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
