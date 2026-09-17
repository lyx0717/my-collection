import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SEED_ITEMS } from '../data/seed';
import { isCategory } from '../lib/categories';
import { buildAccessionMap } from '../utils/filter';
import { uid } from '../utils/id';
const STORAGE_KEY = 'cangwuzhi:items:v1';
function isItem(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const v = value;
    return (typeof v.id === 'string' &&
        typeof v.title === 'string' &&
        v.title.trim().length > 0 &&
        isCategory(v.category) &&
        Array.isArray(v.tags) &&
        v.tags.every((t) => typeof t === 'string') &&
        typeof v.createdAt === 'string' &&
        !Number.isNaN(Date.parse(v.createdAt)));
}
/** 宽松解析导入内容：补齐缺失字段，无法识别的条目直接丢弃 */
function normalizeImported(raw) {
    if (!Array.isArray(raw))
        throw new Error('文件内容不是收藏列表（应为 JSON 数组）');
    const items = [];
    for (const entry of raw) {
        if (typeof entry !== 'object' || entry === null)
            continue;
        const e = entry;
        if (typeof e.title !== 'string' || !e.title.trim() || !isCategory(e.category))
            continue;
        items.push({
            id: typeof e.id === 'string' && e.id ? e.id : uid(),
            title: e.title.trim(),
            category: e.category,
            source: typeof e.source === 'string' ? e.source : undefined,
            url: typeof e.url === 'string' ? e.url : undefined,
            cover: typeof e.cover === 'string' ? e.cover : undefined,
            description: typeof e.description === 'string' ? e.description : undefined,
            tags: Array.isArray(e.tags) ? e.tags.filter((t) => typeof t === 'string') : [],
            createdAt: typeof e.createdAt === 'string' && !Number.isNaN(Date.parse(e.createdAt))
                ? e.createdAt
                : new Date().toISOString(),
        });
    }
    if (items.length === 0)
        throw new Error('没有找到可导入的有效收藏');
    return dedupeById(items);
}
function dedupeById(items) {
    const map = new Map();
    for (const item of items) {
        let id = item.id;
        while (map.has(id))
            id = uid();
        map.set(id, { ...item, id });
    }
    return [...map.values()];
}
function loadInitial() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.every(isItem)) {
                return dedupeById(parsed);
            }
        }
    }
    catch {
        // 数据损坏时回落到内置示例，不阻塞使用
    }
    return SEED_ITEMS;
}
const CollectionContext = createContext(null);
export function CollectionProvider({ children }) {
    const [items, setItems] = useState(loadInitial);
    const hydrated = useRef(false);
    useEffect(() => {
        // 首次挂载不写回，避免把“读取自存储”误当成一次修改
        if (!hydrated.current) {
            hydrated.current = true;
            return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }, [items]);
    const addItem = useCallback((input) => {
        setItems((prev) => [...prev, { ...input, id: uid(), createdAt: new Date().toISOString() }]);
    }, []);
    const updateItem = useCallback((id, input) => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...input } : it)));
    }, []);
    const removeItem = useCallback((id) => {
        setItems((prev) => prev.filter((it) => it.id !== id));
    }, []);
    const importItems = useCallback((jsonText) => {
        const incoming = normalizeImported(JSON.parse(jsonText));
        setItems((prev) => dedupeById([...prev, ...incoming]));
        return incoming.length;
    }, []);
    const resetToSeed = useCallback(() => {
        setItems(SEED_ITEMS);
    }, []);
    const exportItems = useCallback(() => {
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `cangwuzhi-${stamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [items]);
    const accessionMap = useMemo(() => buildAccessionMap(items), [items]);
    const accessionOf = useCallback((id) => accessionMap.get(id), [accessionMap]);
    const value = useMemo(() => ({ items, accessionOf, addItem, updateItem, removeItem, importItems, resetToSeed, exportItems }), [items, accessionOf, addItem, updateItem, removeItem, importItems, resetToSeed, exportItems]);
    return _jsx(CollectionContext.Provider, { value: value, children: children });
}
export function useCollection() {
    const ctx = useContext(CollectionContext);
    if (!ctx)
        throw new Error('useCollection 必须在 CollectionProvider 内使用');
    return ctx;
}
