"use client";

import { useState } from "react";

import { LinkForm, type PreviewProduct } from "@/components/pages/links/link-form";
import { LinkPreview } from "@/components/pages/links/link-preview";

type Props = {
  mode?: "create" | "edit";
  initialLink?: React.ComponentProps<typeof LinkForm>["initialLink"];
};

export function LinkBuilder({ mode = "create", initialLink }: Props) {
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);
  const [requireShipping, setRequireShipping] = useState<boolean>(initialLink?.requireShipping ?? true);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <LinkForm
          mode={mode}
          initialLink={initialLink}
          onPreviewChange={setPreviewProducts}
          onRequireShippingChange={setRequireShipping}
        />
      </div>
      <div className="lg:col-span-2">
        <LinkPreview code={initialLink?.code} products={previewProducts} requireShippingFlag={requireShipping} />
      </div>
    </div>
  );
}
