import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SearchX } from 'lucide-react';
export default function EmptyState({ title = '没有找到匹配的藏品', hint = '换个关键词，或清空分类与标签筛选试试。', action, }) {
    return (_jsxs("div", { className: "flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-700 px-6 py-20 text-center", children: [_jsx("span", { className: "flex h-12 w-12 items-center justify-center rounded-full border border-gold/25 text-gold/70", children: _jsx(SearchX, { size: 20, strokeWidth: 1.6 }) }), _jsx("p", { className: "mt-4 font-serif text-lg text-paper-dim", children: title }), _jsx("p", { className: "mt-1.5 max-w-xs text-sm leading-6 text-paper-muted", children: hint }), action && _jsx("div", { className: "mt-5", children: action })] }));
}
