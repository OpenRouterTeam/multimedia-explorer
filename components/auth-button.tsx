"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { OpenRouterLogo } from "./openrouter-logo";
import { initiateOAuth } from "@/lib/openrouter-auth";

const signInButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "rounded-lg border border-neutral-300 bg-white text-neutral-900 shadow-sm hover:bg-neutral-50 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800",
        minimal:
          "text-neutral-700 underline-offset-4 hover:underline dark:text-neutral-300",
        branded:
          "rounded-lg bg-neutral-900 text-white shadow hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100",
        icon:
          "rounded-lg border border-neutral-300 bg-white text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 aspect-square",
        cta:
          "rounded-xl bg-neutral-900 text-white shadow-lg hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-5 text-sm",
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
  /** onClick handler — defaults to initiating OpenRouter OAuth */
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
    const [internalLoading, setInternalLoading] = React.useState(false);
    const loading = loadingProp ?? internalLoading;

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
      if (onClick) {
        onClick(e);
      } else {
        setInternalLoading(true);
        await initiateOAuth();
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
