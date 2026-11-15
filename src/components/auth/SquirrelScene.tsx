export type SquirrelMood = "idle" | "shy" | "happy" | "sad";

const CSS = `
.sq-tail{transform-origin:262px 322px;animation:sq-sway 3.4s ease-in-out infinite alternate}
.sq-blink{transform-box:fill-box;transform-origin:center;animation:sq-blink 4.2s infinite}
.sq-bob{animation:sq-bob 3.6s ease-in-out infinite alternate}
.sq-bob2{animation:sq-bob 4.8s ease-in-out infinite alternate-reverse}
.sq-drop{animation:sq-drop 3.6s ease-in infinite}
.sq-paws{transition:transform .35s cubic-bezier(.3,1.3,.5,1),opacity .25s}
.sq-happy{animation:sq-jump .6s ease-in-out 2}
.sq-sad{animation:sq-shake .5s ease-in-out 2}
@keyframes sq-sway{from{transform:rotate(-4deg)}to{transform:rotate(6deg)}}
@keyframes sq-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes sq-bob{from{transform:translateY(-5px)}to{transform:translateY(5px)}}
@keyframes sq-drop{0%{transform:translateY(-80px);opacity:0}15%{opacity:1}60%{transform:translateY(0);opacity:1}70%,100%{transform:translateY(8px);opacity:0}}
@keyframes sq-jump{0%,100%{transform:translateY(0)}50%{transform:translateY(-26px)}}
@keyframes sq-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}
@media (prefers-reduced-motion:reduce){.sq-tail,.sq-blink,.sq-bob,.sq-bob2,.sq-drop,.sq-happy,.sq-sad{animation:none!important}}
`;

const Chip = ({ x, y, w, text, bg, fg, cls }: { x: number; y: number; w: number; text: string; bg: string; fg: string; cls: string }) => (
  <g className={cls}>
    <rect x={x} y={y} width={w} height="27" rx="13.5" fill={bg} />
    <text x={x + w / 2} y={y + 18} textAnchor="middle" fontSize="12" fontWeight="700" fill={fg} fontFamily="system-ui,sans-serif">{text}</text>
  </g>
);

/** Nhân vật sóc cầm tiền mặt bỏ vào ví FiGo, quanh có nhãn Thu, Chi, Mục tiêu. px/py: vị trí con trỏ (-1 đến 1) để cảnh nghiêng nhẹ. */
export function SquirrelScene({ mood, px = 0, py = 0 }: { mood: SquirrelMood; px?: number; py?: number }) {
  const far = { transform: `translate(${px * -6}px, ${py * -4}px)`, transition: "transform .2s" };
  const near = { transform: `translate(${px * 9}px, ${py * 6}px)`, transition: "transform .2s" };
  const happy = mood === "happy";
  const sad = mood === "sad";
  return (
    <svg viewBox="0 0 400 460" preserveAspectRatio="xMidYMid slice" className="absolute left-1/2 top-0 aspect-[400/460] h-full -translate-x-1/2 overflow-visible lg:inset-0 lg:left-0 lg:aspect-auto lg:size-full lg:translate-x-0" role="img" aria-label="Chú sóc cầm tiền mặt bỏ vào chiếc ví FiGo, bên cạnh là các nhãn thu nhập, chi tiêu và mục tiêu">
      <style>{CSS}</style>
      <defs>
        <linearGradient id="sq-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a3326" /><stop offset=".55" stopColor="#12714f" /><stop offset="1" stopColor="#35c08f" /></linearGradient>
        <symbol id="sq-coin" viewBox="-20 -20 40 40"><circle r="18" fill="#f7c948" stroke="#d99a1e" strokeWidth="3" /><circle r="12" fill="none" stroke="#e8ab2a" strokeWidth="2" /><text y="5" textAnchor="middle" fontSize="15" fontWeight="800" fill="#c07d12" fontFamily="system-ui,sans-serif">₫</text></symbol>
        <symbol id="sq-note" viewBox="0 0 60 32"><rect x="1" y="1" width="58" height="30" rx="5" fill="#d9f5e6" stroke="#2e9e6b" strokeWidth="2" /><rect x="5" y="5" width="50" height="22" rx="3" fill="none" stroke="#2e9e6b" strokeWidth="1" opacity=".5" /><circle cx="30" cy="16" r="8" fill="#2e9e6b" fillOpacity=".18" stroke="#2e9e6b" strokeWidth="1.5" /><text x="30" y="20.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1f7a53" fontFamily="system-ui,sans-serif">₫</text></symbol>
      </defs>
      <rect x="-700" y="0" width="1800" height="460" fill="url(#sq-sky)" />
      <g style={far}>
        <circle cx="200" cy="200" r="170" fill="#fff" opacity=".07" />
        <path d="M-700 300 L-10 300 Q80 250 170 290 T410 280 L1100 280 L1100 470 L-700 470Z" fill="#0f6a4a" opacity=".9" />
        <path d="M-700 322 L-10 322 Q120 290 230 318 T410 308 L1100 308 L1100 470 L-700 470Z" fill="#17895f" />
      </g>
      <g style={near}>
        <Chip x={26} y={94} w={84} text="+ Thu nhập" bg="#e7fff3" fg="#0a7a52" cls="sq-bob" />
        <Chip x={146} y={82} w={108} text="Mục tiêu 75%" bg="#ffffff" fg="#12714f" cls="sq-bob2" />
        <Chip x={284} y={98} w={84} text="− Chi tiêu" bg="#fff1ea" fg="#d4552a" cls="sq-bob" />
        <g className="sq-bob2"><use href="#sq-coin" x="40" y="156" width="22" height="22" /></g>
        <g className="sq-bob"><use href="#sq-note" x="318" y="150" width="46" height="25" transform="rotate(12 341 162)" /></g>
        <g className="sq-bob"><use href="#sq-coin" x="108" y="136" width="14" height="14" /></g>

        {/* ví FiGo */}
        <g transform="translate(262 226)">
          <use href="#sq-note" x="10" y="-4" width="58" height="31" transform="rotate(-9 39 12)" />
          <use href="#sq-note" x="26" y="2" width="58" height="31" transform="rotate(6 55 17)" />
          <rect x="0" y="14" width="96" height="64" rx="17" fill="#08a06b" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
          <rect x="58" y="31" width="46" height="29" rx="10" fill="#ff7449" />
          <circle cx="87" cy="45.5" r="5" fill="#fff" />
        </g>
        <g className="sq-drop"><use href="#sq-note" x="284" y="196" width="50" height="27" /></g>

        {/* sóc */}
        <g transform="translate(-30 -6.5) scale(.78)">
          <g className={happy ? "sq-happy" : sad ? "sq-sad" : ""} style={{ transformOrigin: "205px 380px" }}>
            <g className="sq-tail"><path d="M250 332 C335 332 365 250 322 188 C300 150 268 172 284 208 C300 244 270 272 238 278Z" fill="#c8651b" /><path d="M262 318 C322 310 342 256 312 214 C302 200 292 212 298 230 C308 256 286 288 256 296Z" fill="#e8934a" /></g>
            <ellipse cx="205" cy="322" rx="57" ry="62" fill="#dc8a30" /><ellipse cx="207" cy="334" rx="34" ry="42" fill="#f7dcae" />
            <ellipse cx="178" cy="384" rx="20" ry="9" fill="#b8591a" /><ellipse cx="234" cy="384" rx="20" ry="9" fill="#b8591a" />
            <path d="M238 304 Q254 304 260 294" stroke="#dc8a30" strokeWidth="15" strokeLinecap="round" fill="none" /><ellipse cx="260" cy="292" rx="11" ry="9" fill="#c8651b" />
            <use href="#sq-note" x="232" y="244" width="66" height="36" transform="rotate(-16 265 262)" />
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
      </g>
    </svg>
  );
}
