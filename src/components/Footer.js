import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bookmark } from 'lucide-react';
export default function Footer() {
    return (_jsx("footer", { className: "mt-20 border-t border-ink-800/70 py-8", children: _jsxs("div", { className: "mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 text-center sm:px-6 lg:px-10", children: [_jsxs("p", { className: "flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-paper-muted", children: [_jsx(Bookmark, { size: 11, className: "text-gold/70" }), "\u85CF\u54C1\u6570\u636E\u4EC5\u4FDD\u5B58\u5728\u5F53\u524D\u6D4F\u89C8\u5668"] }), _jsx("p", { className: "font-serif text-xs tracking-widest text-paper-muted/70", children: "\u85CF\u7269\u5FD7 \u00B7 \u6536\u62E2\u6563\u843D\u5404\u5904\u7684\u70ED\u7231" })] }) }));
}
