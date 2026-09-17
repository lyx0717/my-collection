import { FileText, Film, Globe, UtensilsCrossed } from 'lucide-react';
export const CATEGORIES = {
    movie: {
        label: '影视',
        en: 'FILM',
        icon: Film,
        mark: '影',
        gradient: 'linear-gradient(158deg, #3c1d22 0%, #171013 62%, #120d10 100%)',
        tint: '#c07a72',
    },
    food: {
        label: '美食',
        en: 'FOOD',
        icon: UtensilsCrossed,
        mark: '味',
        gradient: 'linear-gradient(158deg, #3a2c14 0%, #1a1510 62%, #130f0c 100%)',
        tint: '#d0a352',
    },
    article: {
        label: '文章',
        en: 'READING',
        icon: FileText,
        mark: '文',
        gradient: 'linear-gradient(158deg, #222d3e 0%, #12161e 62%, #0e1116 100%)',
        tint: '#86a3c6',
    },
    site: {
        label: '网站',
        en: 'WEB',
        icon: Globe,
        mark: '链',
        gradient: 'linear-gradient(158deg, #1d362d 0%, #111813 62%, #0d130f 100%)',
        tint: '#7bb092',
    },
};
export const CATEGORY_ORDER = ['movie', 'food', 'article', 'site'];
export function isCategory(value) {
    return typeof value === 'string' && CATEGORY_ORDER.includes(value);
}
