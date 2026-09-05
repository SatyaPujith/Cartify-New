import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Star, ChevronRight, Truck, Shield, RotateCcw, Plus, Minus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useProducts } from '@/context/ProductContext';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { getProductById } = useProducts();
  const [quantity, setQuantity] = useState(1);

  const product = id ? getProductById(id) : undefined;

  if (!product) {
    return (
      <div className="max-w-amazon mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
        <Link to="/" className="text-amazon-link hover:text-amazon-orange hover:underline mt-4 inline-block">
          Go back to home
        </Link>
      </div>
    );
  }

  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="max-w-amazon mx-auto px-2 sm:px-4 py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
        <Link to="/" className="hover:text-amazon-link hover:underline">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/category/${product.category}`} className="hover:text-amazon-link hover:underline">
          {product.category}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 truncate">{product.title}</span>
      </div>

      <div className="bg-white rounded-md p-4 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Image */}
        <div className="md:col-span-5">
          <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-4">
          <h1 className="text-xl font-medium text-gray-900 mb-2">{product.title}</h1>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(product.rating)
                      ? 'text-amazon-orange fill-amazon-orange'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-amazon-link hover:text-amazon-orange hover:underline cursor-pointer">
              {product.rating} ({product.reviewCount.toLocaleString('en-IN')} ratings)
            </span>
          </div>

          <hr className="my-3" />

          {discount > 0 && (
            <div className="mb-2">
              <span className="text-lg text-amazon-price font-medium">-{discount}%</span>
            </div>
          )}
          <div className="mb-1">
            {product.originalPrice && (
              <span className="text-sm text-gray-500 line-through mr-2">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
          </div>
          {product.prime && (
            <div className="text-sm text-gray-600 mt-1">
              <span className="font-bold text-amazon-success">Prime</span> FREE delivery
            </div>
          )}

          <hr className="my-3" />

          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Brand:</span> <span className="text-amazon-link">{product.brand}</span></p>
            <p><span className="text-gray-500">Category:</span> <span className="text-amazon-link">{product.category}</span></p>
          </div>

          <hr className="my-3" />

          <h3 className="font-bold text-sm mb-2">About this item</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>High quality {product.brand} product</li>
            <li>Available in stock with Prime delivery</li>
            <li>Rated {product.rating} stars by {product.reviewCount.toLocaleString('en-IN')} customers</li>
          </ul>
        </div>

        {/* Buy box */}
        <div className="md:col-span-3">
          <div className="border border-gray-200 rounded-lg p-4 sticky top-32">
            <p className="text-2xl font-bold text-gray-900 mb-2">{formatPrice(product.price)}</p>
            {product.prime && (
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-bold text-amazon-success">Prime</span> FREE delivery
              </p>
            )}
            <p className="text-sm text-amazon-success font-medium mb-3">In Stock</p>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-600">Qty:</span>
              <div className="flex items-center border border-gray-300 rounded">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-2 py-1 hover:bg-gray-100"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="px-3 text-sm font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-2 py-1 hover:bg-gray-100"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <button
              onClick={() => addToCart(product, quantity)}
              className="w-full bg-amazon-yellow hover:bg-amazon-yellow-hover text-gray-900 font-bold py-2 rounded-full text-sm mb-2 transition-colors"
            >
              Add to Cart
            </button>
            <button
              onClick={() => {
                addToCart(product, quantity);
                navigate('/cart');
              }}
              className="w-full bg-amazon-orange hover:bg-amazon-orange-hover text-white font-bold py-2 rounded-full text-sm transition-colors"
            >
              Buy Now
            </button>

            <hr className="my-4" />

            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-500" />
                Secure transaction
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                Ships from Amazon
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-gray-500" />
                10 days Returnable
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
