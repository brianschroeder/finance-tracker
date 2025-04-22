import StockLookup from '../components/StockLookup';

export default function StocksPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-8 text-center">Stock Market Tracker</h1>
      <div className="max-w-3xl mx-auto">
        <StockLookup />
      </div>
    </div>
  );
} 