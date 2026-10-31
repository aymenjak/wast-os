import type { ReactNode } from "react";

/**
 * NEXVO "Kerbside line" illustrations — see .claude/skills/nexvo-illustration/SKILL.md.
 * Inline SVG, decorative (aria-hidden), tokens only, subtle motion that stops under reduced motion.
 */
const INK = "#1d2a2e", CONCRETE = "#edefed", CONCRETE_2 = "#d7dcda", GREEN = "#1f5a44", GREEN_SOFT = "#cfe3da", HIVIS = "#e8590c", SKY = "#dbe7f6";

const line = { stroke: INK, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
const thin = { ...line, strokeWidth: 2 };

function Frame({ children, w = 240, h = 160, className = "" }: { children: ReactNode; w?: number; h?: number; className?: string }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false" className={className}>
      <ellipse cx={w / 2} cy={h - 18} rx={w * 0.38} ry="6" fill={CONCRETE_2} opacity="0.7" />
      {children}
    </svg>
  );
}

/** Route line that draws itself (motion-safe only). */
function Route({ d }: { d: string }) {
  return <path d={d} fill="none" stroke={HIVIS} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 7" className="motion-safe:animate-[nexvo-route_2.4s_linear_infinite]" />;
}

function Truck({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    // Position on the outer group; animate the inner one (a CSS transform would replace the SVG translate).
    <g transform={`translate(${x} ${y})${flip ? " scale(-1 1)" : ""}`}><g className="motion-safe:animate-[nexvo-bob_3s_ease-in-out_infinite]">
      <path d="M0 0 H44 V30 H0 Z" {...line} fill={GREEN} />
      <path d="M44 10 H58 L68 20 V30 H44 Z" {...line} fill={CONCRETE} />
      <path d="M50 14 H57 L62 20 H50 Z" {...thin} fill={SKY} />
      <path d="M6 8 H38" {...thin} stroke={GREEN_SOFT} />
      <circle cx="14" cy="32" r="6" fill={INK} /><circle cx="56" cy="32" r="6" fill={INK} />
      <circle cx="14" cy="32" r="2" fill={CONCRETE} /><circle cx="56" cy="32" r="2" fill={CONCRETE} />
    </g></g>
  );
}

function Bin({ x, y, fill = 0.4, sensor = false }: { x: number; y: number; fill?: number; sensor?: boolean }) {
  const H = 46;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-4" y="-8" width="44" height="8" rx="3" {...line} fill={GREEN} />
      <path d="M0 0 H36 L32 50 H4 Z" {...line} fill={CONCRETE} />
      <path d={`M${2 + (1 - fill) * 1} ${50 - H * fill} H${34 - (1 - fill) * 1} L32 50 H4 Z`} fill={GREEN_SOFT} />
      <path d="M0 0 H36 L32 50 H4 Z" {...line} />
      {sensor ? (
        <g>
          <rect x="10" y="-15" width="16" height="7" rx="2" fill={INK} />
          <circle cx="23" cy="-11.5" r="1.6" fill={HIVIS} className="motion-safe:animate-pulse" />
          <path d="M8 -20 Q18 -27 28 -20" fill="none" stroke={HIVIS} strokeWidth="2" strokeLinecap="round" className="motion-safe:animate-pulse" />
          <path d="M3 -24 Q18 -34 33 -24" fill="none" stroke={HIVIS} strokeWidth="2" strokeLinecap="round" opacity="0.6" className="motion-safe:animate-pulse" />
        </g>
      ) : null}
    </g>
  );
}

function Ground() {
  return <path d="M16 138 H224" {...line} />;
}

export const illustrations = {
  workOrders: () => (
    <Frame>
      <Ground />
      <Route d="M24 128 H160" />
      <Truck x={52} y={98} />
      <Bin x={170} y={88} fill={0.75} />
    </Frame>
  ),
  customers: () => (
    <Frame>
      <Ground />
      <path d="M60 138 V70 H130 V138" {...line} fill={CONCRETE} />
      <path d="M52 70 H138 L126 56 H64 Z" {...line} fill={GREEN} />
      {[80, 104].map((x) => [84, 108].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="14" height="12" {...thin} fill={SKY} />))}
      <path d="M88 138 V124 H102 V138" {...thin} />
      <path d="M150 138 V96 H186 V138" {...line} fill={CONCRETE_2} />
      <g className="motion-safe:animate-[nexvo-bob_3s_ease-in-out_infinite]">
        <path d="M168 44 C156 44 150 53 150 61 C150 74 168 88 168 88 C168 88 186 74 186 61 C186 53 180 44 168 44 Z" fill={HIVIS} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <circle cx="168" cy="61" r="6" fill="white" />
      </g>
    </Frame>
  ),
  invoices: () => (
    <Frame>
      <Ground />
      <path d="M84 128 V40 H150 V128 L141 122 L132 128 L123 122 L114 128 L105 122 L96 128 L90 123 Z" {...line} fill="white" transform="rotate(-6 117 84)" />
      <path d="M92 132 V44 H158 V132 L149 126 L140 132 L131 126 L122 132 L113 126 L104 132 L98 127 Z" {...line} fill={CONCRETE} />
      {[60, 72, 84].map((y, i) => <path key={y} d={`M104 ${y} H${i === 2 ? 128 : 146}`} {...thin} />)}
      <path d="M104 104 H146" stroke={GREEN} strokeWidth="3" strokeLinecap="round" />
      <circle cx="166" cy="104" r="16" fill={GREEN} stroke={INK} strokeWidth="3" />
      <path d="M158 104 L164 110 L175 98" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  ),
  devices: () => (
    <Frame>
      <Ground />
      <Route d="M28 128 H96" />
      <Bin x={102} y={84} fill={0.82} sensor />
      {/* alert threshold at 80 % of the bin body (y 84 → 134) */}
      <path d="M104 97 H136" stroke="#d03b3b" strokeWidth="2" strokeDasharray="4 3" />
      <rect x="160" y="70" width="40" height="58" rx="6" {...line} fill="white" />
      <path d="M168 84 H192 M168 94 H186" {...thin} />
      <rect x="168" y="104" width="24" height="12" rx="3" fill={GREEN_SOFT} stroke={GREEN} strokeWidth="2" />
    </Frame>
  ),
  support: () => (
    <Frame>
      <Ground />
      <g className="motion-safe:animate-[nexvo-bob_3s_ease-in-out_infinite]">
        <circle cx="120" cy="80" r="40" {...line} fill="white" />
        <circle cx="120" cy="80" r="18" {...line} fill={CONCRETE} />
        {[0, 90, 180, 270].map((a) => <path key={a} d="M120 40 A40 40 0 0 1 148.3 51.7 L132.7 67.3 A18 18 0 0 0 120 62 Z" fill={HIVIS} stroke={INK} strokeWidth="3" strokeLinejoin="round" transform={`rotate(${a} 120 80)`} />)}
      </g>
      <path d="M174 52 H206 V74 H190 L182 82 V74 H174 Z" {...line} fill={GREEN_SOFT} />
    </Frame>
  ),
  search: () => (
    <Frame>
      <Ground />
      <Route d="M24 128 H216" />
      <g className="motion-safe:animate-[nexvo-bob_3s_ease-in-out_infinite]">
        <circle cx="112" cy="70" r="28" {...line} fill={SKY} />
        <path d="M132 90 L156 114" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <path d="M100 62 Q108 54 118 56" {...thin} stroke="white" />
      </g>
    </Frame>
  ),
  notFound: () => (
    <Frame>
      <Ground />
      <path d="M20 128 H150" stroke={CONCRETE_2} strokeWidth="14" strokeLinecap="round" />
      <Route d="M24 128 H140" />
      <path d="M160 138 V70" {...line} />
      <path d="M140 52 H196 L206 62 L196 72 H140 Z" fill={HIVIS} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M150 62 H186" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M176 118 L196 118 M186 108 V128" {...line} stroke="#d03b3b" transform="rotate(45 186 118)" />
      <Truck x={40} y={94} />
    </Frame>
  ),
  auth: () => (
    <Frame w={320} h={200}>
      <circle cx="232" cy="96" r="30" fill={HIVIS} opacity="0.9" />
      <path d="M0 150 H320" {...line} />
      <path d="M20 150 V100 H64 V150 M72 150 V82 H108 V150 M118 150 V112 H150 V150" {...line} fill={CONCRETE} />
      <path d="M190 150 V120 H230 L244 106 L258 120 V150" {...line} fill={GREEN_SOFT} />
      {[30, 46, 82, 94].map((x) => <rect key={x} x={x} y={x < 70 ? 112 : 96} width="8" height="8" {...thin} fill={SKY} />)}
      <Route d="M10 178 C80 178 110 160 170 166 S260 182 312 170" />
      <g transform="translate(120 112)"><Truck x={0} y={0} /></g>
    </Frame>
  ),
  done: () => (
    <Frame>
      <Ground />
      <Route d="M30 128 C80 128 90 100 140 100 S180 110 186 78" />
      <path d="M186 138 V48" {...line} />
      <path d="M186 50 H222 L212 62 L222 74 H186 Z" fill={GREEN} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {([[60, 70], [100, 56], [214, 104]] as const).map(([x, y]) => <path key={x} d={`M${x} ${y - 6} V${y + 6} M${x - 6} ${y} H${x + 6}`} stroke={HIVIS} strokeWidth="2.5" strokeLinecap="round" className="motion-safe:animate-pulse" />)}
    </Frame>
  ),
} as const;

export type IllustrationName = keyof typeof illustrations;

export function Illustration({ name, className = "w-40" }: { name: IllustrationName; className?: string }) {
  const Art = illustrations[name];
  return <div className={className}><Art /></div>;
}
