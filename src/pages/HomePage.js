import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react';
import { useCollection } from '../store/CollectionContext';
import { CATEGORIES, CATEGORY_ORDER } from '../lib/categories';
import { matchQuery } from '../utils/filter';
import SearchBar from '../components/SearchBar';
import CategoryBar from '../components/CategoryBar';
import TagFilter from '../components/TagFilter';
import ItemCard from '../components/ItemCard';
import ItemModal from '../components/ItemModal';
import EmptyState from '../components/EmptyState';
export default function HomePage() {
    const { items, accessionOf } = useCollection();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [activeTag, setActiveTag] = useState(null);
    const [sort, setSort] = useState('desc');
    const [opened, setOpened] = useState(null);
    const counts = useMemo(() => {
        const result = {
            all: items.length,
            movie: 0,
            food: 0,
            article: 0,
            site: 0,
        };
        for (const item of items)
            result[item.category] += 1;
        return result;
    }, [items]);
    // 标签池只受分类影响，不受搜索词影响，避免筛选过程中标签消失
    const tagPoolItems = useMemo(() => (category === 'all' ? items : items.filter((i) => i.category === category)), [items, category]);
    const visible = useMemo(() => {
        const filtered = items.filter((item) => {
            if (category !== 'all' && item.category !== category)
                return false;
            if (activeTag && !item.tags.includes(activeTag))
                return false;
            return matchQuery(item, query);
        });
        return filtered.sort((a, b) => sort === 'desc'
            ? b.createdAt.localeCompare(a.createdAt)
            : a.createdAt.localeCompare(b.createdAt));
    }, [items, category, activeTag, query, sort]);
    const handleCategoryChange = (next) => {
        setCategory(next);
        setActiveTag(null);
    };
    const mastCounts = CATEGORY_ORDER;
    return (_jsxs("div", { children: [_jsxs("section", { className: "pb-10 pt-12 sm:pt-16", children: [_jsx("p", { className: "font-mono text-[10px] uppercase tracking-[0.4em] text-gold/70", children: "A Personal Collection" }), _jsx("h1", { className: "mt-3 font-serif text-5xl tracking-[0.12em] text-paper sm:text-6xl", children: "\u85CF\u54C1\u603B\u76EE" }), _jsx("div", { className: "rule-gold mt-6" }), _jsxs("div", { className: "mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [_jsx("p", { className: "max-w-xl text-sm leading-7 text-paper-dim", children: "\u5728\u6B64\u6536\u62E2\u6563\u843D\u5404\u5904\u7684\u70ED\u7231\u2014\u2014\u4E00\u90E8\u53CD\u590D\u91CD\u770B\u7684\u7535\u5F71\u3001\u4E00\u53E3\u8BB0\u5230\u73B0\u5728\u7684\u5473\u9053\u3001\u4E00\u7BC7\u503C\u5F97\u957F\u8BFB\u7684\u6587\u7AE0\u3001\u4E00\u4E2A\u60F3\u4E00\u76F4\u7559\u4F4F\u7684\u7F51\u7AD9\u3002" }), _jsxs("dl", { className: "flex shrink-0 items-center gap-5", children: [mastCounts.map((key) => {
                                        const meta = CATEGORIES[key];
                                        return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(meta.icon, { size: 14, strokeWidth: 1.7, style: { color: meta.tint } }), _jsxs("div", { className: "leading-tight", children: [_jsx("dt", { className: "sr-only", children: meta.label }), _jsx("dd", { className: "font-mono text-base text-paper", children: counts[key] })] })] }, key));
                                    }), _jsx("div", { className: "h-8 w-px bg-ink-700" }), _jsxs("div", { className: "leading-tight", children: [_jsx("dd", { className: "font-mono text-base text-gold", children: counts.all }), _jsx("dd", { className: "text-[10px] tracking-widest text-paper-muted", children: "\u603B\u85CF\u54C1" })] })] })] })] }), _jsxs("section", { className: "sticky top-14 z-20 -mx-4 space-y-3 border-b border-ink-800/70 bg-ink-950/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10", children: [_jsx(SearchBar, { value: query, onChange: setQuery, resultCount: visible.length }), _jsxs("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsx(CategoryBar, { active: category, counts: counts, onChange: handleCategoryChange }), _jsxs("button", { onClick: () => setSort((s) => (s === 'desc' ? 'asc' : 'desc')), className: "flex shrink-0 items-center gap-1.5 self-start rounded-md border border-ink-700 px-3 py-1.5 text-xs tracking-wide text-paper-dim transition-colors hover:border-gold/40 hover:text-paper lg:self-auto", children: [sort === 'desc' ? (_jsx(ArrowDownWideNarrow, { size: 13, strokeWidth: 1.8 })) : (_jsx(ArrowUpWideNarrow, { size: 13, strokeWidth: 1.8 })), sort === 'desc' ? '最新收录' : '最早收录'] })] }), _jsx(TagFilter, { items: tagPoolItems, active: activeTag, onChange: setActiveTag })] }), _jsx("section", { className: "py-8", children: visible.length === 0 ? (_jsx(EmptyState, { action: _jsx("button", { onClick: () => {
                            setQuery('');
                            setActiveTag(null);
                            setCategory('all');
                        }, className: "rounded-md border border-gold/40 px-4 py-2 text-sm text-gold transition-colors hover:bg-gold/10", children: "\u6E05\u7A7A\u5168\u90E8\u7B5B\u9009" }) })) : (_jsx("div", { className: "grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4", children: visible.map((item, index) => (_jsx(ItemCard, { item: item, accession: accessionOf(item.id) ?? 0, index: index, onOpen: setOpened }, item.id))) })) }), opened && (_jsx(ItemModal, { item: opened, accession: accessionOf(opened.id), onClose: () => setOpened(null) }))] }));
}
