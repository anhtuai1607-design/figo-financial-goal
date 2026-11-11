export type SquirrelMood = "idle" | "shy" | "happy" | "sad";

const CSS = `
.sq-tail{transform-origin:262px 322px;animation:sq-sway 3.4s ease-in-out infinite alternate}
.sq-blink{transform-box:fill-box;transform-origin:center;animation:sq-blink 4.2s infinite}
.sq-bob{animation:sq-bob 3.6s ease-in-out infinite alternate}
.sq-bob2{animation:sq-bob 4.8s ease-in-out infinite alternate-reverse}
.sq-twinkle{animation:sq-tw 2.6s ease-in-out infinite alternate}
.sq-drop{animation:sq-drop 3.8s ease-in infinite}
.sq-paws{transition:transform .35s cubic-bezier(.3,1.3,.5,1),opacity .25s}
.sq-happy{animation:sq-jump .6s ease-in-out 2}
.sq-sad{animation:sq-shake .5s ease-in-out 2}
@media (max-width:1023.98px){.sq-hide-sm{display:none}}
@keyframes sq-sway{from{transform:rotate(-4deg)}to{transform:rotate(6deg)}}
@keyframes sq-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes sq-bob{from{transform:translateY(-6px)}to{transform:translateY(6px)}}
@keyframes sq-tw{from{opacity:.25}to{opacity:1}}
@keyframes sq-drop{0%{transform:translateY(-150px);opacity:0}10%{opacity:1}55%{transform:translateY(0);opacity:1}60%,100%{transform:translateY(0);opacity:0}}
@keyframes sq-jump{0%,100%{transform:translateY(0)}50%{transform:translateY(-26px)}}
@keyframes sq-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}
@media (prefers-reduced-motion:reduce){.sq-tail,.sq-blink,.sq-bob,.sq-bob2,.sq-twinkle,.sq-drop,.sq-happy,.sq-sad{animation:none!important}}
`;

/** Nhân vật sóc nhặt hạt vàng (vẽ bằng SVG, có chuyển động). px/py: vị trí con trỏ từ -1 đến 1 để tạo hiệu ứng nghiêng. */
export function SquirrelScene({ mood, px = 0, py = 0, className = "absolute inset-0 size-full" }: { mood: SquirrelMood; px?: number; py?: number; className?: string }) {
  const far = { transform: `translate(${px * -6}px, ${py * -4}px)`, transition: "transform .2s" };
  const near = { transform: `translate(${px * 9}px, ${py * 6}px)`, transition: "transform .2s" };
  const happy = mood === "happy";
  const sad = mood === "sad";
  return (
    <svg viewBox="0 0 400 460" preserveAspectRatio="xMidYMax slice" className={className} role="img" aria-label="Chú sóc đang nhặt hạt vàng bỏ vào hũ tiết kiệm">
      <style>{CSS}</style>
      <defs>
        <linearGradient id="sq-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a3326" /><stop offset=".55" stopColor="#12714f" /><stop offset="1" stopColor="#35c08f" /></linearGradient>
        <radialGradient id="sq-moon"><stop offset="0" stopColor="#fff6c2" /><stop offset="1" stopColor="#fff6c2" stopOpacity="0" /></radialGradient>
        <symbol id="sq-coin" viewBox="-20 -20 40 40"><circle r="18" fill="#f7c948" stroke="#d99a1e" strokeWidth="3" /><circle r="12" fill="none" stroke="#e8ab2a" strokeWidth="2" /><text y="5" textAnchor="middle" fontSize="15" fontWeight="800" fill="#c07d12" fontFamily="system-ui,sans-serif">₫</text></symbol>
      </defs>
      <rect width="400" height="460" fill="url(#sq-sky)" />
      <g style={far}>
        <circle cx="300" cy="110" r="120" fill="url(#sq-moon)" /><circle className="sq-hide-sm" cx="300" cy="110" r="46" fill="#fff3b0" />
        {[[60, 60], [120, 120], [210, 50], [350, 200], [30, 190]].map(([x, y], i) => <circle key={i} className="sq-twinkle" style={{ animationDelay: `${i * 0.5}s` }} cx={x} cy={y} r="2.2" fill="#fff" />)}
        <path d="M-10 330 Q80 250 170 320 T400 300 L400 470 L-10 470Z" fill="#0f6a4a" opacity=".85" />
        {[[40, 300, 1], [352, 292, 1.15], [318, 310, .8]].map(([x, y, s], i) => <g key={i} transform={`translate(${x} ${y}) scale(${s})`}><path d="M0 -62 L24 -14 H-24Z M0 -42 L30 8 H-30Z M0 -22 L36 30 H-36Z" fill="#0a4d37" /><rect x="-4" y="30" width="8" height="14" fill="#06382a" /></g>)}
        <path d="M-10 380 Q120 330 230 372 T410 360 L410 470 L-10 470Z" fill="#17895f" />
      </g>
      <g style={near}>
        <g className="sq-bob sq-hide-sm"><use href="#sq-coin" x="50" y="140" width="26" height="26" /></g>
        <g className="sq-bob2"><use href="#sq-coin" x="330" y="250" width="22" height="22" /></g>
        <g className="sq-bob2"><use href="#sq-coin" x="110" y="230" width="16" height="16" /></g>
        <g className="sq-bob"><use href="#sq-coin" x="300" y="60" width="18" height="18" /></g>
        {/* hũ tiết kiệm */}
        <g transform="translate(26 332)">
          <path d="M8 14 H82 V82 Q82 96 68 96 H22 Q8 96 8 82Z" fill="#ffffff" fillOpacity=".2" stroke="#ffffff" strokeOpacity=".65" strokeWidth="3" />
          <rect x="4" y="2" width="82" height="14" rx="6" fill="#b4762f" />
          {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <ellipse key={`${r}${c}`} cx={26 + c * 19 + (r % 2) * 7} cy={84 - r * 11} rx="10" ry="5.5" fill="#f7c948" stroke="#d99a1e" strokeWidth="2" />))}
          <g className="sq-drop"><use href="#sq-coin" x="30" y="-30" width="26" height="26" /></g>
        </g>
        {/* sóc */}
        <g className={happy ? "sq-happy" : sad ? "sq-sad" : ""} style={{ transformOrigin: "205px 380px" }}>
          <g className="sq-tail"><path d="M250 332 C335 332 365 250 322 188 C300 150 268 172 284 208 C300 244 270 272 238 278Z" fill="#c8651b" /><path d="M262 318 C322 310 342 256 312 214 C302 200 292 212 298 230 C308 256 286 288 256 296Z" fill="#e8934a" /></g>
          <ellipse cx="205" cy="322" rx="57" ry="62" fill="#dc8a30" /><ellipse cx="207" cy="334" rx="34" ry="42" fill="#f7dcae" />
          <ellipse cx="178" cy="384" rx="20" ry="9" fill="#b8591a" /><ellipse cx="234" cy="384" rx="20" ry="9" fill="#b8591a" />
          <path d="M238 304 Q254 304 260 294" stroke="#dc8a30" strokeWidth="15" strokeLinecap="round" fill="none" /><ellipse cx="260" cy="292" rx="11" ry="9" fill="#c8651b" />
          <use href="#sq-coin" x="240" y="238" width="42" height="42" />
          <ellipse cx="160" cy="322" rx="12" ry="10" fill="#c8651b" />
          <circle cx="170" cy="192" r="16" fill="#dc8a30" /><circle cx="240" cy="192" r="16" fill="#dc8a30" /><circle cx="170" cy="194" r="8" fill="#f4a6a0" /><circle cx="240" cy="194" r="8" fill="#f4a6a0" />
          <circle cx="205" cy="232" r="51" fill="#dc8a30" /><ellipse cx="205" cy="253" rx="29" ry="21" fill="#f7dcae" />
          <circle cx="172" cy="248" r="7.5" fill="#f58f86" opacity=".55" /><circle cx="238" cy="248" r="7.5" fill="#f58f86" opacity=".55" />
          <ellipse cx="205" cy="244" rx="6.5" ry="4.8" fill="#5a2d12" />
          {happy ? <path d="M194 254 Q205 270 216 254Z" fill="#5a2d12" /> : sad ? <path d="M196 262 Q205 253 214 262" stroke="#5a2d12" strokeWidth="2.6" strokeLinecap="round" fill="none" /> : <path d="M196 254 Q205 263 214 254" stroke="#5a2d12" strokeWidth="2.6" strokeLinecap="round" fill="none" />}
          {happy ? (
            <g stroke="#2b1608" strokeWidth="3.4" strokeLinecap="round" fill="none"><path d="M178 232 Q186 222 194 232" /><path d="M216 232 Q224 222 232 232" /></g>
          ) : (
            <g className="sq-blink">
              <ellipse cx="186" cy="229" rx="6.5" ry={sad ? 7 : 8.5} fill="#2b1608" /><ellipse cx="224" cy="229" rx="6.5" ry={sad ? 7 : 8.5} fill="#2b1608" />
              <circle cx="188.5" cy="226" r="2.6" fill="#fff" /><circle cx="226.5" cy="226" r="2.6" fill="#fff" />
            </g>
          )}
          {sad && <path d="M240 214 q6 9 0 14 q-6 -5 0 -14Z" fill="#8fd3ff" />}
          <g className="sq-paws" style={{ transform: mood === "shy" ? "translateY(0)" : "translateY(70px)", opacity: mood === "shy" ? 1 : 0 }}>
            <path d="M168 322 Q158 270 186 236" stroke="#dc8a30" strokeWidth="15" strokeLinecap="round" fill="none" /><path d="M244 322 Q254 270 224 236" stroke="#dc8a30" strokeWidth="15" strokeLinecap="round" fill="none" />
            <ellipse cx="187" cy="231" rx="16" ry="13" fill="#c8651b" /><ellipse cx="223" cy="231" rx="16" ry="13" fill="#c8651b" />
          </g>
        </g>
      </g>
    </svg>
  );
}
