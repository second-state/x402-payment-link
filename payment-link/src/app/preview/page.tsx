import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{
  code?: string;
  scale?: string;
  products?: string;
  requireShipping?: string;
}>;

type Price = {
  amount: number;
  shipping: number;
  currency: string;
  requireShipping?: boolean;
};

type PreviewData = {
  products: {
    name: string;
    description?: string | null;
    image?: string | null;
    price: Price;
  }[];
  total: number;
  shippingTotal: number;
};

export const metadata = {
  title: "Checkout preview",
};

async function getPreviewData(code?: string): Promise<PreviewData | null> {
  if (!code) return null;

  const link = await prisma.link.findFirst({
    where: { code },
    include: {
      linkProducts: {
        include: {
          product: true,
          price: true,
        },
      },
    },
  });
  if (!link || link.linkProducts.length === 0) return null;

  const products = link.linkProducts.map((lp) => {
    const p = lp.product;
    const price = lp.price;
    const amount = price ? Number(price.amount) : 0;
    const shipping = price ? Number(price.shipping) : 0;
    const currency = price?.currency || "USD";
    return {
      name: p.name,
      description: p.description,
      image: p.image,
      price: { amount, shipping, currency, requireShipping: link.requireShipping },
    };
  });

  const total = products.reduce((sum, p) => sum + p.price.amount + p.price.shipping, 0);
  const shippingTotal = products.reduce((sum, p) => sum + p.price.shipping, 0);

  return { products, total, shippingTotal };
}

export default async function PreviewPage({ searchParams }: { searchParams: SearchParams }) {
  const { code, scale, products, requireShipping: requireShippingParam } = await searchParams;

  let providedProducts: PreviewData | null = null;
  if (products) {
    try {
      const padded = products.replace(/-/g, "+").replace(/_/g, "/");
      const json = Buffer.from(padded, "base64").toString("utf-8");
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        const items = parsed.map((p) => ({
          name: p.name ?? "",
          description: p.description ?? null,
          image: p.image ?? null,
          price: {
            amount: Number(p.price ?? 0),
            shipping: Number(p.shipping ?? 0),
            currency: p.currency || "USD",
            requireShipping: p.requireShipping,
          },
        }));
        const total = items.reduce((sum, p) => sum + p.price.amount + p.price.shipping, 0);
        const shippingTotal = items.reduce((sum, p) => sum + p.price.shipping, 0);
        providedProducts = { products: items, total, shippingTotal };
      }
    } catch {
      providedProducts = null;
    }
  }

  const data = providedProducts ?? (await getPreviewData(code));
  const currency = data?.products[0]?.price.currency || "USD";
  const priceTotal = data ? data.products.reduce((sum, p) => sum + p.price.amount, 0) : 0;
  const paramRequireShipping = requireShippingParam ? requireShippingParam === "true" : undefined;
  const requireShipping = paramRequireShipping ?? (data?.products.some((p) => p.price.requireShipping) ?? true);
  const width = 1020;

  return (
    <div
      style={{
        margin: 0,
        background: "#f6f9fc",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        height: "auto",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${width}px`,
          display: "inline-block",
        }}
      >
        <style>{`
            html, body { margin: 0; padding: 0; background: #f6f9fc; }
            * { box-sizing: border-box; }
            .container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.08);
              overflow: hidden;
              display: grid;
              grid-template-columns: 1fr 1fr;
            }
            .header {
              padding: 32px;
              border-right: 1px solid #e6ebf1;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .product-info { display: flex; gap: 16px; margin-bottom: 16px; align-items: flex-start; flex-direction: column; }
            .product-image {
              width: 120px; height: 120px; border-radius: 12px; overflow: hidden;
              border: 1px solid #e6ebf1; background: #f4f6fb;
            }
            .product-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
            .product-title { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 8px; }
            .product-desc { font-size: 14px; color: #6b7280; line-height: 1.5; }
            .price-breakdown { background: #f6f9fc; border: 1px solid #e6ebf1; border-radius: 12px; padding: 16px; }
            .price-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px; color: #111827; }
            .price-row:last-child { margin-bottom: 0; padding-top: 10px; border-top: 1px solid #e6ebf1; font-weight: 700; }
            .form-container { padding: 32px; }
            .section-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 20px; }
            .form-group { margin-bottom: 16px; }
            label { display: block; font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 6px; }
            input { width: 100%; padding: 12px 14px; font-size: 14px; border: 1px solid #d1d5db; border-radius: 8px; background: #f8fafc; }
            .address-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .full { grid-column: 1 / -1; }
            .submit-button {
              width: 100%; padding: 14px; font-size: 15px; font-weight: 700;
              color: white; background: #4f46e5; border: none; border-radius: 10px;
              cursor: not-allowed; opacity: 0.7;
            }
            .secure { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; color: #6b7c93; margin-top: 20px; }
            .lock-icon { width: 14px; height: 14px; }
            @media (max-width: 900px) {
              .container { grid-template-columns: 1fr; }
              .header { border-right: none; border-bottom: 1px solid #e6ebf1; }
              .product-image { width: 100px; height: 100px; }
              .product-title { font-size: 18px; }
              .form-container, .header { padding: 28px; }
              .section-title { font-size: 15px; }
            }
          `}</style>
        {data ? (
          <div className="container">
            <div className="header">
              <div className="product-info">
                {data.products.map((prod) => (
                  <div key={prod.name} style={{ display: "flex", gap: "12px", minWidth: "240px", alignItems: "flex-start" }}>
                    <div className="product-image">
                      {prod.image ? (
                        <img src={prod.image} alt={prod.name} />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#9ca3af",
                            fontSize: "12px",
                          }}
                        >
                          No image
                        </div>
                      )}
                    </div>
                    <div className="product-details">
                      <div className="product-title">{prod.name}</div>
                      <div className="product-desc">{prod.description || "No description provided."}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="price-breakdown">
                <div className="price-row">
                  <div className="price-row-left" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <span>Items</span>
                    <div className="quantity-control" style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "white", border: "1px solid #d1d5db", borderRadius: "999px", padding: "4px 8px" }}>
                      <button type="button" className="quantity-button" style={{ border: "none", background: "transparent", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "500", color: "#4b5563" }} aria-label="Decrease quantity">-</button>
                      <input
                        type="text"
                        id="quantityInput"
                        name="quantity"
                        className="quantity-input"
                        value="1"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        readOnly
                        style={{ width: "48px", border: "none", background: "transparent", textAlign: "center", fontSize: "16px", fontWeight: "500" }}
                      />
                      <button type="button" className="quantity-button" style={{ border: "none", background: "transparent", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "500", color: "#4b5563" }} aria-label="Increase quantity">+</button>
                    </div>
                  </div>
                  <span>{currency} {priceTotal.toFixed(2)}</span>
                </div>
                <div className="price-row">
                  <span>Shipping</span>
                  <span>
                    {currency} {data.shippingTotal.toFixed(2)}
                  </span>
                </div>
                <div className="price-row">
                  <span>Total</span>
                  <span>
                    {currency} {data.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="form-container">
              <div className="section-title">Order Information</div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" placeholder="you@example.com" disabled />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone number</label>
              <input id="phone" placeholder="+1 (555) 123-4567" disabled />
            </div>
            {requireShipping && (
              <>
                <div className="form-group">
                  <label htmlFor="fullName">Full name</label>
                  <input id="fullName" placeholder="John Smith" disabled />
                </div>
                <div className="form-group">
                  <label htmlFor="address1">Address line 1</label>
                  <input id="address1" placeholder="123 Main Street" disabled />
                </div>
                <div className="form-group">
                  <label htmlFor="address2">Address line 2 (optional)</label>
                  <input id="address2" placeholder="Apartment, suite, etc." disabled />
                </div>
                <div className="form-group address-grid">
                  <div>
                    <label htmlFor="city">City</label>
                    <input id="city" placeholder="San Francisco" disabled />
                  </div>
                  <div>
                    <label htmlFor="state">State / Province</label>
                    <input id="state" placeholder="CA" disabled />
                  </div>
                  <div>
                    <label htmlFor="zip">ZIP / Postal code</label>
                    <input id="zip" placeholder="94102" disabled />
                  </div>
                  <div>
                    <label htmlFor="country">Country</label>
                    <input id="country" placeholder="USA" disabled />
                  </div>
                </div>
              </>
            )}
              <div className="form-group">
                <button className="submit-button" type="button" disabled>
                  Pay {currency} {data.total.toFixed(2)}
                </button>
                <div className="secure">
                  <svg className="lock-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
	          Secure checkout powered by x402 labs
	        </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              border: "1px solid #e6ebf1",
              padding: "32px",
              color: "#6b7280",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            Add products and save a link to preview checkout.
          </div>
        )}
      </div>
    </div>
  );
}
