import { SignUp } from "@clerk/nextjs";
import { AuthFrame } from "@/components/auth-frame";

export default function SignUpPage() {
  return (
    <AuthFrame
      title="Build a calmer relationship with your money."
      description="Create your Chamber workspace and turn everyday transactions into a useful financial story."
    >
      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "w-full shadow-none",
            card: "w-full border-0 bg-transparent p-0 shadow-none",
            headerTitle: "text-2xl font-semibold tracking-[-0.03em]",
            headerSubtitle: "text-sm text-muted-foreground",
            formButtonPrimary: "h-9 rounded-md bg-primary text-sm font-semibold hover:bg-primary/90",
            formFieldInput: "h-9 rounded-md border-border bg-card text-sm",
            footerActionLink: "font-semibold text-primary",
          },
        }}
      />
    </AuthFrame>
  );
}
