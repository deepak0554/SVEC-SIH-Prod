import React from "react";

export default function SvecLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      className={className}
    >
      {/* Outer Gear / Cog Wheel */}
      <g id="gear" fill="#16a34a">
        <circle cx="200" cy="180" r="145" />
        {/* 24 Teeth */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24;
          return (
            <rect
              key={i}
              x="188"
              y="23"
              width="24"
              height="20"
              rx="2"
              transform={`rotate(${angle} 200 180)`}
            />
          );
        })}
      </g>

      {/* Inner Circles */}
      <circle cx="200" cy="180" r="135" fill="#fcfdf2" stroke="#1e3a8a" strokeWidth="6" />
      <circle cx="200" cy="180" r="128" fill="none" stroke="#db2777" strokeWidth="2.5" />

      {/* Big Red V Lines */}
      <path
        d="M 125 105 L 200 295 L 275 105"
        fill="none"
        stroke="#dc2626"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Top Center-Right: Satellite Dish */}
      <g transform="translate(165, 80)" stroke="#1e3a8a" strokeWidth="2" fill="none">
        {/* Dish Stand */}
        <path d="M 25 55 L 45 55 M 35 55 L 35 38" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
        <path d="M 22 38 L 48 38" stroke="#1e293b" strokeWidth="2" />
        {/* Dish Bowl */}
        <path d="M 10 15 C 15 35, 55 35, 60 15" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2.5" />
        {/* Central LNB / Horn receiver */}
        <line x1="35" y1="23" x2="35" y2="2" stroke="#0f172a" strokeWidth="2.5" />
        <circle cx="35" cy="2" r="3.5" fill="#ef4444" stroke="none" />
      </g>

      {/* Bottom Left: Transmission Tower */}
      <g transform="translate(100, 185)">
        {/* Main framing legs */}
        <line x1="15" y1="85" x2="25" y2="5" stroke="#1e293b" strokeWidth="3.5" />
        <line x1="45" y1="85" x2="35" y2="5" stroke="#1e293b" strokeWidth="3.5" />
        {/* Horizontal bars */}
        <line x1="16" y1="65" x2="44" y2="65" stroke="#1e293b" strokeWidth="2" />
        <line x1="19" y1="45" x2="41" y2="45" stroke="#1e293b" strokeWidth="2" />
        <line x1="22" y1="25" x2="38" y2="25" stroke="#1e293b" strokeWidth="2" />
        {/* Cross Braces (diagonals) */}
        <line x1="15" y1="85" x2="41" y2="45" stroke="#1e293b" strokeWidth="1.5" />
        <line x1="45" y1="85" x2="19" y2="45" stroke="#1e293b" strokeWidth="1.5" />
        <line x1="19" y1="45" x2="38" y2="25" stroke="#1e293b" strokeWidth="1.5" />
        <line x1="41" y1="45" x2="22" y2="25" stroke="#1e293b" strokeWidth="1.5" />
        <line x1="22" y1="25" x2="35" y2="5" stroke="#1e293b" strokeWidth="1.5" />
        <line x1="38" y1="25" x2="25" y2="5" stroke="#1e293b" strokeWidth="1.5" />
        {/* Top platform */}
        <line x1="23" y1="5" x2="37" y2="5" stroke="#1e293b" strokeWidth="2.5" />
      </g>

      {/* Bottom Right: Computer Setup */}
      <g transform="translate(230, 195)">
        {/* CRT/LCD Monitor Outer */}
        <rect x="8" y="5" width="58" height="42" rx="4" fill="#2563eb" stroke="#1d4ed8" strokeWidth="3" />
        <rect x="13" y="9" width="48" height="34" rx="1.5" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1" />
        {/* Monitor Screen Lines */}
        <path d="M 18 16 L 34 16 M 18 23 L 44 23 M 18 30 L 38 30" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
        {/* Monitor Stand */}
        <path d="M 32 47 L 42 47 L 46 56 L 28 56 Z" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="2" />
        {/* Keyboard base */}
        <path d="M 3 58 L 71 58 L 62 73 L 12 73 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
        {/* Keyboard keys lines */}
        <line x1="14" y1="63" x2="60" y2="63" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3,2" />
        <line x1="12" y1="68" x2="58" y2="68" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,2" />
      </g>

      {/* Curved Upper Text for Sri Vasavi Engineering College */}
      {/* SVG Path for the curved text on top */}
      <defs>
        <path
          id="textPathUpper"
          d="M 72,180 A 128,128 0 0,1 328,180"
          fill="none"
        />
      </defs>

      <text fill="#dc2626" fontSize="13" fontWeight="bold" fontFamily="system-ui, sans-serif" letterSpacing="1.8">
        <textPath href="#textPathUpper" startOffset="50%" textAnchor="middle">
          SRI VASAVI ENGINEERING COLLEGE
        </textPath>
      </text>

      {/* Blue Stars on Sides */}
      <g fill="#1d4ed8">
        {/* Left Star */}
        <path d="M 85,198 L 87,192 L 93,192 L 88,188 L 90,182 L 85,186 L 80,182 L 82,188 L 77,192 L 83,192 Z" />
        {/* Right Star */}
        <path d="M 315,198 L 317,192 L 323,192 L 318,188 L 320,182 L 315,186 L 310,182 L 312,188 L 307,192 L 313,192 Z" />
      </g>

      {/* Ribbon / Banner at Bottom */}
      <g id="ribbon">
        {/* Ribbon folds left and right */}
        <path d="M 60,312 C 45,315 32,328 32,345 C 32,360 48,362 55,350 L 70,332 Z" fill="#db2777" opacity="0.8" />
        <path d="M 340,312 C 355,315 368,328 368,345 C 368,360 352,362 345,350 L 330,332 Z" fill="#db2777" opacity="0.8" />
        
        {/* Main Ribbon White Plate */}
        <path
          d="M 45,322 Q 200,345 355,322 L 345,290 Q 200,312 55,290 Z"
          fill="#ffffff"
          stroke="#db2777"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* TADEPALLIGUDEM Text inside Ribbon */}
        <text
          x="200"
          y="313"
          fill="#1e3a8a"
          fontSize="17"
          fontWeight="800"
          fontFamily="system-ui, sans-serif"
          textAnchor="middle"
          letterSpacing="1"
        >
          TADEPALLIGUDEM
        </text>
      </g>
    </svg>
  );
}
