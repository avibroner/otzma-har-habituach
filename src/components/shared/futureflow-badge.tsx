"use client";

import { useState, useEffect } from "react";

interface FutureFlowBadgeProps {
  /** שם המערכת — משמש להודעת WhatsApp מוקדמת */
  systemName: string;
  position?: "bottom-left" | "bottom-right";
  theme?: "light" | "dark" | "auto";
  lang?: "he" | "en";
  dismissable?: boolean;
  className?: string;
}

const STORAGE_KEY = "ff_badge_dismissed";
const WHATSAPP_NUMBER = "972515120079";

function ArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 375 375"
      aria-hidden="true"
    >
      <clipPath id="ff-clip">
        <path d="M 51.6875 14.191406 L 323.1875 14.191406 L 323.1875 360.691406 L 51.6875 360.691406 Z" />
      </clipPath>
      <g clipPath="url(#ff-clip)">
        <path
          fill="#2f748e"
          d="M 142.675781 296.773438 C 149.6875 303.25 155.90625 310.578125 162.363281 317.648438 C 169.355469 325.3125 175.671875 333.671875 183.21875 340.722656 C 199.480469 355.953125 217.464844 355.378906 233.566406 339.910156 C 240.578125 333.175781 245.507812 324.996094 249.789062 316.359375 C 256.917969 301.960938 261.691406 286.730469 265.273438 271.164062 C 276.980469 220.558594 284.644531 169.222656 292.449219 117.925781 C 293.875 108.519531 295.242188 99.109375 296.628906 89.800781 C 302.945312 89.800781 308.511719 90.039062 314.058594 89.742188 C 321.226562 89.347656 325.40625 83.683594 322.238281 77.761719 C 317.304688 68.550781 316.253906 58.546875 314.394531 48.644531 C 312.929688 40.800781 311.601562 32.917969 309.957031 25.117188 C 308.945312 20.34375 307.421875 15.648438 301.558594 14.757812 C 295.28125 13.808594 292.507812 18.222656 290.03125 22.738281 C 288.507812 25.53125 287.238281 28.484375 285.992188 31.414062 C 280.960938 43.4375 276.089844 55.539062 270.921875 67.5 C 269.949219 69.757812 268.207031 72.453125 266.148438 73.304688 C 262.542969 74.789062 259.925781 76.394531 260.144531 80.574219 C 260.363281 84.792969 263.492188 86.59375 266.957031 87.347656 C 271.414062 88.296875 276.011719 88.613281 281.082031 89.246094 C 281 90.535156 281.039062 92.078125 280.804688 93.585938 C 276.148438 123.828125 271.929688 154.152344 266.660156 184.296875 C 261.472656 213.90625 255.589844 243.394531 249.273438 272.769531 C 245.867188 288.652344 240.359375 303.980469 231.824219 318.003906 C 228.039062 324.203125 223.722656 329.949219 217.304688 333.652344 C 210.492188 337.574219 203.480469 338.046875 197.183594 332.878906 C 192.269531 328.839844 187.714844 324.324219 183.476562 319.570312 C 175.496094 310.65625 168.089844 301.191406 159.949219 292.414062 C 155.828125 287.980469 150.976562 283.976562 145.847656 280.808594 C 137.070312 275.402344 128.554688 276.195312 120.832031 283.046875 C 116.296875 287.066406 111.996094 291.683594 108.789062 296.773438 C 101.996094 307.566406 95.933594 318.816406 89.65625 329.929688 C 87.320312 334.066406 85.160156 338.304688 82.902344 342.503906 C 82.269531 342.464844 81.636719 342.425781 81.023438 342.386719 C 79.554688 339.039062 77.613281 335.808594 76.683594 332.324219 C 73.335938 319.746094 70.148438 307.132812 67.257812 294.457031 C 66.128906 289.542969 66.089844 284.414062 65.277344 279.421875 C 64.40625 273.996094 61.808594 271.539062 57.730469 271.835938 C 53.691406 272.132812 51.570312 275.144531 51.6875 280.550781 C 51.710938 281.085938 51.769531 281.621094 51.828125 282.136719 C 53.351562 293.207031 54.421875 304.359375 56.523438 315.3125 C 58.839844 327.3125 61.96875 339.21875 68.265625 349.933594 C 76.230469 363.5 86.984375 363.816406 95.339844 350.703125 C 97.480469 347.335938 99.222656 343.734375 101.105469 340.207031 C 105.246094 332.464844 109.046875 324.519531 113.542969 316.996094 C 117.503906 310.398438 121.839844 303.941406 126.714844 298 C 132.597656 290.890625 135.921875 290.515625 142.675781 296.773438 Z M 296.726562 44.722656 C 297.242188 44.785156 297.777344 44.863281 298.292969 44.921875 C 300.113281 54.527344 301.9375 64.132812 303.796875 74.078125 L 284.726562 74.078125 C 289.082031 63.441406 292.90625 54.09375 296.726562 44.722656 Z"
        />
      </g>
    </svg>
  );
}

export function FutureFlowBadge({
  systemName,
  position = "bottom-left",
  theme = "auto",
  lang = "he",
  dismissable = true,
  className,
}: FutureFlowBadgeProps) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "true") setDismissed(true);
    }
    // Delay entrance by 2 seconds
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || dismissed) return null;

  const whatsappText =
    lang === "he"
      ? `היי, הגעתי מהמערכת ${systemName} ואשמח לשמוע עוד על FutureFlow`
      : `Hi, I came from ${systemName} and would love to hear more about FutureFlow`;
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`;

  const label =
    lang === "he" ? "נבנה על ידי FutureFlow" : "Powered by FutureFlow";

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  const positionClasses =
    position === "bottom-left" ? "bottom-4 left-4" : "bottom-4 right-4";

  const isDark =
    theme === "dark" ||
    (theme === "auto" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div
      role="complementary"
      aria-label={label}
      className={`fixed z-40 ${positionClasses} ${className ?? ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: visible ? (hovered ? 1 : 0.5) : 0,
        transform: visible ? (hovered ? "scale(1.05)" : "scale(1)") : "scale(0.95)",
        transition: "all 0.3s ease-out",
      }}
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`
          inline-flex items-center gap-2 rounded-full px-2.5 py-1.5
          backdrop-blur-sm border shadow-sm
          ${hovered ? "shadow-md" : ""}
          ${
            isDark
              ? "bg-gray-900/80 border-gray-700/40 text-gray-200"
              : "bg-white/80 border-gray-200/40 text-gray-700"
          }
        `}
        style={{
          textDecoration: "none",
          transition: "all 0.3s ease-out",
        }}
      >
        <ArrowIcon />

        <span
          className="text-xs font-medium whitespace-nowrap overflow-hidden"
          style={{
            maxWidth: hovered ? "160px" : "0px",
            opacity: hovered ? 1 : 0,
            transition: "all 0.3s ease-out",
          }}
        >
          {label}
        </span>
      </a>

      {/* Dismiss button */}
      {dismissable && hovered && (
        <button
          onClick={handleDismiss}
          aria-label={lang === "he" ? "הסתר" : "Dismiss"}
          className={`
            absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full
            flex items-center justify-center text-[10px] leading-none
            transition-opacity duration-200
            ${
              isDark
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-500 hover:bg-gray-300"
            }
          `}
        >
          ✕
        </button>
      )}
    </div>
  );
}
