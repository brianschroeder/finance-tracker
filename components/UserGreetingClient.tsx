'use client';

import { useState, useEffect } from 'react';

// Custom event for user settings update
const USER_SETTINGS_UPDATED_EVENT = 'user-settings-updated';

// Local storage key for cached username
const USER_NAME_CACHE_KEY = 'finance_tracker_username';

type UserGreetingClientProps = {
  initialName: string;
};

export default function UserGreetingClient({ initialName }: UserGreetingClientProps) {
  const [userName, setUserName] = useState(initialName);

  // Function to fetch user settings
  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/user-settings', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        const name = data.name || '';
        
        if (name !== userName) {
          setUserName(name);
          localStorage.setItem(USER_NAME_CACHE_KEY, name);
        }
      }
    } catch (_error) {
      // Silently fail
    }
  };

  useEffect(() => {
    // Try to get username from localStorage once we're on the client
    const cachedName = localStorage.getItem(USER_NAME_CACHE_KEY);
    if (cachedName && cachedName !== userName) {
      setUserName(cachedName);
    }
    
    // Then fetch the latest from the API
    fetchUserSettings();
    
    // Set up a refresh interval (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchUserSettings();
    }, 30000);
    
    // Listen for user settings update events
    const handleUserSettingsUpdate = (event: CustomEvent) => {
      const { name } = event.detail;
      if (name && name !== userName) {
        setUserName(name);
        localStorage.setItem(USER_NAME_CACHE_KEY, name);
      }
    };
    
    window.addEventListener(USER_SETTINGS_UPDATED_EVENT, handleUserSettingsUpdate as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener(USER_SETTINGS_UPDATED_EVENT, handleUserSettingsUpdate as EventListener);
      clearInterval(intervalId);
    };
  }, [userName]);

  return (
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
      {userName ? `Welcome, ${userName}` : 'Welcome'}
    </p>
  );
} 