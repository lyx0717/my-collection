export default function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[20px] font-bold">{title}</h2>
      {desc && <p className="mt-1 text-[13px] text-ink3">{desc}</p>}
    </div>
  )
}
