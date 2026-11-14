import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckoutFlow } from "@/components/checkout-flow";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Checkout (demo)" };

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-xl">
      <Suspense fallback={<Spinner label="Loading checkout" />}>
        <CheckoutFlow />
      </Suspense>
    </main>
  );
}
