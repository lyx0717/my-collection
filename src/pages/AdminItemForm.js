import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CATEGORIES, CATEGORY_ORDER } from '../lib/categories';
import { parseTags, tagsToText } from '../utils/tags';
function cleanOptional(value) {
    const v = value.trim();
    return v ? v : undefined;
}
function isValidUrl(value) {
    if (!/^https?:\/\//i.test(value))
        return false;
    try {
        const u = new URL(value);
        return u.hostname.includes('.');
    }
    catch {
        return false;
    }
}
const fieldClass = 'h-10 w-full rounded-md border border-ink-700 bg-ink-950/70 px-3 text-sm text-paper placeholder:text-paper-muted/60 transition-colors focus:border-gold/60 focus:outline-none';
const labelClass = 'mb-1.5 block text-xs tracking-widest text-paper-dim';
export default function AdminItemForm({ initial, onSubmit, onCancel }) {
    const [title, setTitle] = useState(initial?.title ?? '');
    const [category, setCategory] = useState(initial?.category ?? 'movie');
    const [source, setSource] = useState(initial?.source ?? '');
    const [url, setUrl] = useState(initial?.url ?? '');
    const [cover, setCover] = useState(initial?.cover ?? '');
    const [tagsText, setTagsText] = useState(tagsToText(initial?.tags ?? []));
    const [description, setDescription] = useState(initial?.description ?? '');
    const [errors, setErrors] = useState({});
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape')
                onCancel();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onCancel]);
    const submit = (e) => {
        e.preventDefault();
        const next = {};
        if (!title.trim())
            next.title = '请填写藏品名称';
        if (url.trim() && !isValidUrl(url.trim()))
            next.url = '链接需以 http:// 或 https:// 开头';
        setErrors(next);
        if (Object.keys(next).length > 0)
            return;
        onSubmit({
            title: title.trim(),
            category,
            source: cleanOptional(source),
            url: cleanOptional(url),
            cover: cleanOptional(cover),
            description: cleanOptional(description),
            tags: parseTags(tagsText),
        });
    };
    return (_jsx("div", { className: "animate-fade-in fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm", onClick: onCancel, role: "dialog", "aria-modal": "true", "aria-label": initial ? '编辑藏品' : '新增藏品', children: _jsxs("form", { onSubmit: submit, onClick: (e) => e.stopPropagation(), className: "animate-drawer flex h-dvh w-full max-w-md flex-col overflow-y-auto border-l border-gold/25 bg-ink-900 shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-ink-800 px-6 py-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-serif text-xl tracking-wide text-paper", children: initial ? '编辑藏品' : '新增藏品' }), _jsx("p", { className: "mt-0.5 text-xs text-paper-muted", children: initial ? '修改后保存，登记号保持不变' : '收入一件新的藏品' })] }), _jsx("button", { type: "button", onClick: onCancel, "aria-label": "\u5173\u95ED", className: "flex h-8 w-8 items-center justify-center rounded-md border border-ink-700 text-paper-dim hover:border-gold/50 hover:text-gold", children: _jsx(X, { size: 16 }) })] }), _jsxs("div", { className: "flex-1 space-y-5 px-6 py-6", children: [_jsxs("div", { children: [_jsxs("label", { className: labelClass, htmlFor: "f-title", children: ["\u540D\u79F0 ", _jsx("span", { className: "text-gold", children: "*" })] }), _jsx("input", { id: "f-title", className: fieldClass, value: title, onChange: (e) => setTitle(e.target.value), placeholder: "\u4F8B\u5982\uFF1A\u82B1\u6837\u5E74\u534E", autoFocus: true }), errors.title && _jsx("p", { className: "mt-1.5 text-xs text-red-400/90", children: errors.title })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass, htmlFor: "f-category", children: "\u5206\u7C7B" }), _jsx("select", { id: "f-category", className: fieldClass, value: category, onChange: (e) => setCategory(e.target.value), children: CATEGORY_ORDER.map((key) => (_jsx("option", { value: key, children: CATEGORIES[key].label }, key))) })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, htmlFor: "f-source", children: "\u6765\u6E90" }), _jsx("input", { id: "f-source", className: fieldClass, value: source, onChange: (e) => setSource(e.target.value), placeholder: "\u5BFC\u6F14 / \u5730\u540D / \u4F5C\u8005" })] })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, htmlFor: "f-url", children: "\u539F\u94FE\u63A5" }), _jsx("input", { id: "f-url", className: fieldClass, value: url, onChange: (e) => setUrl(e.target.value), placeholder: "https://\u2026", inputMode: "url" }), errors.url ? (_jsx("p", { className: "mt-1.5 text-xs text-red-400/90", children: errors.url })) : (_jsx("p", { className: "mt-1.5 text-[11px] text-paper-muted", children: "\u7559\u7A7A\u4E5F\u53EF\u4EE5\uFF0C\u5361\u7247\u5C06\u4E0D\u663E\u793A\u5916\u94FE\u5165\u53E3" }))] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, htmlFor: "f-cover", children: "\u5C01\u9762\u56FE\u94FE\u63A5" }), _jsx("input", { id: "f-cover", className: fieldClass, value: cover, onChange: (e) => setCover(e.target.value), placeholder: "https://\u2026\uFF08\u7559\u7A7A\u4F7F\u7528\u6392\u7248\u5C01\u9762\uFF09", inputMode: "url" })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, htmlFor: "f-tags", children: "\u6807\u7B7E" }), _jsx("input", { id: "f-tags", className: fieldClass, value: tagsText, onChange: (e) => setTagsText(e.target.value), placeholder: "\u7EAA\u5F55\u7247\uFF0C\u738B\u5BB6\u536B\uFF0C\u9999\u6E2F\u7535\u5F71" }), _jsx("p", { className: "mt-1.5 text-[11px] text-paper-muted", children: "\u7528\u9017\u53F7\u5206\u9694\u591A\u4E2A\u6807\u7B7E\uFF0C\u53EF\u4E2D\u82F1\u6DF7\u6392" })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, htmlFor: "f-desc", children: "\u77ED\u8BC4 / \u5907\u6CE8" }), _jsx("textarea", { id: "f-desc", rows: 5, className: "w-full resize-y rounded-md border border-ink-700 bg-ink-950/70 px-3 py-2.5 text-sm leading-6 text-paper placeholder:text-paper-muted/60 transition-colors focus:border-gold/60 focus:outline-none", value: description, onChange: (e) => setDescription(e.target.value), placeholder: "\u4E3A\u4EC0\u4E48\u60F3\u7559\u4E0B\u5B83\uFF1F\u8BB0\u4E00\u7B14\u2026\u2026" })] })] }), _jsxs("div", { className: "flex items-center justify-end gap-3 border-t border-ink-800 px-6 py-4", children: [_jsx("button", { type: "button", onClick: onCancel, className: "rounded-md border border-ink-600 px-4 py-2 text-sm text-paper-dim transition-colors hover:border-gold/40 hover:text-paper", children: "\u53D6\u6D88" }), _jsx("button", { type: "submit", className: "rounded-md bg-gold px-5 py-2 text-sm font-medium text-ink-950 transition-colors hover:bg-gold-bright", children: initial ? '保存修改' : '收入馆藏' })] })] }) }));
}
