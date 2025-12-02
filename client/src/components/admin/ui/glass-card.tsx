import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ReactNode, forwardRef } from "react";

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "interactive";
  glow?: boolean;
  glowColor?: "brand" | "accent" | "success";
  animationDelay?: number;
  noPadding?: boolean;
}

/**
 * GlassCard - Glassmorphism card component inspired by saastify.ai
 * Features soft borders, inner/outer glow shadows, and hover effects
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      className,
      variant = "default",
      glow = false,
      glowColor = "brand",
      animationDelay = 0,
      noPadding = false,
      ...props
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();

    const glowStyles = {
      brand: "shadow-glow hover:shadow-glow-xl",
      accent: "shadow-glow-accent",
      success: "shadow-glow-success",
    };

    const variantStyles = {
      default: "bg-white/95 backdrop-blur-xl border-white/20 shadow-lg",
      elevated: "bg-white/98 backdrop-blur-xl border-white/30 shadow-xl",
      interactive:
        "bg-white/95 backdrop-blur-xl border-white/20 shadow-lg cursor-pointer hover:shadow-xl hover:border-[#375BBE]/40 hover:bg-white",
    };

    const cardVariants = {
      initial: prefersReducedMotion
        ? { opacity: 1, y: 0 }
        : { opacity: 0, y: 20 },
      animate: {
        opacity: 1,
        y: 0,
        transition: {
          duration: prefersReducedMotion ? 0.01 : 0.45,
          delay: animationDelay,
          ease: [0.22, 1, 0.36, 1],
        },
      },
    };

    const hoverVariants = prefersReducedMotion
      ? {}
      : {
          y: -2,
          transition: {
            duration: 0.25,
            ease: [0.22, 1, 0.36, 1],
          },
        };

    const tapVariants = prefersReducedMotion
      ? {}
      : {
          scale: 0.98,
          transition: {
            duration: 0.15,
            ease: [0.22, 1, 0.36, 1],
          },
        };

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover={variant === "interactive" ? hoverVariants : undefined}
        whileTap={variant === "interactive" ? tapVariants : undefined}
        className={cn(
          "relative rounded-2xl border transition-all duration-250",
          variantStyles[variant],
          glow && glowStyles[glowColor],
          !noPadding && "p-6",
          className
        )}
        {...props}
      >
        {/* Subtle top highlight */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/80 via-transparent to-transparent pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export default GlassCard;

