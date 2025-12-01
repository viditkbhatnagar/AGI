import { motion, useMotionValue, useSpring } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position
      } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position
      } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position
      } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    color: `rgba(15,23,42,${0.1 + i * 0.03})`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <svg
        className="w-full h-full text-slate-950 dark:text-white"
        viewBox="0 0 696 316"
        fill="none"
        style={{ opacity: 0.3 }}
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.05 + path.id * 0.02}
            initial={{ pathLength: 0.3, opacity: 0.4 }}
            animate={{
              pathLength: 1,
              opacity: [0.2, 0.4, 0.2],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

// Dynamic Grid Background
function DynamicGrid() {
  const gridSize = 50;
  const columns = Math.ceil(window.innerWidth / gridSize);
  const rows = Math.ceil(window.innerHeight / gridSize);

  return (
    <div className="absolute inset-0 z-0 opacity-20">
      <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
        {Array.from({ length: columns * rows }).map((_, i) => (
          <motion.div
            key={i}
            className="border border-[#375BBE]/10 dark:border-white/5"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Floating Elements
function FloatingElements() {
  const elements = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    size: 20 + Math.random() * 40,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: 10 + Math.random() * 20,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {elements.map((el) => (
        <motion.div
          key={el.id}
          className="absolute rounded-full bg-gradient-to-br from-[#375BBE]/20 to-[#FF7F50]/20 blur-xl"
          style={{
            width: `${el.size}px`,
            height: `${el.size}px`,
            left: `${el.x}%`,
            top: `${el.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: el.duration,
            repeat: Number.POSITIVE_INFINITY,
            delay: el.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Corner Decorative Accents
function CornerAccents() {
  return (
    <>
      {/* Top Left */}
      <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none z-10">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-[#375BBE]/30 via-transparent to-transparent" />
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-[#375BBE]/30 via-transparent to-transparent" />
        <motion.div
          className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#FF7F50]/40"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      </div>

      {/* Top Right */}
      <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none z-10">
        <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-l from-[#375BBE]/30 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-[#375BBE]/30 via-transparent to-transparent" />
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF7F50]/40"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            delay: 0.5,
          }}
        />
      </div>

      {/* Bottom Left */}
      <div className="absolute bottom-0 left-0 w-32 h-32 pointer-events-none z-10">
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-[#375BBE]/30 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 w-px h-full bg-gradient-to-t from-[#375BBE]/30 via-transparent to-transparent" />
        <motion.div
          className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#FF7F50]/40"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            delay: 1,
          }}
        />
      </div>

      {/* Bottom Right */}
      <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none z-10">
        <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-[#375BBE]/30 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-px h-full bg-gradient-to-t from-[#375BBE]/30 via-transparent to-transparent" />
        <motion.div
          className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#FF7F50]/40"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            delay: 1.5,
          }}
        />
      </div>
    </>
  );
}

// Mouse Following Gradient
function MouseGradient({ containerRef }: { containerRef: React.RefObject<HTMLDivElement> }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 150, damping: 15 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 15 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => container.removeEventListener("mousemove", handleMouseMove);
    }
  }, [mouseX, mouseY, containerRef]);

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        background: `radial-gradient(600px circle at ${springX}px ${springY}px, rgba(55, 91, 190, 0.15), transparent 40%)`,
      }}
    />
  );
}

// Click Ripple Effect
function useRipple() {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const createRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { id, x, y }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  return { ripples, createRipple };
}

export function BackgroundPaths({
  title = "Professional Certification Platform",
  subtitle,
  description,
  quotes,
  onGetStarted,
}: {
  title?: string;
  subtitle?: string;
  description?: string;
  quotes?: string[];
  onGetStarted?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ripples, createRipple } = useRipple();

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
    } else {
      window.location.href = "/login";
    }
  };

  const defaultQuotes = quotes || [
    "Transform your career with industry-recognized certifications",
    "Access comprehensive courses and interactive modules",
    "Earn digital certificates that validate your expertise",
  ];

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#FEFDF7] dark:bg-neutral-950"
      onMouseDown={createRipple}
    >
      {/* Background Layers */}
      <div className="absolute inset-0 z-0">
        <DynamicGrid />
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
        <FloatingElements />
        <MouseGradient containerRef={containerRef} />
      </div>

      {/* Corner Accents */}
      <CornerAccents />

      {/* Click Ripples */}
      {ripples.map((ripple) => (
        <motion.div
          key={ripple.id}
          className="absolute rounded-full border-2 border-[#375BBE]/40 pointer-events-none z-30"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: "translate(-50%, -50%)",
          }}
          initial={{ width: 0, height: 0, opacity: 0.8 }}
          animate={{ width: 300, height: 300, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}

      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 md:px-6 text-center h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="max-w-4xl mx-auto w-full py-4"
        >
          {/* AGI Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mb-3 sm:mb-4 flex items-center justify-center"
          >
            <img
              src="/agi-logo.png"
              alt="AGI Logo"
              className="h-20 sm:h-24 md:h-28 lg:h-32 xl:h-36 w-auto object-contain"
            />
          </motion.div>

          {/* Title */}
          {title && (
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-[#0C5FB3] dark:text-white/90 px-4"
            >
              {title}
            </motion.h1>
          )}

          {/* Animated Quotes - Word by Word */}
          {defaultQuotes.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="mb-3 sm:mb-4 px-4"
            >
              {defaultQuotes.map((quote, quoteIndex) => (
                <motion.p
                  key={quoteIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0 + quoteIndex * 0.3, duration: 0.6 }}
                  className="text-xs sm:text-sm md:text-base mb-1.5 sm:mb-2 text-[#2E3A59] dark:text-white/80"
                >
                  {quote.split(" ").map((word, wordIndex) => (
                    <motion.span
                      key={wordIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 1.0 + quoteIndex * 0.3 + wordIndex * 0.05,
                        duration: 0.3,
                      }}
                      className="inline-block mr-1.5"
                    >
                      {word}
                    </motion.span>
                  ))}
                </motion.p>
              ))}
            </motion.div>
          )}

          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="text-sm sm:text-base md:text-lg font-semibold mb-2 sm:mb-3 text-[#0C5FB3] dark:text-white/90 px-4"
            >
              {subtitle}
            </motion.p>
          )}

          {description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="text-xs sm:text-sm md:text-base mb-4 sm:mb-6 text-[#2E3A59] dark:text-white/80 max-w-2xl mx-auto leading-relaxed px-4"
            >
              {description}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="inline-block group relative bg-gradient-to-b from-black/10 to-white/10 
            dark:from-white/10 dark:to-black/10 p-px rounded-2xl backdrop-blur-lg 
            overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 mb-3 sm:mb-4"
          >
            <Button
              onClick={handleGetStarted}
              variant="ghost"
              className="rounded-[1.15rem] px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold backdrop-blur-md 
              bg-white/95 hover:bg-white/100 dark:bg-black/95 dark:hover:bg-black/100 
              text-[#375BBE] dark:text-white transition-all duration-300 
              group-hover:-translate-y-0.5 border border-[#375BBE]/10 dark:border-white/10
              hover:shadow-md dark:hover:shadow-neutral-800/50 hover:bg-[#FF7F50] hover:text-white"
            >
              <span className="opacity-90 group-hover:opacity-100 transition-opacity">
                Begin Your Journey
              </span>
              <span
                className="ml-2 sm:ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 
                transition-all duration-300"
              >
                →
              </span>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-[#0C5FB3]/80 dark:text-white/70"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#FF7F50] animate-pulse" />
              <span>Professional Certifications</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#FF7F50] animate-pulse" style={{ animationDelay: '0.5s' }} />
              <span>Interactive Learning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#FF7F50] animate-pulse" style={{ animationDelay: '1s' }} />
              <span>Digital Certificates</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
