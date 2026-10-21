'use client';

import { useState, useEffect } from 'react';
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

  const selectedCustomer = customers.find((c) => c.customerId === Number(selectedCustomerId));

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-ink">Customer spend</h1>
        <p className="mt-1 text-ink-soft">
          How much a customer has spent in total, not counting cancelled orders.
        </p>
      </div>

      <div className="p-6 rounded-3xl border border-line bg-card space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="customer-select" className="text-sm text-ink-soft">
            Customer
          </label>
          <select
            id="customer-select"
            value={selectedCustomerId}
            onChange={(e) => handleCustomerChange(Number(e.target.value))}
            className="w-full p-2.5 rounded-xl bg-paper border border-line text-sm text-ink"
          >
            {customers.map((c) => (
              <option key={c.customerId} value={c.customerId}>
                {c.city ? `${c.customerName}, ${c.city}` : c.customerName}
              </option>
            ))}
          </select>
        </div>

        <div className="p-6 rounded-2xl bg-peach-100 text-center" aria-live="polite">
          <p className="text-ink-soft">{selectedCustomer?.customerName ?? 'This customer'} has spent</p>
          <p className="mt-1 text-5xl font-bold text-peach-700 tabular-nums">
            {spendLoading ? '…' : formatCurrency(lifetimeSpend)}
          </p>
        </div>

        <p className="text-sm text-ink-soft">
          This total is calculated inside PostgreSQL by <code>get_customer_total_spent</code>.
        </p>
      </div>
    </div>
  );
}
