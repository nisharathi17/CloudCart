
'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { fetchAuthSession } from 'aws-amplify/auth';

interface CartItem {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  availableStock: number;
}

export default function PlaceOrderPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);


  useEffect(() => {
    async function fetchData() {
      try {
        const prodRes = await fetch('/api/products');
        const prodData = await prodRes.json();

        if (!prodRes.ok) {
          throw new Error(prodData.error || 'Failed to load products');
        }

        const productList = Array.isArray(prodData)
          ? prodData
          : prodData.products;

        if (!Array.isArray(productList)) {
          throw new Error('Unexpected API response from /api/products.');
        }

        setProducts(productList);

        if (productList.length > 0) {
          setSelectedProductId(productList[0].productId);
        }
      } catch (err) {
        console.error('Error loading order form data:', err);
      }
    }

    fetchData();
  }, []);


  const handleAddToCart = () => {
    if (!selectedProductId) return;

    const prod = products.find(
      (p) => p.productId === Number(selectedProductId)
    );

    if (!prod) return;

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === prod.productId
      );

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
          quantity,
          availableStock: prod.stockQty,
        },
      ];
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    setLoading(true);
    setSuccessResult(null);
    setEngineError(null);

    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
        payment_method: 'UPI',
      };

      // Get both Cognito tokens.
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString();
      const idToken = session.tokens?.idToken?.toString();

      if (!accessToken || !idToken) {
        throw new Error('Please sign in again before placing an order.');
      }

      // Send the access token for API authorization and the ID token
      // so the server can verify the user's identity and email claims.
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'x-id-token': idToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setEngineError(data.details || data.error || 'Failed to place order.');
      } else {
        setSuccessResult(data);
        setCart([]);

        // Refresh products to show updated stock.
        const prodRes = await fetch('/api/products');
        const prodData = await prodRes.json();

        if (prodRes.ok) {
          const productList = Array.isArray(prodData)
            ? prodData
            : prodData.products;

          if (Array.isArray(productList)) {
            setProducts(productList);
          }
        }
      }
    } catch (err) {
      setEngineError(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(
    (p) => p.productId === Number(selectedProductId)
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-ink">Place an order</h1>
        <p className="mt-1 text-ink-soft">
          The database checks stock, works out the total, and a confirmation email is sent.
        </p>
      </div>

      {successResult && (
        <div role="status" className="p-5 rounded-3xl bg-sage-100 text-sage-700 space-y-1">
          <p className="font-semibold">Order #{successResult.orderId} placed</p>
          <p className="text-sm">Total: {formatCurrency(successResult.totalAmount)}</p>
          {successResult.emailQueued && (
            <p className="text-sm">A confirmation email is on its way.</p>
          )}
        </div>
      )}

      {engineError && (
        <div role="alert" className="p-5 rounded-3xl bg-blush-100 text-blush-700 space-y-1">
          <p className="font-semibold">The order wasn't placed</p>
          <p className="text-sm">{engineError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-2 p-6 rounded-3xl border border-line bg-card space-y-5">
          <h2 className="font-semibold text-ink">Add products</h2>

          <div className="space-y-1.5">
            <label htmlFor="product-select" className="text-sm text-ink-soft">
              Product
            </label>
            <select
              id="product-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-paper border border-line text-sm text-ink"
            >
              {products.map((product) => (
                <option key={product.productId} value={product.productId}>
                  {product.productName}, {formatCurrency(product.price)}
                </option>
              ))}
            </select>

            {selectedProduct && (
              <p className="text-sm text-ink-faint">
                {selectedProduct.stockQty} in stock
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="quantity-input" className="text-sm text-ink-soft">
              Quantity
            </label>
            <input
              id="quantity-input"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-full p-2.5 rounded-xl bg-paper border border-line text-sm text-ink tabular-nums"
            />
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full px-4 py-2.5 rounded-full bg-sky-200 text-sky-700 hover:bg-sky-100 text-sm font-semibold transition-colors"
          >
            Add to order
          </button>
        </div>

        <div className="md:col-span-3 p-6 rounded-3xl border border-line bg-card space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="font-semibold text-ink">Your order</h2>

            {cart.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink-faint">
                Nothing here yet. Choose a product and add it to your order.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-3 rounded-xl bg-paper border border-line text-sm"
                  >
                    <div>
                      <p className="font-medium text-ink">{item.productName}</p>
                      <p className="text-ink-soft">
                        {item.quantity} × {formatCurrency(item.unitPrice)} ={' '}
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromCart(item.productId)}
                      aria-label={`Remove ${item.productName}`}
                      className="text-ink-faint hover:text-blush-700 transition-colors p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-line space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">Total</span>
              <span className="text-2xl font-bold tabular-nums">
                {formatCurrency(cartTotal)}
              </span>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={loading || cart.length === 0}
              className="w-full px-4 py-3 rounded-full bg-peach-200 text-peach-700 hover:bg-peach-100 font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Placing order…' : 'Place order'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-sky-100 text-sm text-ink-soft space-y-1">
        <p className="font-semibold text-ink">What happens in the database</p>
        <p>
          The <code>place_order</code> procedure creates the order, a trigger checks and deducts
          stock, and another trigger recalculates the total. If stock is short, everything rolls back.
        </p>
      </div>
    </div>
  );
}
