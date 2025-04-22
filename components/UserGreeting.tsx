import { getUserSettings } from '@/lib/userSettings';

// This is a server component that can be used to fetch user data during server rendering
export default async function UserGreeting() {
  const settings = await getUserSettings();
  const userName = settings?.name || '';
  
  return (
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
      {userName ? `Welcome, ${userName}` : 'Welcome'}
    </p>
  );
} 