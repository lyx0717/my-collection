export interface GlassToggleApi {
  /** 当前位置 0（夜）… 1（昼） */
  readonly value: number
  /** 'night' | 'day' */
  readonly state: 'night' | 'day'
  /** 外部同步用：animate=false 直接落位、不触发 onChange */
  set(value: 'night' | 'day' | number, animate?: boolean): void
  toggle(): void
  destroy(): void
}

export interface GlassToggleOptions {
  root: HTMLElement
  canvas: HTMLCanvasElement
  space: HTMLElement
  hit: HTMLElement
  initial?: number
  onChange?: (value: 0 | 1) => void
}

export function createGlassToggle(options: GlassToggleOptions): GlassToggleApi
