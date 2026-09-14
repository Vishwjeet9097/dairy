import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@/components/dairy/ui";
import { CustomerForm } from "@/components/dairy/customer-form";

export const Route = createFileRoute("/customers/new")({
  head: () => ({
    meta: [
      { title: "Add Customer — Vishal Dairy" },
      { name: "description", content: "Add a new milk delivery customer with daily morning and evening quantity." },
      { property: "og:title", content: "Add Customer — Vishal Dairy" },
      { property: "og:description", content: "Add a new milk delivery customer with daily morning and evening quantity." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <CustomerForm />
    </ClientOnly>
  ),
});
