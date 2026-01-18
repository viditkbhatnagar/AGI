import React from 'react';
import { cn } from '@/lib/utils';

interface RetroTvErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  errorCode?: string;
  errorMessage?: string;
}

const RetroTvError = React.forwardRef<HTMLDivElement, RetroTvErrorProps>(
  (
    {
      className,
      errorCode = '404',
      errorMessage = 'NOT FOUND',
      ...props
    },
    ref
  ) => {
    // Splits the error code into individual characters
    const errorCodeDigits = errorCode.split('');

    return (
      <div
        ref={ref}
        className={cn(
          'retro-tv-wrapper flex items-center justify-center min-h-[500px]',
          className
        )}
        {...props}
      >
        {/* 404 Text Behind TV */}
        <div className="text_404">
          {errorCodeDigits.map((digit, index) => (
            <div key={index} className="text_404_digit">
              {digit}
            </div>
          ))}
        </div>

        <div className="main">
          {/* Antenna */}
          <div className="antenna">
            <div className="antenna_shadow"></div>
            <div className="a1"></div>
            <div className="a1d"></div>
            <div className="a2"></div>
            <div className="a2d"></div>
            <div className="a_base"></div>
          </div>
          
          {/* TV Body */}
          <div className="tv">
            {/* Screen Section */}
            <div className="display_div">
              <div className="screen_out">
                <div className="screen_out1">
                  <div className="screen">
                    {/* Test Pattern Bars */}
                    <div className="test_bars">
                      <div className="bar bar1"></div>
                      <div className="bar bar2"></div>
                      <div className="bar bar3"></div>
                      <div className="bar bar4"></div>
                      <div className="bar bar5"></div>
                      <div className="bar bar6"></div>
                      <div className="bar bar7"></div>
                    </div>
                    {/* Bottom bars */}
                    <div className="bottom_bars">
                      <div className="bbar bbar1"></div>
                      <div className="bbar bbar2"></div>
                      <div className="bbar bbar3"></div>
                      <div className="bbar bbar4"></div>
                      <div className="bbar bbar5"></div>
                      <div className="bbar bbar6"></div>
                      <div className="bbar bbar7"></div>
                      <div className="bbar bbar8"></div>
                    </div>
                    {/* Error Message Overlay */}
                    <div className="notfound_overlay">
                      <span className="notfound_text">{errorMessage}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Control Panel */}
            <div className="buttons_div">
              <div className="dial dial1">
                <div className="dial_inner"></div>
              </div>
              <div className="dial dial2">
                <div className="dial_inner"></div>
              </div>
              <div className="speakers">
                <div className="speaker_dot"></div>
                <div className="speaker_dot"></div>
                <div className="speaker_dot"></div>
              </div>
            </div>
          </div>
          
          {/* TV Stand */}
          <div className="bottom">
            <div className="base1"></div>
            <div className="base2"></div>
          </div>
        </div>

        <style>{`
          .retro-tv-wrapper {
            position: relative;
            width: 100%;
            padding: 40px 20px;
          }

          .retro-tv-wrapper .text_404 {
            position: absolute;
            display: flex;
            gap: 5px;
            z-index: 0;
          }

          .retro-tv-wrapper .text_404_digit {
            font-size: 180px;
            font-weight: 900;
            color: #d1d5db;
            line-height: 1;
            font-family: 'Arial Black', 'Helvetica Neue', sans-serif;
          }

          .retro-tv-wrapper .main {
            position: relative;
            z-index: 1;
            transform: scale(0.9);
          }

          /* Antenna */
          .retro-tv-wrapper .antenna {
            position: absolute;
            top: -85px;
            left: 50%;
            transform: translateX(-50%);
            width: 120px;
            height: 90px;
          }

          .retro-tv-wrapper .antenna_shadow {
            display: none;
          }

          .retro-tv-wrapper .a1 {
            position: absolute;
            bottom: 0;
            left: 35%;
            width: 4px;
            height: 75px;
            background: linear-gradient(to right, #1a1a1a, #3a3a3a, #1a1a1a);
            transform: rotate(-25deg);
            transform-origin: bottom center;
            border-radius: 2px;
          }

          .retro-tv-wrapper .a1d {
            position: absolute;
            top: 5px;
            left: 22%;
            width: 10px;
            height: 10px;
            background: #1a1a1a;
            border-radius: 50%;
            border: 2px solid #3a3a3a;
          }

          .retro-tv-wrapper .a2 {
            position: absolute;
            bottom: 0;
            right: 35%;
            width: 4px;
            height: 75px;
            background: linear-gradient(to right, #1a1a1a, #3a3a3a, #1a1a1a);
            transform: rotate(25deg);
            transform-origin: bottom center;
            border-radius: 2px;
          }

          .retro-tv-wrapper .a2d {
            position: absolute;
            top: 5px;
            right: 22%;
            width: 10px;
            height: 10px;
            background: #1a1a1a;
            border-radius: 50%;
            border: 2px solid #3a3a3a;
          }

          .retro-tv-wrapper .a_base {
            position: absolute;
            bottom: -5px;
            left: 50%;
            transform: translateX(-50%);
            width: 35px;
            height: 25px;
            background: linear-gradient(180deg, #ff8c00, #cc6600);
            border-radius: 50% 50% 0 0;
          }

          /* TV Body */
          .retro-tv-wrapper .tv {
            position: relative;
            width: 380px;
            height: 240px;
            background: linear-gradient(135deg, #d4813a 0%, #c97830 25%, #b86a25 50%, #a55c1b 75%, #8a4d15 100%);
            border-radius: 20px;
            box-shadow: 
              0 10px 30px rgba(0, 0, 0, 0.4),
              inset 0 2px 0 rgba(255, 200, 150, 0.3),
              inset 0 -5px 15px rgba(0, 0, 0, 0.2);
            border: 4px solid #8a4d15;
          }

          /* Screen Container */
          .retro-tv-wrapper .display_div {
            position: absolute;
            top: 18px;
            left: 18px;
            width: 230px;
            height: 190px;
          }

          .retro-tv-wrapper .screen_out {
            width: 100%;
            height: 100%;
            background: #1a1a1a;
            border-radius: 15px;
            padding: 8px;
            box-shadow: 
              inset 0 0 20px rgba(0, 0, 0, 0.8),
              0 0 0 3px #5a3d20;
          }

          .retro-tv-wrapper .screen_out1 {
            width: 100%;
            height: 100%;
            position: relative;
            overflow: hidden;
            border-radius: 10px;
            background: #000;
          }

          .retro-tv-wrapper .screen {
            width: 100%;
            height: 100%;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          /* Test Pattern Color Bars */
          .retro-tv-wrapper .test_bars {
            display: flex;
            flex: 1;
            width: 100%;
          }

          .retro-tv-wrapper .bar {
            flex: 1;
            height: 100%;
          }

          .retro-tv-wrapper .bar1 { background: #c0c0c0; }
          .retro-tv-wrapper .bar2 { background: #ffff00; }
          .retro-tv-wrapper .bar3 { background: #00ffff; }
          .retro-tv-wrapper .bar4 { background: #00ff00; }
          .retro-tv-wrapper .bar5 { background: #ff00ff; }
          .retro-tv-wrapper .bar6 { background: #ff0000; }
          .retro-tv-wrapper .bar7 { background: #0000ff; }

          /* Bottom Bars */
          .retro-tv-wrapper .bottom_bars {
            display: flex;
            width: 100%;
            height: 35px;
          }

          .retro-tv-wrapper .bbar {
            flex: 1;
          }

          .retro-tv-wrapper .bbar1 { background: #0000aa; }
          .retro-tv-wrapper .bbar2 { background: #000000; }
          .retro-tv-wrapper .bbar3 { background: #aa00aa; }
          .retro-tv-wrapper .bbar4 { background: #000000; }
          .retro-tv-wrapper .bbar5 { background: #00aaaa; }
          .retro-tv-wrapper .bbar6 { background: #000000; }
          .retro-tv-wrapper .bbar7 { background: #c0c0c0; }
          .retro-tv-wrapper .bbar8 { background: #1a1a1a; }

          /* Error Message Overlay */
          .retro-tv-wrapper .notfound_overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #000;
            padding: 4px 12px;
            border: 2px solid #fff;
          }

          .retro-tv-wrapper .notfound_text {
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1px;
            font-family: 'Courier New', monospace;
            text-transform: uppercase;
          }

          /* CRT Scanline Effect */
          .retro-tv-wrapper .screen::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.15) 0px,
              rgba(0, 0, 0, 0.15) 1px,
              transparent 1px,
              transparent 2px
            );
            pointer-events: none;
            z-index: 10;
          }

          /* Control Panel */
          .retro-tv-wrapper .buttons_div {
            position: absolute;
            right: 25px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            width: 80px;
          }

          .retro-tv-wrapper .dial {
            width: 55px;
            height: 55px;
            background: linear-gradient(145deg, #c97830, #8a4d15);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 
              0 4px 8px rgba(0, 0, 0, 0.4),
              inset 0 2px 4px rgba(255, 200, 150, 0.2);
            border: 3px solid #5a3d20;
          }

          .retro-tv-wrapper .dial_inner {
            width: 35px;
            height: 35px;
            background: linear-gradient(145deg, #a55c1b, #6b3d10);
            border-radius: 50%;
            position: relative;
            box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5);
          }

          .retro-tv-wrapper .dial_inner::before {
            content: '';
            position: absolute;
            top: 5px;
            left: 50%;
            transform: translateX(-50%);
            width: 3px;
            height: 12px;
            background: #3a2510;
            border-radius: 2px;
          }

          .retro-tv-wrapper .speakers {
            display: flex;
            gap: 8px;
            margin-top: 10px;
          }

          .retro-tv-wrapper .speaker_dot {
            width: 10px;
            height: 10px;
            background: #3a2510;
            border-radius: 50%;
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
          }

          /* TV Stand/Feet */
          .retro-tv-wrapper .bottom {
            display: flex;
            justify-content: space-between;
            padding: 0 40px;
            margin-top: -2px;
          }

          .retro-tv-wrapper .base1,
          .retro-tv-wrapper .base2 {
            width: 50px;
            height: 15px;
            background: linear-gradient(180deg, #3a3a3a, #1a1a1a);
            border-radius: 0 0 5px 5px;
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
          }

          /* Responsive */
          @media (max-width: 640px) {
            .retro-tv-wrapper .main {
              transform: scale(0.65);
            }
            
            .retro-tv-wrapper .text_404_digit {
              font-size: 100px;
            }
          }

          @media (max-width: 480px) {
            .retro-tv-wrapper .main {
              transform: scale(0.5);
            }
            
            .retro-tv-wrapper .text_404_digit {
              font-size: 70px;
            }
          }
        `}</style>
      </div>
    );
  }
);

RetroTvError.displayName = 'RetroTvError';

export { RetroTvError };
