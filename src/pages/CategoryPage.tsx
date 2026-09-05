import { useParams, Link } from 'react-router-dom';
import ProductCard from '@/components/ProductCard';
import { useProducts } from '@/context/ProductContext';
import { ChevronRight } from 'lucide-react';

export default function CategoryPage() {
  const { categoryName } = useParams();
  const { getProductsByCategory, getDeals } = useProducts();

  const products = categoryName === 'deals' || categoryName === 'Deals'
    ? getDeals()
    : getProductsByCategory(categoryName || '');

  return (
    <div className="max-w-cartify mx-auto px-2 sm:px-4 py-4">
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
        <Link to="/" className="hover:text-cartify-link hover:underline">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700">{categoryName === 'deals' ? "Today's Deals" : categoryName}</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        {categoryName === 'deals' ? "Today's Deals" : categoryName}
      </h1>

      {products.length === 0 ? (
        <div className="bg-white rounded-md p-8 text-center">
          <p className="text-gray-600">No products in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
