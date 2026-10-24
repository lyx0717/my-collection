/**
 * 模块标题：标题在上、卡片在下。
 *
 * mb-5 而非更紧：标题与它所属的卡片要像「一组」，
 * 而与上一个模块卡片之间的留白由 SettingsPage 的 space-y-14 负责。
 * 两层间距分工明确，调一处不会连带另一处跑偏。
 *
 * 15px 而非 20px：设置页的大标题（22px）才是页面的第一层级，
 * 模块标题是第二层级。曾经反过来 —— 20px 的模块标题比 15px 的页面标题还大，
 * 第一眼认不出自己在哪一页。
 */
export default function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {desc && <p className="mt-1.5 text-[13px] leading-5 text-ink3">{desc}</p>}
    </div>
  )
}
