import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, cartSubtotal } = useCart();
  const navigate = useNavigate();
  const [proceedToBuy, setProceedToBuy] = useState(false);

  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

  if (items.length === 0) {
    return (
      <div className="max-w-amazon mx-auto px-4 py-10">
        <div className="bg-white rounded-md p-8 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Amazon Cart is empty</h1>
          <p className="text-gray-600 mb-4">Check out our best sellers and deals today!</p>
          <Link
            to="/"
            className="inline-block bg-amazon-yellow hover:bg-amazon-yellow-hover text-gray-900 font-bold py-2 px-6 rounded-full text-sm transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-amazon mx-auto px-2 sm:px-4 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cart items */}
        <div className="lg:col-span-9">
          <div className="bg-white rounded-md p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Shopping Cart</h1>
            <Link to="/" className="text-sm text-amazon-link hover:text-amazon-orange hover:underline">
              Deselect all items
            </Link>
            <hr className="my-3" />

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0">
                  <Link to={`/product/${item.product.id}`} className="shrink-0">
                    <div className="w-32 h-32 bg-gray-50 rounded overflow-hidden">
                      <img
                        src={item.product.image}
                        alt={item.product.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </Link>

                  <div className="flex-1">
                    <Link to={`/product/${item.product.id}`}>
                      <h3 className="text-sm font-medium text-amazon-link hover:text-amazon-orange line-clamp-2">
                        {item.product.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-amazon-success mt-1">In Stock</p>
                    {item.product.prime && (
                      <p className="text-xs text-gray-500">Eligible for FREE Shipping</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-gray-300 rounded">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="px-2 py-1 hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-sm font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 py-1 hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-sm text-amazon-link hover:text-amazon-orange hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                    {item.product.originalPrice && (
                      <p className="text-xs text-gray-500 line-through">
                        {formatPrice(item.product.originalPrice * item.quantity)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-right mt-4">
              <p className="text-lg">
                Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items):{' '}
                <span className="font-bold">{formatPrice(cartSubtotal)}</span>
              </p>
            </div>
          </div>

          <Link to="/" className="inline-flex items-center gap-1 text-sm text-amazon-link hover:text-amazon-orange hover:underline mt-4">
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>

        {/* Buy box */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-md p-4 sticky top-32">
            <p className="text-sm text-gray-700 mb-1">
              {cartSubtotal >= 499 ? (
                <span className="text-amazon-success">
                  <span className="font-bold">✓</span> Your order qualifies for FREE Shipping.
                </span>
              ) : (
                <span>
                  Add <span className="font-bold">{formatPrice(499 - cartSubtotal)}</span> more for FREE Shipping
                </span>
              )}
            </p>
            <p className="text-lg mt-3">
              Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items):{' '}
              <span className="font-bold text-xl">{formatPrice(cartSubtotal)}</span>
            </p>

            {!proceedToBuy ? (
              <button
                onClick={() => setProceedToBuy(true)}
                className="w-full bg-amazon-yellow hover:bg-amazon-yellow-hover text-gray-900 font-bold py-2 rounded-full text-sm mt-4 transition-colors"
              >
                Proceed to Buy
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="bg-amazon-success-bg rounded-md p-3">
                  <p className="text-sm font-bold text-amazon-success mb-1">Confirm Your Order</p>
                  <p className="text-xs text-gray-700">
                    You are about to purchase {items.reduce((s, i) => s + i.quantity, 0)} items for{' '}
                    <span className="font-bold">{formatPrice(cartSubtotal)}</span>.
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Payment will be processed via Razorpay Test Mode.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-amazon-orange hover:bg-amazon-orange-hover text-white font-bold py-2 rounded-full text-sm transition-colors"
                >
                  Confirm & Pay
                </button>
                <button
                  onClick={() => setProceedToBuy(false)}
                  className="w-full border border-gray-300 text-gray-700 font-bold py-2 rounded-full text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
