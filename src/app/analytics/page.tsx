'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Users, Calculator, TrendingUp, DollarSign } from 'lucide-react';
import SegmentBadge from '@/components/SegmentBadge';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AnalyticsPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [lifetimeSpend, setLifetimeSpend] = useState<number | null>(null);
  const [spendLoading, setSpendLoading] = useState(false);

  const [segments, setSegments] = useState<any[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [custRes, segRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/segments'),
        ]);

        const custData = await custRes.json();
        const segData = await segRes.json();

        setCustomers(custData);
        setSegments(segData);
        if (custData.length > 0) {
          setSelectedCustomerId(custData[0].customerId);
          fetchSpend(custData[0].customerId);
        }
      } catch (err) {
        console.error('Error loading analytics data:', err);
      } finally {
        setSegmentsLoading(false);
      }
    }
    loadData();
  }, []);

  const fetchSpend = async (customerId: number) => {
    setSpendLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/spend`);
      const data = await res.json();
      setLifetimeSpend(data.totalSpent);
    } catch (err) {
      console.error('Error fetching customer spend:', err);
    } finally {
      setSpendLoading(false);
    }
  };

  const handleCustomerChange = (id: number) => {
    setSelectedCustomerId(id);
    fetchSpend(id);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          Customer Analytics &amp; RFM Segmentation
        </h1>
        <p className="text-sm text-slate-400">
          Evaluates PostgreSQL native stored function <code>get_customer_total_spent</code> and presents unsupervised Machine Learning RFM clusters (K-Means, $k=4$).
        </p>
      </div>

      {/* Top: Customer Lifetime Spend Calculator */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-400" />
            <h2 className="font-semibold text-base text-white">
              Stored Function: <code>get_customer_total_spent(customer_id)</code>
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Calculated inside PostgreSQL</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Select Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerChange(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {customers.map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  #{c.customerId} - {c.customerName} ({c.city})
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium">Lifetime Aggregate Spend</p>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                {spendLoading ? 'Computing...' : formatCurrency(lifetimeSpend)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Customer Segments Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm space-y-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-base text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-400" />
              <span>RFM Customer Segmentation (K-Means ML Output)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Recency (days), Frequency (orders count), and Monetary ($ spend) partitioned into 4 distinct behavioral clusters.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{segments.length} Customer Segments</span>
        </div>

        {segmentsLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading segments...</div>
        ) : segments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No segments found in <code>customer_segments</code>. Run <code>python ml/rfm_segmentation.py</code> or seed the database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3 text-right">Recency (Days)</th>
                  <th className="px-4 py-3 text-right">Frequency</th>
                  <th className="px-4 py-3 text-right">Monetary Spend</th>
                  <th className="px-4 py-3 text-center">Cluster Segment</th>
                  <th className="px-4 py-3 text-right">Last Synchronized</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {segments.map((seg) => (
                  <tr key={seg.customerId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-sans font-medium text-slate-100">
                      {seg.customer?.customerName}{' '}
                      <span className="text-[10px] text-slate-500 font-mono">#{seg.customerId}</span>
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-400">{seg.customer?.city}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{seg.recencyDays} d</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-200">{seg.frequency}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">
                      {formatCurrency(seg.monetaryValue)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <SegmentBadge label={seg.segmentLabel} />
                    </td>
                    <td className="px-4 py-3 text-right font-sans text-slate-500">
                      {formatDate(seg.lastUpdated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cluster Archetype Explanation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 text-xs space-y-1">
          <p className="font-bold text-emerald-400 uppercase">Big Spender</p>
          <p className="text-slate-300">Highest lifetime monetary expenditure across catalog orders.</p>
        </div>
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-950/10 text-xs space-y-1">
          <p className="font-bold text-blue-400 uppercase">Loyal</p>
          <p className="text-slate-300">High repeat order frequency with active recent transactions.</p>
        </div>
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/10 text-xs space-y-1">
          <p className="font-bold text-rose-400 uppercase">At-Risk</p>
          <p className="text-slate-300">Long dormant intervals with high recency day counts.</p>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 text-xs space-y-1">
          <p className="font-bold text-amber-400 uppercase">New</p>
          <p className="text-slate-300">Recent customer acquisitions with initial purchase volume.</p>
        </div>
      </div>
    </div>
  );
}
