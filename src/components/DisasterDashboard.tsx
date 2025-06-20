import React, { useState, useEffect } from 'react';
import { MapPin, Clock, User, Tag, AlertCircle, TrendingUp } from 'lucide-react';

interface Disaster {
  id: string;
  title: string;
  description: string;
  location_name: string | null;
  tags: string[];
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface DisasterDashboardProps {
  disasters: Disaster[];
  onSelectDisaster: (disaster: Disaster) => void;
  selectedDisaster: Disaster | null;
}

const DisasterDashboard: React.FC<DisasterDashboardProps> = ({
  disasters,
  onSelectDisaster,
  selectedDisaster
}) => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    recent: 0,
    urgent: 0
  });

  useEffect(() => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    setStats({
      total: disasters.length,
      active: disasters.length, // All disasters are considered active for demo
      recent: disasters.filter(d => new Date(d.created_at) > twentyFourHoursAgo).length,
      urgent: disasters.filter(d => d.tags.includes('urgent')).length
    });
  }, [disasters]);

  const getTagColor = (tag: string) => {
    const colors: { [key: string]: string } = {
      'flood': 'bg-blue-100 text-blue-800',
      'fire': 'bg-red-100 text-red-800',
      'earthquake': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800',
      'medical': 'bg-green-100 text-green-800',
      'evacuation': 'bg-purple-100 text-purple-800',
      'default': 'bg-gray-100 text-gray-800'
    };
    return colors[tag.toLowerCase()] || colors.default;
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Disasters</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent (24h)</p>
              <p className="text-3xl font-bold text-gray-900">{stats.recent}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Urgent</p>
              <p className="text-3xl font-bold text-gray-900">{stats.urgent}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Disasters List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Disasters</h2>
          <p className="text-sm text-gray-600">Click on a disaster to view details and manage response</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {disasters.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No disasters reported</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by reporting a new disaster event.
              </p>
            </div>
          ) : (
            disasters.map((disaster) => (
              <div
                key={disaster.id}
                onClick={() => onSelectDisaster(disaster)}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
                  selectedDisaster?.id === disaster.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {disaster.title}
                      </h3>
                      {disaster.tags.includes('urgent') && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          URGENT
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {disaster.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {disaster.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getTagColor(tag)}`}
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {disaster.location_name && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{disaster.location_name}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{disaster.owner_id}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatTimeAgo(disaster.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DisasterDashboard;