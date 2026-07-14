import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/partner/profile")({
  beforeLoad: () => { throw redirect({ to: "/partner/store" }); },
});
