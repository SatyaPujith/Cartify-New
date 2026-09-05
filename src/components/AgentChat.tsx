import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Send, Loader2, X, ShoppingBag, TrendingDown, CheckCircle2,
  Eye, CreditCard, Shield, Lock, AlertCircle, Package,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useProducts } from '@/context/ProductContext';
import { useRazorpayPayment } from '@/hooks/useRazorpayPayment';
import { callAgent, type AgentResponse } from '@/lib/agent';
import type { Product } from '@/types';

type ChatStage = 'idle' | 'results' | 'in_cart' | 'confirming' | 'paying' | 'success' | 'failed';

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  products?: Product[];
  total?: number;
  budget?: number;
  withinBudget?: boolean;
  stage?: ChatStage;
}

const examplePrompts = [
  'I want to make biryani under ₹500',
  'I want to give a gift to my friend under ₹1000',
  'Make a pizza under ₹400',
  'Birthday gift for my sister under ₹2000',
];

export default function AgentChat() {
  const { addToCart, clearCart, addAuditEntry, items, cartSubtotal } = useCart();
  const { addProducts } = useProducts();
  const { processPayment, paymentStatus, paymentMessage, totalAmount, taxAmount } = useRazorpayPayment();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<ChatStage>('idle');
  const [lastAgentResponse, setLastAgentResponse] = useState<AgentResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      content: "Hi! I'm your AI shopping agent. Tell me what you need — like 'make biryani under ₹500' or 'gift for my friend under ₹1000' — and I'll find the right products, add them to your cart, and you can pay right here!",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, stage]);

  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

  const handleSend = async (promptText?: string) => {
    const text = promptText || input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);
    setStage('idle');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      const response = await callAgent(text);
      setLastAgentResponse(response);

      if (response.products && response.products.length > 0) {
        addProducts(response.products);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: response.explanation + ' Would you like me to add these to your cart?',
          products: response.products,
          total: response.total,
          budget: response.budget,
          withinBudget: response.withinBudget,
          stage: 'results',
        },
      ]);
      setStage('results');

      addAuditEntry({
        action: 'AGENT_SEARCH',
        description: `Agent found ${response.products.length} products for "${text}" — Total: ₹${response.total}${response.budget ? ` / Budget: ₹${response.budget}` : ''}`,
        amount: response.total,
        status: 'success',
        details: { prompt: text, productCount: response.products.length, budget: response.budget, total: response.total },
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: `Sorry, I couldn't process that request. ${err instanceof Error ? err.message : 'Please try again.'}`,
        },
      ]);
      addAuditEntry({
        action: 'AGENT_SEARCH',
        description: `Agent failed to process "${text}"`,
        status: 'failed',
        details: { prompt: text, error: err instanceof Error ? err.message : 'Unknown' },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!lastAgentResponse?.products) return;

    clearCart();
    lastAgentResponse.products.forEach((product) => {
      addToCart(product);
    });

    addAuditEntry({
      action: 'AGENT_ADD_ITEMS',
      description: `Agent added ${lastAgentResponse.products.length} items to cart — Total: ₹${lastAgentResponse.total}`,
      amount: lastAgentResponse.total,
      status: 'success',
      details: {
        productCount: lastAgentResponse.products.length,
        budget: lastAgentResponse.budget,
        total: lastAgentResponse.total,
        withinBudget: lastAgentResponse.withinBudget,
      },
    });

    setStage('in_cart');
    setMessages((prev) => [
      ...prev,
      {
        role: 'agent',
        content: `Done! I've added ${lastAgentResponse.products.length} items to your cart. The total is ₹${lastAgentResponse.total.toLocaleString('en-IN')}${lastAgentResponse.budget ? ` (within your budget of ₹${lastAgentResponse.budget.toLocaleString('en-IN')})` : ''}.\n\nWould you like to proceed to payment? I can process your order right here using Razorpay Test Mode.`,
        total: lastAgentResponse.total,
        budget: lastAgentResponse.budget,
        withinBudget: lastAgentResponse.withinBudget,
        stage: 'in_cart',
      },
    ]);
  };

  const handleProceedToPayment = () => {
    setStage('confirming');
    setMessages((prev) => [
      ...prev,
      {
        role: 'agent',
        content: `Here's your order summary:\n\n• Items: ${items.length}\n• Subtotal: ${formatPrice(cartSubtotal)}\n• Tax (5%): ${formatPrice(taxAmount)}\n• Total: ${formatPrice(totalAmount)}\n\nPlease confirm to proceed with payment via Razorpay Test Mode. This action will be logged to the audit trail.`,
        total: totalAmount,
        stage: 'confirming',
      },
    ]);
  };

  const handleConfirmPayment = async () => {
    setStage('paying');
    setMessages((prev) => [
      ...prev,
      {
        role: 'agent',
        content: 'Processing your payment... Please wait.',
        stage: 'paying',
      },
    ]);

    const result = await processPayment(lastAgentResponse?.intent?.rawInput || undefined);

    if (result.status === 'success') {
      setStage('success');
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: `Payment successful! Your order has been placed.\n\n• Order ID: ${result.orderId || 'N/A'}\n• Payment ID: ${result.paymentId || 'N/A'}\n• Amount: ${formatPrice(totalAmount)}\n\nEvery action has been logged to the audit trail. You can view it on the checkout page or in the audit trail panel.\n\nIs there anything else you'd like to buy?`,
          stage: 'success',
        },
      ]);
    } else if (result.status === 'cancelled') {
      setStage('in_cart');
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: 'Payment was cancelled. No charge was made. Would you like to try again, or modify your cart?',
          stage: 'in_cart',
        },
      ]);
    } else {
      setStage('failed');
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: `Payment failed: ${result.message}\n\nThis error has been logged. You can try again or go to the checkout page for a full breakdown.`,
          stage: 'failed',
        },
      ]);
    }
  };

  const handleStartOver = () => {
    setStage('idle');
    setLastAgentResponse(null);
    setMessages((prev) => [
      ...prev,
      {
        role: 'agent',
        content: "What would you like to shop for next?",
      },
    ]);
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-cartify-navy hover:bg-cartify-navy-hover text-white rounded-full p-4 shadow-2xl transition-all hover:scale-105 group"
        >
          <Sparkles className="w-6 h-6 text-cartify-orange" />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-cartify-navy text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Ask AI Agent
          </span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[440px] h-full sm:h-[600px] sm:max-h-[80vh] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-cartify-navy text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-cartify-orange rounded-full p-1.5">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">AI Shopping Agent</h3>
                <p className="text-xs text-gray-400">Powered by Agentic Commerce</p>
              </div>
              {stage !== 'idle' && (
                <span className="ml-2 text-xs bg-cartify-navy-hover px-2 py-0.5 rounded-full">
                  {stage === 'results' && 'Products found'}
                  {stage === 'in_cart' && 'In cart'}
                  {stage === 'confirming' && 'Confirming'}
                  {stage === 'paying' && 'Paying...'}
                  {stage === 'success' && 'Order placed'}
                  {stage === 'failed' && 'Payment failed'}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-cartify-navy-hover rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-cartify-navy text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>

                  {/* Product preview */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.products.slice(0, 4).map((product) => (
                        <div key={product.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-10 h-10 object-contain rounded shrink-0"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700 line-clamp-1">{product.title}</p>
                            <p className="text-xs font-bold text-gray-900">{formatPrice(product.price)}</p>
                          </div>
                        </div>
                      ))}
                      {msg.products.length > 4 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{msg.products.length - 4} more items
                        </p>
                      )}

                      {/* Budget summary */}
                      <div className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2 mt-2">
                        <span className="text-xs font-bold text-gray-700">Total</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{formatPrice(msg.total || 0)}</span>
                          {msg.budget && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                msg.withinBudget
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {msg.withinBudget ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Under {formatPrice(msg.budget)}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <TrendingDown className="w-3 h-3" /> Over {formatPrice(msg.budget)}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cartify-orange" />
                  <span className="text-sm text-gray-600">Searching products...</span>
                </div>
              </div>
            )}

            {stage === 'paying' && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cartify-orange" />
                  <span className="text-sm text-gray-600">Processing payment...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Contextual action buttons */}
          <div className="border-t border-gray-200 bg-white shrink-0">
            {/* Results stage: Add to cart + View catalog */}
            {stage === 'results' && lastAgentResponse?.products && lastAgentResponse.products.length > 0 && (
              <div className="px-4 py-2 space-y-2">
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-cartify-yellow hover:bg-cartify-yellow-hover text-gray-900 font-bold py-2.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Add {lastAgentResponse.products.length} items to cart — {formatPrice(lastAgentResponse.total)}
                </button>
                <button
                  onClick={() => {
                    const category = lastAgentResponse.intent?.category;
                    if (category) {
                      navigate(`/category/${category}`);
                    } else {
                      navigate(`/search?q=${encodeURIComponent(lastAgentResponse.searchQuery || '')}`);
                    }
                  }}
                  className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View products in catalog
                </button>
              </div>
            )}

            {/* In cart stage: Proceed to payment + Go to cart */}
            {stage === 'in_cart' && (
              <div className="px-4 py-2 space-y-2">
                <button
                  onClick={handleProceedToPayment}
                  className="w-full bg-cartify-orange hover:bg-cartify-orange-hover text-white font-bold py-2.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Proceed to Payment — {formatPrice(totalAmount)}
                </button>
                <button
                  onClick={() => navigate('/cart')}
                  className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Go to Cart Page
                </button>
              </div>
            )}

            {/* Confirming stage: Confirm & Pay + Cancel */}
            {stage === 'confirming' && (
              <div className="px-4 py-2 space-y-2">
                <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">
                    By confirming, you authorize a payment of <span className="font-bold">{formatPrice(totalAmount)}</span> via Razorpay Test Mode. This will be recorded in the audit trail.
                  </p>
                </div>
                <button
                  onClick={handleConfirmPayment}
                  className="w-full bg-cartify-orange hover:bg-cartify-orange-hover text-white font-bold py-2.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Confirm & Pay {formatPrice(totalAmount)}
                </button>
                <button
                  onClick={() => setStage('in_cart')}
                  className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-full text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Success stage */}
            {stage === 'success' && (
              <div className="px-4 py-2 space-y-2">
                <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <p className="text-xs text-green-700 font-bold">Order placed successfully!</p>
                </div>
                <button
                  onClick={handleStartOver}
                  className="w-full bg-cartify-yellow hover:bg-cartify-yellow-hover text-gray-900 font-bold py-2.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Shop for something else
                </button>
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  View order details
                </button>
              </div>
            )}

            {/* Failed stage */}
            {stage === 'failed' && (
              <div className="px-4 py-2 space-y-2">
                <div className="bg-red-50 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{paymentMessage}</p>
                </div>
                <button
                  onClick={handleProceedToPayment}
                  className="w-full bg-cartify-orange hover:bg-cartify-orange-hover text-white font-bold py-2.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/cart')}
                  className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-full text-sm transition-colors"
                >
                  Go to Cart
                </button>
              </div>
            )}

            {/* Example prompts */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Try these:</p>
                <div className="flex flex-wrap gap-1.5">
                  {examplePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tell me what you need..."
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cartify-orange"
                  disabled={loading || stage === 'paying'}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || stage === 'paying'}
                  className="bg-cartify-orange hover:bg-cartify-orange-hover text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
