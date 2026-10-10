import * as THREE from 'three'
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

/**
 * 双渲染器场景：WebGL 负责绳索与氛围，CSS3D 负责书签卡片。
 *
 * 为什么叠两个渲染器而不是全 WebGL：
 * 书签卡片的文字必须清晰、可选中、可无障碍朗读。把文字烘焙成纹理会
 * 一次性丢掉这三样，153张卡片的纹理内存也不可控。CSS3D 让卡片保持为
 * 真实 DOM，渲染与命中测试交给浏览器。
 *
 * 代价：DOM 无法与 3D 几何真正相交，卡片之间不会互相遮挡穿插。
 * 在这个场景里可接受——卡片始终排列在绳下，遮挡不是必要视觉信息。
 *
 * 两层的z序：WebGL 画布在底层（z-index 0），CSS3D 覆盖层在上（z-index 1）。
 * DOM 永远盖在 canvas 上，所以绳索要画在卡片「后面」，
 * 靠 CSS3DObject 的 z 值把卡片稍微往前推来实现前后关系。
 */

export interface SceneHandles {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  webgl: THREE.WebGLRenderer
  css3d: CSS3DRenderer
  /** 绳索线条，几何每帧更新 */
  ropeLine: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
  /** 绳索下方的柔和投影线，给绳子一点厚度感 */
  ropeShadow: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
  /** 浮尘粒子系统 */
  dust: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  /** 绳索在 CSS3D 场景中的镜像线，用极薄的 div 画，保证卡片下方也有绳 */
  mount: HTMLElement
  cssScene: THREE.Scene
  /** 相机水平平移量 */
  panX: number
  resize: () => void
  dispose: () => void
}

const ROPE_Y = 14

export function createScene(container: HTMLElement, cssMount: HTMLElement): SceneHandles {
  const scene = new THREE.Scene()
  const cssScene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400)
  camera.position.set(0, 6, 46)
  camera.lookAt(0, ROPE_Y - 3, 0)

  // --- WebGL 层：透明画布，让 CSS 渐变背景透出来做天空 ---
  const webgl = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  webgl.setClearColor(0x000000, 0)
  webgl.domElement.style.position = 'absolute'
  webgl.domElement.style.inset = '0'
  webgl.domElement.style.zIndex = '0'
  container.appendChild(webgl.domElement)

  // --- CSS3D 层：卡片宿主 ---
  const css3d = new CSS3DRenderer()
  css3d.domElement.style.position = 'absolute'
  css3d.domElement.style.inset = '0'
  css3d.domElement.style.zIndex = '1'
  css3d.domElement.style.pointerEvents = 'none'
  cssMount.appendChild(css3d.domElement)

  // --- 绳索：Line 的顶点每帧从物理节点写入 ---
  const ropeGeo = new THREE.BufferGeometry()
  const ropeMat = new THREE.LineBasicMaterial({ color: 0xc4a882 })
  const ropeLine = new THREE.Line(ropeGeo, ropeMat)
  scene.add(ropeLine)

  // 绳索下方的柔和投影线，制造厚度感（一条更粗更淡的同路径线）
  const shadowGeo = new THREE.BufferGeometry()
  const shadowMat = new THREE.LineBasicMaterial({ color: 0x8b7355, transparent: true, opacity: 0.28 })
  const shadowLine = new THREE.Line(shadowGeo, shadowMat)
  scene.add(shadowLine)

  // --- 浮尘：暖阳里的尘埃，氛围感最便宜也最有效的元素 ---
  const DUST_COUNT = 260
  const dustGeo = new THREE.BufferGeometry()
  const dustPos = new Float32Array(DUST_COUNT * 3)
  const dustSeed = new Float32Array(DUST_COUNT)
  for (let i = 0; i < DUST_COUNT; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 90
    dustPos[i * 3 + 1] = Math.random() * 30 - 6
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 30 + 6
    // 每粒尘埃独立的漂浮相位与速度，避免整片一起动显得假
    dustSeed[i] = Math.random() * Math.PI * 2
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dustMat = new THREE.PointsMaterial({
    color: 0xfff2d8,
    size: 0.16,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  scene.add(dust)

  function resize(): void {
    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    webgl.setSize(w, h)
    css3d.setSize(w, h)
  }
  resize()
  window.addEventListener('resize', resize)

  return {
    scene,
    camera,
    webgl,
    css3d,
    ropeLine,
    ropeShadow: shadowLine,
    dust,
    mount: cssMount,
    cssScene,
    panX: 0,
    resize,
    dispose() {
      window.removeEventListener('resize', resize)
      ropeGeo.dispose()
      ropeMat.dispose()
      shadowGeo.dispose()
      shadowMat.dispose()
      dustGeo.dispose()
      dustMat.dispose()
      webgl.dispose()
      webgl.domElement.remove()
      css3d.domElement.remove()
    },
  }
}

/**
 * 逐帧更新绳索与浮尘的几何数据。
 * 用 setDrawRange 与「长度不匹配才重建 attribute」而非每帧重建 BufferGeometry
 * —— 后者每帧产生垃圾，跑一分钟就是几万次无谓分配。
 */
export function updateRopeGeometry(
  handles: SceneHandles,
  points: Float32Array,
  count: number,
  time: number,
): void {
  // 同一段逻辑作用在主线与阴影线上，只是阴影整体下移一点点
  writeLinePositions(handles.ropeLine, points, count, 0)
  writeLinePositions(handles.ropeShadow, points, count, -0.12)

  // 浮尘缓慢上浮 + 正弦横摆，到顶后从底部循环
  const dgeo = handles.dust.geometry as THREE.BufferGeometry
  const dpos = dgeo.getAttribute('position') as THREE.BufferAttribute
  const arr = dpos.array as Float32Array
  const n = arr.length / 3
  for (let i = 0; i < n; i++) {
    const seed = arr[i * 3] * 0.1 + i
    arr[i * 3 + 1] += 0.004 + (i % 7) * 0.0004
    if (arr[i * 3 + 1] > 26) arr[i * 3 + 1] = -6
    arr[i * 3] += Math.sin(time * 0.3 + seed) * 0.006
  }
  dpos.needsUpdate = true
}

/** 把节点坐标写入某条线的 position attribute，yOffset 用于阴影线的错位。 */
function writeLinePositions(
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>,
  points: Float32Array,
  count: number,
  yOffset: number,
): void {
  const geo = line.geometry
  let attr = geo.getAttribute('position') as THREE.BufferAttribute | undefined
  if (!attr || attr.count !== count) {
    attr = new THREE.BufferAttribute(new Float32Array(count * 3), 3)
    geo.setAttribute('position', attr)
  }
  const arr = attr.array as Float32Array
  for (let i = 0; i < count * 3; i += 3) {
    arr[i] = points[i]
    arr[i + 1] = points[i + 1] + yOffset
    arr[i + 2] = points[i + 2]
  }
  attr.needsUpdate = true
  geo.setDrawRange(0, count)
  geo.computeBoundingSphere()
}

/** 创建一个 CSS3D 卡片对象。scale 用「世界单位 → 像素」的换算，由相机距离决定。 */
export function createCardObject(element: HTMLElement): CSS3DObject {
  const obj = new CSS3DObject(element)
  // CSS3DObject 默认 1 世界单位 = 1px，需要缩放到世界单位量级
  obj.scale.setScalar(0.014)
  return obj
}

export const SCENE_ROPE_Y = ROPE_Y