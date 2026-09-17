import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CATEGORIES, CATEGORY_ORDER } from '../lib/categories';
export default function CategoryBar({ active, counts, onChange }) {
    const chips = [
        { key: 'all', label: '全部' },
        ...CATEGORY_ORDER.map((key) => ({
            key,
            label: CATEGORIES[key].label,
            icon: CATEGORIES[key].icon,
        })),
    ];
    return (_jsx("div", { className: "flex flex-wrap items-center gap-2", children: chips.map(({ key, label, icon: Icon }) => {
            const isActive = active === key;
            return (_jsxs("button", { onClick: () => onChange(key), className: [
                    'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] tracking-wide transition-all',
                    isActive
                        ? 'border-gold/55 bg-gold/12 text-gold-bright'
                        : 'border-ink-700 bg-ink-900/60 text-paper-dim hover:border-gold/35 hover:text-paper',
                ].join(' '), children: [Icon && _jsx(Icon, { size: 13, strokeWidth: 1.8 }), label, _jsx("span", { className: `font-mono text-[10px] ${isActive ? 'text-gold/80' : 'text-paper-muted'}`, children: counts[key] })] }, key));
        }) }));
}
