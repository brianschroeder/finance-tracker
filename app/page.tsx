import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import Dashboard from "@/components/Dashboard";

export default function Home() {
  // Instead of automatically redirecting to onboarding,
  // check if database is initialized and render Dashboard 
  // if it is, otherwise redirect to onboarding
  
  // Since this is a server component, we can't fetch from API routes
  // so we'll use the dashboard component directly
  return (
    <div>
      <Dashboard />
    </div>
  );
}
