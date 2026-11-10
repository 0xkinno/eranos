// 24 px stroke icon set, 1.5 px, round caps. No icon library.
const S = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
export const Power = () => (<svg {...S}><path d="M12 3v8" /><path d="M6.3 6.6a8 8 0 1 0 11.4 0" /></svg>);
export const Wallet = () => (<svg {...S}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M16 12.5h2" /><path d="M5 6l11-3v3" /></svg>);
export const Check = () => (<svg {...S}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>);
export const LinkOut = () => (<svg {...S}><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></svg>);
export const Copy = () => (<svg {...S}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></svg>);
export const Key = () => (<svg {...S}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9" /><path d="M16 7l3 3" /></svg>);
export const Menu = () => (<svg {...S}><path d="M4 8h16M4 16h16" /></svg>);
export const Close = () => (<svg {...S}><path d="M6 6l12 12M18 6L6 18" /></svg>);
