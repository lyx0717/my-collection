import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { LibraryBig, Settings2 } from 'lucide-react';
export default function Header() {
    const linkClass = ({ isActive }) => [
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm tracking-wide transition-colors',
        isActive
            ? 'bg-gold/10 text-gold-bright'
            : 'text-paper-dim hover:bg-ink-800 hover:text-paper',
    ].join(' ');
    return (_jsx("header", { className: "sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-md", children: _jsxs("div", { className: "mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10", children: [_jsxs(NavLink, { to: "/", className: "group flex items-center gap-2.5", children: [_jsx("span", { className: "flex h-8 w-8 items-center justify-center rounded-md border border-gold/35 bg-ink-900 font-serif text-lg text-gold transition-colors group-hover:border-gold/70", children: "\u85CF" }), _jsxs("span", { className: "leading-none", children: [_jsx("span", { className: "block font-serif text-base tracking-[0.2em] text-paper", children: "\u85CF\u7269\u5FD7" }), _jsx("span", { className: "mt-0.5 block font-mono text-[9px] uppercase tracking-[0.28em] text-paper-muted", children: "Personal Collection" })] })] }), _jsxs("nav", { className: "flex items-center gap-1", children: [_jsxs(NavLink, { to: "/", end: true, className: linkClass, children: [_jsx(LibraryBig, { size: 15, strokeWidth: 1.8 }), _jsx("span", { className: "hidden sm:inline", children: "\u85CF\u54C1\u9986" })] }), _jsxs(NavLink, { to: "/admin", className: linkClass, children: [_jsx(Settings2, { size: 15, strokeWidth: 1.8 }), _jsx("span", { className: "hidden sm:inline", children: "\u7BA1\u7406" })] })] })] }) }));
}
