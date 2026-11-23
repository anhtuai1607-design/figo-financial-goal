import { useId } from "react";
import type { MascotMood } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

const MASCOT_CSS = `
.fm-tail{transform-origin:145px 148px;animation:fm-sway 3.2s ease-in-out infinite alternate}
.fm-blink{transform-box:fill-box;transform-origin:center;animation:fm-blink 4.4s infinite}
.fm-breathe{transform-origin:100px 180px;animation:fm-breathe 3.6s ease-in-out infinite}
.fm-wave{transform-origin:52px 136px;animation:fm-wave 1.5s ease-in-out infinite alternate}
.fm-celebrate{transform-origin:100px 180px;animation:fm-jump 0.65s cubic-bezier(.3,1.4,.5,1) infinite alternate}
.fm-warn{transform-origin:100px 180px;animation:fm-tilt 1.8s ease-in-out infinite alternate}
.fm-sparkle{transform-box:fill-box;transform-origin:center;animation:fm-spark 1.8s ease-in-out infinite alternate}
@keyframes fm-sway{from{transform:rotate(-5deg)}to{transform:rotate(7deg)}}
@keyframes fm-blink{0%,91%,100%{transform:scaleY(1)}95%{transform:scaleY(0.08)}}
@keyframes fm-breathe{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-2px) scaleY(1.015)}}
@keyframes fm-wave{from{transform:rotate(-8deg)}to{transform:rotate(14deg)}}
@keyframes fm-jump{from{transform:translateY(0) scale(1)}to{transform:translateY(-8px) scale(1.03)}}
@keyframes fm-tilt{from{transform:rotate(-2deg)}to{transform:rotate(2deg)}}
@keyframes fm-spark{from{transform:scale(0.75) rotate(-8deg);opacity:0.55}to{transform:scale(1.12) rotate(10deg);opacity:1}}
@media (prefers-reduced-motion:reduce){
  .fm-tail,.fm-blink,.fm-breathe,.fm-wave,.fm-celebrate,.fm-warn,.fm-sparkle{animation:none!important}
}
`;

export function SquirrelMascot({
  mood = "idle",
  size = 64,
  lookX = 0,
  lookY = 0,
  className,
}: {
  mood?: MascotMood;
  size?: number;
  lookX?: number;
  lookY?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const gradBody = `fm-body-${uid}`;
  const gradTail = `fm-tail-${uid}`;
  const gradCoin = `fm-coin-${uid}`;

  const px = Math.max(-1, Math.min(1, lookX)) * 2.4;
  const py = Math.max(-1, Math.min(1, lookY)) * 1.8;

  const happy = mood === "happy" || mood === "celebrate";
  const warn = mood === "warn";
  const thinking = mood === "thinking";
  const encourage = mood === "encourage";
  const shy = mood === "shy";

  const bodyMotionClass = mood === "celebrate" ? "fm-celebrate" : warn ? "fm-warn" : "fm-breathe";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn("select-none overflow-visible", className)}
      role="img"
      aria-label="Sóc FiGo"
    >
      <style>{MASCOT_CSS}</style>
      <defs>
        <linearGradient id={gradBody} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eb993e" />
          <stop offset="100%" stopColor="#d47822" />
        </linearGradient>
        <linearGradient id={gradTail} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d96f24" />
          <stop offset="100%" stopColor="#ae4d12" />
        </linearGradient>
        <linearGradient id={gradCoin} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe270" />
          <stop offset="100%" stopColor="#e69d12" />
        </linearGradient>
      </defs>

      {/* Soft ground shadow */}
      <ellipse cx="98" cy="184" rx="44" ry="8" fill="currentColor" className="text-foreground/10" />

      <g className={bodyMotionClass}>
        {/* Fluffy animated tail */}
        <g className="fm-tail">
          <path
            d="M126 154 C178 154 192 104 166 66 C152 44 130 56 140 80 C148 102 132 122 114 126 Z"
            fill={`url(#${gradTail})`}
          />
          <path
            d="M134 146 C170 140 180 108 161 82 C154 72 146 78 151 92 C156 108 144 128 128 134 Z"
            fill="#f2a25a"
            opacity="0.88"
          />
        </g>

        {/* Feet */}
        <ellipse cx="78" cy="176" rx="16" ry="7.5" fill="#b35316" />
        <ellipse cx="116" cy="176" rx="16" ry="7.5" fill="#b35316" />

        {/* Torso & warm belly */}
        <ellipse cx="97" cy="140" rx="40" ry="42" fill={`url(#${gradBody})`} />
        <ellipse cx="97" cy="147" rx="25" ry="29" fill="#fae2b8" />

        {/* FiGo emerald neckerchief */}
        <path d="M66 112 Q97 128 128 112 Q122 125 97 129 Q72 125 66 112 Z" fill="#0ea46f" />
        <path d="M92 124 L86 140 L97 135 L108 140 L102 124 Z" fill="#088459" />

        {/* Ears */}
        <circle cx="68" cy="52" r="14" fill="#df882c" />
        <circle cx="126" cy="52" r="14" fill="#df882c" />
        <circle cx="68" cy="54" r="7.5" fill="#f7afa7" />
        <circle cx="126" cy="54" r="7.5" fill="#f7afa7" />

        {/* Head */}
        <circle cx="97" cy="82" r="41" fill={`url(#${gradBody})`} />
        {/* Head tuft */}
        <path d="M90 42 Q97 31 104 42 Q99 47 90 42 Z" fill="#c9681b" />

        {/* Muzzle & rosy cheeks */}
        <ellipse cx="97" cy="98" rx="24" ry="17" fill="#fae2b8" />
        <circle cx="71" cy="95" r="6.5" fill="#f58f86" opacity="0.55" />
        <circle cx="123" cy="95" r="6.5" fill="#f58f86" opacity="0.55" />

        {/* Nose */}
        <ellipse cx="97" cy="91" rx="5.5" ry="4" fill="#52260d" />

        {/* Mouth */}
        {happy ? (
          <path d="M87 99 Q97 113 107 99 Z" fill="#52260d" />
        ) : warn ? (
          <path
            d="M89 106 Q97 99 105 106"
            stroke="#52260d"
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
          />
        ) : thinking ? (
          <path
            d="M91 102 Q98 104 104 100"
            stroke="#52260d"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            d="M89 100 Q97 108 105 100"
            stroke="#52260d"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Eyes */}
        {happy ? (
          <g stroke="#2b1608" strokeWidth="3.2" strokeLinecap="round" fill="none">
            <path d="M74 80 Q81 71 88 80" />
            <path d="M106 80 Q113 71 120 80" />
          </g>
        ) : (
          <g className="fm-blink">
            <g transform={`translate(${px}, ${py})`}>
              <ellipse cx="81" cy="78" rx="5.8" ry={warn ? 6.4 : 7.4} fill="#2b1608" />
              <ellipse cx="113" cy="78" rx="5.8" ry={warn ? 6.4 : 7.4} fill="#2b1608" />
              <circle cx="83" cy="75.5" r="2.2" fill="#ffffff" />
              <circle cx="115" cy="75.5" r="2.2" fill="#ffffff" />
            </g>
          </g>
        )}

        {/* Eyebrows for warn/thinking */}
        {warn && (
          <g stroke="#52260d" strokeWidth="2.6" strokeLinecap="round">
            <path d="M73 68 L87 72" />
            <path d="M121 68 L107 72" />
          </g>
        )}
        {thinking && (
          <g stroke="#52260d" strokeWidth="2.4" strokeLinecap="round">
            <path d="M74 68 Q81 65 87 68" fill="none" />
            <path d="M107 66 Q114 62 121 65" fill="none" />
          </g>
        )}

        {/* Paws & Contextual Props */}
        {shy ? (
          <g>
            <path
              d="M68 142 Q62 104 82 82"
              stroke="#df882c"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M126 142 Q132 104 112 82"
              stroke="#df882c"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="82" cy="80" rx="12" ry="10" fill="#c8651b" />
            <ellipse cx="112" cy="80" rx="12" ry="10" fill="#c8651b" />
          </g>
        ) : mood === "celebrate" ? (
          <g>
            <path
              d="M68 134 Q46 106 54 84"
              stroke="#df882c"
              strokeWidth="11"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M126 134 Q148 106 140 84"
              stroke="#df882c"
              strokeWidth="11"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="54" cy="83" rx="9.5" ry="8" fill="#c8651b" />
            <ellipse cx="140" cy="83" rx="9.5" ry="8" fill="#c8651b" />
          </g>
        ) : encourage ? (
          <g>
            <g className="fm-wave">
              <path
                d="M68 136 Q46 112 52 92"
                stroke="#df882c"
                strokeWidth="11"
                strokeLinecap="round"
                fill="none"
              />
              <ellipse cx="52" cy="90" rx="9.5" ry="8" fill="#c8651b" />
            </g>
            <ellipse cx="126" cy="138" rx="10" ry="8.5" fill="#c8651b" />
          </g>
        ) : thinking ? (
          <g>
            <ellipse cx="68" cy="138" rx="10" ry="8.5" fill="#c8651b" />
            <path
              d="M124 136 Q132 114 112 106"
              stroke="#df882c"
              strokeWidth="10.5"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="111" cy="106" rx="9" ry="7.5" fill="#c8651b" />
          </g>
        ) : (
          <g>
            {/* Left paw */}
            <ellipse cx="68" cy="138" rx="10" ry="8.5" fill="#c8651b" />
            {/* Right paw holding a gold ₫ coin */}
            <path
              d="M122 136 Q138 130 140 120"
              stroke="#df882c"
              strokeWidth="11"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="140" cy="120" rx="9" ry="7.5" fill="#c8651b" />
            <g transform="translate(143, 102)">
              <circle r="13" fill={`url(#${gradCoin})`} stroke="#c97d10" strokeWidth="2" />
              <circle r="9" fill="none" stroke="#fff3b0" strokeWidth="1.2" opacity="0.7" />
              <text
                y="4.5"
                textAnchor="middle"
                fontSize="12"
                fontWeight="800"
                fill="#8a5005"
                fontFamily="system-ui, sans-serif"
              >
                ₫
              </text>
            </g>
          </g>
        )}
      </g>

      {/* Mood accents (sparkles / alert / thought) */}
      {(mood === "celebrate" || mood === "happy") && (
        <g className="fm-sparkle">
          <path d="M34 52 L37 44 L40 52 L48 55 L40 58 L37 66 L34 58 L26 55 Z" fill="#f7c948" />
          <circle cx="164" cy="48" r="4" fill="#10b981" />
          {mood === "celebrate" && (
            <path
              d="M160 72 L162 66 L164 72 L170 74 L164 76 L162 82 L160 76 L154 74 Z"
              fill="#ff7449"
            />
          )}
        </g>
      )}
      {warn && (
        <g transform="translate(154, 42)">
          <circle r="13" fill="#ef4444" />
          <text
            y="5"
            textAnchor="middle"
            fontSize="15"
            fontWeight="800"
            fill="#ffffff"
            fontFamily="system-ui, sans-serif"
          >
            !
          </text>
        </g>
      )}
      {thinking && (
        <g fill="#10b981" opacity="0.85">
          <circle cx="152" cy="54" r="3.5" />
          <circle cx="163" cy="43" r="5" />
        </g>
      )}
    </svg>
  );
}
