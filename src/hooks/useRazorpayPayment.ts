import { useState, useEffect, useCallback, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import { createRazorpayOrder, verifyRazorpayPayment, type CreateOrderResponse } from '@/lib/agent';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

export type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed' | 'cancelled';

export interface PaymentResult {
  status: PaymentStatus;
  message: string;
  orderId?: string;
  paymentId?: string;
}

export function useRazorpayPayment() {
  const { items, cartSubtotal, clearCart, addAuditEntry } = useCart();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => setRazorpayLoaded(false);
    document.body.appendChild(script);
    scriptRef.current = script;
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, []);

  const taxRate = 0.05;
  const taxAmount = Math.round(cartSubtotal * taxRate);
  const totalAmount = cartSubtotal + taxAmount;

  const processPayment = useCallback(
    async (agentIntent?: string): Promise<PaymentResult> => {
      setPaymentStatus('processing');
      setPaymentMessage('Creating order...');

      addAuditEntry({
        action: 'PAYMENT_INITIATED',
        description: `Payment initiated for ${items.length} items — Total: ₹${totalAmount}`,
        amount: Math.round(totalAmount * 100),
        status: 'pending',
        details: { itemCount: items.length, subtotal: cartSubtotal, tax: taxAmount, total: totalAmount },
      });

      try {
        const order = await createRazorpayOrder(
          totalAmount,
          items.map((item) => ({
            id: item.product.id,
            title: item.product.title,
            price: item.product.price,
            quantity: item.quantity,
            image: item.product.image,
            source: item.product.source,
          })),
          agentIntent
        );

        setPaymentMessage('Opening payment gateway...');

        if (order.mockMode || !window.Razorpay || !razorpayLoaded) {
          return await simulateMockPayment(order);
        } else {
          return await openRazorpayCheckout(order);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Payment failed';
        setPaymentStatus('failed');
        setPaymentMessage(msg);
        addAuditEntry({
          action: 'PAYMENT_FAILED',
          description: `Payment failed: ${msg}`,
          amount: Math.round(totalAmount * 100),
          status: 'failed',
          details: { error: msg },
        });
        return { status: 'failed', message: msg };
      }
    },
    [items, totalAmount, cartSubtotal, taxAmount, razorpayLoaded, addAuditEntry]
  );

  const simulateMockPayment = async (order: CreateOrderResponse): Promise<PaymentResult> => {
    setPaymentMessage('Processing mock payment...');
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockPaymentId = `pay_mock_${Date.now()}`;
    const mockSignature = 'mock_signature_for_test_mode';

    const verification = await verifyRazorpayPayment(
      order.razorpayOrderId,
      mockPaymentId,
      mockSignature,
      true
    );

    if (verification.verified) {
      setPaymentStatus('success');
      setPaymentMessage('Payment successful! (Mock mode — Razorpay test keys not configured)');
      clearCart();
      addAuditEntry({
        action: 'PAYMENT_SUCCESS',
        description: `Payment of ₹${totalAmount} verified successfully (mock mode)`,
        amount: Math.round(totalAmount * 100),
        status: 'success',
        details: { orderId: order.orderId, paymentId: mockPaymentId, mockMode: true },
      });
      return {
        status: 'success',
        message: 'Payment successful! (Mock mode)',
        orderId: order.orderId,
        paymentId: mockPaymentId,
      };
    } else {
      throw new Error('Payment verification failed');
    }
  };

  const openRazorpayCheckout = async (order: CreateOrderResponse): Promise<PaymentResult> => {
    return new Promise<PaymentResult>((resolve, reject) => {
      const options: RazorpayOptions = {
        key: order.keyId,
        amount: order.amount,
        currency: 'INR',
        name: 'Amazon Clone',
        description: 'Purchase from AI Shopping Agent',
        order_id: order.razorpayOrderId,
        handler: async (response) => {
          try {
            const verification = await verifyRazorpayPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              false
            );

            if (verification.verified) {
              setPaymentStatus('success');
              setPaymentMessage('Payment successful!');
              clearCart();
              addAuditEntry({
                action: 'PAYMENT_SUCCESS',
                description: `Payment of ₹${totalAmount} verified via Razorpay`,
                amount: Math.round(totalAmount * 100),
                status: 'success',
                details: { orderId: verification.orderId, paymentId: response.razorpay_payment_id },
              });
              resolve({
                status: 'success',
                message: 'Payment successful!',
                orderId: verification.orderId,
                paymentId: response.razorpay_payment_id,
              });
            } else {
              throw new Error('Signature verification failed');
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Verification failed';
            setPaymentStatus('failed');
            setPaymentMessage(msg);
            addAuditEntry({
              action: 'PAYMENT_FAILED',
              description: `Payment verification failed: ${msg}`,
              amount: Math.round(totalAmount * 100),
              status: 'failed',
              details: { error: msg },
            });
            reject(err);
          }
        },
        prefill: { name: 'Test User', email: 'test@example.com', contact: '9999999999' },
        theme: { color: '#131921' },
        modal: {
          ondismiss: () => {
            setPaymentStatus('cancelled');
            setPaymentMessage('Payment cancelled');
            addAuditEntry({
              action: 'PAYMENT_CANCELLED',
              description: 'Payment cancelled by user (checkout modal dismissed)',
              amount: Math.round(totalAmount * 100),
              status: 'cancelled',
              details: { reason: 'user_dismissed' },
            });
            resolve({ status: 'cancelled', message: 'Payment cancelled' });
          },
        },
      };

      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        reject(new Error('Razorpay checkout not loaded'));
        return;
      }
      const rzp = new RazorpayCtor(options);
      rzp.open();
    });
  };

  const resetPayment = useCallback(() => {
    setPaymentStatus('idle');
    setPaymentMessage('');
  }, []);

  return {
    paymentStatus,
    paymentMessage,
    totalAmount,
    taxAmount,
    cartSubtotal,
    processPayment,
    resetPayment,
  };
}
