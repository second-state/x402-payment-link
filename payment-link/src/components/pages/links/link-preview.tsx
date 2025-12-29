"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Monitor, Smartphone } from "lucide-react";

type PreviewProduct = {
  slug: string;
  name: string;
  description?: string | null;
  image?: string | null;
  price: number;
  shipping: number;
  currency?: string;
  requireShipping?: boolean;
};

type Props = {
  code?: string;
  products?: PreviewProduct[];
  requireShippingFlag?: boolean;
};

export function LinkPreview({ code, products, requireShippingFlag }: Props) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");

  function encodeProducts(items: PreviewProduct[]): string | null {
    try {
      const json = JSON.stringify(items);
      if (typeof window === "undefined") return null;
      const base = window.btoa(unescape(encodeURIComponent(json)));
      return base.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch {
      return null;
    }
  }

  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams();
    const hasProducts = Boolean(products && products.length);
    if (!hasProducts && code) {
      params.set("code", code);
    }
    if (hasProducts) {
      const encoded = encodeProducts(products);
      if (encoded) params.set("products", encoded);
      const requireShipping = products.some((p) => p.requireShipping !== false);
      params.set("requireShipping", requireShipping ? "true" : "false");
    } else if (typeof requireShippingFlag === "boolean") {
      params.set("requireShipping", requireShippingFlag ? "true" : "false");
    }
    params.set("scale", "0.6");
    return `/preview?${params.toString()}`;
  }, [code, products, requireShippingFlag]);

  const frameSize = viewport === "mobile" ? { width: 270, height: 760 } : { width: 668, height: 530 };
  const iframeSize = viewport === "mobile" ? { width: 386, height: 1090 } : { width: 1024, height: 860 };
  const scale = viewport === "mobile" ? 0.7 : 0.65;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">Checkout preview</div>
        <div className="inline-flex overflow-hidden rounded-full border border-slate-200 shadow-sm">
          <Button
            size="xs"
            variant={viewport === "desktop" ? "default" : "ghost"}
            onClick={() => setViewport("desktop")}
            className="rounded-none px-3 py-2"
            aria-label="Desktop preview"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="xs"
            variant={viewport === "mobile" ? "default" : "ghost"}
            onClick={() => setViewport("mobile")}
            className="rounded-none px-3 py-2 border-l border-slate-200"
            aria-label="Mobile preview"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex w-full justify-center">
        <div
          className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
          style={{ width: frameSize.width, height: frameSize.height, transition: "250ms ease-in-out" }}
        >
          <iframe
            title="Checkout preview"
            src={iframeSrc}
            className="h-full w-full border-0"
            style={{
              width: iframeSize.width,
              height: iframeSize.height,
              transform: `scale(${scale})`,
              transformOrigin: "left top",
            }}
          />
        </div>
      </div>
    </div>
  );
}
