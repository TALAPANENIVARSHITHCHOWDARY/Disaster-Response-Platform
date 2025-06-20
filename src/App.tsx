import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Users, Radio, Shield, Clock } from 'lucide-react';
import { io } from 'socket.io-client';
import DisasterDashboard from './components/DisasterDashboard';
import CreateDisasterForm from './components/CreateDisasterForm';
import SocialMediaFeed from './components/SocialMediaFeed';
import ResourceMap from './components/ResourceMap';
import OfficialUpdates from './components/OfficialUpdates';

const socket = io('http://localhost:3001');

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [disasters, setDisasters] = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    // Socket connection handling
    socket.on('connect', () => {
      setConnectionStatus('connected');
      console.log('Connected to disaster response server');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('disaster_updated', (data) => {
      console.log('Disaster update received:', data);
      if (data.type === 'create') {
        setDisasters(prev => [data.data, ...prev]);
      } else if (data.type === 'update') {
        setDisasters(prev => prev.map(d => d.id === data.data.id ? data.data : d));
      } else if (data.type === 'delete') {
        setDisasters(prev => prev.filter(d => d.id !== data.data.id));
      }
    });

    // Fetch initial disasters
    fetchDisasters();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('disaster_updated');
    };
  }, []);

  const fetchDisasters = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/disasters');
      const data = await response.json();
      setDisasters(data);
    } catch (error) {
      console.error('Failed to fetch disasters:', error);
    }
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: AlertTriangle },
    { id: 'create', name: 'Report Disaster', icon: MapPin },
    { id: 'social', name: 'Social Media', icon: Radio },
    { id: 'resources', name: 'Resources', icon: Users },
    { id: 'updates', name: 'Official Updates', icon: Shield }
  ];

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-red-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Disaster Response Platform</h1>
                <p className="text-sm text-gray-500">Real-time coordination and response system</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
                <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                <span className="text-sm font-medium capitalize">{connectionStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    isActive
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DisasterDashboard 
            disasters={disasters}
            onSelectDisaster={setSelectedDisaster}
            selectedDisaster={selectedDisaster}
          />
        )}
        
        {activeTab === 'create' && (
          <CreateDisasterForm onDisasterCreated={fetchDisasters} />
        )}
        
        {activeTab === 'social' && (
          <SocialMediaFeed 
            disasters={disasters}
            selectedDisaster={selectedDisaster}
          />
        )}
        
        {activeTab === 'resources' && (
          <ResourceMap 
            disasters={disasters}
            selectedDisaster={selectedDisaster}
          />
        )}
        
        {activeTab === 'updates' && (
          <OfficialUpdates 
            disasters={disasters}
            selectedDisaster={selectedDisaster}
          />
        )}
      </main>
    </div>
  );
}

export default App;