'use client';

import { useState, useEffect } from 'react';
import { XCircle, CheckCircle2, RotateCcw, AlertCircle, Package } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CancelOrderPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      const activeOrders = data.filter((o: any) => o.status !== 'Cancelled');
      setOrders(activeOrders);
      if (activeOrders.length > 0 && selectedOrderId === '') {
        setSelectedOrderId(activeOrders[0].orderId);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async () => {
    if (!selectedOrderId) return;
    if (!confirm(`Are you sure you want to cancel Order #${selectedOrderId}? This will restore stock in products.`)) return;

    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/orders/${selectedOrderId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.details || data.error);
      } else {
        setSuccessMessage(`Order #${selectedOrderId} was successfully cancelled. Inventory stock restored!`);
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
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          Cancel Order &amp; Stock Restoration Testbed
        </h1>
        <p className="text-sm text-slate-400">
          Executes native PostgreSQL stored procedure <code>cancel_order(p_order_id)</code>, restores line item quantities to <code>products.stock_qty</code>, and transitions payments (Completed &rarr; Refunded, Pending &rarr; Failed).
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-200 flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-200 flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="p-12 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900/40">
          <p className="text-base font-medium">No active orders available for cancellation.</p>
          <p className="text-xs text-slate-400 mt-1">All orders are either completed or already cancelled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Order Selector */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-5">
            <h2 className="font-semibold text-base text-white">1. Select Active Order</h2>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Target Order</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              >
                {orders.map((o) => (
                  <option key={o.orderId} value={o.orderId}>
                    Order #{o.orderId} - {o.customer?.customerName} ({formatCurrency(o.totalAmount)}) [{o.status}]
                  </option>
                ))}
              </select>
            </div>

            {currentOrder && (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2 text-slate-300">
                <p>
                  <strong>Customer:</strong> {currentOrder.customer?.customerName} ({currentOrder.customer?.email})
                </p>
                <p>
                  <strong>Date:</strong> {formatDate(currentOrder.orderDate)}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className="font-semibold text-teal-400">{currentOrder.status}</span>
                </p>
                <p>
                  <strong>Payment Method:</strong> {currentOrder.payment?.method || 'None'}{' '}
                  <span className="text-slate-500">({currentOrder.payment?.paymentStatus || 'Pending'})</span>
                </p>
              </div>
            )}

            <button
              onClick={handleCancelOrder}
              disabled={loading || !selectedOrderId}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-rose-950"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Executing cancel_order...' : 'Execute cancel_order Procedure'}</span>
            </button>
          </div>

          {/* Items that will be restored */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <h2 className="font-semibold text-base text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-400" />
              <span>2. Line Items Restored to Inventory</span>
            </h2>

            {currentOrder?.orderItems && currentOrder.orderItems.length > 0 ? (
              <div className="space-y-2">
                {currentOrder.orderItems.map((item: any) => (
                  <div
                    key={item.orderItemId}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-200">{item.product?.productName}</p>
                      <p className="text-slate-500">Unit Price: {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-400 font-mono">
                        +{item.quantity} units restored
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No items detected for this order.</p>
            )}

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Engine Behavior on Cancel:</p>
              <p>&bull; <code>products.stock_qty</code> increases by each item&apos;s quantity.</p>
              <p>&bull; <code>orders.status</code> transitions to <code>&apos;Cancelled&apos;</code>.</p>
              <p>&bull; <code>payments.payment_status</code> transitions to <code>&apos;Refunded&apos;</code>.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
