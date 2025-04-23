import { Suspense } from 'react';
import Onboarding from '@/components/Onboarding';

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <Onboarding />
    </Suspense>
  );
} 