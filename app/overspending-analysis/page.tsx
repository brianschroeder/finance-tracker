import OverspendingAnalysis from '@/components/OverspendingAnalysis';
import PageTitle from '@/components/PageTitle';

export default function OverspendingAnalysisPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageTitle 
        title="Overspending Analysis" 
        description="Track your overspending patterns across pay periods and identify areas for improvement"
      />
      <OverspendingAnalysis />
    </div>
  );
}
