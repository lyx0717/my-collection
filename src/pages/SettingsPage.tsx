import { useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  Bookmark,
  Folder,
  HardDrive,
  Info,
  Palette,
  Tag,
} from 'lucide-react'
import { useBookmarks } from '../store/BookmarksContext'
import { useToast } from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import CollectionModal from '../components/CollectionModal'
import AppearanceSection from '../components/settings/AppearanceSection'
import DataSection from '../components/settings/DataSection'
import CollectionsSection from '../components/settings/CollectionsSection'
import TagsSection from '../components/settings/TagsSection'
import BookmarkletSection from '../components/settings/BookmarkletSection'
import AboutSection from '../components/settings/AboutSection'
import type { Collection } from '../types'

type Section = 'appearance' | 'data' | 'collections' | 'tags' | 'bookmarklet' | 'about'

type ConfirmState =
  | null
  | 'reset'
  | 'clear'
  | { collection: Collection }
  | { tag: string; count: number }

export default function SettingsPage() {
  const { collections, addCollection, renameCollection, removeCollection, removeTag, resetToSeed, clearAll } =
    useBookmarks()
  const toast = useToast()
  const [section, setSection] = useState<Section>('appearance')
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [collectionModal, setCollectionModal] = useState<
    { mode: 'create' } | { mode: 'edit'; collection: Collection } | null
  >(null)

  const navItems: Array<{ key: Section; label: string; icon: ReactNode }> = [
    { key: 'appearance', label: '外观', icon: <Palette size={15} /> },
    { key: 'data', label: '数据导入导出', icon: <HardDrive size={15} /> },
    { key: 'collections', label: '分组管理', icon: <Folder size={15} /> },
    { key: 'tags', label: '标签管理', icon: <Tag size={15} /> },
    { key: 'bookmarklet', label: '书签小工具', icon: <Bookmark size={15} /> },
    { key: 'about', label: '关于', icon: <Info size={15} /> },
  ]

  const submitCollection = (name: string, emoji?: string) => {
    if (collectionModal?.mode === 'edit') {
      renameCollection(collectionModal.collection.id, name, emoji)
      toast(`分组「${name}」已更新`)
    } else {
      addCollection(name, emoji)
      toast(`分组「${name}」已创建`)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="glass-topbar sticky top-0 z-40 flex h-[62px] items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
        <a
          href="#/"
          className="flex h-9 items-center gap-1.5 rounded-[10px] px-2 text-[13px] text-ink2 hover:bg-surface-2"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">返回书签</span>
        </a>
        <h1 className="text-[16px] font-bold">设置</h1>
      </header>

      <div className="mx-auto flex max-w-5xl gap-8 px-4 py-8 sm:px-6">
        <nav className="hidden w-[168px] shrink-0 md:block">
          <div className="sticky top-24 flex flex-col gap-1">
            {navItems.map((n) => (
              <button
                key={n.key}
                onClick={() => {
                  setSection(n.key)
                  document.getElementById(`sec-${n.key}`)?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={`flex items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[13.5px] font-medium transition-colors ${
                  section === n.key
                    ? 'bg-accent-soft font-semibold text-accent-ink'
                    : 'text-ink2 hover:bg-surface-2'
                }`}
              >
                {n.icon}
                {n.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-10 pb-20">
          <AppearanceSection />
          <DataSection />
          <CollectionsSection
            onEdit={(col) => setCollectionModal({ mode: 'edit', collection: col })}
            onCreate={() => setCollectionModal({ mode: 'create' })}
            onDelete={(col) => setConfirm({ collection: col })}
          />
          <TagsSection onDeleteTag={(tag, count) => setConfirm({ tag, count })} />
          <BookmarkletSection />
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
          message="分组内的书签不会被删除，会移动到「未分组」。"
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
      {confirm && typeof confirm === 'object' && 'tag' in confirm && (
        <ConfirmDialog
          title={`删除标签「#${confirm.tag}」？`}
          message={`该标签会从 ${confirm.count} 条书签上移除，书签本身不会被删除。`}
          confirmText="删除标签"
          danger
          onConfirm={() => {
            removeTag(confirm.tag)
            setConfirm(null)
            toast(`标签「#${confirm.tag}」已删除`)
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
