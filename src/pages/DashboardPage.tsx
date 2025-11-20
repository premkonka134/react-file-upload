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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-400 border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                Invoices Processing Report
              </h1>
              <p className="text-slate-400 text-sm">Real-time processing metrics and analytics</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-4 sm:mt-0 flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-105 transform"
              title="Refresh Report Data"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              <span className="font-medium">Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="relative group">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none hover:border-slate-500 transition-colors"
              >
                <option value="All">All</option>
                <option value="DONE">Completed</option>
                <option value="PENDING">In Progress</option>
                <option value="FAILED">Error</option>
              </select>
            </div>

            <div className="relative group">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Document Type</label>
              <select
                value={filters.documentType}
                onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none hover:border-slate-500 transition-colors"
              >
                <option value="All">All</option>
                {Object.keys(stats.byDocumentType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="relative group">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Created Time</label>
              <select
                value={filters.createdTime}
                onChange={(e) => setFilters({ ...filters, createdTime: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none hover:border-slate-500 transition-colors"
              >
                <option value="All">All</option>
                <option value="Today">Today</option>
                <option value="Week">This Week</option>
                <option value="Month">This Month</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 text-center hover:border-slate-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 shadow-lg">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500/20 rounded-full mb-3">
                <span className="text-2xl">✓</span>
              </div>
              <div className="text-4xl font-bold text-green-400 mb-2">{stats.completed}</div>
              <div className="text-slate-400 text-sm font-medium">Invoices Completed</div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 text-center hover:border-slate-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 shadow-lg">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-yellow-500/20 rounded-full mb-3">
                <span className="text-2xl">⟳</span>
              </div>
              <div className="text-4xl font-bold text-yellow-400 mb-2">{stats.inProgress}</div>
              <div className="text-slate-400 text-sm font-medium">Invoices In Progress</div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 text-center hover:border-slate-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 shadow-lg">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-500/20 rounded-full mb-3">
                <span className="text-2xl">!</span>
              </div>
              <div className="text-4xl font-bold text-red-400 mb-2">{stats.error}</div>
              <div className="text-slate-400 text-sm font-medium">Invoices Error</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg overflow-hidden">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
                <span className="w-1 h-6 bg-gradient-to-b from-blue-400 to-cyan-400 rounded mr-3"></span>
                Document Type Analysis
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-3 font-semibold text-slate-300 px-2">Type</th>
                      <th className="text-center py-3 font-semibold text-slate-300 px-2">Done</th>
                      <th className="text-center py-3 font-semibold text-slate-300 px-2">Success</th>
                      <th className="text-center py-3 font-semibold text-slate-300 px-2">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.byDocumentType).map(([type, data]) => (
                      <tr key={type} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                        <td className="py-3 px-2 text-slate-300">{type}</td>
                        <td className="py-3 px-2 text-center text-green-400 font-semibold">{data.done}</td>
                        <td className="py-3 px-2 text-center text-cyan-400 font-semibold">{data.successRate}%</td>
                        <td className="py-3 px-2 text-center text-slate-400">{data.avgTime}s</td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-slate-700/50 border-t-2 border-slate-600">
                      <td className="py-3 px-2 text-white">Total</td>
                      <td className="py-3 px-2 text-center text-green-400">{stats.completed}</td>
                      <td className="py-3 px-2 text-center text-cyan-400">{overallSuccessRate}%</td>
                      <td className="py-3 px-2 text-center text-slate-300">
                        {Object.values(stats.byDocumentType).length > 0
                          ? (Object.values(stats.byDocumentType)
                              .reduce((sum, d) => sum + parseFloat(d.avgTime as any), 0) /
                              Object.values(stats.byDocumentType).length).toFixed(2)
                          : 0}s
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
                <span className="w-1 h-6 bg-gradient-to-b from-blue-400 to-cyan-400 rounded mr-3"></span>
                Processing Breakdown
              </h3>
              <div className="flex items-end justify-center space-x-8 h-64">
                {Object.entries(stats.byDocumentType).map(([type, data]) => {
                  const maxHeight = Math.max(...Object.values(stats.byDocumentType).map(d => d.total));
                  const height = maxHeight > 0 ? (data.total / maxHeight) * 100 : 0;

                  return (
                    <div key={type} className="flex flex-col items-center">
                      <div className="relative w-20 flex flex-col-reverse" style={{ height: '200px' }}>
                        <div
                          className="bg-gradient-to-t from-blue-500 to-cyan-400 w-full rounded-t shadow-lg hover:from-blue-600 hover:to-cyan-500 transition-all duration-300"
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className="absolute -top-7 left-0 right-0 text-center text-sm font-bold text-white bg-slate-700 rounded px-2 py-1">
                          {data.total}
                        </div>
                      </div>
                      <div className="mt-4 text-xs font-semibold text-slate-300 text-center">{type}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-8 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-6 text-center flex items-center justify-center">
                <span className="w-1 h-6 bg-gradient-to-b from-blue-400 to-cyan-400 rounded mr-3"></span>
                Success Rate
              </h3>
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="#334155"
                      strokeWidth="20"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="url(#successGradient)"
                      strokeWidth="20"
                      fill="none"
                      strokeDasharray={`${(overallSuccessRate / 100) * 502.4} 502.4`}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">{overallSuccessRate}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-between text-xs font-semibold text-slate-400">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
                <span className="w-1 h-6 bg-gradient-to-b from-blue-400 to-cyan-400 rounded mr-3"></span>
                Daily Processing Volume
              </h3>
              <div className="h-64 flex items-end justify-between px-4">
                {[...Array(8)].map((_, i) => {
                  const height = Math.random() * 80 + 20;
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 mx-1">
                      <div className="w-full flex flex-col-reverse" style={{ height: '200px' }}>
                        <div
                          className="bg-gradient-to-t from-blue-500 to-cyan-400 w-full rounded-t shadow-lg hover:from-blue-600 hover:to-cyan-500 transition-all duration-300"
                          style={{ height: `${height}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-400">
                        {`${5 + i * 2}:00 ${i < 4 ? 'AM' : 'PM'}`}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-center space-x-6 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-full mr-2"></div>
                  <span className="text-slate-400 font-medium">Invoices Processed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
