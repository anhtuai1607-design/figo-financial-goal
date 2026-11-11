export type SquirrelMood = "idle" | "shy" | "happy" | "sad";

const CSS = `
.sq-tail{transform-origin:262px 322px;animation:sq-sway 3.4s ease-in-out infinite alternate}
.sq-blink{transform-box:fill-box;transform-origin:center;animation:sq-blink 4.2s infinite}
.sq-bob{animation:sq-bob 3.6s ease-in-out infinite alternate}
.sq-bob2{animation:sq-bob 4.8s ease-in-out infinite alternate-reverse}
.sq-twinkle{animation:sq-tw 2.6s ease-in-out infinite alternate}
.sq-mist{animation:sq-mist 18s ease-in-out infinite alternate}
.sq-mist2{animation:sq-mist 26s ease-in-out infinite alternate-reverse}
.sq-ray{transform-origin:300px 165px;animation:sq-ray 15s ease-in-out infinite alternate}
.sq-fly{animation:sq-fly 7s ease-in-out infinite alternate}
.sq-paws{transition:transform .35s cubic-bezier(.3,1.3,.5,1),opacity .25s}
.sq-happy{animation:sq-jump .6s ease-in-out 2}
.sq-sad{animation:sq-shake .5s ease-in-out 2}
.sq-jarcoin{transform-box:fill-box;transform-origin:center;transition:opacity .35s ease,transform .45s cubic-bezier(.3,1.5,.5,1)}
/* vòng lặp 5 giây: sóc cầm xu -> tung vòng cung -> rơi vào hũ -> xu mới hiện ở tay */
.sq-hold{transform-box:fill-box;transform-origin:center;animation:sq-hold 5s infinite}
.sq-tx{animation:sq-tx 5s linear infinite}
.sq-ty{animation:sq-ty 5s infinite}
.sq-spin{opacity:0;transform-box:fill-box;transform-origin:center;animation:sq-spin 5s infinite}
.sq-jar{transform-box:fill-box;transform-origin:50% 100%;animation:sq-jar 5s infinite}
.sq-land{opacity:0;transform-box:fill-box;transform-origin:center;animation:sq-land 5s infinite}
.sq-jarglow{opacity:0;animation:sq-glowp 5s infinite}
@media (max-width:1023.98px){.sq-hide-sm{display:none}}
@keyframes sq-sway{from{transform:rotate(-4deg)}to{transform:rotate(6deg)}}
@keyframes sq-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes sq-bob{from{transform:translateY(-6px)}to{transform:translateY(6px)}}
@keyframes sq-tw{from{opacity:.2}to{opacity:1}}
@keyframes sq-mist{from{transform:translateX(-28px)}to{transform:translateX(28px)}}
@keyframes sq-ray{from{transform:rotate(-5deg);opacity:.55}to{transform:rotate(5deg);opacity:1}}
@keyframes sq-fly{0%{transform:translate(0,0);opacity:.15}45%{opacity:1}100%{transform:translate(16px,-20px);opacity:.25}}
@keyframes sq-jump{0%,100%{transform:translateY(0)}50%{transform:translateY(-26px)}}
@keyframes sq-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}
@keyframes sq-hold{0%,17.9%{opacity:1;transform:scale(1)}18%,73.9%{opacity:0;transform:scale(.5)}74%{opacity:0;transform:scale(.2)}84%{opacity:1;transform:scale(1.12)}90%{transform:scale(.97)}100%{opacity:1;transform:scale(1)}}
@keyframes sq-tx{0%,18%{transform:translateX(0)}50%{transform:translateX(-190px)}50.01%,100%{transform:translateX(0)}}
@keyframes sq-ty{0%{transform:translateY(0)}18%{transform:translateY(0);animation-timing-function:cubic-bezier(.2,.65,.35,1)}36%{transform:translateY(-96px);animation-timing-function:cubic-bezier(.6,.05,.9,.6)}50%{transform:translateY(69px)}50.01%,100%{transform:translateY(0)}}
@keyframes sq-spin{0%,17.9%{opacity:0;transform:scaleX(1)}18%{opacity:1;transform:scaleX(1) scale(1)}24%{transform:scaleX(.15) scale(.82)}30%{transform:scaleX(-1) scale(.74)}38%{transform:scaleX(.15) scale(.72)}44%{transform:scaleX(1) scale(.72)}50%{opacity:1;transform:scaleX(1) scale(.7)}50.01%,100%{opacity:0;transform:scale(.7)}}
@keyframes sq-jar{0%,50%{transform:scale(1)}53%{transform:scale(1.05,.94)}58%{transform:scale(.99,1.03)}63%,100%{transform:scale(1)}}
@keyframes sq-land{0%,49.5%{opacity:0;transform:scale(.2)}54%{opacity:1;transform:scale(1)}66%,100%{opacity:0;transform:scale(1.5)}}
@keyframes sq-glowp{0%,49%{opacity:0}54%{opacity:.95}72%,100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.sq-tail,.sq-blink,.sq-bob,.sq-bob2,.sq-twinkle,.sq-mist,.sq-mist2,.sq-ray,.sq-fly,.sq-hold,.sq-tx,.sq-ty,.sq-spin,.sq-jar,.sq-land,.sq-jarglow,.sq-happy,.sq-sad{animation:none!important}}
`;

const JAR_COINS = 12;
const STARS: [number, number, number][] = [[60, 60, 2.2], [120, 118, 1.8], [210, 50, 2.4], [350, 200, 2], [30, 190, 2], [172, 168, 1.5], [268, 150, 1.6], [380, 120, 1.8], [90, 215, 1.5]];
const FIREFLIES: [number, number, number, number][] = [[64, 262, 6.5, 0], [128, 300, 8, 1.2], [300, 322, 7, 2.1], [346, 292, 6, .6], [262, 200, 7.5, 1.7], [38, 222, 6, 2.6], [336, 176, 7, 3.2]];

/** Nhân vật sóc nhặt hạt vàng (vẽ bằng SVG, có chuyển động). px/py: vị trí con trỏ từ -1 đến 1 để tạo hiệu ứng nghiêng. progress: 0..1, hũ đầy dần theo tiến độ điền form. */
export function SquirrelScene({ mood, px = 0, py = 0, progress = 0.5, className = "absolute inset-0 size-full" }: { mood: SquirrelMood; px?: number; py?: number; progress?: number; className?: string }) {
  const far = { transform: `translate(${px * -8}px, ${py * -5}px)`, transition: "transform .25s" };
  const mid = { transform: `translate(${px * -2}px, ${py * -1}px)`, transition: "transform .25s" };
  const near = { transform: `translate(${px * 8}px, ${py * 5}px)`, transition: "transform .2s" };
  const happy = mood === "happy";
  const sad = mood === "sad";
  const filled = Math.max(3, Math.min(JAR_COINS, Math.round(3 + progress * 9)));
  return (
    <svg viewBox="0 0 400 460" preserveAspectRatio="xMidYMax slice" className={className} role="img" aria-label="Chú sóc tung hạt vàng bỏ vào hũ tiết kiệm">
      <style>{CSS}</style>
      <defs>
        <linearGradient id="sq-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#072a20" /><stop offset=".45" stopColor="#0f6446" /><stop offset=".8" stopColor="#23a577" /><stop offset="1" stopColor="#43cb9b" /></linearGradient>
        <radialGradient id="sq-moon"><stop offset="0" stopColor="#fff6c2" /><stop offset="1" stopColor="#fff6c2" stopOpacity="0" /></radialGradient>
        <radialGradient id="sq-glow"><stop offset="0" stopColor="#ffe88a" stopOpacity=".9" /><stop offset="1" stopColor="#ffe88a" stopOpacity="0" /></radialGradient>
        <radialGradient id="sq-halo"><stop offset="0" stopColor="#a8ffd8" stopOpacity=".26" /><stop offset="1" stopColor="#a8ffd8" stopOpacity="0" /></radialGradient>
        <linearGradient id="sq-rayg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6c2" stopOpacity=".22" /><stop offset="1" stopColor="#fff6c2" stopOpacity="0" /></linearGradient>
        <linearGradient id="sq-fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ea9a42" /><stop offset="1" stopColor="#cf7422" /></linearGradient>
        <linearGradient id="sq-tailg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d5702a" /><stop offset="1" stopColor="#b9540f" /></linearGradient>
        <symbol id="sq-coin" viewBox="-20 -20 40 40"><circle r="18" fill="#f7c948" stroke="#d99a1e" strokeWidth="3" /><circle r="12" fill="none" stroke="#e8ab2a" strokeWidth="2" /><path d="M-9 -9 A13 13 0 0 1 4 -13" stroke="#fff3b8" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".8" /><text y="5" textAnchor="middle" fontSize="15" fontWeight="800" fill="#c07d12" fontFamily="system-ui,sans-serif">₫</text></symbol>
        <path id="sq-star" d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2Z" />
        <path id="sq-pine" d="M0 -62 L24 -14 H-24Z M0 -42 L30 8 H-30Z M0 -22 L36 30 H-36Z" />
      </defs>
      <rect width="400" height="460" fill="url(#sq-sky)" />

      {/* lớp xa: trăng, tia sáng, sao, đồi xa */}
      <g style={far}>
        <circle cx="300" cy="165" r="130" fill="url(#sq-moon)" />
        <g className="sq-ray"><path d="M300 165 L196 470 L248 470Z" fill="url(#sq-rayg)" /><path d="M300 165 L262 470 L318 470Z" fill="url(#sq-rayg)" opacity=".7" /><path d="M300 165 L120 470 L158 470Z" fill="url(#sq-rayg)" opacity=".5" /></g>
        <circle className="sq-hide-sm" cx="300" cy="165" r="46" fill="#fff3b0" />
        {STARS.map(([x, y, r], i) => <circle key={i} className="sq-twinkle" style={{ animationDelay: `${i * 0.43}s` }} cx={x} cy={y} r={r} fill="#fff" />)}
        <path d="M-20 300 Q60 246 140 288 T300 276 T440 292 L440 470 L-20 470Z" fill="#2a9c73" opacity=".5" />
        {[[22, 276, .5], [74, 270, .42], [334, 268, .46], [380, 276, .5]].map(([x, y, s], i) => <use key={i} href="#sq-pine" transform={`translate(${x} ${y}) scale(${s})`} fill="#0b5a40" opacity=".7" />)}
      </g>

      {/* lớp giữa: đồi, thông, sương mù */}
      <g style={mid}>
        <path d="M-10 330 Q80 250 170 320 T400 300 L400 470 L-10 470Z" fill="#0f6a4a" opacity=".92" />
        {[[40, 300, 1], [352, 292, 1.15], [318, 310, .8]].map(([x, y, s], i) => <g key={i} transform={`translate(${x} ${y}) scale(${s})`}><use href="#sq-pine" fill="#0a4d37" /><path d="M0 -62 L24 -14 H12 L0 -50Z" fill="#14795a" opacity=".5" /><rect x="-4" y="30" width="8" height="14" fill="#06382a" /></g>)}
        <g className="sq-mist"><ellipse cx="120" cy="352" rx="150" ry="16" fill="#b9f5db" opacity=".11" /></g>
        <path d="M-10 380 Q120 330 230 372 T410 360 L410 470 L-10 470Z" fill="#17895f" />
        <g className="sq-mist2"><ellipse cx="300" cy="378" rx="170" ry="14" fill="#d4ffec" opacity=".12" /></g>
        {[[14, 392], [58, 384], [150, 398], [262, 395], [296, 388], [350, 384], [386, 392]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q3 -13 7 -16 q-1 9 4 16 q3 -9 9 -11 q-3 6 -2 11Z`} fill="#0f6a4a" opacity=".8" />)}
      </g>

      {/* lớp gần: đom đóm, hũ, sóc */}
      <g style={near}>
        <circle cx="205" cy="300" r="150" fill="url(#sq-halo)" />
        {FIREFLIES.map(([x, y, r, d], i) => (
          <g key={i} className="sq-fly" style={{ animationDelay: `${d}s`, animationDuration: `${6 + (i % 3) * 1.6}s` }}>
            <circle cx={x} cy={y} r={r * 1.7} fill="url(#sq-glow)" /><circle cx={x} cy={y} r="1.7" fill="#fff9c4" />
          </g>
        ))}
        <g className="sq-bob sq-hide-sm"><use href="#sq-coin" x="56" y="182" width="26" height="26" /></g>
        <g className="sq-bob2"><use href="#sq-coin" x="330" y="250" width="22" height="22" /></g>
        <g className="sq-bob2"><use href="#sq-coin" x="110" y="230" width="16" height="16" /></g>
        <g className="sq-bob"><use href="#sq-coin" x="300" y="60" width="18" height="18" /></g>

        {/* hũ tiết kiệm: đầy dần theo tiến độ điền form */}
        <ellipse cx="71" cy="424" rx="48" ry="6" fill="#04241a" opacity=".3" />
        <circle className="sq-jarglow" cx="71" cy="334" r="42" fill="url(#sq-glow)" />
        <g transform="translate(26 326)">
          <g className="sq-jar">
            <path d="M8 14 H82 V82 Q82 96 68 96 H22 Q8 96 8 82Z" fill="#ffffff" fillOpacity=".18" stroke="#ffffff" strokeOpacity=".7" strokeWidth="3" />
            {Array.from({ length: JAR_COINS }, (_, i) => {
              const r = Math.floor(i / 3), c = i % 3, on = i < filled;
              return <ellipse key={i} className="sq-jarcoin" style={{ opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(.3)" }} cx={26 + c * 19 + (r % 2) * 7} cy={84 - r * 11} rx="10" ry="5.5" fill="#f7c948" stroke="#d99a1e" strokeWidth="2" />;
            })}
            <path d="M17 26 V76" stroke="#fff" strokeOpacity=".4" strokeWidth="4" strokeLinecap="round" />
            <rect x="4" y="2" width="82" height="14" rx="6" fill="#b4762f" /><rect x="8" y="4" width="74" height="4" rx="2" fill="#d9a05a" opacity=".7" />
          </g>
        </g>
        <g className="sq-land" style={{ animationDelay: "0s" }}><use href="#sq-star" x="52" y="310" fill="#fff6c2" /></g>
        <g className="sq-land" style={{ animationDelay: ".06s" }}><use href="#sq-star" x="88" y="316" fill="#ffe27a" /></g>
        <g className="sq-land" style={{ animationDelay: ".12s" }}><use href="#sq-star" x="72" y="300" fill="#fff" /></g>

        {/* sóc */}
        <ellipse cx="205" cy="392" rx="80" ry="9" fill="#04241a" opacity=".38" />
        <g className={happy ? "sq-happy" : sad ? "sq-sad" : ""} style={{ transformOrigin: "205px 380px" }}>
          <g className="sq-tail">
            <path d="M250 332 C335 332 365 250 322 188 C300 150 268 172 284 208 C300 244 270 272 238 278Z" fill="url(#sq-tailg)" />
            <path d="M262 318 C322 310 342 256 312 214 C302 200 292 212 298 230 C308 256 286 288 256 296Z" fill="#ee9b52" />
            <path d="M318 226 C330 252 318 286 290 304 M306 206 C316 226 312 250 296 268" stroke="#b9540f" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".45" />
            <path d="M322 188 C346 226 346 292 262 330" stroke="#ffd7a0" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".4" />
          </g>
          <ellipse cx="205" cy="322" rx="57" ry="62" fill="url(#sq-fur)" /><ellipse cx="207" cy="334" rx="34" ry="42" fill="#f7dcae" />
          <path d="M233.5 268.3 A57 62 0 0 1 241.6 369.5" stroke="#ffd7a0" strokeOpacity=".5" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <ellipse cx="178" cy="384" rx="20" ry="9" fill="#b8591a" /><ellipse cx="234" cy="384" rx="20" ry="9" fill="#b8591a" />
          <path d="M238 304 Q254 304 260 294" stroke="#dc8a30" strokeWidth="15" strokeLinecap="round" fill="none" /><ellipse cx="260" cy="292" rx="11" ry="9" fill="#c8651b" />
          <g className="sq-hold"><use href="#sq-coin" x="240" y="238" width="42" height="42" /></g>
          <ellipse cx="160" cy="322" rx="12" ry="10" fill="#c8651b" />
          <circle cx="170" cy="192" r="16" fill="#dc8a30" /><circle cx="240" cy="192" r="16" fill="#dc8a30" /><circle cx="170" cy="194" r="8" fill="#f4a6a0" /><circle cx="240" cy="194" r="8" fill="#f4a6a0" />
          <circle cx="205" cy="232" r="51" fill="url(#sq-fur)" /><ellipse cx="205" cy="253" rx="29" ry="21" fill="#f7dcae" />
          <path d="M237.8 192.9 A51 51 0 0 1 244.1 264.8" stroke="#ffd7a0" strokeOpacity=".55" strokeWidth="2.6" strokeLinecap="round" fill="none" />
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
          {/* xu được tung: bay vòng cung từ tay sóc sang hũ, nằm trên cùng để không bị đầu che */}
          <g className="sq-tx"><g className="sq-ty"><g className="sq-spin"><use href="#sq-coin" x="240" y="238" width="42" height="42" /></g></g></g>
        </g>
      </g>
    </svg>
  );
}
