'use client';

import { useEffect, useState } from 'react';
import MetricCard from '@/components/MetricCard';
import { Package, Users, ShoppingCart, DollarSign, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [statsRes, prodRes, ordersRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/products'),
          fetch('/api/orders'),
        ]);

        if (!statsRes.ok || !prodRes.ok) {
          const errData = await statsRes.json();
          throw new Error(errData.details || 'Failed to connect to database');
        }

        const statsData = await statsRes.json();
        const prodData = await prodRes.json();
        const ordersData = await ordersRes.json();

        setStats(statsData);
        setProducts(prodData);
        setOrders(ordersData);
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Querying PostgreSQL schema via Prisma ORM...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-200 space-y-4">
        <div className="flex items-center space-x-3 text-rose-400">
          <AlertTriangle className="w-7 h-7" />
          <h2 className="text-xl font-bold">Database Connection Diagnostic</h2>
        </div>
        <p className="text-sm text-slate-300">
          Could not establish connection to the PostgreSQL database. Please ensure PostgreSQL is running.
        </p>
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-rose-300 overflow-x-auto">
          {error}
        </div>
        <div className="pt-2 text-xs text-slate-400 space-y-1">
          <p><strong>Quick Fix with Docker:</strong> <code>docker compose up -d</code></p>
          <p><strong>Database Init:</strong> Click the &quot;Reset &amp; Seed DB&quot; button in the top right navbar once connected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Admin Management Console
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/30">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 3NF Normalization
            </span>
          </h1>
          <p className="text-sm text-slate-400">
            Real-time PostgreSQL engine monitoring, live inventory status, and automated trigger recalculations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition-all"
          >
            <span>Test Place Order</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Products"
          value={stats?.totalProducts ?? 0}
          icon={Package}
          subtitle="Catalog SKU count"
        />
        <MetricCard
          title="Total Customers"
          value={stats?.totalCustomers ?? 0}
          icon={Users}
          subtitle="Registered shoppers"
        />
        <MetricCard
          title="Total Orders"
          value={stats?.totalOrders ?? 0}
          icon={ShoppingCart}
          subtitle="Placed purchases"
        />
        <MetricCard
          title="Gross Revenue"
          value={formatCurrency(stats?.grossRevenue)}
          icon={DollarSign}
          variant="success"
          subtitle="Non-cancelled total"
        />
        <MetricCard
          title="Low Stock Alerts"
          value={stats?.lowStockCount ?? 0}
          icon={AlertTriangle}
          variant={stats?.lowStockCount > 0 ? 'warning' : 'default'}
          subtitle="Threshold: < 25 units"
        />
      </div>

      {/* Low Stock Depletion Alert Box */}
      {stats?.lowStockCount > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200">
          <div className="flex items-center gap-2 font-semibold text-amber-400 text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Inventory Alert: {stats.lowStockCount} Products Running Critically Low</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {stats.lowStockProducts.map((p: any) => (
              <div
                key={p.productId}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs"
              >
                <div>
                  <p className="font-medium text-slate-200">{p.productName}</p>
                  <p className="text-slate-400">{p.category?.categoryName}</p>
                </div>
                <span className="px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300">
                  {p.stockQty} left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Catalog Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-base text-white">Product Inventory Catalog</h2>
            <p className="text-xs text-slate-400">Live products with category references and stock quantities</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {products.length} Products Loaded
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Available Stock</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {products.map((prod) => {
                const isCritical = prod.stockQty < 25;
                const isOutOfStock = prod.stockQty === 0;
                return (
                  <tr key={prod.productId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-400">#{prod.productId}</td>
                    <td className="px-4 py-3 font-sans font-medium text-slate-100">{prod.productName}</td>
                    <td className="px-4 py-3 font-sans text-slate-400">{prod.category?.categoryName}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{formatCurrency(prod.price)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-200">{prod.stockQty}</td>
                    <td className="px-4 py-3 text-center">
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          OUT OF STOCK
                        </span>
                      ) : isCritical ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          LOW STOCK
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          IN STOCK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders Overview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-base text-white">Recent Historical Orders</h2>
            <p className="text-xs text-slate-400">Order lifecycle state and automatic total_amount synchronizations</p>
          </div>
          <Link href="/orders" className="text-xs text-teal-400 hover:underline">
            View Order Testing &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {orders.slice(0, 8).map((ord) => (
                <tr key={ord.orderId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-400">#{ord.orderId}</td>
                  <td className="px-4 py-3 font-sans text-slate-400">{formatDate(ord.orderDate)}</td>
                  <td className="px-4 py-3 font-sans text-slate-200">
                    {ord.customer?.customerName}{' '}
                    <span className="text-[10px] text-slate-500">({ord.customer?.city})</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        ord.status === 'Cancelled'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : ord.status === 'Delivered'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-100">
                    {formatCurrency(ord.totalAmount)}
                  </td>
                  <td className="px-4 py-3 font-sans text-slate-400">
                    {ord.payment?.method || 'N/A'}{' '}
                    <span className="text-[10px] text-slate-500">
                      ({ord.payment?.paymentStatus || 'Pending'})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
