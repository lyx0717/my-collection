import { useState, type ReactNode } from 'react'
import { ArrowLeft, Folder, HardDrive, Info, Palette } from 'lucide-react'
import { useBookmarks } from '../store/BookmarksContext'
import { useToast } from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import CollectionModal from '../components/CollectionModal'
import CapsuleNav, { type CapsuleNavItem } from '../components/CapsuleNav'
import ThemeToggle from '../components/ThemeToggle'
import AppearanceSection from '../components/settings/AppearanceSection'
import DataSection from '../components/settings/DataSection'
import CollectionsSection from '../components/settings/CollectionsSection'
import AboutSection from '../components/settings/AboutSection'
import type { Collection } from '../types'

type Section = 'appearance' | 'data' | 'collections' | 'about'

type ConfirmState =
  | null
  | 'reset'
  | 'clear'
  | { collection: Collection }

export default function SettingsPage() {
  const { collections, addCollection, renameCollection, removeCollection, resetToSeed, clearAll } =
    useBookmarks()
  const toast = useToast()
  const [section, setSection] = useState<Section>('appearance')
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [collectionModal, setCollectionModal] = useState<
    { mode: 'create' } | { mode: 'edit'; collection: Collection } | null
  >(null)

  const navItems: Array<{ key: Section; label: string; icon: ReactNode }> = [
    { key: 'appearance', label: '外观', icon: <Palette size={16} strokeWidth={1.8} /> },
    { key: 'data', label: '数据导入导出', icon: <HardDrive size={16} strokeWidth={1.8} /> },
    { key: 'collections', label: '分组管理', icon: <Folder size={16} strokeWidth={1.8} /> },
    { key: 'about', label: '关于', icon: <Info size={16} strokeWidth={1.8} /> },
  ]

  const submitCollection = (name: string, icon?: string) => {
    if (collectionModal?.mode === 'edit') {
      renameCollection(collectionModal.collection.id, name, icon)
      toast(`分组「${name}」已更新`)
    } else {
      addCollection(name, icon)
      toast(`分组「${name}」已创建`)
    }
  }

  return (
    // 同 HomePage：不加 bg-canvas，否则会盖住 body 下的氛围光层
    <div className="min-h-dvh">
      {/* 顶部通栏 fixed，与首页 DockBar 同一形态 */}
      <header className="glass-chrome fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b px-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2.5">
          <a
            href="#/"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] text-ink2 transition-colors hover:bg-surface-2 hover:text-accent"
            aria-label="返回书签"
          >
            <ArrowLeft size={17} />
          </a>
          <h1 className="text-[15px] font-bold">设置</h1>
          {/* 与首页 DockBar 同一套明暗切换，放在返回键与内容之间 ——
              改主题时往往就在设置页里，不该还要退回首页才切得了。 */}
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* fixed 顶栏不占文档流，垫一段等高空白，
          否则下方 sticky 导航会整体上移 56px、压住内容。 */}
      <div aria-hidden className="h-14" />

      {/* 导航：与首页分组导航共用 CapsuleNav，宽度同样按内容自适应居中。
          sticky top-14 让它吸在通栏顶栏下方。
          pointer-events-none + 胶囊内 auto：这条 sticky 带通栏占满，
          而胶囊只有内容宽度，两侧空白若参与命中测试会吃掉下层内容的点击。 */}
      <div className="pointer-events-none sticky top-14 z-30 px-4 py-3 sm:px-6">
        <CapsuleNav
          ariaLabel="设置导航"
          items={navItems.map<CapsuleNavItem>((n) => ({
            key: n.key,
            label: n.label,
            icon: n.icon,
            active: section === n.key,
            onClick: () => {
              setSection(n.key)
              document.getElementById(`sec-${n.key}`)?.scrollIntoView({ behavior: 'smooth' })
            },
          }))}
          maxWidth="min(700px, calc(100vw - 32px))"
        />
      </div>

      {/* 内容宽度收到 760px：iOS 设置页是分组列表（约 390~430pt），
          过宽的设置页会让人失去「这是一份清单」的认知。
          pt-6 让首个区块与吸顶胶囊拉开距离。
          space-y-14 给每个模块标题与上一个模块留出 56px 呼吸位 ——
          原来四个 section 直接相邻，标题紧贴上一块卡片的底边，看着像同一块内容。 */}
      <div className="mx-auto max-w-[760px] px-4 pt-5 pb-20 sm:px-6">
        <div className="space-y-14 pt-4">
          <AppearanceSection />
          <DataSection />
          <CollectionsSection
            onEdit={(col) => setCollectionModal({ mode: 'edit', collection: col })}
            onCreate={() => setCollectionModal({ mode: 'create' })}
            onDelete={(col) => setConfirm({ collection: col })}
          />
          <AboutSection
            onReset={() => setConfirm('reset')}
            onClear={() => setConfirm('clear')}
          />
        </div>
      </div>

      {confirm === 'reset' && (
        <ConfirmDialog
          title="恢复为示例数据？"
          message="当前浏览器里的全部书签与分组将被内置书签数据覆盖（来自 seed.ts）。建议先导出 JSON 备份。"
          confirmText="恢复示例"
          danger
          onConfirm={() => {
            void resetToSeed()
            setConfirm(null)
            toast('已恢复为内置书签数据')
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'clear' && (
        <ConfirmDialog
          title="清空全部数据？"
          message="所有书签和分组都会被删除，且无法撤销。建议先导出 JSON 备份。"
          confirmText="全部清空"
          danger
          onConfirm={() => {
            clearAll()
            setConfirm(null)
            toast('已清空全部数据')
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm && typeof confirm === 'object' && 'collection' in confirm && (
        <ConfirmDialog
          title={`删除分组「${confirm.collection.name}」？`}
          message="分组内的书签不会被删除，它们会回到「全部」里。"
          confirmText="删除分组"
          danger
          onConfirm={() => {
            removeCollection(confirm.collection.id)
            setConfirm(null)
            toast(`分组「${confirm.collection.name}」已删除`)
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {collectionModal && (
        <CollectionModal
          initial={collectionModal.mode === 'edit' ? collectionModal.collection : null}
          existingNames={collections.map((c) => c.name)}
          onSubmit={submitCollection}
          onClose={() => setCollectionModal(null)}
        />
      )}
    </div>
  )
}
