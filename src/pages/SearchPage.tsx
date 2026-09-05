import { useSearchParams, Link } from 'react-router-dom';
import { useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { useProducts } from '@/context/ProductContext';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'All';
  const [sortBy, setSortBy] = useState('relevance');
  const { searchProducts } = useProducts();

  let results = searchProducts(query, category);

  if (sortBy === 'price-low') results = [...results].sort((a, b) => a.price - b.price);
  if (sortBy === 'price-high') results = [...results].sort((a, b) => b.price - a.price);
  if (sortBy === 'rating') results = [...results].sort((a, b) => b.rating - a.rating);

  return (
    <div className="max-w-cartify mx-auto px-2 sm:px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">
          {results.length > 0
            ? `1-${results.length} of ${results.length} results for`
            : 'No results for'}
          {query && <span className="font-bold text-gray-900 ml-1">"{query}"</span>}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cartify-orange"
          >
            <option value="relevance">Relevance</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Avg. Customer Review</option>
          </select>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="bg-white rounded-md p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">No results found</h1>
          <p className="text-gray-600 mb-4">Try searching with different keywords.</p>
          <Link
            to="/"
            className="inline-block bg-cartify-yellow hover:bg-cartify-yellow-hover text-gray-900 font-bold py-2 px-6 rounded-full text-sm transition-colors"
          >
            Go Home
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
