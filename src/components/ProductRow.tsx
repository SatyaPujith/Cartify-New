import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '@/types';
import ProductCard from './ProductCard';

interface ProductRowProps {
  title: string;
  products: Product[];
  seeMoreLink?: string;
}

export default function ProductRow({ title, products, seeMoreLink }: ProductRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white rounded-md p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {seeMoreLink && (
          <a href={seeMoreLink} className="text-sm text-amazon-link hover:text-amazon-orange hover:underline">
            See more
          </a>
        )}
      </div>

      <div className="relative group">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 shadow-md rounded-full p-1.5 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        >
          {products.map((product) => (
            <div key={product.id} className="min-w-[200px] max-w-[200px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 shadow-md rounded-full p-1.5 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
}
