import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata = {
  title: "Admin login",
  robots: "noindex, nofollow",
};

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
