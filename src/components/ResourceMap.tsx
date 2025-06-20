import React, { useState, useEffect } from 'react';
import { MapPin, Users, Heart, Home, Droplets, Utensils, Loader2, AlertTriangle } from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  location_name: string;
  type: string;
  created_at: string;
}

interface ResourceData {
  disaster_id: string;
  resources: Resource[];
  query_params: {
    lat?: string;
    lon?: string;
    radius?: string;
  };
  total_count: number;
  note?: string;
}

interface ResourceMapProps {
  disasters: any[];
  selectedDisaster: any;
}

const ResourceMap: React.FC<ResourceMapProps> = ({ disasters, selectedDisaster }) => {
  const [resourceData, setResourceData] = useState<ResourceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState('10000'); // 10km default

  useEffect(() => {
    if (selectedDisaster) {
      fetchResources(selectedDisaster.id);
    }
  }, [selectedDisaster, coordinates, radius]);

  const fetchResources = async (disasterId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let url = `http://localhost:3001/api/resources/${disasterId}`;
      const params = new URLSearchParams();
      
      if (coordinates) {
        params.append('lat', coordinates.lat.toString());
        params.append('lon', coordinates.lng.toString());
        params.append('radius', radius);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch resources');
      }
      const data = await response.json();
      setResourceData(data);
    } catch (error) {
      console.error('Error fetching resources:', error);
      setError('Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewResource = async () => {
    if (!selectedDisaster) return;
    
    try {
      const response = await fetch('http://localhost:3001/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disaster_id: selectedDisaster.id,
          name: 'New Emergency Resource',
          location_name: 'Central Location',
          type: 'general',
          lat: coordinates?.lat || 40.7128,
          lng: coordinates?.lng || -74.0060
        })
      });
      
      if (response.ok) {
        fetchResources(selectedDisaster.id);
      }
    } catch (error) {
      console.error('Error creating resource:', error);
    }
  };

  const getResourceIcon = (type: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      'shelter': <Home className="h-5 w-5" />,
      'medical': <Heart className="h-5 w-5" />,
      'food': <Utensils className="h-5 w-5" />,
      'water': <Droplets className="h-5 w-5" />,
      'general': <Users className="h-5 w-5" />
    };
    return icons[type] || icons.general;
  };

  const getResourceColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'shelter': 'bg-blue-100 text-blue-800 border-blue-200',
      'medical': 'bg-red-100 text-red-800 border-red-200',
      'food': 'bg-green-100 text-green-800 border-green-200',
      'water': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'general': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type] || colors.general;
  };

  const handleLocationInput = () => {
    const lat = prompt('Enter latitude:');
    const lng = prompt('Enter longitude:');
    
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        setCoordinates({ lat: latNum, lng: lngNum });
      }
    }
  };

  if (!selectedDisaster) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <MapPin className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No disaster selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Select a disaster from the dashboard to view available resources.
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
            <MapPin className="h-8 w-8 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Resource Mapping</h2>
              <p className="text-sm text-gray-600">
                Available resources for: <span className="font-medium">{selectedDisaster.title}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLocationInput}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Set Location
            </button>
            <button
              onClick={createNewResource}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Add Resource
            </button>
          </div>
        </div>
      </div>

      {/* Search Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Geospatial Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Radius
            </label>
            <select
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="1000">1 km</option>
              <option value="5000">5 km</option>
              <option value="10000">10 km</option>
              <option value="25000">25 km</option>
              <option value="50000">50 km</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Coordinates
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700">
              {coordinates ? 
                `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}` : 
                'No location set'
              }
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resources Found
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-gray-900">
              {resourceData ? resourceData.total_count : '0'} resources
            </div>
          </div>
        </div>
      </div>

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
      {isLoading && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 text-green-600 animate-spin" />
          <p className="mt-2 text-sm text-gray-600">Loading resources...</p>
        </div>
      )}

      {/* Resources List */}
      {resourceData && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Available Resources</h3>
                <p className="text-sm text-gray-600">
                  {resourceData.total_count} resources found
                  {coordinates && ` within ${parseInt(radius) / 1000}km`}
                </p>
              </div>
              {resourceData.note && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  Demo Data
                </span>
              )}
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {resourceData.resources.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No resources found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search radius or location.
                </p>
              </div>
            ) : (
              resourceData.resources.map((resource) => (
                <div key={resource.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 p-2 rounded-lg border ${getResourceColor(resource.type)}`}>
                      {getResourceIcon(resource.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-lg font-medium text-gray-900 truncate">
                          {resource.name}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getResourceColor(resource.type)}`}>
                          {resource.type}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{resource.location_name || 'Location not specified'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>Available now</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-400 mt-1">
                        Added {new Date(resource.created_at).toLocaleDateString()}
                      </p>
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

export default ResourceMap;