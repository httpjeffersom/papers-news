const paths = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  refresh: <><path d="M20 7v5h-5" /><path d="M4.9 9A7.5 7.5 0 0 1 18 6l2 6" /><path d="M4 17v-5h5" /><path d="M19.1 15A7.5 7.5 0 0 1 6 18l-2-6" /></>,
  feed: <><path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h10" /></>,
  bookmark: <><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4z" /></>,
  source: <><rect x="3.5" y="4" width="17" height="16" rx="2.5" /><path d="M7.5 8h9M7.5 12h9M7.5 16h5" /></>,
  external: <><path d="M14 4h6v6" /><path d="m20 4-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  trash: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="m6 7 1 13h10l1-13M9 7V4h6v3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></>,
  moon: <path d="M20.2 14.3A8.5 8.5 0 0 1 9.7 3.8 8.5 8.5 0 1 0 20.2 14.3Z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  read: <><path d="M12 6.5c-1.4-1.3-3.4-2-6-2H3v14h3c2.6 0 4.6.7 6 2 1.4-1.3 3.4-2 6-2h3v-14h-3c-2.6 0-4.6.7-6 2Z" /><path d="M12 6.5v14" /></>,
  back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
};

export default function Icon({ name, className = "" }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
