export type Category = 'movie' | 'food' | 'article' | 'site'

export interface Item {
  id: string
  /** 名称 */
  title: string
  category: Category
  /** 导演 / 餐厅与地名 / 作者来源 / 站点名 */
  source?: string
  /** 外链地址 */
  url?: string
  /** 封面图地址，留空时使用排版封面 */
  cover?: string
  /** 短评 / 备注 */
  description?: string
  tags: string[]
  /** ISO 时间，同时决定藏品登记号顺序 */
  createdAt: string
}

/** 表单提交时的数据（id 与 createdAt 由存储层补齐/保留） */
export type ItemInput = Omit<Item, 'id' | 'createdAt'>
