import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <section className="py-4 sm:py-8">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </section>
  );
}
