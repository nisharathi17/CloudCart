'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { authHeaders } from '@/lib/auth-headers';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const headers = await authHeaders();
        const [statsRes, prodRes, ordersRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/products'),
          fetch('/api/orders', { headers }),
        ]);

        if (!statsRes.ok || !prodRes.ok) {
          const errData = await statsRes.json();
          throw new Error(errData.details || 'Failed to connect to database');
        }

        const statsData = await statsRes.json();
        const prodData = await prodRes.json();

        setStats(statsData);
        setProducts(prodData);
        setSignedIn(ordersRes.status !== 401);

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(Array.isArray(ordersData) ? ordersData : []);
        } else {
          setOrders([]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-8 h-8 border-4 border-peach-300 border-t-transparent rounded-full animate-spin" />
        <p className="text-ink-soft text-sm">Loading inventory…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="p-8 rounded-3xl border border-line bg-blush-100 space-y-4">
        <div className="flex items-center gap-3 text-blush-700">
          <AlertTriangle className="w-6 h-6" />
          <h2 className="text-xl font-bold">Can't reach the database</h2>
        </div>
        <p className="text-sm text-ink-soft">
          Something went wrong while loading the dashboard. Here's the error from the server:
        </p>
        <pre className="p-4 rounded-xl bg-card border border-line text-xs text-ink-soft overflow-x-auto whitespace-pre-wrap">
          {error}
        </pre>
        <p className="text-sm text-ink-soft">
          Running locally? Start the database with <code>docker compose up -d</code>
        </p>
      </div>
    );
  }

  const maxStock = Math.max(1, ...products.map((p) => p.stockQty));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-ink">Inventory</h1>
          <p className="mt-1 text-ink-soft">
            Stock levels update the moment an order is placed or cancelled.
          </p>
        </div>
        <Link
          href="/orders"
          className="shrink-0 px-5 py-2.5 text-sm font-semibold rounded-full bg-peach-200 text-peach-700 hover:bg-peach-100 transition-colors"
        >
          Place an order
        </Link>
      </div>

      {/* Summary card */}
      <div className="rounded-3xl border border-line bg-card p-6">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:border-r lg:border-line lg:pr-6">
            <dt className="text-sm text-ink-soft">Products</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{stats?.totalProducts ?? 0}</dd>
          </div>
          <div className="lg:border-r lg:border-line lg:pr-6">
            <dt className="text-sm text-ink-soft">Customers</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{stats?.totalCustomers ?? 0}</dd>
          </div>
          <div className="lg:border-r lg:border-line lg:pr-6">
            <dt className="text-sm text-ink-soft">Orders</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{stats?.totalOrders ?? 0}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Revenue</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(stats?.grossRevenue)}</dd>
            <p className="text-xs text-ink-faint">excluding cancelled orders</p>
          </div>
        </dl>
      </div>

      {/* Low stock */}
      {stats?.lowStockCount > 0 && (
        <div className="rounded-3xl border border-line bg-butter-100 p-5">
          <h2 className="font-semibold text-ink mb-1">
            {stats.lowStockCount === 1
              ? '1 product is running low'
              : `${stats.lowStockCount} products are running low`}
          </h2>
          <p className="text-sm text-ink-soft mb-3">Anything under 25 units is flagged here.</p>
          <div className="flex flex-wrap gap-2">
            {stats.lowStockProducts.map((p: any) => (
              <div
                key={p.productId}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-line text-sm"
              >
                <span className="text-ink">{p.productName}</span>
                <span className="px-2 py-0.5 rounded-full bg-butter-200 text-butter-700 text-xs font-semibold tabular-nums">
                  {p.stockQty} left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Catalog Table */}
      <div className="rounded-3xl border border-line bg-card overflow-hidden">
        <div className="p-5 border-b border-line">
          <h2 className="font-semibold text-ink">Products</h2>
          <p className="text-sm text-ink-soft">Live stock levels for every item in the catalog.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-sm text-ink-soft font-medium bg-paper/60 border-y border-line">
              <tr>
                <th scope="col" className="px-4 py-3">Product</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3 text-right">Price</th>
                <th scope="col" className="px-4 py-3">Stock</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((prod) => {
                const isCritical = prod.stockQty > 0 && prod.stockQty < 25;
                const isOutOfStock = prod.stockQty === 0;
                const barColor = isOutOfStock
                  ? 'bg-blush-500'
                  : isCritical
                  ? 'bg-butter-500'
                  : 'bg-sage-500';
                const statusText = isOutOfStock
                  ? 'Out of stock'
                  : isCritical
                  ? 'Running low'
                  : 'In stock';
                const statusColor = isOutOfStock
                  ? 'text-blush-700'
                  : isCritical
                  ? 'text-butter-700'
                  : 'text-sage-700';
                return (
                  <tr key={prod.productId}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={`/images/products/${prod.productId}.jpg`}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover bg-paper"
                          onError={(e) => {
                            e.currentTarget.style.visibility = 'hidden';
                          }}
                        />
                        <div>
                          <p className="font-medium text-ink">{prod.productName}</p>
                          <p className="text-xs text-ink-faint">#{prod.productId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{prod.category?.categoryName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(prod.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums w-6">{prod.stockQty}</span>
                        <span className="w-20 h-1.5 rounded-full bg-line overflow-hidden">
                          <span
                            className={`block h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.max(4, (prod.stockQty / maxStock) * 100)}%` }}
                          />
                        </span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-medium ${statusColor}`}>{statusText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders Overview */}
      <div className="rounded-3xl border border-line bg-card overflow-hidden">
        <div className="p-5 border-b border-line flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-ink">Your recent orders</h2>
            <p className="text-sm text-ink-soft">The last 8 orders placed with your account</p>
          </div>
          <Link href="/cancel-order" className="text-sm text-sky-700 hover:underline shrink-0">
            Cancel an order
          </Link>
        </div>

        {!signedIn ? (
          <p className="p-8 text-sm text-ink-soft">
            <Link href="/login" className="text-sky-700 hover:underline">
              Log in
            </Link>{' '}
            to see your orders.
          </p>
        ) : orders.length === 0 ? (
          <p className="p-8 text-sm text-ink-soft">
            You haven't placed any orders yet.{' '}
            <Link href="/orders" className="text-sky-700 hover:underline">
              Place your first order.
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-sm text-ink-soft font-medium bg-paper/60 border-y border-line">
                <tr>
                  <th scope="col" className="px-4 py-3">Order</th>
                  <th scope="col" className="px-4 py-3">Placed</th>
                  <th scope="col" className="px-4 py-3">Items</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Total</th>
                  <th scope="col" className="px-4 py-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.slice(0, 8).map((ord) => {
                  const statusClasses: Record<string, string> = {
                    Cancelled: 'bg-blush-100 text-blush-700',
                    Delivered: 'bg-sage-100 text-sage-700',
                    Shipped: 'bg-sky-100 text-sky-700',
                    Placed: 'bg-peach-100 text-peach-700',
                  };
                  const itemsText = (ord.orderItems || [])
                    .map((it: any) => `${it.quantity} × ${it.product?.productName}`)
                    .join(', ');
                  return (
                    <tr key={ord.orderId}>
                      <td className="px-4 py-3 font-medium text-ink">#{ord.orderId}</td>
                      <td className="px-4 py-3 text-ink-soft">{formatDate(ord.orderDate)}</td>
                      <td className="px-4 py-3 text-ink-soft">{itemsText}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusClasses[ord.status] || 'bg-paper text-ink-soft'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(ord.totalAmount)}</td>
                      <td className="px-4 py-3 text-ink-soft">
                        {ord.payment?.method || 'N/A'}, {ord.payment?.paymentStatus || 'Pending'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
