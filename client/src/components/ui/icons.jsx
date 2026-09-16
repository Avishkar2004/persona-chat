import React from "react";

/**
 * Shared icon set. Crisp 24x24 line icons used across the chat UI so we don't
 * rely on emoji glyphs (which render inconsistently across platforms).
 * Each icon inherits `currentColor` and accepts a `className` for sizing.
 *
 * Icons are decorative by default (`aria-hidden`). Any control that shows an
 * icon and no text must carry its own `aria-label`.
 */
function Svg({ children, className = "h-5 w-5", stroke = true, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={stroke ? "none" : "currentColor"}
      stroke={stroke ? "currentColor" : "none"}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SendIcon = (p) => (
  <Svg stroke={false} {...p}>
    <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2 .01 7z" />
  </Svg>
);

export const SmileIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
    <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.2" />
  </Svg>
);

export const ImageIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m4 17 5-5 4 4 2.5-2.5L20 17" />
  </Svg>
);

export const PaperclipIcon = (p) => (
  <Svg {...p}>
    <path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />
  </Svg>
);

export const FileIcon = (p) => (
  <Svg {...p}>
    <path d="M14 3v5h5" />
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
  </Svg>
);

export const SearchIcon = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Svg>
);

export const UserPlusIcon = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
    <path d="M19 8v6M22 11h-6" />
  </Svg>
);

export const SparklesIcon = (p) => (
  <Svg {...p}>
    <path d="M10 3.5 11.6 8a2 2 0 0 0 1.3 1.3l4.6 1.6-4.6 1.6a2 2 0 0 0-1.3 1.3L10 18.5l-1.6-4.6a2 2 0 0 0-1.3-1.3L2.5 11l4.6-1.6A2 2 0 0 0 8.4 8z" />
    <path d="M18.5 3v4M16.5 5h4M18 16v3M16.5 17.5h3" />
  </Svg>
);

export const UploadIcon = (p) => (
  <Svg {...p}>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Svg>
);

export const UsersIcon = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 19c0-3 2.9-5.5 6.5-5.5s6.5 2.5 6.5 5.5" />
    <path d="M16.5 5.4a3.5 3.5 0 0 1 0 6.6M18 13.8c2.1.7 3.5 2.4 3.5 4.4" />
  </Svg>
);

export const InboxIcon = (p) => (
  <Svg {...p}>
    <path d="M3 12h5l1.5 2.5h5L16 12h5" />
    <path d="M5 5h14l2 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" />
  </Svg>
);

export const ChatIcon = (p) => (
  <Svg {...p}>
    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
  </Svg>
);

export const CheckIcon = (p) => (
  <Svg {...p}>
    <path d="m20 6-11 11-5-5" />
  </Svg>
);

export const CloseIcon = (p) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const TrashIcon = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </Svg>
);

export const LogoutIcon = (p) => (
  <Svg {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 17 5 12l5-5M5 12h12" />
  </Svg>
);

export const ChevronDownIcon = (p) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const ArrowLeftIcon = (p) => (
  <Svg {...p}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

export const SunIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);

export const MoonIcon = (p) => (
  <Svg {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </Svg>
);

export const MonitorIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M9 20h6M12 16v4" />
  </Svg>
);

export const WifiIcon = (p) => (
  <Svg {...p}>
    <path d="M2.5 9a15 15 0 0 1 19 0" />
    <path d="M6 12.5a10 10 0 0 1 12 0" />
    <path d="M9.5 16a5 5 0 0 1 5 0" />
    <path d="M12 19.5h.01" strokeWidth="2.4" />
  </Svg>
);

export const WifiOffIcon = (p) => (
  <Svg {...p}>
    <path d="m2 2 20 20" />
    <path d="M6 12.5a10 10 0 0 1 4-2.4M14.4 10.6a10 10 0 0 1 3.6 1.9" />
    <path d="M2.5 9a15 15 0 0 1 5-3.3M16 5.4A15 15 0 0 1 21.5 9" />
    <path d="M9.5 16a5 5 0 0 1 4.6-.3" />
    <path d="M12 19.5h.01" strokeWidth="2.4" />
  </Svg>
);
