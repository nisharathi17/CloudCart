'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, CheckCircle2, AlertOctagon, Info, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CartItem {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  availableStock: number;
}

export default function PlaceOrderPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [custRes, prodRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/products'),
        ]);
        const custData = await custRes.json();
        const prodData = await prodRes.json();

        setCustomers(custData);
        setProducts(prodData);
        if (custData.length > 0) setSelectedCustomerId(custData[0].customerId);
        if (prodData.length > 0) setSelectedProductId(prodData[0].productId);
      } catch (err) {
        console.error('Error loading order form data:', err);
      }
    }
    fetchData();
  }, []);

  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.productId === Number(selectedProductId));
    if (!prod) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === prod.productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === prod.productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: prod.productId,
          productName: prod.productName,
          unitPrice: parseFloat(prod.price),
          quantity: quantity,
          availableStock: prod.stockQty,
        },
      ];
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmitOrder = async () => {
    if (!selectedCustomerId || cart.length === 0) return;
    setLoading(true);
    setSuccessResult(null);
    setEngineError(null);

    try {
      const payload = {
        customer_id: Number(selectedCustomerId),
        items: cart.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
        payment_method: 'UPI',
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setEngineError(data.details || data.error);
      } else {
        setSuccessResult(data);
        setCart([]);
        // Refresh products to show updated stock
        const prodRes = await fetch('/api/products');
        setProducts(await prodRes.json());
      }
    } catch (err: any) {
      setEngineError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p.productId === Number(selectedProductId));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          Place Order &amp; Database Trigger Testbed
        </h1>
        <p className="text-sm text-slate-400">
          Executes native PostgreSQL stored procedure <code>place_order(p_customer_id, p_items JSONB)</code>{' '}
          and fires <code>trg_validate_and_deduct_stock</code> and <code>trg_update_order_total</code>.
        </p>
      </div>

      {/* Trigger Explanation Callout */}
      <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 text-teal-200 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-teal-400 text-sm">
          <Zap className="w-4 h-4" />
          <span>PostgreSQL Engine Business Logic in Action:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li>
            <strong>Trigger 1 (Stock Deduction)</strong>: Fires <code>BEFORE INSERT</code> on <code>order_items</code>. Validates stock in <code>products</code> and deducts it. If requested &gt; available, PostgreSQL immediately aborts the transaction with an exception!
          </li>
          <li>
            <strong>Trigger 2 (Order Total Sync)</strong>: Fires <code>AFTER INSERT</code> on <code>order_items</code>. Dynamically recalculates <code>orders.total_amount</code> from line items inside the database.
          </li>
          <li>
            <strong>Trigger Stress Test Tip</strong>: Set quantity higher than available stock (e.g. 500) to see PostgreSQL abort the transaction.
          </li>
        </ul>
      </div>

      {/* Success Notification */}
      {successResult && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span>Order Placed Successfully! (Order #{successResult.orderId})</span>
          </div>
          <p className="text-xs text-slate-300">
            Calculated Total Amount: <strong>{formatCurrency(successResult.totalAmount)}</strong>
          </p>
          <div className="text-[11px] font-mono text-emerald-300 space-y-0.5">
            {successResult.triggersFired?.map((t: string, i: number) => (
              <p key={i}>&bull; {t}</p>
            ))}
          </div>
        </div>
      )}

      {/* Engine Error Notification */}
      {engineError && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-400">
            <AlertOctagon className="w-5 h-5" />
            <span>PostgreSQL Engine Aborted Transaction:</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-rose-300 overflow-x-auto">
            {engineError}
          </div>
          <p className="text-[11px] text-slate-400">
            The database engine stopped the order before invalid data could be committed, preserving data integrity.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Customer & Product Selector */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-5">
          <h2 className="font-semibold text-base text-white">1. Order Configuration</h2>

          {/* Customer Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Select Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {customers.map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  #{c.customerId} - {c.customerName} ({c.city})
                </option>
              ))}
            </select>
          </div>

          {/* Product Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Select Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  #{p.productId} - {p.productName} ({formatCurrency(p.price)} | Stock: {p.stockQty})
                </option>
              ))}
            </select>
            {selectedProduct && (
              <p className="text-[11px] text-slate-400">
                Available Inventory in DB: <span className="font-bold text-teal-400">{selectedProduct.stockQty} units</span>
              </p>
            )}
          </div>

          {/* Quantity Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Quantity to Order</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item to Order Payload</span>
          </button>
        </div>

        {/* Right: Cart & Atomic Submission */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-semibold text-base text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-400" />
                <span>2. Order Items Payload (JSONB)</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">{cart.length} line items</span>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-1">
                <p>No items added yet.</p>
                <p>Select a product and click &quot;Add Item&quot; on the left.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-200">{item.productName}</p>
                      <p className="text-slate-400">
                        {item.quantity} &times; {formatCurrency(item.unitPrice)} ={' '}
                        <span className="text-emerald-400 font-semibold font-mono">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromCart(item.productId)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Calculated Total:</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {formatCurrency(cartTotal)}
              </span>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={loading || cart.length === 0 || !selectedCustomerId}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-teal-950"
            >
              <Zap className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Executing place_order procedure...' : 'Execute place_order Procedure'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
