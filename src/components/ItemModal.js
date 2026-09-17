import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { CATEGORIES } from '../lib/categories';
import { formatAccession } from '../utils/filter';
import Cover from './Cover';
export default function ItemModal({ item, accession, onClose }) {
    const closeRef = useRef(null);
    const meta = CATEGORIES[item.category];
    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);
    return (_jsx("div", { className: "animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6", onClick: onClose, role: "dialog", "aria-modal": "true", "aria-label": item.title, children: _jsxs("div", { className: "animate-rise relative grid max-h-[92dvh] w-full max-w-3xl grid-rows-[auto,1fr] overflow-hidden rounded-t-xl border border-gold/20 bg-ink-900 shadow-2xl sm:rounded-xl md:grid-cols-[280px,1fr] md:grid-rows-none", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "hidden md:block", children: _jsx(Cover, { item: item, accession: accession, className: "h-full" }) }), _jsxs("div", { className: "flex min-h-0 flex-col overflow-y-auto p-6 sm:p-8", children: [_jsx("button", { ref: closeRef, onClick: onClose, "aria-label": "\u5173\u95ED", className: "absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md border border-ink-700 text-paper-dim transition-colors hover:border-gold/50 hover:text-gold", children: _jsx(X, { size: 16 }) }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "flex h-7 w-7 items-center justify-center rounded-sm border", style: { borderColor: `${meta.tint}55`, color: meta.tint }, children: _jsx(meta.icon, { size: 13, strokeWidth: 1.7 }) }), _jsxs("span", { className: "font-mono text-[10px] uppercase tracking-[0.3em] text-paper-muted", children: [meta.en, accession ? ` · ${formatAccession(accession)}` : ''] })] }), _jsx("h2", { className: "mt-4 font-serif text-3xl leading-tight text-paper", children: item.title }), item.source && (_jsx("p", { className: "mt-2 text-sm tracking-wide text-paper-dim", children: item.source })), _jsx("div", { className: "rule-gold my-5" }), item.description && (_jsx("p", { className: "text-[15px] leading-7 text-paper-dim", children: item.description })), item.tags.length > 0 && (_jsx("div", { className: "mt-6 flex flex-wrap gap-2", children: item.tags.map((tag) => (_jsxs("span", { className: "rounded-full border border-ink-700 px-2.5 py-1 text-xs tracking-wide", style: { color: meta.tint }, children: ["#", tag] }, tag))) })), item.url && (_jsxs("a", { href: item.url, target: "_blank", rel: "noreferrer noopener", className: "mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-gold-bright md:mt-8", children: [_jsx(ExternalLink, { size: 15, strokeWidth: 2 }), "\u8BBF\u95EE\u539F\u94FE\u63A5"] }))] })] }) }));
}
