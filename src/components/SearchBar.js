import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
export default function SearchBar({ value, onChange, resultCount }) {
    const inputRef = useRef(null);
    useEffect(() => {
        const onKey = (e) => {
            const target = e.target;
            const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
            if (e.key === '/' && !typing) {
                e.preventDefault();
                inputRef.current?.focus();
            }
            if (e.key === 'Escape' && document.activeElement === inputRef.current) {
                onChange('');
                inputRef.current?.blur();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onChange]);
    return (_jsxs("div", { className: "group relative", children: [_jsx(Search, { size: 17, strokeWidth: 1.8, className: "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-paper-muted transition-colors group-focus-within:text-gold" }), _jsx("input", { ref: inputRef, type: "text", value: value, onChange: (e) => onChange(e.target.value), placeholder: "\u641C\u7D22\u85CF\u54C1\u540D\u79F0\u3001\u5907\u6CE8\u6216\u6807\u7B7E\u2026\u2026", className: "h-12 w-full rounded-lg border border-ink-700 bg-ink-900 pl-11 pr-24 text-sm text-paper placeholder:text-paper-muted/70 transition-colors focus:border-gold/60 focus:outline-none" }), _jsxs("div", { className: "absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2", children: [value ? (_jsx("button", { onClick: () => onChange(''), "aria-label": "\u6E05\u7A7A\u641C\u7D22", className: "flex h-6 w-6 items-center justify-center rounded text-paper-muted hover:text-gold", children: _jsx(X, { size: 14 }) })) : (_jsx("kbd", { className: "hidden rounded border border-ink-700 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-paper-muted sm:block", children: "/" })), value && (_jsxs("span", { className: "font-mono text-[11px] tracking-wider text-gold/80", children: [resultCount, " \u4EF6"] }))] })] }));
}
