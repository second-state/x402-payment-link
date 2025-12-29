"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";

const networkOptions = [
  { value: "base-sepolia", label: "Base Sepolia (test)" },
  { value: "base", label: "Base" },
  { value: "base-mainnet", label: "Base Mainnet" },
];

type Props = {
  onCreated?: () => void;
  onPreviewChange?: (products: PreviewProduct[]) => void;
  onRequireShippingChange?: (val: boolean) => void;
  mode?: "create" | "edit";
  initialLink?: {
    code?: string;
    productSlugs: string[];
    network: string;
    payToAddress: string;
    successUrl?: string | null;
    cancelUrl?: string | null;
    requireShipping?: boolean | null;
  };
};

export type PreviewProduct = {
  slug: string;
  name: string;
  description?: string | null;
  image?: string | null;
  price: number;
  shipping: number;
  currency: string;
  requireShipping: boolean;
};

export function LinkForm({
  onCreated,
  onPreviewChange,
  onRequireShippingChange,
  mode = "create",
  initialLink,
}: Props) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [productSlugs, setProductSlugs] = useState<string[]>(initialLink?.productSlugs ?? []);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productOptions, setProductOptions] = useState<
    { slug: string; name: string; description?: string | null; image?: string | null; prices?: { amount: string; shipping: string; currency: string }[] }[]
  >([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [network, setNetwork] = useState(initialLink?.network ?? "base-sepolia");
  const [payToAddress, setPayToAddress] = useState(initialLink?.payToAddress ?? "");
  const [successUrl, setSuccessUrl] = useState(initialLink?.successUrl ?? "");
  const [cancelUrl, setCancelUrl] = useState(initialLink?.cancelUrl ?? "");
  const [requireShipping, setRequireShipping] = useState<boolean>(initialLink?.requireShipping ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const { toast, ToastContainer } = useToast();

  function computePreviewProducts(selected: string[]) {
    if (!onPreviewChange) return;
    const products: PreviewProduct[] = selected
      .map((slug) => productOptions.find((p) => p.slug === slug))
      .filter(Boolean)
      .map((p) => {
        const price = (p?.prices || [])[0];
        return {
          slug: p!.slug,
          name: p!.name,
          description: p!.description,
          image: p!.image,
          price: price ? Number(price.amount) : 0,
          shipping: price ? Number(price.shipping) : 0,
          currency: price?.currency || "USD",
          requireShipping,
        };
      });

    onPreviewChange(products);
  }

  useEffect(() => {
    async function loadProducts() {
      setProductsLoading(true);
      try {
        const res = await fetch("/api/products?includePrices=true", { cache: "no-cache" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          products?: {
            slug: string;
            name: string;
            description?: string | null;
            image?: string | null;
            prices?: { amount: string; shipping: string; currency: string }[];
          }[];
        };
        const opts = (data.products ?? []).map((p) => ({
          slug: p.slug,
          name: p.name,
          description: p.description,
          image: p.image,
          prices: p.prices,
        }));
        setProductOptions(opts);
      } catch {
        // ignore
      } finally {
        setProductsLoading(false);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    if (onRequireShippingChange) onRequireShippingChange(requireShipping);
  }, [requireShipping, onRequireShippingChange]);

  useEffect(() => {
    computePreviewProducts(productSlugs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSlugs, productOptions, requireShipping]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    setCreatedCode(null);
    try {
      const payload: Record<string, unknown> =
        mode === "edit"
          ? {
              network,
              payToAddress,
              successUrl: successUrl || undefined,
              cancelUrl: cancelUrl || undefined,
              requireShipping,
            }
          : {
              productSlugs,
              network,
              payToAddress,
              successUrl: successUrl || undefined,
              cancelUrl: cancelUrl || undefined,
              requireShipping,
            };

      const endpoint = mode === "edit" && initialLink?.code ? `/api/links/${initialLink.code}` : "/api/links";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create link");
      }
      const data = await res.json();
      const code = data.link?.code ?? null;
      setCreatedCode(code);
      toast({
        title: mode === "edit" ? "Link updated" : "Link created",
        description: code ? `Code: ${code}` : mode === "edit" ? "Updated link" : "Link created",
      });
      if (onCreated) onCreated();
      router.push("/links");
    } catch (err) {
      setError((err as Error).message);
      toast({
        title: mode === "edit" ? "Error updating link" : "Error creating link",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <ToastContainer />
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">{isEdit ? "Edit payment link" : "Create payment link"}</CardTitle>
        <CardDescription>
          {isEdit ? "Update link routing and overrides." : "Generate a short code tied to products and network."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-800">What you’re selling</h4>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="productSlug">Products</Label>
                <div className="space-y-2">
                  {productsLoading ? (
                    <Select id="productSlug" value={productSlugs[0] ?? ""} disabled>
                      <option>Loading products...</option>
                    </Select>
                  ) : productOptions.length ? (
                    <>
                      {!isEdit && (
                        <div className="space-y-2" ref={pickerRef}>
                          <div className="text-xs uppercase text-slate-500">Add product</div>
                          <div className="relative">
                            <Input
                              ref={searchInputRef}
                              value={productSearch}
                              onFocus={() => setPickerOpen(true)}
                              onClick={() => setPickerOpen(true)}
                              onChange={(e) => {
                                setPickerOpen(true);
                                setProductSearch(e.target.value);
                              }}
                              placeholder="Search products..."
                              className="h-11 rounded-lg"
                            />
                            {pickerOpen && (
                              <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                                <div className="max-h-60 overflow-auto py-1">
                                  {productOptions
                                    .filter((p) => !productSlugs.includes(p.slug))
                                    .filter((p) =>
                                      `${p.name} ${p.slug}`.toLowerCase().includes(productSearch.toLowerCase()),
                                    ).map((p) => (
                                      <button
                                        key={p.slug}
                                        type="button"
                                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          if (!productSlugs.includes(p.slug)) {
                                            setProductSlugs([...productSlugs, p.slug]);
                                          }
                                          setProductSearch("");
                                          setPickerOpen(false);
                                          searchInputRef.current?.focus();
                                        }}
                                      >
                                        <div>
                                          <div className="font-semibold text-slate-900">{p.name}</div>
                                          <div className="text-xs text-slate-500">{p.slug}</div>
                                        </div>
                                        <span className="text-xs text-blue-600">Add</span>
                                      </button>
                                    ))}
                                  {productOptions.filter((p) => !productSlugs.includes(p.slug)).length === 0 && (
                                    <div className="px-3 py-2 text-xs text-slate-500">All products selected</div>
                                  )}
                                  {productOptions
                                    .filter((p) => !productSlugs.includes(p.slug))
                                    .filter((p) =>
                                      `${p.name} ${p.slug}`.toLowerCase().includes(productSearch.toLowerCase()),
                                    ).length === 0 &&
                                    productOptions.filter((p) => !productSlugs.includes(p.slug)).length > 0 && (
                                      <div className="px-3 py-2 text-xs text-slate-500">No matches</div>
                                    )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        {productSlugs.map((slug) => {
                          const p = productOptions.find((opt) => opt.slug === slug);
                          if (!p) return null;
                          const price = (p.prices || [])[0];
                          return (
                            <div
                              key={slug}
                              className="relative flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                            >
                              {!isEdit && (
                                <button
                                  type="button"
                                  className="absolute right-2 top-2 rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                  aria-label={`Remove ${p.name}`}
                                  onClick={() => setProductSlugs((prev) => prev.filter((s) => s !== slug))}
                                >
                                  ✕
                                </button>
                              )}
                              <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                                {p.image ? (
                                  <Image src={p.image} alt={p.name} width={48} height={48} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                                    No image
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                                <div className="text-xs text-slate-500">{p.slug}</div>
                                {price && (
                                  <div className="text-xs text-slate-600">
                                    {price.currency} {price.amount} · Ship {price.currency} {price.shipping}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <Select id="productSlug" value="" disabled>
                        <option>No products found</option>
                      </Select>
                      <p className="text-xs text-slate-500">Add a product before creating a link.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payTo">Pay to address</Label>
                <Input
                  id="payTo"
                  placeholder="0x..."
                  value={payToAddress}
                  onChange={(e) => setPayToAddress(e.target.value)}
                  className="h-11 rounded-lg"
                />
              </div>
            <div className="space-y-1.5">
              <Label htmlFor="network">Network</Label>
              <Select id="network" value={network} onChange={(e) => setNetwork(e.target.value)}>
                {networkOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="requireShipping"
                type="checkbox"
                checked={requireShipping}
                onChange={(e) => setRequireShipping(e.target.checked)}
              />
              <Label htmlFor="requireShipping" className="text-sm font-medium text-slate-700">
                Collect shipping details
              </Label>
            </div>
          </div>
        </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-800">Checkout behavior</h4>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="successUrl">Success URL</Label>
                <Input
                  id="successUrl"
                  placeholder="https://yourapp.com/success"
                  value={successUrl}
                  onChange={(e) => setSuccessUrl(e.target.value)}
                  className="h-11 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cancelUrl">Cancel URL</Label>
                <Input
                  id="cancelUrl"
                  placeholder="https://yourapp.com/cancel"
                  value={cancelUrl}
                  onChange={(e) => setCancelUrl(e.target.value)}
                  className="h-11 rounded-lg"
                />
              </div>
            </div>
          </div>

        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleCreate}
            disabled={loading || (!isEdit && !productSlugs.length) || !payToAddress}
            className="rounded-lg px-4"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Spinner />
                <span>{isEdit ? "Saving..." : "Creating..."}</span>
              </div>
            ) : (
              (isEdit ? "Save changes" : "Create link")
            )}
          </Button>
          {createdCode && (
            <div className="text-sm text-slate-700">
              Created code: <span className="font-mono text-xs">{createdCode}</span>
            </div>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
