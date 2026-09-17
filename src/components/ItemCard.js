import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowUpRight } from 'lucide-react';
import { CATEGORIES } from '../lib/categories';
import Cover from './Cover';
export default function ItemCard({ item, accession, index, onOpen }) {
    const meta = CATEGORIES[item.category];
    return (_jsxs("article", { role: "button", tabIndex: 0, "aria-label": `查看藏品：${item.title}`, onClick: () => onOpen(item), onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(item);
            }
        }, style: { animationDelay: `${Math.min(index, 11) * 45}ms` }, className: "group animate-rise cursor-pointer overflow-hidden rounded-lg border border-ink-700/80 bg-ink-850 transition-all duration-300 hover:-translate-y-1 hover:border-gold/45 hover:shadow-[0_18px_45px_-18px_rgba(0,0,0,0.85)] focus:outline-none", children: [_jsx("div", { className: "overflow-hidden", children: _jsx(Cover, { item: item, accession: accession }) }), _jsxs("div", { className: "border-t border-ink-800 p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("h3", { className: "font-serif text-lg leading-snug text-paper transition-colors group-hover:text-gold-bright", children: item.title }), item.url && (_jsx(ArrowUpRight, { size: 15, className: "mt-1 shrink-0 text-paper-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold", strokeWidth: 1.8 }))] }), item.source && (_jsx("p", { className: "mt-1 truncate text-xs tracking-wide text-paper-muted", children: item.source })), item.tags.length > 0 && (_jsxs("div", { className: "mt-3 flex flex-wrap gap-x-2.5 gap-y-1", children: [item.tags.slice(0, 3).map((tag) => (_jsxs("span", { className: "text-[11px] tracking-wide", style: { color: meta.tint }, children: ["#", tag] }, tag))), item.tags.length > 3 && (_jsxs("span", { className: "text-[11px] text-paper-muted", children: ["+", item.tags.length - 3] }))] }))] })] }));
}
