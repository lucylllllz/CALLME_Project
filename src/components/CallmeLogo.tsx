export function CallmeLogo({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Circle with Gradient */}
      <circle cx="50" cy="50" r="45" fill="url(#bgGradient)" />
      
      {/* Chat Bubbles - representing conversation */}
      <g>
        {/* First bubble - user */}
        <path
          d="M28 32C28 28.6863 30.6863 26 34 26H52C55.3137 26 58 28.6863 58 32V42C58 45.3137 55.3137 48 52 48H38L32 52V48C29.7909 48 28 46.2091 28 44V32Z"
          fill="white"
          opacity="0.95"
        />
        
        {/* Second bubble - AI/Coach overlapping */}
        <path
          d="M42 50C42 46.6863 44.6863 44 48 44H66C69.3137 44 72 46.6863 72 50V60C72 63.3137 69.3137 66 66 66H52L46 70V66C43.7909 66 42 64.2091 42 62V50Z"
          fill="url(#bubbleGradient)"
        />
        
        {/* Microphone icon inside second bubble */}
        <circle cx="57" cy="55" r="4" fill="white" opacity="0.9" />
        <rect x="55.5" y="52" width="3" height="6" rx="1.5" fill="white" opacity="0.9" />
        <path d="M54 58C54 59.6569 55.3431 61 57 61C58.6569 61 60 59.6569 60 58" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
        <line x1="57" y1="61" x2="57" y2="63" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      </g>
      
      {/* Letter "C" for CALLME */}
      <text
        x="43"
        y="41"
        fontSize="10"
        fontWeight="600"
        fill="url(#textGradient)"
        textAnchor="middle"
      >
        C
      </text>
      
      {/* Small sparkle/star - AI enhancement indicator */}
      <g transform="translate(65, 30)">
        <path d="M0,-4 L1,0 L0,4 L-1,0 Z" fill="#FFD700" opacity="0.8" />
        <path d="M-4,0 L0,1 L4,0 L0,-1 Z" fill="#FFD700" opacity="0.8" />
      </g>
      
      <defs>
        <linearGradient id="bgGradient" x1="5" y1="5" x2="95" y2="95" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="0.5" stopColor="#059669" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="bubbleGradient" x1="42" y1="44" x2="72" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="textGradient" x1="38" y1="36" x2="48" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#047857" />
          <stop offset="1" stopColor="#065f46" />
        </linearGradient>
      </defs>
    </svg>
  );
}
