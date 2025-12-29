"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";

type Props = {
  mode?: "create" | "edit";
  initialSlug?: string;
  redirectTo?: string;
  product?: {
    slug: string;
    name: string;
    description?: string | null;
    image?: string | null;
    price: number;
    shipping: number;
  };
};

export function ProductForm({ mode = "create", initialSlug = "", product, redirectTo }: Props) {
  const isEdit = mode === "edit";
  const router = useRouter();
  const [slug, setSlug] = useState(initialSlug);
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [image, setImage] = useState(product?.image ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [shipping, setShipping] = useState(product ? String(product.shipping) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, ToastContainer } = useToast();

  useEffect(() => {
    if (!product) return;
    setSlug(product.slug);
    setName(product.name);
    setDescription(product.description ?? "");
    setImage(product.image ?? "");
    setPrice(String(product.price));
    setShipping(String(product.shipping));
  }, [product]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const originalSlug = initialSlug || product?.slug || slug;
      const payload = {
        slug,
        name,
        description: description || undefined,
        image: image || undefined,
        price: Number(price || 0),
        shipping: Number(shipping || 0),
      };

      const endpoint = isEdit ? `/api/products/${originalSlug}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save product");
      }

      toast({ title: isEdit ? "Product updated" : "Product created" });
      if (redirectTo) {
        router.push(redirectTo);
      }
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <ToastContainer />
      <CardHeader>
        <CardTitle>{isEdit ? "Edit product" : "Create product"}</CardTitle>
        <CardDescription>Define a product and its price.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid gap-3 rounded-lg bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">Pricing</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="shipping">Shipping (USD)</Label>
                <Input
                  id="shipping"
                  type="number"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={loading} className="rounded-lg px-4">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  <span>Saving...</span>
                </div>
              ) : isEdit ? (
                "Update product"
              ) : (
                "Create product"
              )}
            </Button>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
