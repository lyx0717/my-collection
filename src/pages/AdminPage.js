import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, Pencil, Plus, RotateCcw, Search, Trash2, Upload, } from 'lucide-react';
import { useCollection } from '../store/CollectionContext';
import { CATEGORIES, CATEGORY_ORDER } from '../lib/categories';
import { formatAccession } from '../utils/filter';
import Cover from '../components/Cover';
import EmptyState from '../components/EmptyState';
import AdminItemForm from './AdminItemForm';
export default function AdminPage() {
    const { items, accessionOf, addItem, updateItem, removeItem, importItems, resetToSeed, exportItems } = useCollection();
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [resetting, setResetting] = useState(false);
    const [toast, setToast] = useState(null);
    const fileRef = useRef(null);
    const toastTimer = useRef(undefined);
    const showToast = (t) => {
        setToast(t);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 3200);
    };
    const sorted = useMemo(() => [...items]
        .filter((i) => {
        const q = query.trim().toLowerCase();
        if (!q)
            return true;
        return [i.title, i.source ?? '', i.tags.join(' ')]
            .join(' ')
            .toLowerCase()
            .includes(q);
    })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [items, query]);
    const handleSubmit = (input) => {
        if (editing) {
            updateItem(editing.id, input);
            showToast({ kind: 'ok', text: `已保存对「${input.title}」的修改` });
            setEditing(null);
        }
        else {
            addItem(input);
            showToast({ kind: 'ok', text: `「${input.title}」已收入馆藏` });
            setCreating(false);
        }
    };
    const handleImportFile = async (file) => {
        try {
            const text = await file.text();
            const count = importItems(text);
            showToast({ kind: 'ok', text: `成功导入 ${count} 件藏品` });
        }
        catch (err) {
            showToast({ kind: 'err', text: err instanceof Error ? err.message : '导入失败，请检查文件格式' });
        }
    };
    const confirmDelete = () => {
        if (!deleting)
            return;
        removeItem(deleting.id);
        showToast({ kind: 'ok', text: `「${deleting.title}」已移出馆藏` });
        setDeleting(null);
    };
    const confirmReset = () => {
        resetToSeed();
        setResetting(false);
        showToast({ kind: 'ok', text: '已恢复为内置示例藏品' });
    };
    return (_jsxs("div", { className: "pb-16 pt-10", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [_jsxs("div", { children: [_jsxs(Link, { to: "/", className: "inline-flex items-center gap-1.5 text-xs tracking-wide text-paper-muted transition-colors hover:text-gold", children: [_jsx(ArrowLeft, { size: 13 }), "\u8FD4\u56DE\u85CF\u54C1\u9986"] }), _jsx("h1", { className: "mt-3 font-serif text-3xl tracking-[0.1em] text-paper", children: "\u9986\u85CF\u7BA1\u7406" }), _jsxs("p", { className: "mt-2 text-sm text-paper-muted", children: ["\u5171 ", items.length, " \u4EF6\u85CF\u54C1\uFF0C\u6539\u52A8\u81EA\u52A8\u4FDD\u5B58\u5728\u6B64\u6D4F\u89C8\u5668\u4E2D\u3002"] })] }), _jsxs("button", { onClick: () => setCreating(true), className: "inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-gold-bright", children: [_jsx(Plus, { size: 16, strokeWidth: 2.2 }), "\u65B0\u589E\u85CF\u54C1"] })] }), _jsxs("div", { className: "mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "relative w-full lg:max-w-xs", children: [_jsx(Search, { size: 15, className: "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-muted" }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "\u5728\u7BA1\u7406\u5217\u8868\u4E2D\u7B5B\u9009\u2026\u2026", className: "h-10 w-full rounded-md border border-ink-700 bg-ink-900 pl-10 pr-3 text-sm text-paper placeholder:text-paper-muted/70 focus:border-gold/60 focus:outline-none" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("button", { onClick: exportItems, className: "inline-flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-2 text-xs text-paper-dim transition-colors hover:border-gold/45 hover:text-paper", children: [_jsx(Download, { size: 13 }), "\u5BFC\u51FA JSON"] }), _jsxs("button", { onClick: () => fileRef.current?.click(), className: "inline-flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-2 text-xs text-paper-dim transition-colors hover:border-gold/45 hover:text-paper", children: [_jsx(Upload, { size: 13 }), "\u5BFC\u5165 JSON"] }), _jsx("input", { ref: fileRef, type: "file", accept: "application/json,.json", className: "hidden", onChange: (e) => {
                                    const file = e.target.files?.[0];
                                    if (file)
                                        void handleImportFile(file);
                                    e.target.value = '';
                                } }), _jsxs("button", { onClick: () => setResetting(true), className: "inline-flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-2 text-xs text-paper-dim transition-colors hover:border-red-400/50 hover:text-red-300", children: [_jsx(RotateCcw, { size: 13 }), "\u6062\u590D\u793A\u4F8B"] })] })] }), _jsx("div", { className: "rule-gold mt-6" }), sorted.length === 0 ? (_jsx("div", { className: "mt-8", children: _jsx(EmptyState, { title: query ? '没有匹配的藏品' : '馆藏还是空的', hint: query ? '换个关键词试试。' : '从第一件藏品开始，建立你的私人藏品馆。', action: !query && (_jsxs("button", { onClick: () => setCreating(true), className: "inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink-950 hover:bg-gold-bright", children: [_jsx(Plus, { size: 15 }), "\u65B0\u589E\u85CF\u54C1"] })) }) })) : (_jsx("ul", { className: "mt-6 divide-y divide-ink-800/80 rounded-lg border border-ink-800 bg-ink-900/40", children: sorted.map((item) => {
                    const meta = CATEGORIES[item.category];
                    return (_jsxs("li", { className: "flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-ink-850/70 sm:px-5", children: [_jsx(Cover, { item: item, size: "sm" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-mono text-[10px] tracking-wider text-gold/70", children: formatAccession(accessionOf(item.id) ?? 0) }), _jsx("span", { className: "rounded-sm border px-1.5 py-px text-[10px]", style: { borderColor: `${meta.tint}44`, color: meta.tint }, children: meta.label })] }), _jsx("p", { className: "mt-1 truncate font-serif text-base text-paper", children: item.title }), _jsx("p", { className: "truncate text-xs text-paper-muted", children: [item.source, item.tags.length > 0 ? `# ${item.tags.join('  # ')}` : '']
                                            .filter(Boolean)
                                            .join('　·　') })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [item.url && (_jsx("a", { href: item.url, target: "_blank", rel: "noreferrer noopener", "aria-label": `访问 ${item.title}`, className: "flex h-8 w-8 items-center justify-center rounded-md text-paper-muted transition-colors hover:text-gold", children: _jsx(ExternalLink, { size: 15 }) })), _jsx("button", { onClick: () => setEditing(item), "aria-label": `编辑 ${item.title}`, className: "flex h-8 w-8 items-center justify-center rounded-md text-paper-muted transition-colors hover:text-gold", children: _jsx(Pencil, { size: 15 }) }), _jsx("button", { onClick: () => setDeleting(item), "aria-label": `删除 ${item.title}`, className: "flex h-8 w-8 items-center justify-center rounded-md text-paper-muted transition-colors hover:text-red-300", children: _jsx(Trash2, { size: 15 }) })] })] }, item.id));
                }) })), _jsx("div", { className: "mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4", children: CATEGORY_ORDER.map((key) => {
                    const meta = CATEGORIES[key];
                    const count = items.filter((i) => i.category === key).length;
                    return (_jsxs("div", { className: "rounded-lg border border-ink-800 bg-ink-900/40 px-4 py-3", children: [_jsxs("div", { className: "flex items-center gap-2", style: { color: meta.tint }, children: [_jsx(meta.icon, { size: 14, strokeWidth: 1.7 }), _jsx("span", { className: "text-xs tracking-widest", children: meta.label })] }), _jsx("p", { className: "mt-2 font-mono text-xl text-paper", children: count })] }, key));
                }) }), (creating || editing) && (_jsx(AdminItemForm, { initial: editing, onSubmit: handleSubmit, onCancel: () => {
                    setCreating(false);
                    setEditing(null);
                } })), deleting && (_jsx(ConfirmDialog, { title: "\u79FB\u51FA\u8FD9\u4EF6\u85CF\u54C1\uFF1F", message: `「${deleting.title}」将从馆藏中删除，此操作无法撤销。`, confirmText: "\u5220\u9664", danger: true, onConfirm: confirmDelete, onCancel: () => setDeleting(null) })), resetting && (_jsx(ConfirmDialog, { title: "\u6062\u590D\u4E3A\u5185\u7F6E\u793A\u4F8B\uFF1F", message: "\u5F53\u524D\u6D4F\u89C8\u5668\u91CC\u7684\u5168\u90E8\u85CF\u54C1\u5C06\u88AB 16 \u4EF6\u793A\u4F8B\u85CF\u54C1\u8986\u76D6\u3002\u5EFA\u8BAE\u5148\u5BFC\u51FA\u5907\u4EFD\u3002", confirmText: "\u6062\u590D\u793A\u4F8B", danger: true, onConfirm: confirmReset, onCancel: () => setResetting(false) })), toast && (_jsx("div", { role: "status", className: `animate-rise fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md border px-4 py-2.5 text-sm shadow-xl ${toast.kind === 'ok'
                    ? 'border-gold/40 bg-ink-850 text-paper'
                    : 'border-red-400/40 bg-ink-850 text-red-300'}`, children: toast.text }))] }));
}
function ConfirmDialog({ title, message, confirmText, danger, onConfirm, onCancel, }) {
    return (_jsx("div", { className: "animate-fade-in fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm", onClick: onCancel, role: "alertdialog", "aria-modal": "true", children: _jsxs("div", { className: "animate-rise w-full max-w-sm rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-2xl", onClick: (e) => e.stopPropagation(), children: [_jsx("h3", { className: "font-serif text-lg text-paper", children: title }), _jsx("p", { className: "mt-2 text-sm leading-6 text-paper-dim", children: message }), _jsxs("div", { className: "mt-6 flex justify-end gap-3", children: [_jsx("button", { onClick: onCancel, className: "rounded-md border border-ink-600 px-4 py-2 text-sm text-paper-dim hover:border-gold/40 hover:text-paper", children: "\u53D6\u6D88" }), _jsx("button", { onClick: onConfirm, className: `rounded-md px-4 py-2 text-sm font-medium transition-colors ${danger
                                ? 'bg-red-500/90 text-white hover:bg-red-500'
                                : 'bg-gold text-ink-950 hover:bg-gold-bright'}`, children: confirmText })] })] }) }));
}
