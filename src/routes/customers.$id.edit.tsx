import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@/components/dairy/ui";
import { CustomerForm } from "@/components/dairy/customer-form";

export const Route = createFileRoute("/customers/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Customer — Vishal Dairy" },
      { name: "description", content: "Update customer contact details, daily milk quantity and rate." },
      { property: "og:title", content: "Edit Customer — Vishal Dairy" },
      { property: "og:description", content: "Update customer contact details, daily milk quantity and rate." },
    ],
  }),
  component: EditRoute,
});

function EditRoute() {
  const { id } = Route.useParams();
  return (
    <ClientOnly>
      <CustomerForm customerId={id} />
    </ClientOnly>
  );
}
