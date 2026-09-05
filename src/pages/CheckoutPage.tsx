import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Loader2, CheckCircle2, XCircle, ArrowLeft, Lock, CreditCard } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useRazorpayPayment } from '@/hooks/useRazorpayPayment';
import AuditTrail from '@/components/AuditTrail';

export default function CheckoutPage() {
  const { items, cartSubtotal } = useCart();
  const navigate = useNavigate();
  const { paymentStatus, paymentMessage, totalAmount, taxAmount, processPayment, resetPayment } = useRazorpayPayment();
  const [showConfirm, setShowConfirm] = useState(true);

  useEffect(() => {
    if (items.length === 0 && paymentStatus !== 'success') {
      navigate('/cart');
    }
  }, [items.length, navigate, paymentStatus]);

  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

  const handlePayment = async () => {
    setShowConfirm(false);
    await processPayment();
  };

  if (paymentStatus === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-600 mb-6">{paymentMessage}</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-bold text-sm text-gray-900 mb-2">What happens next:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Your order has been recorded in the audit trail</li>
              <li>• Payment was processed via Razorpay Test Mode</li>
              <li>• Every action has been logged for transparency</li>
            </ul>
          </div>
          <div className="mb-6">
            <AuditTrail />
          </div>
          <Link
            to="/"
            className="inline-block bg-amazon-yellow hover:bg-amazon-yellow-hover text-gray-900 font-bold py-2.5 px-8 rounded-full text-sm transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="max-w-amazon mx-auto px-2 sm:px-4 py-4">
      <Link to="/cart" className="inline-flex items-center gap-1 text-sm text-amazon-link hover:text-amazon-orange hover:underline mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Cart
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-4">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Order summary */}
        <div className="lg:col-span-8">
          {/* Confirmation gate */}
          {showConfirm && (paymentStatus === 'idle' || paymentStatus === 'cancelled') && (
            <div className="bg-amazon-success-bg border border-green-200 rounded-lg p-5 mb-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-green-800 mb-1">Confirm Your Purchase</h3>
                  <p className="text-sm text-green-700">
                    You are about to pay <span className="font-bold">{formatPrice(totalAmount)}</span> for{' '}
                    <span className="font-bold">{items.length} item{items.length > 1 ? 's' : ''}</span>.
                    This action will be processed via Razorpay Test Mode and logged to the audit trail.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handlePayment}
                      className="bg-amazon-orange hover:bg-amazon-orange-hover text-white font-bold py-2 px-6 rounded-full text-sm transition-colors flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      Confirm & Pay
                    </button>
                    <button
                      onClick={() => navigate('/cart')}
                      className="border border-gray-300 text-gray-700 font-bold py-2 px-6 rounded-full text-sm hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing state */}
          {paymentStatus === 'processing' && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <Loader2 className="w-10 h-10 text-amazon-orange animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-600">{paymentMessage}</p>
            </div>
          )}

          {/* Failed state */}
          {paymentStatus === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5 mb-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-800 mb-1">Payment Failed</h3>
                  <p className="text-sm text-red-700">{paymentMessage}</p>
                  <button
                    onClick={() => {
                      resetPayment();
                      setShowConfirm(true);
                    }}
                    className="mt-3 bg-amazon-orange hover:bg-amazon-orange-hover text-white font-bold py-2 px-6 rounded-full text-sm transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Items list */}
          <div className="bg-white rounded-lg p-4">
            <h2 className="font-bold text-lg text-gray-900 mb-3">Order Items</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <img
                    src={item.product.image}
                    alt={item.product.title}
                    className="w-16 h-16 object-contain rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 line-clamp-2">{item.product.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit trail */}
          <div className="mt-4">
            <AuditTrail />
          </div>
        </div>

        {/* Right: Payment summary */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-lg p-4 sticky top-32">
            <h2 className="font-bold text-lg text-gray-900 mb-3">Payment Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Items ({items.reduce((s, i) => s + i.quantity, 0)}):</span>
                <span className="text-gray-900">{formatPrice(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery:</span>
                <span className="text-green-600 font-bold">FREE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (5%):</span>
                <span className="text-gray-900">{formatPrice(taxAmount)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">Order Total:</span>
                <span className="font-bold text-lg text-gray-900">{formatPrice(totalAmount)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                Razorpay Test Mode
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                256-bit SSL Secure Payment
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                PCI DSS Compliant
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
