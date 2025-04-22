import AssetForm from '@/components/AssetForm';

export default function AssetsPage() {
  return (
    <div className="py-10 px-4 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Update Assets</h1>
          <p className="text-gray-500 mt-2">Manage your financial assets and track your net worth</p>
        </div>
        <div className="hidden sm:block bg-blue-50 p-2 rounded-full">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <AssetForm />
    </div>
  );
} 