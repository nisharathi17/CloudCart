'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { authHeaders } from '@/lib/auth-headers';
import Link from 'next/link';

export default function CancelOrderPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders', { headers: await authHeaders() });

      if (res.status === 401) {
        setSignedIn(false);
        setOrders([]);
        return;
      }
      setSignedIn(true);

      const data = await res.json();
      const activeOrders = Array.isArray(data)
        ? data.filter((o: any) => o.status !== 'Cancelled')
        : [];
      setOrders(activeOrders);
      setSelectedOrderId((prev) =>
        activeOrders.some((o: any) => o.orderId === prev) ? prev : activeOrders[0]?.orderId ?? ''
      );
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async () => {
    if (!selectedOrderId) return;
    if (!confirm(`Cancel order #${selectedOrderId}? Its items go back into stock.`)) return;

    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/orders/${selectedOrderId}/cancel`, {
        method: 'POST',
        headers: await authHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.details || data.error);
      } else {
        setSuccessMessage(`Order #${selectedOrderId} is cancelled and its items are back in stock.`);
        fetchOrders();
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentOrder = orders.find((o) => o.orderId === Number(selectedOrderId));

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-ink">Cancel an order</h1>
        <p className="mt-1 text-ink-soft">
          Cancelling puts every item back into stock and refunds the payment.
        </p>
      </div>

      {successMessage && (
        <div role="status" className="p-5 rounded-3xl bg-sage-100 text-sage-700 text-sm">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="p-5 rounded-3xl bg-blush-100 text-blush-700 text-sm">
          {errorMessage}
        </div>
      )}

      {!loaded ? (
        <p className="p-12 text-center text-sm text-ink-soft">Loading your orders…</p>
      ) : !signedIn ? (
        <p className="p-12 text-center text-sm text-ink-soft border border-line rounded-3xl bg-card">
          <Link href="/login" className="text-sky-700 hover:underline">
            Log in
          </Link>{' '}
          to see your orders
        </p>
      ) : orders.length === 0 ? (
        <p className="p-12 text-center text-sm text-ink-soft border border-line rounded-3xl bg-card">
          No orders to cancel.{' '}
          <Link href="/orders" className="text-sky-700 hover:underline">
            Place one.
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order Selector */}
          <div className="p-6 rounded-3xl border border-line bg-card space-y-5">
            <h2 className="font-semibold text-ink">Select an order</h2>
            <div className="space-y-1.5">
              <label htmlFor="order-select" className="text-sm text-ink-soft">
                Order
              </label>
              <select
                id="order-select"
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-paper border border-line text-sm text-ink"
              >
                {orders.map((o) => (
                  <option key={o.orderId} value={o.orderId}>
                    #{o.orderId}, {formatCurrency(o.totalAmount)}, {o.status}
                  </option>
                ))}
              </select>
            </div>

            {currentOrder && (
              <dl className="p-4 rounded-xl bg-paper border border-line text-sm space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Placed</dt>
                  <dd className="text-ink">{formatDate(currentOrder.orderDate)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Status</dt>
                  <dd className="text-ink font-medium">{currentOrder.status}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Payment</dt>
                  <dd className="text-ink">
                    {currentOrder.payment?.method || 'None'} ({currentOrder.payment?.paymentStatus || 'Pending'})
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Total</dt>
                  <dd className="text-ink tabular-nums">{formatCurrency(currentOrder.totalAmount)}</dd>
                </div>
              </dl>
            )}

            <button
              onClick={handleCancelOrder}
              disabled={loading || !selectedOrderId}
              className="w-full px-4 py-3 rounded-full bg-blush-200 text-blush-700 hover:bg-blush-100 font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Cancelling…' : 'Cancel this order'}
            </button>
          </div>

          {/* Items that will be restored */}
          <div className="p-6 rounded-3xl border border-line bg-card space-y-4">
            <h2 className="font-semibold text-ink">Goes back into stock</h2>

            {currentOrder?.orderItems && currentOrder.orderItems.length > 0 ? (
              <div className="space-y-2">
                {currentOrder.orderItems.map((item: any) => (
                  <div
                    key={item.orderItemId}
                    className="p-3 rounded-xl bg-paper border border-line flex items-center justify-between text-sm"
                  >
                    <p className="font-medium text-ink">{item.product?.productName}</p>
                    <span className="px-2.5 py-0.5 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold tabular-nums">
                      +{item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-faint">No items found for this order.</p>
            )}

            <p className="text-sm text-ink-soft">
              The <code>cancel_order</code> procedure restores each item's quantity, marks the
              order cancelled, and updates the payment status.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
