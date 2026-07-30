import { SignIn } from "@clerk/nextjs";
import { AuthFrame } from "@/components/auth-frame";

export default function SignInPage() {
  return (
    <AuthFrame
      title="Welcome back to a clearer money picture."
      description="Your budget, spending, accounts, and next financial decisions are waiting in one calm workspace."
    >
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "w-full shadow-none",
            card: "w-full border-0 bg-transparent p-0 shadow-none",
            headerTitle: "text-2xl font-semibold tracking-[-0.03em]",
            headerSubtitle: "text-sm text-muted-foreground",
            formButtonPrimary: "h-11 rounded-xl bg-primary text-sm font-semibold hover:bg-primary/90",
            formFieldInput: "h-11 rounded-xl border-border bg-card text-sm",
            footerActionLink: "font-semibold text-primary",
          },
        }}
      />
    </AuthFrame>
  );
}
