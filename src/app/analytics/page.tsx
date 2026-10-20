'use client';

import { useState, useEffect } from 'react';
import { Calculator, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AnalyticsPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [lifetimeSpend, setLifetimeSpend] = useState<number | null>(null);
  const [spendLoading, setSpendLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const custRes = await fetch('/api/customers');
        const custData = await custRes.json();

        setCustomers(custData);
        if (custData.length > 0) {
          setSelectedCustomerId(custData[0].customerId);
          fetchSpend(custData[0].customerId);
        }
      } catch (err) {
        console.error('Error loading analytics data:', err);
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
          Customer Analytics
        </h1>
        <p className="text-sm text-slate-400">
          Evaluates PostgreSQL native stored function <code>get_customer_total_spent</code>.
        </p>
      </div>

      {/* Customer Lifetime Spend Calculator */}
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
    </div>
  );
}
