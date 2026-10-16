/**
 * 模块标题：标题在上、卡片在下。
 *
 * mb-5 而非更紧：标题与它所属的卡片要像「一组」，
 * 而与上一个模块卡片之间的留白由 SettingsPage 的 space-y-14 负责。
 * 两层间距分工明确，调一处不会连带另一处跑偏。
 */
export default function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[20px] font-bold">{title}</h2>
      {desc && <p className="mt-1.5 text-[13px] leading-5 text-ink3">{desc}</p>}
    </div>
  )
}
