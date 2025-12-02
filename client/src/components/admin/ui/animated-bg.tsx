import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * AnimatedBg - Saastify-inspired aurora background with orbs and noise overlay
 * Features floating gradient orbs with smooth animations
 */
export function AnimatedBg() {
  const prefersReducedMotion = useReducedMotion();

  const orbs = [
    {
      id: 1,
      gradient: "from-admin-brand/20 via-admin-accent/15 to-transparent",
      size: "w-[600px] h-[600px]",
      position: "top-[-10%] left-[-5%]",
      delay: 0,
      duration: 18,
    },
    {
      id: 2,
      gradient: "from-admin-accent/15 via-admin-success/10 to-transparent",
      size: "w-[500px] h-[500px]",
      position: "top-[40%] right-[-10%]",
      delay: 6,
      duration: 22,
    },
    {
      id: 3,
      gradient: "from-admin-success/12 via-admin-brand/10 to-transparent",
      size: "w-[450px] h-[450px]",
      position: "bottom-[-5%] left-[30%]",
      delay: 12,
      duration: 20,
    },
    {
      id: 4,
      gradient: "from-admin-warn/10 via-admin-accent/8 to-transparent",
      size: "w-[350px] h-[350px]",
      position: "top-[20%] left-[50%]",
      delay: 9,
      duration: 16,
    },
  ];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Base gradient layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800" />
      
      {/* Subtle aurora orbs for depth */}
      {orbs.map((orb) => (
        prefersReducedMotion ? (
          <div
            key={orb.id}
            className={`absolute rounded-full blur-3xl bg-gradient-radial ${orb.gradient} ${orb.size} ${orb.position}`}
            style={{ opacity: 0.15 }}
          />
        ) : (
          <motion.div
            key={orb.id}
            className={`absolute rounded-full blur-3xl bg-gradient-radial ${orb.gradient} ${orb.size} ${orb.position}`}
            animate={{
              x: [0, 30, -20, 0],
              y: [0, -30, 20, 0],
              scale: [1, 1.1, 0.95, 1],
              opacity: [0.1, 0.2, 0.08, 0.1],
            }}
            transition={{
              duration: orb.duration,
              delay: orb.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )
      ))}
    </div>
  );
}

export default AnimatedBg;

