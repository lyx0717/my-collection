import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import { Rope } from '../../lib/physics/rope'
import { createScene, updateRopeGeometry, createCardObject, type SceneHandles } from '../../lib/three/scene'
import { usePhysicsLoop } from '../../hooks/usePhysicsLoop'

/** 分组定义。ropeSpan 决定绳长 —— 卡片越多绳越长，视觉上才既不挤也不空。 */
export interface GroupDef {
  id: string
  name: string
  color: string
  count: number
  ropeSpan: number
}

export const GROUPS: GroupDef[] = [
  { id: 'col_dev', name: '开发', color: '#C97B4A', count: 39, ropeSpan: 78 },
  { id: 'col_ai', name: 'AI', color: '#9B7BC4', count: 29, ropeSpan: 60 },
  { id: 'col_work', name: '工作', color: '#5B87B8', count: 26, ropeSpan: 55 },
  { id: 'col_life', name: '生活', color: '#D97B8C', count: 28, ropeSpan: 58 },
  { id: 'col_tool', name: '工具', color: '#D9A94A', count: 19, ropeSpan: 44 },
  { id: 'col_sci', name: '科学', color: '#5FA88C', count: 12, ropeSpan: 32 },
]

const CAM_Z = 46
const FOV = 42
/** 卡片半宽对应的世界距离阈值，超过就不算命中 */
const PICK_RADIUS = 1.9

export function ClotheslineStage({
  group,
  windStrength,
  onMetrics,
}: {
  group: GroupDef
  windStrength: number
  onMetrics: (m: { fps: number; nodes: number; cards: number; constraintMs: number; maxError: number }) => void
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const cssMountRef = useRef<HTMLDivElement | null>(null)
  const handlesRef = useRef<SceneHandles | null>(null)
  const ropeRef = useRef<Rope | null>(null)
  const objectsRef = useRef<Map<number, CSS3DObject>>(new Map())
  const colorRef = useRef(group.color)

  /** 所有每帧变化的状态放这里，不进 React state */
  const frameRef = useRef({ panX: 0, panTarget: 0, panDragging: false, panLastX: 0, draggingCard: -1, frameCount: 0, fpsAccum: 0 })

  // ---- 场景初始化（仅一次）----
  useEffect(() => {
    const wrap = wrapRef.current
    const cssMount = cssMountRef.current
    if (!wrap || !cssMount) return

    const handles = createScene(wrap, cssMount)
    handlesRef.current = handles
    ropeRef.current = new Rope(GROUPS[0].ropeSpan)

    return () => {
      handles.dispose()
      handlesRef.current = null
      ropeRef.current = null
      objectsRef.current.clear()
    }
  }, [])

  /**
   * 卡片对象池。
   * 分组切换只增删差额，且每次都是「新建元素」而非复用——因为卡片数量和
   * 颜色都可能变，复用会让旧颜色残留。DOM 数量上限为一个分组的最大卡片数。
   */
  const syncCards = useCallback((rope: Rope, handles: SceneHandles, def: GroupDef) => {
    const map = objectsRef.current
    colorRef.current = def.color

    for (const [idx, obj] of map) {
      if (idx >= rope.cards.length) {
        handles.cssScene.remove(obj)
        obj.element.remove()
        map.delete(idx)
      }
    }

    for (let i = 0; i < rope.cards.length; i++) {
      if (map.has(i)) continue
      const holder = document.createElement('div')
      holder.appendChild(renderPlaceholder(rope.cards[i].id, def.color))
      const obj = createCardObject(holder)
      // CSS3D 层默认 pointer-events: none，卡片要单独打开才能收鼠标事件
      obj.element.style.pointerEvents = 'auto'
      handles.cssScene.add(obj)
      map.set(i, obj)
    }
  }, [])

  // ---- 分组切换：重建节点与卡片，绳长走插值过渡 ----
  useEffect(() => {
    const rope = ropeRef.current
    const handles = handlesRef.current
    if (!rope || !handles) return

    // 先按当前实际绳长重建（保持节点密度不变），再把目标绳长设为新值，
    // setRestSpan 内部会从当前值缓动到目标值 —— 绳子不会「弹」一下
    const ids = Array.from({ length: group.count }, (_, i) => `#${i + 1}`)
    rope.build(rope.span, ids)
    rope.setRestSpan(group.ropeSpan)
    syncCards(rope, handles, group)

    // 切组后把镜头拉回中心，否则可能停在上一组绳长的空区域
    frameRef.current.panTarget = 0
  }, [group, syncCards])

  // ---- 风量实时生效 ----
  useEffect(() => {
    ropeRef.current?.setWindStrength(windStrength)
  }, [windStrength])

  // ---- 主循环 ----
  const ropePoints = useRef<Float32Array>(new Float32Array(3 * 512))
  usePhysicsLoop(ropeRef, (dt) => {
    const rope = ropeRef.current
    const handles = handlesRef.current
    if (!rope || !handles) return

    // 节点坐标 → 绳索几何
    const n = rope.nodes.length
    let buf = ropePoints.current
    if (buf.length < n * 3) {
      buf = new Float32Array(n * 3)
      ropePoints.current = buf
    }
    for (let i = 0; i < n; i++) {
      const p = rope.nodes[i]
      buf[i * 3] = p.x
      buf[i * 3 + 1] = p.y
      buf[i * 3 + 2] = p.z
    }
    updateRopeGeometry(handles, buf, n, performance.now() / 1000)

    // 卡片跟随摆锤位置
    const map = objectsRef.current
    for (let i = 0; i < rope.cards.length; i++) {
      const obj = map.get(i)
      const card = rope.cards[i]
      if (obj) obj.position.set(card.bob.x, card.bob.y, card.bob.z)
    }

    // 相机平移：阻尼跟随，避免滚轮/拖拽的顿挫
    const f = frameRef.current
    f.panX += (f.panTarget - f.panX) * 0.12
    handles.panX = f.panX
    handles.camera.position.x = f.panX
    handles.camera.lookAt(f.panX, 11, 0)

    handles.webgl.render(handles.scene, handles.camera)
    handles.css3d.render(handles.cssScene, handles.camera)

    // 性能读数：每 30 帧（约 0.5s）上报一次，避免高频 setState
    f.frameCount++
    f.fpsAccum += dt
    if (f.frameCount % 30 === 0) {
      const fps = Math.round(f.frameCount / Math.max(0.0001, f.fpsAccum))
      onMetrics({
        fps,
        nodes: n,
        cards: rope.cards.length,
        constraintMs: Number(rope.metrics.constraintMs.toFixed(2)),
        maxError: Number(Math.abs(rope.metrics.maxError).toFixed(3)),
      })
      f.frameCount = 0
      f.fpsAccum = 0
    }
  })

  // ---- 交互 ----
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const hit = new THREE.Vector3()

    const toNdc = (e: PointerEvent): void => {
      const r = wrap.getBoundingClientRect()
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1
    }

    /** 鼠标射线与 z=0 平面的交点，即物理所用的世界坐标 */
    const worldAt = (): THREE.Vector3 | null => {
      const handles = handlesRef.current
      if (!handles) return null
      raycaster.setFromCamera(ndc, handles.camera)
      return raycaster.ray.intersectPlane(plane, hit) ? hit.clone() : null
    }

    /**
     * 命中测试用射线到摆锤中心的距离，而非 CSS :hover。
     * CSS3D 元素的命中受matrix 影响，细微透视就足以让 hover 抖动；
     * 悬停展开必须由我们自己控制，否则卡片一动就掉 hover。
     */
    const pick = (): number => {
      const rope = ropeRef.current
      const handles = handlesRef.current
      if (!rope || !handles) return -1
      raycaster.setFromCamera(ndc, handles.camera)
      const tmp = new THREE.Vector3()
      let best = -1
      let bestD = PICK_RADIUS
      for (let i = 0; i < rope.cards.length; i++) {
        const c = rope.cards[i]
        tmp.set(c.bob.x, c.bob.y, c.bob.z)
        const d = raycaster.ray.distanceToPoint(tmp)
        if (d < bestD) {
          bestD = d
          best = i
        }
      }
      return best
    }

    const onDown = (e: PointerEvent): void => {
      const rope = ropeRef.current
      const handles = handlesRef.current
      if (!rope || !handles) return
      // 绳长插值期间不接受拖拽：节点正在整体移动，拖拽会和插值抢控制权
      if (rope.isTransitioning) return
      wrap.setPointerCapture(e.pointerId)
      toNdc(e)

      const idx = pick()
      if (idx >= 0) {
        const w = worldAt()
        if (w) {
          rope.beginDrag(rope.cards[idx], w.x, w.y, w.z)
          frameRef.current.draggingCard = idx
          wrap.style.cursor = 'grabbing'
          return
        }
      }
      const f = frameRef.current
      f.panDragging = true
      f.panLastX = e.clientX
    }

    const onMove = (e: PointerEvent): void => {
      const rope = ropeRef.current
      const handles = handlesRef.current
      if (!rope || !handles) return
      toNdc(e)
      const f = frameRef.current

      if (f.draggingCard >= 0) {
        const w = worldAt()
        if (w) rope.moveDrag(w.x, w.y, w.z)
        return
      }
      if (f.panDragging) {
        const r = wrap.getBoundingClientRect()
        // 屏幕像素 → 世界单位：z=0 平面在相机正前方 CAM_Z 处，
        // 该深度上的可视高度 = 2·tan(fov/2)·CAM_Z
        const worldPerPx = (2 * Math.tan((FOV * Math.PI) / 360) * CAM_Z) / r.height
        f.panTarget -= (e.clientX - f.panLastX) * worldPerPx
        f.panLastX = e.clientX
        return
      }
      wrap.style.cursor = pick() >= 0 ? 'grab' : 'default'
    }

    const onUp = (e: PointerEvent): void => {
      const rope = ropeRef.current
      const f = frameRef.current
      if (rope && f.draggingCard >= 0) {
        rope.endDrag(rope.cards[f.draggingCard])
        f.draggingCard = -1
      }
      f.panDragging = false
      wrap.style.cursor = 'default'
      if (wrap.hasPointerCapture(e.pointerId)) wrap.releasePointerCapture(e.pointerId)
    }

    const onWheel = (e: WheelEvent): void => {
      frameRef.current.panTarget += (e.deltaX !== 0 ? e.deltaX : e.deltaY) * 0.035
    }

    wrap.addEventListener('pointerdown', onDown)
    wrap.addEventListener('pointermove', onMove)
    wrap.addEventListener('pointerup', onUp)
    wrap.addEventListener('pointercancel', onUp)
    wrap.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      wrap.removeEventListener('pointerdown', onDown)
      wrap.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerup', onUp)
      wrap.removeEventListener('pointercancel', onUp)
      wrap.removeEventListener('wheel', onWheel)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* 天空与阳台：CSS 渐变承担主体色调，比 WebGL 做渐变便宜也更可控 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background:
            'linear-gradient(180deg, #B4D4F0 0%, #D8E8F6 40%, #F2E6CE 76%, #E2CFAE 100%)',
        }}
      />
      {/* 暖阳光斑：左上斜射 */}
      <div
        style={{
          position: 'absolute',
          left: '-10%',
          top: '-22%',
          width: '64%',
          height: '80%',
          zIndex: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 42% 42%, rgba(255,224,152,0.5) 0%, rgba(255,224,152,0) 68%)',
        }}
      />
      <div ref={cssMountRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
      {/* 晕影压暗四角，把视线收到中央。放在卡片之上才有聚焦效果 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 44%, rgba(74,52,24,0.26) 100%)',
        }}
      />
    </div>
  )
}

/**
 * 占位卡片。
 *
 * 刻意用原生日志手工构建而不是 React 组件：这些元素每帧都要改 transform，
 * 交给 React 会导致 60 次/秒 的协调开销。阶段 2 换成真实卡片时，
 * 内容仍由这里生成（favicon 加载、文字排版），不改成 React 组件。
 */
function renderPlaceholder(label: string, color: string): HTMLElement {
  const card = document.createElement('div')
  card.style.cssText =
    'width:108px;height:74px;border-radius:5px;' +
    'background:linear-gradient(160deg,#FFFDF8 0%,#F3EBDD 100%);' +
    'box-shadow:0 3px 8px rgba(90,70,45,.22), inset 0 1px 0 rgba(255,255,255,.9);' +
    'border:0.5px solid rgba(120,95,60,.28);' +
    'display:flex;align-items:center;justify-content:center;' +
    'font:500 12px/1.2 system-ui,-apple-system,sans-serif;color:#8A7355;' +
    'cursor:grab;user-select:none;position:relative;pointer-events:auto;'

  const clip = document.createElement('div')
  clip.style.cssText =
    'position:absolute;top:-7px;left:50%;transform:translateX(-50%);' +
    'width:18px;height:13px;border-radius:2px;' +
    'background:linear-gradient(180deg,#A8865A 0%,#7E6242 100%);' +
    'box-shadow:0 1px 2px rgba(60,40,20,.4);'
  card.appendChild(clip)

  const text = document.createElement('span')
  text.textContent = label
  text.style.opacity = '0.7'
  card.appendChild(text)

  const dot = document.createElement('span')
  dot.style.cssText = `position:absolute;left:7px;top:7px;width:6px;height:6px;border-radius:50%;background:${color};`
  card.appendChild(dot)

  return card
}