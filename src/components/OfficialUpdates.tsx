import React, { useState, useEffect } from 'react';
import { Shield, ExternalLink, Clock, AlertTriangle, Loader2, TrendingUp } from 'lucide-react';

interface OfficialUpdate {
  id: string;
  source: string;
  title: string;
  content: string;
  url: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
}

interface UpdatesData {
  disaster_id: string;
  updates: OfficialUpdate[];
  summary: {
    total_updates: number;
    high_priority: number;
    sources: string[];
    last_updated: string;
  };
}

interface OfficialUpdatesProps {
  disasters: any[];
  selectedDisaster: any;
}

const OfficialUpdates: React.FC<OfficialUpdatesProps> = ({ disasters, selectedDisaster }) => {
  const [updatesData, setUpdatesData] = useState<UpdatesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDisaster) {
      fetchOfficialUpdates(selectedDisaster.id);
    }
  }, [selectedDisaster]);

  const fetchOfficialUpdates = async (disasterId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3001/api/updates/${disasterId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch official updates');
      }
      const data = await response.json();
      setUpdatesData(data);
    } catch (error) {
      console.error('Error fetching official updates:', error);
      setError('Failed to load official updates');
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <TrendingUp className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getSourceIcon = (source: string) => {
    // You could add specific icons for different sources
    return <Shield className="h-6 w-6" />;
  };

  const getSourceColor = (source: string) => {
    const colors: { [key: string]: string } = {
      'FEMA': 'bg-blue-100 text-blue-800',
      'Red Cross': 'bg-red-100 text-red-800',
      'Local Emergency Management': 'bg-green-100 text-green-800',
      'National Weather Service': 'bg-purple-100 text-purple-800'
    };
    return colors[source] || 'bg-gray-100 text-gray-800';
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  if (!selectedDisaster) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No disaster selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Select a disaster from the dashboard to view official updates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Official Updates</h2>
              <p className="text-sm text-gray-600">
                Government and relief organization updates for: <span className="font-medium">{selectedDisaster.title}</span>
              </p>
            </div>
          </div>
          
          <button
            onClick={() => fetchOfficialUpdates(selectedDisaster.id)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {updatesData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Updates</p>
                <p className="text-2xl font-bold text-gray-900">{updatesData.summary.total_updates}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-gray-900">{updatesData.summary.high_priority}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Sources</p>
                <p className="text-2xl font-bold text-gray-900">{updatesData.summary.sources.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Last Updated</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatTimeAgo(updatesData.summary.last_updated)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !updatesData && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin" />
          <p className="mt-2 text-sm text-gray-600">Loading official updates...</p>
        </div>
      )}

      {/* Official Updates List */}
      {updatesData && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Latest Official Communications</h3>
            <p className="text-sm text-gray-600">Updates from government agencies and relief organizations</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {updatesData.updates.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No official updates</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No official communications available for this disaster yet.
                </p>
              </div>
            ) : (
              updatesData.updates.map((update) => (
                <div key={update.id} className="px-6 py-6 hover:bg-gray-50">
                  <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 p-2 rounded-lg ${getSourceColor(update.source)}`}>
                      {getSourceIcon(update.source)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getSourceColor(update.source)}`}>
                          {update.source}
                        </span>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(update.priority)}`}>
                          {getPriorityIcon(update.priority)}
                          <span className="uppercase">{update.priority}</span>
                        </div>
                        <span className="text-xs text-gray-500">{formatTimeAgo(update.timestamp)}</span>
                      </div>
                      
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {update.title}
                      </h4>
                      
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {update.content}
                      </p>
                      
                      <a
                        href={update.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <span>Read full update</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficialUpdates;