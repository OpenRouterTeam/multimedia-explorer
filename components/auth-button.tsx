"use client";

import * as React from "react";
import { useContext } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { OpenRouterLogo } from "./openrouter-logo";

// Re-use the auth context to auto-wire signIn — import the context directly
// to avoid a hard requirement on the provider (useOpenRouterAuth throws if missing)
const AuthContext = React.createContext<{
  signIn: (callbackUrl?: string) => Promise<void>;
  isLoading: boolean;
} | null>(null);

// Expose the context so the provider can supply it
export { AuthContext as SignInButtonAuthContext };

const signInButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "rounded-lg border border-border bg-surface text-foreground hover:border-accent/40 hover:shadow-[0_0_10px_rgba(59,130,246,0.15)]",
        minimal:
          "text-muted underline-offset-4 hover:text-accent hover:underline",
        branded:
          "rounded-lg bg-accent text-white shadow-[0_0_10px_rgba(59,130,246,0.2)] hover:bg-accent-hover hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]",
        icon:
          "rounded-lg border border-border bg-surface text-foreground hover:border-accent/40 hover:shadow-[0_0_10px_rgba(59,130,246,0.15)] aspect-square",
        cta:
          "rounded-xl bg-accent text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:bg-accent-hover hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98]",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        default: "h-11 px-5 text-sm",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface SignInButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof signInButtonVariants> {
  /** Button label. Defaults to "Sign in with OpenRouter" */
  label?: string;
  /** Show the OpenRouter logo */
  showLogo?: boolean;
  /** Logo position relative to text */
  logoPosition?: "left" | "right";
  /** Show loading spinner */
  loading?: boolean;
  /** onClick handler — defaults to initiating OpenRouter OAuth when inside OpenRouterAuthProvider */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

const SignInButton = React.forwardRef<HTMLButtonElement, SignInButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      label,
      showLogo = true,
      logoPosition = "left",
      loading: loadingProp,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    // Auto-wire to auth context if available (no throw if missing)
    const authCtx = useContext(AuthContext);
    const loading = loadingProp ?? authCtx?.isLoading ?? false;

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      if (onClick) {
        onClick(e);
      } else if (authCtx) {
        authCtx.signIn();
      }
    };

    const isIconOnly = variant === "icon";
    const buttonLabel = label ?? (isIconOnly ? undefined : "Sign in with OpenRouter");

    const logoSize =
      size === "sm" ? "size-3.5" : size === "xl" ? "size-5" : "size-4";

    const logoEl = showLogo ? (
      <OpenRouterLogo className={logoSize} />
    ) : null;

    const spinnerSize =
      size === "sm" ? "size-3" : size === "xl" ? "size-5" : "size-4";

    return (
      <button
        ref={ref}
        className={cn(signInButtonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        aria-label={isIconOnly ? "Sign in with OpenRouter" : undefined}
        onClick={handleClick}
        {...props}
      >
        {loading ? (
          <Spinner className={spinnerSize} />
        ) : (
          <>
            {logoPosition === "left" && logoEl}
            {buttonLabel && <span>{buttonLabel}</span>}
            {logoPosition === "right" && logoEl}
          </>
        )}
      </button>
    );
  }
);
SignInButton.displayName = "SignInButton";

export { SignInButton, signInButtonVariants };
export default SignInButton;
