import { Suspense } from "react"
import { CheckEmailForm } from "@/components/auth/check-email-form"

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense>
        <CheckEmailForm />
      </Suspense>
    </div>
  )
}
