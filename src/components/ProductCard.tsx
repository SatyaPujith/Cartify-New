import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [imageError, setImageError] = useState(false);

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const getFallbackImage = () => {
    const titleLower = product.title.toLowerCase();
    
    // Hash function to get deterministic index based on title
    const getHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash);
    };
    
    const hash = getHash(product.title);

    if (titleLower.includes('chocolate') || titleLower.includes('gift')) {
      const images = [
        'https://images.unsplash.com/photo-1548901671-317b4f4a5e3f?w=400',
        'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400',
        'https://images.unsplash.com/photo-1511381939415-e440c06497f1?w=400',
        'https://images.unsplash.com/photo-1514326535286-4e554904a44b?w=400'
      ];
      return images[hash % images.length];
    }
    if (titleLower.includes('masala') || titleLower.includes('spice')) {
      const images = [
        'https://images.unsplash.com/photo-1596040033229-a9821ebd05e5?w=400',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
        'https://images.unsplash.com/photo-1599909635549-8f5c1e3e1d2e?w=400',
        'https://images.unsplash.com/photo-1586201375761-8416509e8f5e?w=400'
      ];
      return images[hash % images.length];
    }
    if (titleLower.includes('phone') || titleLower.includes('mobile')) {
      const images = [
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
        'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400',
        'https://images.unsplash.com/photo-1601972602237-8c79241e468b?w=400',
        'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400'
      ];
      return images[hash % images.length];
    }
    if (titleLower.includes('headphone') || titleLower.includes('earphone')) {
      const images = [
        'https://images.unsplash.com/photo-1505740420928-5e560c3d4999?w=400',
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400',
        'https://images.unsplash.com/photo-1590646877753-0d1e3e6f1d2e?w=400',
        'https://images.unsplash.com/photo-1564424224651-efa32efb4231?w=400'
      ];
      return images[hash % images.length];
    }
    
    // Default fallback
    const defaultImages = [
      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      'https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?w=400',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'
    ];
    return defaultImages[hash % defaultImages.length];
  };

  return (
    <div className="flex flex-col bg-white rounded-md p-3 hover:shadow-lg transition-shadow group">
      <Link to={`/product/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden rounded mb-2 bg-gray-50 flex items-center justify-center">
          <img
            src={imageError ? getFallbackImage() : product.image}
            alt={product.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={handleImageError}
          />
        </div>
      </Link>

      <Link to={`/product/${product.id}`} className="flex-1">
        <h3 className="text-sm text-amazon-link hover:text-amazon-link-hover line-clamp-2 leading-snug">
          {product.title}
        </h3>
      </Link>

      <div className="flex items-center gap-1 mt-1">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-3.5 h-3.5 ${
                star <= Math.round(product.rating)
                  ? 'text-amazon-orange fill-amazon-orange'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-amazon-link hover:text-amazon-orange hover:underline cursor-pointer">
          {product.reviewCount.toLocaleString('en-IN')}
        </span>
      </div>

      <div className="mt-1">
        {product.originalPrice && (
          <span className="text-xs text-gray-500 line-through mr-1">
            {formatPrice(product.originalPrice)}
          </span>
        )}
        <span className="text-lg font-bold text-gray-900">
          {formatPrice(product.price)}
        </span>
      </div>

      {product.prime && (
        <div className="mt-1">
          <span className="text-xs font-bold text-amazon-success">Prime</span>
          <span className="text-xs text-gray-600 ml-1">FREE delivery</span>
        </div>
      )}

      <button
        onClick={() => addToCart(product)}
        className="mt-2 bg-amazon-yellow hover:bg-amazon-yellow-hover text-gray-900 text-xs font-bold py-1.5 px-3 rounded-full transition-colors"
      >
        Add to Cart
      </button>
    </div>
  );
}
