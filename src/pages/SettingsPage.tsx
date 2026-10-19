import { useState } from 'react'
import { useBookmarks } from '../store/BookmarksContext'
import { useToast } from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import CollectionModal from '../components/CollectionModal'
import DockBar from '../components/DockBar'
import AppearanceSection from '../components/settings/AppearanceSection'
import DataSection from '../components/settings/DataSection'
import CollectionsSection from '../components/settings/CollectionsSection'
import AboutSection from '../components/settings/AboutSection'
import type { Collection } from '../types'

type ConfirmState =
  | null
  | 'reset'
  | 'clear'
  | { collection: Collection }

export default function SettingsPage() {
  const { collections, addCollection, renameCollection, removeCollection, resetToSeed, clearAll } =
    useBookmarks()
  const toast = useToast()
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  const [collectionModal, setCollectionModal] = useState<
    { mode: 'create' } | { mode: 'edit'; collection: Collection } | null
  >(null)

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
      {/* 顶栏直接复用首页的 DockBar。
          曾经这里是第二套顶栏（← + 「设置」15px），于是首页顶栏给的
          「确定的头部锚点」被自己推翻，两个页面的头部高度与对齐都不一样。
          复用后 logo 同时承担「回首页」，搜索、明暗、设置的位置也保持一致。
          h-14 通栏 fixed 不占文档流，下面垫一段等高空白。 */}
      <DockBar />
      <div aria-hidden className="h-14" />

      {/* 内容宽度收到 760px：iOS 设置页是分组列表（约 390~430pt），
          过宽的设置页会让人失去「这是一份清单」的认知。
          space-y-14 给每个模块标题与上一个模块留出 56px 呼吸位 ——
          原来四个 section 直接相邻，标题紧贴上一块卡片的底边，看着像同一块内容。

          这里不放分区跳转胶囊：四个分区总共两屏，而分区标题就在正文里。
          曾经在标题上方再放一条「外观 / 数据导入导出 / 分组管理 / 关于」胶囊，
          同一组词在 100px 内出现两次，导航反而成了噪音。各区段的
          scroll-mt 锚点保留着，深链仍然可用。 */}
      <div className="mx-auto max-w-[760px] px-4 pt-10 pb-20 sm:px-6">
        {/* 大标题：与首页 h1 同级（22px）。
            曾经把「设置」塞在顶栏里只有 15px，比分区标题 20px 还小，
            第一眼认不出自己在哪一页 —— 层级倒挂。现在用 iOS 的大标题形式，
            分区标题降到 15px，两者各归其位。 */}
        <h1 className="mb-10 text-[22px] font-bold tracking-[-0.01em]">设置</h1>
        <div className="space-y-14">
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
