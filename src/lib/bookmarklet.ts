/** 生成「收藏到我的书签」书签小工具代码（打开 #/add 深链并携带当前页 URL 与标题） */
export function bookmarkletHref(): string {
  const base =
    window.location.origin + window.location.pathname.replace(/index\.html$/, '')
  const target = `${base}#/add`
  return `javascript:(function(){open('${target}?u='+encodeURIComponent(location.href)+'&t='+encodeURIComponent(document.title),'_blank')})()`
}
