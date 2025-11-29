import React from "react";

const Globe: React.FC = () => {
  return (
    <>
      <style>
        {`
          @keyframes logoRotate {
            0% { background-position: 0% center; }
            100% { background-position: 400% center; }
          }
        `}
      </style>
      <div className="flex items-center justify-center h-screen">
        <div
          className="relative w-[250px] h-[250px] rounded-full overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.2),-5px_0_8px_#c3f4ff_inset,15px_2px_25px_#000_inset,-24px_-2px_34px_#c3f4ff99_inset,250px_0_44px_#00000066_inset,150px_0_38px_#000000aa_inset]"
          style={{
            transformStyle: "preserve-3d",
            perspective: "1000px",
          }}
        >
          {/* Main logo wrap - seamless 360 degree coverage */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: "url('/AGI Logo.png')",
              backgroundSize: "400% auto",
              backgroundPosition: "center",
              backgroundRepeat: "repeat-x",
              animation: "logoRotate 20s linear infinite",
              transform: "rotateX(10deg)",
              transformStyle: "preserve-3d",
            }}
          />
          
          {/* Additional layer for seamless wrap - offset by 200% */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: "url('/AGI Logo.png')",
              backgroundSize: "400% auto",
              backgroundPosition: "200% center",
              backgroundRepeat: "repeat-x",
              animation: "logoRotate 20s linear infinite",
              transform: "rotateX(10deg)",
              transformStyle: "preserve-3d",
            }}
          />
          
          {/* Vertical coverage layers for top/bottom */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: "url('/AGI Logo.png')",
              backgroundSize: "auto 400%",
              backgroundPosition: "center",
              backgroundRepeat: "repeat-y",
              transform: "rotateX(10deg) rotateY(90deg)",
              transformStyle: "preserve-3d",
              opacity: 0.6,
            }}
          />
          
          {/* 3D Sphere Lighting Effects */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `
                radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.12) 0%, transparent 50%),
                radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.08) 0%, transparent 50%)
              `,
              mixBlendMode: "soft-light",
            }}
          />
          
          {/* Subtle highlight for 3D depth */}
          <div
            className="absolute top-[15%] left-[25%] w-[30%] h-[30%] rounded-full blur-xl opacity-25 pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)",
            }}
          />
        </div>
      </div>
    </>
  );
};

export default Globe;
