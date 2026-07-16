// Faint Abu Dhabi-inspired skyline silhouette — buildings sit as LIGHTER
// shapes against the darker khaki sky (as if photographed in afternoon haze).
// Designed to be barely visible — atmospheric, not foreground art.
export function CitySkyline({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1600 360"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="bldgFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9BEA8" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#A89D86" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="bldgNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4C9B2" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#B0A48C" stopOpacity="0.32" />
        </linearGradient>
      </defs>

      {/* Far layer — scattered boxy towers in the middle/left */}
      <g fill="url(#bldgFar)">
        <rect x="40"   y="200" width="48"  height="160" />
        <rect x="85"   y="170" width="60"  height="190" />
        <rect x="145"  y="210" width="44"  height="150" />
        <rect x="185"  y="155" width="58"  height="205" />
        <rect x="240"  y="190" width="46"  height="170" />
        <rect x="285"  y="165" width="55"  height="195" />
        <rect x="340"  y="195" width="60"  height="165" />
        <rect x="400"  y="160" width="55"  height="200" />
        <rect x="455"  y="190" width="50"  height="170" />
        <rect x="505"  y="170" width="65"  height="190" />
        <rect x="570"  y="200" width="45"  height="160" />
        <rect x="615"  y="180" width="55"  height="180" />
        <rect x="670"  y="160" width="50"  height="200" />
        <rect x="720"  y="190" width="60"  height="170" />
        <rect x="780"  y="170" width="55"  height="190" />
        <rect x="835"  y="195" width="45"  height="165" />
        <rect x="880"  y="165" width="60"  height="195" />
        <rect x="940"  y="185" width="55"  height="175" />
        <rect x="995"  y="200" width="48"  height="160" />
        <rect x="1043" y="175" width="65"  height="185" />
      </g>

      {/* Etihad Towers cluster (right) — slightly more visible */}
      <g fill="url(#bldgNear)">
        <path d="M 1130 155 Q 1148 130 1170 125 Q 1192 130 1202 155 L 1202 360 L 1130 360 Z" />
        <path d="M 1200 142 Q 1218 110 1240 105 Q 1262 110 1272 142 L 1272 360 L 1200 360 Z" />
        <path d="M 1270 128 Q 1290 100 1312 95 Q 1334 100 1344 128 L 1344 360 L 1270 360 Z" />
        <path d="M 1342 142 Q 1360 115 1380 110 Q 1400 115 1410 142 L 1410 360 L 1342 360 Z" />
        <path d="M 1408 158 Q 1424 132 1442 128 Q 1460 132 1470 158 L 1470 360 L 1408 360 Z" />

        <rect x="1475" y="180" width="42" height="180" />
        <rect x="1520" y="160" width="58" height="200" />
      </g>
    </svg>
  );
}
