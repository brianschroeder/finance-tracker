'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

// Custom event for user settings update - must match the one in UserGreetingClient
const USER_SETTINGS_UPDATED_EVENT = 'user-settings-updated';

// Local storage keys for cached user settings
const USER_NAME_CACHE_KEY = 'finance_tracker_username';
const USER_EMAIL_CACHE_KEY = 'finance_tracker_email';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isClient, setIsClient] = useState(false);
  
  // Import/Export functionality (copied from Dashboard)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add this state for the confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Add loading state
  const [importLoading, setImportLoading] = useState(false);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
    
    // Load cached values from localStorage
    const cachedName = localStorage.getItem(USER_NAME_CACHE_KEY);
    const cachedEmail = localStorage.getItem(USER_EMAIL_CACHE_KEY);
    
    if (cachedName) setUserName(cachedName);
    if (cachedEmail) setUserEmail(cachedEmail);
  }, []);

  // Fetch user settings
  useEffect(() => {
    if (!isClient) return;
    
    async function fetchUserSettings() {
      try {
        setLoading(true);
        const response = await fetch('/api/user-settings', { cache: 'no-store' });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user settings');
        }
        
        const data = await response.json();
        const name = data.name || '';
        const email = data.email || '';
        
        setUserName(name);
        setUserEmail(email);
        
        // Update cache
        localStorage.setItem(USER_NAME_CACHE_KEY, name);
        localStorage.setItem(USER_EMAIL_CACHE_KEY, email);
      } catch (_error) {
        toast({
          title: 'Error',
          description: 'Failed to load user settings',
          variant: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserSettings();
  }, [isClient]);

  // Save user settings
  const handleSaveSettings = async () => {
    if (!isClient) return;
    
    try {
      setSaving(true);
      
      const response = await fetch('/api/user-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: userName,
          email: userEmail
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user settings');
      }
      
      // Update local storage cache
      localStorage.setItem(USER_NAME_CACHE_KEY, userName);
      localStorage.setItem(USER_EMAIL_CACHE_KEY, userEmail);
      
      // Dispatch a custom event to notify other components
      const event = new CustomEvent(USER_SETTINGS_UPDATED_EVENT, {
        detail: { name: userName, email: userEmail }
      });
      window.dispatchEvent(event);
      
      toast({
        title: 'Success',
        description: 'User settings updated successfully',
        variant: 'success'
      });
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to update user settings',
        variant: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // Export data to JSON
  const handleExportData = async () => {
    try {
      // Fetch complete data from our export API
      const response = await fetch('/api/export-data');
      
      if (!response.ok) {
        throw new Error('Failed to fetch export data');
      }
      
      // Get the full data as JSON
      const exportData = await response.json();
      
      // Create a JSON string with nice formatting
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // Create a blob and download link
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.download = `financial-data-${date}.json`;
      a.href = url;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: 'All your financial data has been exported successfully',
        variant: 'success'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'error'
      });
    }
  };

  // Handle file upload for import
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setImportData(content);
      } catch (_err) {
        setImportError('Failed to read the file');
      }
    };
    reader.readAsText(file);
  };

  // Import data from JSON
  const handleImportData = async () => {
    try {
      setImportError(null);
      setImportSuccess(null);
      
      // Parse the JSON data to validate it
      JSON.parse(importData);
      
      // Show confirmation modal instead of using browser confirm
      setShowConfirmModal(true);
    } catch (_err) {
      setImportError(_err instanceof Error ? _err.message : 'Failed to parse JSON data');
      toast({
        title: 'Error',
        description: 'Invalid JSON format',
        variant: 'error'
      });
    }
  };

  // This is the actual import function that gets called after confirmation
  const executeImport = async () => {
    try {
      setImportError(null);
      setImportSuccess(null);
      setImportLoading(true);
      
      // Send to our import API endpoint
      const response = await fetch('/api/import-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: importData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import data');
      }
      
      // Show success message
      setImportSuccess('Your data has been successfully imported and all sections have been updated.');
      toast({
        title: 'Success',
        description: 'All financial data has been imported successfully',
        variant: 'success'
      });
      
      // Close modal after a delay
      setTimeout(() => {
        setShowImportModal(false);
        setShowConfirmModal(false);
        setImportSuccess(null);
        
        // Refresh all data after successful import
        window.location.reload();
      }, 2000);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import data');
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to import data',
        variant: 'error'
      });
      setShowConfirmModal(false);
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your account settings and data</p>
      </div>
      
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>
        
        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <Input
                  id="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your name"
                  disabled={loading}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  id="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="Your email (optional)"
                  disabled={loading}
                  className="w-full"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveSettings} 
                disabled={loading || saving}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {saving ? (
                  <>
                    <span className="mr-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                    Saving...
                  </>
                ) : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Setup Options */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Setup Options</CardTitle>
              <CardDescription>Run onboarding or setup wizards again</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100 shadow-sm space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800">Onboarding Wizard</h3>
                </div>
                <p className="text-sm text-gray-500">
                  Run the onboarding wizard again to set up or update your personal information, pay schedule, income, assets, and budget categories.
                </p>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Running the onboarding wizard will not delete any of your existing data. It allows you to update your settings step-by-step. You can exit at any time without losing your current configuration.
                  </p>
                </div>
                <div className="flex justify-start mt-3">
                  <Link href="/onboarding?noAutoRedirect=true">
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      Start Onboarding Wizard
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Data Management */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Export or import your complete financial data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Included Data Categories</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    'Dashboard', 'Assets', 'Investments', 'Income', 
                    'Pay Schedule', 'Budget', 'Savings Plan', 'Credit Cards', 
                    'Transactions', 'Pending Transactions', 'Recurring Transactions'
                  ].map((category) => (
                    <div key={category} className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{category}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-3">
                  <h3 className="text-lg font-medium text-gray-800">Export Data</h3>
                  <p className="text-sm text-gray-500">Download your complete financial data as a JSON file. This includes all your accounts, transactions, settings and preferences.</p>
                  <Button 
                    onClick={handleExportData} 
                    variant="outline" 
                    className="w-full mt-2 bg-white hover:bg-gray-50"
                  >
                    Export Data
                  </Button>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-3">
                  <h3 className="text-lg font-medium text-gray-800">Import Data</h3>
                  <p className="text-sm text-gray-500">Upload your financial data from a previously exported JSON file. This will replace all existing data.</p>
                  <Button 
                    onClick={() => setShowImportModal(true)} 
                    variant="outline" 
                    className="w-full mt-2 bg-white hover:bg-gray-50"
                  >
                    Import Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Import Data</h2>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Importing data will replace all your existing data including transactions, settings, and preferences.
              </p>
              <p className="text-xs text-blue-600 mt-1">This will update all sections: Dashboard, Assets, Investments, Income, Pay Schedule, Budget, Savings Plan, Credit Cards, Transactions, Pending Transactions, and Recurring Transactions.</p>
            </div>
            
            {importError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Import Failed</h3>
                  <p className="text-sm text-red-700 mt-1">{importError}</p>
                </div>
              </div>
            )}
            
            {importSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-green-800">Import Successful</h3>
                  <p className="text-sm text-green-700 mt-1">{importSuccess}</p>
                  <p className="text-xs text-green-600 mt-1">The page will refresh momentarily...</p>
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Import from file:
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Select JSON File
                </button>
                <span className="ml-3 text-sm text-gray-500">
                  {fileInputRef.current?.files?.[0]?.name || "No file selected"}
                </span>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Or paste JSON data:
                </label>
                {importData && (
                  <button
                    onClick={() => setImportData('')}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="w-full h-48 border border-gray-300 rounded-md p-2 text-sm font-mono"
                placeholder='{"assetData": {...}, "paySettings": {...}, ...}'
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImportData}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-md shadow-sm"
                disabled={!importData.trim()}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border border-gray-200">
            <div className="mb-4 text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Are you absolutely sure?</h3>
              <div className="text-sm text-gray-600">
                <p className="mb-2">This action <strong className="text-red-600">cannot be undone</strong>. This will permanently replace:</p>
                <ul className="list-disc text-left mx-auto max-w-xs space-y-1 pl-5 mb-3">
                  <li>All your saved transactions</li>
                  <li>Income settings</li>
                  <li>Budget categories</li>
                  <li>Investments &amp; assets</li>
                  <li>Pay schedule &amp; recurring transactions</li>
                  <li>Credit cards &amp; all other data</li>
                </ul>
                <p className="italic text-gray-500 text-xs">
                  Consider <button 
                    className="text-blue-600 underline"
                    onClick={handleExportData}
                  >
                    exporting your current data
                  </button> before proceeding
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                disabled={importLoading}
              >
                Cancel
              </button>
              <button
                onClick={executeImport}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm text-sm flex items-center"
                disabled={importLoading}
              >
                {importLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </>
                ) : (
                  'Yes, Replace All Data'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 