import React, { useState, useEffect } from 'react';
import { Radio, Clock, MapPin, AlertTriangle, Users, Loader2 } from 'lucide-react';

interface SocialMediaPost {
  id: string;
  user: string;
  content: string;
  timestamp: string;
  urgency: 'low' | 'medium' | 'high';
  location?: string;
  priority?: 'low' | 'medium' | 'high';
  keywords?: string[];
}

interface SocialMediaData {
  disaster_id: string;
  posts: SocialMediaPost[];
  summary: {
    total_posts: number;
    urgent_posts: number;
    last_updated: string;
  };
}

interface SocialMediaFeedProps {
  disasters: any[];
  selectedDisaster: any;
}

const SocialMediaFeed: React.FC<SocialMediaFeedProps> = ({ disasters, selectedDisaster }) => {
  const [socialMediaData, setSocialMediaData] = useState<SocialMediaData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (selectedDisaster) {
      fetchSocialMediaData(selectedDisaster.id);
    }
  }, [selectedDisaster]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && selectedDisaster) {
      interval = setInterval(() => {
        fetchSocialMediaData(selectedDisaster.id);
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedDisaster]);

  const fetchSocialMediaData = async (disasterId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3001/api/social-media/${disasterId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch social media data');
      }
      const data = await response.json();
      setSocialMediaData(data);
    } catch (error) {
      console.error('Error fetching social media data:', error);
      setError('Failed to load social media data');
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
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
        <Radio className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No disaster selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Select a disaster from the dashboard to view social media reports.
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
            <Radio className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Social Media Monitor</h2>
              <p className="text-sm text-gray-600">
                Real-time social media reports for: <span className="font-medium">{selectedDisaster.title}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Auto-refresh</span>
            </label>
            <button
              onClick={() => fetchSocialMediaData(selectedDisaster.id)}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Radio className="h-4 w-4" />
              )}
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {socialMediaData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold text-gray-900">{socialMediaData.summary.total_posts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Urgent Posts</p>
                <p className="text-2xl font-bold text-gray-900">{socialMediaData.summary.urgent_posts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Last Updated</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatTimeAgo(socialMediaData.summary.last_updated)}
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
      {isLoading && !socialMediaData && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin" />
          <p className="mt-2 text-sm text-gray-600">Loading social media reports...</p>
        </div>
      )}

      {/* Social Media Posts */}
      {socialMediaData && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Live Social Media Feed</h3>
            <p className="text-sm text-gray-600">Real-time posts and reports from the field</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {socialMediaData.posts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Radio className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No social media reports</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No social media activity detected for this disaster yet.
                </p>
              </div>
            ) : (
              socialMediaData.posts.map((post) => (
                <div key={post.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getUrgencyColor(post.urgency)}`}>
                      {getUrgencyIcon(post.urgency)}
                      <span className="uppercase">{post.urgency}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-sm font-medium text-gray-900">@{post.user}</p>
                        <p className="text-xs text-gray-500">{formatTimeAgo(post.timestamp)}</p>
                        {post.location && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            <span>{post.location}</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-800 mb-2">{post.content}</p>
                      
                      {post.keywords && post.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {post.keywords.map((keyword, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
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

export default SocialMediaFeed;