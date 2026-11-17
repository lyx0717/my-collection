/**
 * 柔光玻璃 C 方案 —— WebGL2 全 shader 渲染器
 *
 * 只做一件事：把「倒角 SDF + 边缘折射 + 轻微色散 + 环境色 tint + 磨砂」
 * 合成到一块 canvas 上。玻璃透出的背景不是 backdrop-filter，而是把
 * 页面底图栅格当成场景纹理，在 shader 里按折射偏移 + mip 模糊重采样。
 *
 * WebGL 初始化 / 预乘输出 / ResizeObserver / WEBGL_lose_context 清理
 * 这套经验来自仓库里 components/appearance/glass-toggle.js：
 *   · Safari 不认 premultipliedAlpha:false，会把 alpha=0 的像素颜色也糊到
 *     页面上（画布变成一块矩形白底）。这里统一 alpha:true + 预乘输出。
 *   · 组件卸载时用 WEBGL_lose_context.loseContext() 主动归还 GPU 上下文。
 *
 * 失败即降级：调用方拿到 null / onStatus('unavailable'|'lost') 后显示说明文字。
 */

import type { Theme } from './softglass-common'

export type RendererStatus = 'ok' | 'unavailable' | 'lost'

export interface RendererParams {
  blur: number
  alpha: number
  sat: number
  bright: number
  tint: [number, number, number]
  tintAmt: number
  rim: number
  theme: Theme
  radius: number
  bevel: number
}

export interface SceneFrame {
  source: HTMLCanvasElement
  vw: number
  vh: number
}

export interface SoftGlassRenderer {
  setParams(params: RendererParams): void
  setScene(scene: SceneFrame): void
  setReducedMotion(value: boolean): void
  destroy(): void
}

const VERT = `#version 300 es
precision highp float;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;

uniform vec2  uRes;        // canvas backing px
uniform vec2  uCss;        // canvas css px
uniform float uDpr;
uniform vec2  uViewport;   // page viewport css px
uniform vec4  uRect;       // canvas rect in viewport css px: left, top, w, h
uniform sampler2D uScene;
uniform float uRadius;
uniform float uBevel;
uniform float uBlur;
uniform float uAlpha;
uniform float uSat;
uniform float uBright;
uniform vec3  uTint;
uniform float uTintAmt;
uniform float uRim;
uniform float uTheme;      // 0 light .. 1 dark
uniform float uTime;
uniform float uStill;      // 1 = 静态渲染（prefers-reduced-motion）

out vec4 outColor;

const vec3 COOL = vec3(0.78, 0.90, 1.00);
const vec3 WARM = vec3(1.00, 0.88, 0.72);

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float sdRB(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

/* 场景重采样：mip 层负责大范围磨砂，5 个偏移 tap 负责近处柔化。
   LOD 与 blur 的关系是经验值（log2(1 + blur*0.55)），实测下与 CSS
   blur(12–18px) 的观感接近。 */
vec3 sceneAt(vec2 uv, float lod) {
  uv = clamp(uv, vec2(0.0015), vec2(0.9985));
  float dx = uBlur / max(uViewport.x, 1.0) * 0.55;
  float dy = uBlur / max(uViewport.y, 1.0) * 0.55;
  vec2 rx = vec2(dx, 0.0);
  vec2 ry = vec2(0.0, dy);
  vec3 c = textureLod(uScene, uv, lod).rgb * 0.36;
  c += textureLod(uScene, uv + rx, lod).rgb * 0.16;
  c += textureLod(uScene, uv - rx, lod).rgb * 0.16;
  c += textureLod(uScene, uv + ry, lod).rgb * 0.16;
  c += textureLod(uScene, uv - ry, lod).rgb * 0.16;
  return c;
}

void main() {
  vec2 fc = vec2(gl_FragCoord.x / uDpr, uCss.y - gl_FragCoord.y / uDpr); // css, top-left
  vec2 halfSize = uCss * 0.5;
  vec2 p = vec2(fc.x - halfSize.x, halfSize.y - fc.y);                  // y-up, center
  float radius = max(min(uRadius, min(halfSize.x, halfSize.y) - 1.0), 0.0);
  float sd = sdRB(p, halfSize - radius, radius);

  float aa = max(0.75, uDpr * 0.5);
  float mask = smoothstep(aa, -aa, sd);

  /* SDF 法线：四向差分，边缘越近折射越强 */
  float e = 0.6;
  vec2 q = halfSize - radius;
  float gx = sdRB(vec2(p.x + e, p.y), q, radius) - sdRB(vec2(p.x - e, p.y), q, radius);
  float gy = sdRB(vec2(p.x, p.y + e), q, radius) - sdRB(vec2(p.x, p.y - e), q, radius);
  vec2 n = normalize(vec2(gx, gy) + vec2(1e-5));

  float rimBand = smoothstep(-uBevel, 0.0, sd);
  float refr = pow(rimBand, 2.0) * uBevel * 0.30;
  /* 屏幕 y 向下：向内折射 = (-n.x, +n.y) */
  vec2 disp = vec2(-n.x, n.y) * refr / max(uViewport, vec2(1.0));

  float lod = clamp(log2(1.0 + uBlur * 0.55), 0.0, 6.0);
  vec2 uv = (uRect.xy + fc) / max(uViewport, vec2(1.0));
  vec3 s;
  s.r = sceneAt(uv + disp * 1.00, lod).r;
  s.g = sceneAt(uv + disp * 1.22, lod).g;   // 轻微色散：三个通道偏移不同
  s.b = sceneAt(uv + disp * 1.48, lod).b;

  float sLum = lum(s);
  s = mix(vec3(sLum), s, uSat);
  s *= uBright;

  /* background-color 的 shader 等价物：中性玻璃底按 alpha 覆盖场景 */
  vec3 neutral = mix(vec3(0.972, 0.976, 0.984), vec3(0.055, 0.062, 0.078), uTheme);
  vec3 col = mix(s, neutral, clamp(uAlpha, 0.0, 0.94));

  /* 倒角厚度：向内一档压暗 */
  col *= 1.0 - 0.10 * smoothstep(0.0, uBevel * 1.7, -sd);

  /* 环境色 tint */
  col = mix(col, uTint, clamp(uTintAmt, 0.0, 0.6));

  /* rim light：左上冷白、右下暖白，正圆角处自然衰减 */
  float rimMask = exp(-max(-sd, 0.0) / max(uBevel * 0.42, 0.5));
  float wCool = clamp(dot(n, normalize(vec2(-0.9, 0.9))), 0.0, 1.0);
  float wWarm = clamp(dot(n, normalize(vec2(0.9, -0.9))), 0.0, 1.0);
  float rimGain = mix(0.75, 1.15, uTheme) * uRim;
  col += COOL * rimMask * (0.12 + 0.95 * wCool) * rimGain * 0.50;
  col += WARM * rimMask * (0.06 + 0.70 * wWarm) * rimGain * 0.38;

  /* 磨砂颗粒（1% 级） */
  float grain = hash21(gl_FragCoord.xy * 0.72 + (uStill > 0.5 ? 11.3 : fract(uTime) * 41.0)) - 0.5;
  col += grain * 0.02;

  float a = clamp(mask, 0.0, 1.0);
  /* 预乘输出：rgb 先乘 alpha，配合 premultipliedAlpha:true */
  outColor = vec4(clamp(col, 0.0, 1.0) * a, a);
}`

interface Program {
  program: WebGLProgram
  loc: (name: string) => WebGLUniformLocation | null
}

function buildProgram(gl: WebGL2RenderingContext, fragSrc: string): Program {
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)
    if (!sh) throw new Error('createShader failed')
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(String(gl.getShaderInfoLog(sh)))
    }
    return sh
  }
  const program = gl.createProgram()
  if (!program) throw new Error('createProgram failed')
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragSrc))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(String(gl.getProgramInfoLog(program)))
  }
  const cache = new Map<string, WebGLUniformLocation | null>()
  return {
    program,
    loc: (name) => {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name))
      return cache.get(name) ?? null
    },
  }
}

export function createSoftGlassRenderer(options: {
  host: HTMLElement
  onFps?: (fps: number) => void
  onStatus?: (status: RendererStatus, detail?: string) => void
}): SoftGlassRenderer | null {
  const { host, onFps, onStatus } = options

  const canvas = document.createElement('canvas')
  canvas.className = 'sg-webgl-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  host.appendChild(canvas)

  /* 必须预乘：Safari 会把 alpha=0 的像素颜色也糊到页面上。
     透明画布 + premultipliedAlpha:true + shader 预乘输出，Chrome/Safari 一致。 */
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  })

  let dead = false
  const fail = (detail: string) => {
    if (dead) return
    dead = true
    onStatus?.('unavailable', detail)
    canvas.remove()
  }
  if (!gl || gl.isContextLost()) {
    fail('WebGL2 不可用')
    return null
  }

  let program: Program
  let vao: WebGLVertexArrayObject | null
  let tex: WebGLTexture | null
  let hasScene = false

  const placeholder = document.createElement('canvas')
  placeholder.width = 1
  placeholder.height = 1
  const pctx = placeholder.getContext('2d')
  if (pctx) {
    pctx.fillStyle = '#9aa0aa'
    pctx.fillRect(0, 0, 1, 1)
  }

  const buildResources = () => {
    program = buildProgram(gl, FRAG)
    vao = gl.createVertexArray()
    tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, placeholder)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.useProgram(program.program)
    gl.uniform1i(program.loc('uScene'), 0)
    hasScene = false
  }

  try {
    buildResources()
  } catch (err) {
    fail(err instanceof Error ? err.message : 'shader 初始化失败')
    return null
  }

  let params: RendererParams = {
    blur: 18,
    alpha: 0.32,
    sat: 1.7,
    bright: 1.04,
    tint: [0.7, 0.75, 0.8],
    tintAmt: 0.2,
    rim: 0.6,
    theme: 'light',
    radius: 26,
    bevel: 22,
  }
  let scene: SceneFrame | null = null
  let sceneVw = 0
  let sceneVh = 0
  let reducedMotion = false
  let raf = 0
  let running = false
  let frameCount = 0
  let fpsMark = 0
  let lastStillTime = 0

  const resize = () => {
    if (dead) return
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(rect.width))
    const h = Math.max(1, Math.round(rect.height))
    const dpr = Math.min(window.devicePixelRatio || 1, 2, 2800 / Math.max(w, h))
    const bw = Math.max(2, Math.round(w * dpr))
    const bh = Math.max(2, Math.round(h * dpr))
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }
    return { rect, w, h, dpr }
  }

  const draw = (time: number) => {
    if (dead || !program || !vao) return
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(rect.width))
    const h = Math.max(1, Math.round(rect.height))
    if (canvas.width < 2 || canvas.height < 2) return
    const dpr = canvas.width / w

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program.program)
    gl.bindVertexArray(vao)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)

    const set1f = (n: string, v: number) => gl.uniform1f(program.loc(n), v)
    gl.uniform2f(program.loc('uRes'), canvas.width, canvas.height)
    gl.uniform2f(program.loc('uCss'), w, h)
    gl.uniform1f(program.loc('uDpr'), dpr)
    gl.uniform2f(program.loc('uViewport'), sceneVw || window.innerWidth, sceneVh || window.innerHeight)
    gl.uniform4f(program.loc('uRect'), rect.left, rect.top, w, h)
    set1f('uRadius', params.radius)
    set1f('uBevel', params.bevel)
    set1f('uBlur', params.blur)
    set1f('uAlpha', params.alpha)
    set1f('uSat', params.sat)
    set1f('uBright', params.bright)
    gl.uniform3f(program.loc('uTint'), params.tint[0], params.tint[1], params.tint[2])
    set1f('uTintAmt', params.tintAmt)
    set1f('uRim', params.rim)
    set1f('uTheme', params.theme === 'dark' ? 1 : 0)
    set1f('uTime', reducedMotion ? lastStillTime : time)
    set1f('uStill', reducedMotion ? 1 : 0)

    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (hasScene) hasScene = true
  }

  const frame = (t: number) => {
    if (!running || dead) return
    draw(t / 1000)
    frameCount += 1
    if (fpsMark === 0) fpsMark = t
    else if (t - fpsMark >= 500) {
      const fps = Math.round((frameCount * 1000) / (t - fpsMark))
      onFps?.(fps)
      frameCount = 0
      fpsMark = t
    }
    raf = requestAnimationFrame(frame)
  }

  const start = () => {
    if (dead || running) return
    if (reducedMotion) {
      draw(lastStillTime)
      onFps?.(-1)
      return
    }
    running = true
    frameCount = 0
    fpsMark = 0
    lastStillTime = performance.now() / 1000
    raf = requestAnimationFrame(frame)
  }

  const stop = () => {
    running = false
    cancelAnimationFrame(raf)
  }

  const syncRect = () => {
    resize()
    if (reducedMotion) draw(lastStillTime)
  }

  const onVisible = () => {
    if (document.hidden) stop()
    else start()
  }
  const onScroll = () => {
    syncRect()
  }

  const ro = new ResizeObserver(() => syncRect())
  ro.observe(host)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  document.addEventListener('visibilitychange', onVisible)

  const onLost = (event: Event) => {
    event.preventDefault()
    stop()
    onStatus?.('lost', 'WebGL 上下文丢失')
  }
  const onRestored = () => {
    try {
      buildResources()
      hasScene = false
      if (scene) uploadScene()
      onStatus?.('ok')
      start()
    } catch {
      onStatus?.('unavailable', '上下文恢复失败')
    }
  }
  canvas.addEventListener('webglcontextlost', onLost, false)
  canvas.addEventListener('webglcontextrestored', onRestored, false)

  function uploadScene() {
    if (!scene || !tex || dead || !gl) return
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene.source)
    gl.generateMipmap(gl.TEXTURE_2D)
    hasScene = true
    sceneVw = scene.vw
    sceneVh = scene.vh
    onStatus?.('ok')
    if (reducedMotion) draw(lastStillTime)
  }

  resize()
  start()

  return {
    setParams(next) {
      params = next
      if (reducedMotion) draw(lastStillTime)
    },
    setScene(next) {
      scene = next
      if (!dead) {
        sceneVw = next.vw
        sceneVh = next.vh
        uploadScene()
      }
    },
    setReducedMotion(value) {
      if (reducedMotion === value) return
      reducedMotion = value
      if (value) {
        stop()
        lastStillTime = performance.now() / 1000
        draw(lastStillTime)
        onFps?.(-1)
      } else {
        start()
      }
    },
    destroy() {
      dead = true
      stop()
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('visibilitychange', onVisible)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    },
  }
}