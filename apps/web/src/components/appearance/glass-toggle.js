

/* ------------------------------------------------------------------ *
 *  Glass Toggle
 *  ------------
 *  Pass 1 draws what lives under the lens — page, track floor, light
 *  wash, the moon/sun pixel matrix — into a mipmapped texture, and
 *  writes the icon coverage into the alpha channel.
 *  Pass 2 is the glass: a rounded-square bevel refracts that texture
 *  with a chromatic split and frost, then the LED strip — a capsule
 *  SDF hugging the glass — scatters inside, washes the track and
 *  spills onto the page. One glow model serves both themes.
 *
 *  Component: createGlassToggle({canvas, space, hit}) returns
 *  { value, state, set(v, animate), toggle() }. Layout is measured from
 *  `space`, so the canvas + class can be dropped into any host page.
 * ------------------------------------------------------------------ */

const PI = Math.PI;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const rand = (a, b) => a + Math.random() * (b - a);
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

/* every feel knob lives here */
const CFG = {
  colors: ['#6f86ff', '#ffa82e'],   // night light, day light
  led: 1.78,                        // base brightness of the strip
  halfW: 0.92,                      // angular half-length of the strip
  knobK: 129, knobDamp: 0.6,        // knob spring
  stripK: 70,                       // orbit phase spring
  stretchGain: 6.5, stretchMax: 16, // speed squash
  pressSqueeze: 0.035,              // knob shrink while pressed
  hoverLed: 0.08, pressLed: 0.12, kickLed: 0.12,
  kickDecay: 3.5,
  swirl: 1.62, burst: 0.38,         // morph curl / radial burst
  partK: [260, 460], partDamp: 0.72
};
const LIGHT_A = hexRgb(CFG.colors[0]), LIGHT_B = hexRgb(CFG.colors[1]);

/* ------------------------------ pixel matrix ------------------------------ */
const GRID = 17, C0 = 8;
const PITCH = 5.7, PSIZE = 4.6;   // design px, authored for a 432px track

function buildMoon () {
  const out = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const dx = x - C0, dy = y - C0;
    const inMain = dx * dx + dy * dy <= 6.6 * 6.6;
    const sx = x - 11.3, sy = y - 5.6;
    const inShadow = sx * sx + sy * sy <= 5.4 * 5.4;
    if (inMain && !inShadow) out.push({ x, y, b: 1, kind: 'lit' });
    else if (inMain && inShadow && (x + y) % 2 === 0) out.push({ x, y, b: 0.2, kind: 'earth' }); // earthshine
  }
  for (const c of out) {
    if ((c.x === 3 && c.y === 9) || (c.x === 6 && c.y === 12) || (c.x === 4 && c.y === 12)) c.b = 0.5;
  }
  for (const [x, y, b] of [[15, 1, 1], [14, 1, .45], [16, 1, .45], [15, 0, .45], [15, 2, .45], [11, 0, .75], [16, 5, .6]]) {
    out.push({ x, y, b, kind: 'star' });
  }
  return out;
}

function buildSun () {
  const m = new Map();
  const add = (x, y, b, ang = 0, kind = 'core') => {
    const k = x + ',' + y;
    if (!m.has(k)) m.set(k, { x, y, b, ang, kind });
  };
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const dx = x - C0, dy = y - C0;
    if (dx * dx + dy * dy <= 3.7 * 3.7) add(x, y, 1);
  }
  for (let a = 0; a < 8; a++) {
    const ang = a * PI / 4;
    const rs = a % 2 ? [5.9, 7.2] : [5.6, 6.6, 7.6];
    for (const r of rs) add(Math.round(C0 + Math.cos(ang) * r), Math.round(C0 + Math.sin(ang) * r), 1, ang, 'ray');
  }
  return [...m.values()];
}

const MOON = buildMoon();
const SUN = buildSun();

/* Pair every moon pixel with a sun pixel by angle, so the morph reads
   as one coherent sweep. The larger set drives the particle count. */
const angKey = c => {
  const a = Math.atan2(c.y - C0, c.x - C0);
  return ((a + PI * 0.75 + PI * 2) % (PI * 2)) + Math.hypot(c.x - C0, c.y - C0) * 1e-3;
};
function pairUp () {
  const A = [...MOON].sort((p, q) => angKey(p) - angKey(q));
  const B = [...SUN].sort((p, q) => angKey(p) - angKey(q));
  const big = A.length >= B.length ? A : B;
  const small = big === A ? B : A;
  const pairs = [];
  let last = -1;
  for (let i = 0; i < big.length; i++) {
    const j = Math.floor(i * small.length / big.length);
    const first = j !== last; last = j;
    const s = { ...small[j], b: first ? small[j].b : 0 };
    pairs.push(big === A ? [big[i], s] : [s, big[i]]);
  }
  return pairs.map(([a, b]) => ({
    a, b,
    delay: 0.04 + (1 - a.x / (GRID - 1)) * 0.26 + rand(0, 0.06),
    curl: rand(-1, 1) * 16 + (a.y - C0) * 0.9,   // design px, tangential
    lift: rand(2, 12),                            // design px, radial burst
    k: rand(CFG.partK[0], CFG.partK[1]),
    drag: rand(0.004, 0.016),
    ba: a.b,
    bb: b.b,
    ka: a.kind, kb: b.kind, ang: b.ang || 0,
    phase: rand(0, PI * 2), tw: rand(1.5, 3.2),
    x: 0, y: 0, vx: 0, vy: 0, inited: false,
  }));
}
const PIX = pairUp();
const ICON_BOX = 240;   // design px, square texture around the knob centre

/* ------------------------------ shaders ------------------------------ */
const VERT = `#version 300 es
precision highp float;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const HEADER = `#version 300 es
precision highp float;
#define PI 3.141592653589793

uniform vec2  uRes;
uniform float uDpr;
uniform vec2  uCss;
uniform vec2  uCenter;
uniform vec2  uTrackHalf;
uniform float uTrackR;
uniform vec2  uKnobHalf;
uniform float uKnobR;
uniform float uKnobX;
uniform float uBevel;
uniform float uTheme;       // eased theme, 0 dark .. 1 light
uniform float uGlowAngle;   // centre of the light strip
uniform float uHalfW;       // angular half-length of the strip
uniform float uTime;
uniform float uLed;
uniform float uLift;        // hover lift of the glass, design px
uniform vec3  uLight;

float hash21(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float lum(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float sdRB(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float angleDiff(float a, float b){ return atan(sin(a - b), cos(a - b)); }

/* One glow model for both themes. On dark it adds light; on light adding
   would only clip, so it emits as a saturated tint with the same falloff. */
vec3 glowLight(vec3 col, float amt){
  vec3 dark = col + uLight * amt;
  vec3 lit  = mix(col, uLight * 1.04 + 0.03, clamp(1.0 - exp(-amt * 1.3), 0.0, 0.88));
  return mix(dark, lit, uTheme);
}

/* LED strip: a capsule that hugs the glass from outside */
float ledSd(vec2 pp){
  float sk = sdRB(pp, uKnobHalf, uKnobR);
  float ring = uKnobHalf.x * 0.061;
  float a = atan(pp.y, pp.x);
  float da = abs(angleDiff(a, uGlowAngle));
  float tang = max(da - uHalfW, 0.0) * (uKnobHalf.x + 5.0);
  return length(vec2(sk - ring, tang)) - uKnobHalf.x * 0.015;
}
float ledGround(vec2 pp){
  float ls = max(ledSd(pp), 0.0);
  float s = uKnobHalf.x / 99.0;
  return (exp(-ls / (14.0 * s)) * 0.85 + exp(-ls / (55.0 * s)) * 0.32) * uLed;
}

`;

const FRAG_SCENE = HEADER + `
uniform sampler2D uPix;
uniform sampler2D uGlow;
uniform float uIconSize;
out vec4 outColor;

void main(){
  vec2 fc = vec2(gl_FragCoord.x / uDpr, uCss.y - gl_FragCoord.y / uDpr); // css, top-left origin
  vec2 p = vec2(fc.x - uCenter.x, uCenter.y - fc.y);              // y up
  vec2 kc = vec2(uKnobX, 0.0);

  /* page: studio light in the upper right */
  vec2 uvTop = fc / uCss;
  float sky = 1.0 - smoothstep(0.0, 1.5, length((uvTop - vec2(0.92, -0.08)) * vec2(1.0, 1.25)));
  vec3 dBg = mix(vec3(0.040), vec3(0.120), sky);
  vec3 lBg = mix(vec3(0.800), vec3(0.925), sky);
  vec3 col = mix(dBg, lBg, uTheme);

  /* 设计稿 432×224 下 sFac≈1；倒角、边缘高光这类按比例缩放的常量用 sFac 折算 */
  float sFac = uKnobHalf.x / 99.0;

  float st = sdRB(p, uTrackHalf, uTrackR);

  /* track cast shadow */
  float sh = 1.0 - smoothstep(-10.0, 34.0, sdRB(p - vec2(0.0, -14.0), uTrackHalf, uTrackR));
  col *= 1.0 - sh * mix(0.5, 0.17, uTheme);
  float sh2 = 1.0 - smoothstep(-2.0, 4.0, sdRB(p - vec2(0.0, -1.5), uTrackHalf, uTrackR));
  col *= 1.0 - sh2 * mix(0.3, 0.08, uTheme);

  /* LED spill onto the page */
  float ls = max(ledSd(p - kc), 0.0);
  float spill = (exp(-ls / (18.0 * sFac)) * 0.5 + exp(-ls / (85.0 * sFac)) * 0.34) * uLed;
  col = glowLight(col, spill * 0.6);

  if (st < 2.0) {
    /* track floor */
    vec3 base = mix(vec3(0.030), vec3(0.945), uTheme);
    base *= 1.0 - p.y / uTrackHalf.y * mix(0.05, 0.010, uTheme);
    float sOff = sdRB(p - vec2(0.0, -7.0), uTrackHalf, uTrackR);
    float inner = smoothstep(-14.0, 3.0, sOff);
    base = mix(base * (1.0 - inner * 0.6), base - inner * 0.085, uTheme);

    float led = (exp(-ls / (14.0 * sFac)) * 0.85 + exp(-ls / (55.0 * sFac)) * 0.32) * uLed;
    base = glowLight(base, led * 0.55);

    /* knob shadow on the floor, outside the lens only */
    float sk0 = sdRB(p - kc - vec2(0.0, -(7.0 + uLift * 5.0)), uKnobHalf, uKnobR);
    float ksh = 1.0 - smoothstep(-8.0, 20.0 + uLift * 8.0, sk0);
    float under = 1.0 - smoothstep(-1.5, 1.5, sdRB(p - kc, uKnobHalf, uKnobR));
    base *= 1.0 - ksh * mix(0.6, 0.2, uTheme) * (1.0 - under);

    float rim = 1.0 - smoothstep(0.0, 1.3, abs(st + 0.75));
    float topness = smoothstep(-uTrackHalf.y * 0.6, uTrackHalf.y, p.y);
    base += rim * mix(mix(0.035, 0.09, 1.0 - topness), mix(-0.055, 0.05, topness), uTheme);

    col = mix(col, base, 1.0 - smoothstep(-0.6, 0.6, st));

    /* pixel swarm beneath the glass: sharp texture + blurred glow */
    vec2 pp2 = p - kc;
    vec2 uvI = vec2(pp2.x, -pp2.y) / uIconSize + 0.5;
    float ia = texture(uPix, uvI).a;
    float ig = texture(uGlow, uvI).a;
    if (ia + ig > 0.001) {
      float inkT = smoothstep(0.40, 0.56, lum(base));
      vec3 ink = mix(vec3(1.0, 0.965, 0.925), vec3(0.11, 0.105, 0.10), inkT);
      ink += uLight * clamp(ledGround(pp2) * 0.20, 0.0, 0.55) * mix(0.9, 0.25, uTheme);
      col = mix(col, ink, clamp(ia, 0.0, 1.0));
      col += vec3(1.0, 0.78, 0.55) * ig * 0.64 * (1.0 - uTheme);
    }
    outColor = vec4(col, clamp(ia, 0.0, 1.0));
    return;
  }

  outColor = vec4(col, 0.0);
}`;

const FRAG_GLASS = HEADER + `
uniform sampler2D uScene;
out vec4 outColor;

void main(){
  vec2 fc = vec2(gl_FragCoord.x / uDpr, uCss.y - gl_FragCoord.y / uDpr);
  vec2 p = vec2(fc.x - uCenter.x, uCenter.y - fc.y);
  vec2 kc = vec2(uKnobX, 0.0);
  vec2 pp = p - kc;
  vec2 uv = gl_FragCoord.xy / uRes;
  float s = uKnobHalf.x / 99.0;

  float sd = sdRB(pp, uKnobHalf, uKnobR);
  float lsd = ledSd(pp);
  vec3 col = textureLod(uScene, uv, 0.0).rgb;

  float sil = 0.0;
  if (sd < 2.0 * s) {
    /* bevel normal from the rounded-box SDF */
    float e = 0.5 * s;
    vec2 n = vec2(
      sdRB(pp + vec2(e, 0.0), uKnobHalf, uKnobR) - sdRB(pp - vec2(e, 0.0), uKnobHalf, uKnobR),
      sdRB(pp + vec2(0.0, e), uKnobHalf, uKnobR) - sdRB(pp - vec2(0.0, e), uKnobHalf, uKnobR)
    );
    n /= max(length(n), 1e-4);

    float d = max(-sd, 0.0);
    float t = clamp(d / uBevel, 0.0, 1.0);
    float slope = pow(1.0 - t, 2.6);

    /* refraction: the bevel bends inward, the centre magnifies */
    vec2 off = -n * slope * 40.0 * s - pp * 0.055;
    float mip = 0.12 + 1.7 * slope;

    vec3 refr;
    refr.r = textureLod(uScene, uv + off * uDpr / uRes * 0.968, mip).r;
    refr.g = textureLod(uScene, uv + off * uDpr / uRes, mip).g;
    refr.b = textureLod(uScene, uv + off * uDpr / uRes * 1.032, mip).b;
    float ia = textureLod(uScene, uv + off * uDpr / uRes, 0.0).a;

    /* dark: smoked glass; light: cream glass that clears over the icon */
    float vyTop = clamp((pp.y + uKnobHalf.y) / (2.0 * uKnobHalf.y), 0.0, 1.0);
    vec3 dGlass = refr * 0.84 + vec3(0.135) * (0.45 + 0.55 * vyTop);
    vec3 lGlass = mix(refr, vec3(0.99), 0.5 * (1.0 - ia * 0.8));
    vec3 body = mix(dGlass, lGlass, uTheme);

    /* light entering the glass + total internal reflection in the bevel */
    float lq = max(lsd, 0.0);
    float sc = (exp(-lq / (24.0 * s)) * 0.8 + exp(-lq / (64.0 * s)) * 0.2) * uLed;
    body = glowLight(body, sc * 0.8);
    float rg = exp(-d / (2.2 * s)) * exp(-lq / (40.0 * s)) * uLed;
    body = glowLight(body, rg * 1.3);

    /* fixed speculars, bevel shading */
    vec2 Ld = normalize(vec2(-0.35, 1.0));
    float ndl = dot(n, Ld);
    body += pow(max(ndl, 0.0), 2.0) * exp(-d / (1.25 * s)) * mix(0.42, 0.70, uTheme);
    body += max(ndl, 0.0) * slope * mix(0.07, 0.16, uTheme);
    body *= 1.0 - max(-ndl, 0.0) * slope * mix(0.28, 0.07, uTheme);
    body += exp(-d / (0.7 * s)) * mix(0.07, 0.12, uTheme);
    body += (hash21(gl_FragCoord.xy) - 0.5) * 0.012;

    sil = 1.0 - smoothstep(-0.7, 0.7, sd);
    col = mix(col, body, sil);
  }

  /* the strip itself: white-hot core inside a saturated tube */
  float lm = 1.0 - smoothstep(-0.6 * s, 0.6 * s, lsd);
  vec3 lc = mix(uLight * 1.05, mix(uLight, vec3(1.0), 0.65), 1.0 - smoothstep(-1.4 * s, -0.2 * s, lsd));
  col = mix(col, lc * (0.8 + 0.35 * uLed), lm);
  col = glowLight(col, exp(-max(lsd, 0.0) / (4.5 * s)) * 0.55 * uLed * (1.0 - lm));

  col += (hash21(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * 0.014;

  /* 嵌进别人的界面时，轨道以外必须是透明的，只把 LED 光晕留成一圈柔光 */
  float sdT = sdRB(p, uTrackHalf, uTrackR);
  float outside = smoothstep(-1.0, 3.0, sdT);
  float ls = max(lsd, 0.0);
  float spill = (exp(-ls / (16.0 * s)) * 0.34 + exp(-ls / (46.0 * s)) * 0.20) * uLed;
  float spillA = clamp(spill * 2.0, 0.0, 1.0) * outside;
  col = mix(col, mix(uLight, vec3(1.0), 0.5), spillA);
  float aOut = max(max(1.0 - smoothstep(-1.0, 2.0, sdT), sil), lm);
  aOut = max(aOut, spillA);

  /* 画布比版位外扩 10px，最后 8px 羽化，让光晕在边界前自然归零而不是被切一刀 */
  float fe = min(min(fc.x, uCss.x - fc.x), min(fc.y, uCss.y - fc.y));
  aOut *= smoothstep(0.0, 8.0, fe);
  outColor = vec4(clamp(col, 0.0, 1.0), clamp(aOut, 0.0, 1.0));
}`;

/* ------------------------------ renderer ------------------------------ */
export function createGlassToggle ({ root, canvas, space, hit, initial = 0, onChange = () => {} }) {
  const gl = canvas.getContext('webgl2', {
    alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: false
  });
  if (!gl || gl.isContextLost()) throw new Error('WebGL2 is not available');

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    if (!sh) throw new Error('createShader failed (context lost?)');
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(String(gl.getShaderInfoLog(sh)));
    return sh;
  };
  const program = frag => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const cache = new Map();
    return { p, loc: n => { if (!cache.has(n)) cache.set(n, gl.getUniformLocation(p, n)); return cache.get(n); } };
  };
  const scene = program(FRAG_SCENE);
  const glass = program(FRAG_GLASS);

  const target = { tex: null, fbo: null, w: 0, h: 0 };
  const buildTarget = (w, h) => {
    if (target.tex) gl.deleteTexture(target.tex);
    if (target.fbo) gl.deleteFramebuffer(target.fbo);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const levels = Math.floor(Math.log2(Math.max(w, h))) + 1;
    gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    target.tex = tex; target.fbo = fbo; target.w = w; target.h = h;
  };
  const emptyVAO = gl.createVertexArray();

  /* the pixel swarm is rasterised on the CPU into a small texture: real
     per-particle springs, and the glass only has to sample it. */
  const pixCanvas = document.createElement('canvas');
  const pctx = pixCanvas.getContext('2d');
  const glowCanvas = document.createElement('canvas');
  const gctx = glowCanvas.getContext('2d');
  let HAS_FILTER;
  try { gctx.filter = 'blur(1px)'; HAS_FILTER = gctx.filter === 'blur(1px)'; gctx.filter = 'none'; }
  catch (e) { HAS_FILTER = false; }

  const texPix = gl.createTexture();
  const texGlow = gl.createTexture();
  for (const tex of [texPix, texGlow]) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  gl.useProgram(scene.p);
  gl.uniform1i(scene.loc('uPix'), 0);
  gl.uniform1i(scene.loc('uGlow'), 1);

  const L = {
    w: 0, h: 0, dpr: 1, scale: 1, center: [0, 0],
    trackHalf: [1, 1], trackR: 1, knobHalf: [1, 1], knobR: 1,
    halfKnob: 1, bevel: 1, travel: 1, iconSize: 1
  };

  function resize () {
    const box = root.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    // 分辨率与中心跟画布走（画布比版位每边外扩 10px），缩放仍按版位算
    const w = Math.max(1, Math.round(cr.width));
    const h = Math.max(1, Math.round(cr.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2, 2800 / Math.max(w, h));
    const bw = Math.max(2, Math.round(w * dpr));
    const bh = Math.max(2, Math.round(h * dpr));
    L.w = w; L.h = h; L.dpr = dpr;
    if (canvas.width !== bw || canvas.height !== bh || target.w !== bw || target.h !== bh) {
      canvas.width = bw; canvas.height = bh;
      buildTarget(bw, bh);
    }

    // authored at 432 x 224：按版位等比缩小，留 4px 给 LED 外溢
    const scale = Math.min(1, (box.width - 8) / 432, (box.height - 8) / 224);
    const tw = 432 * scale, th = 224 * scale;
    space.style.width = tw + 'px';
    space.style.height = th + 'px';
    const pad = 13 * scale;
    const knob = 198 * scale;

    L.scale = scale;
    L.center = [cr.width / 2, cr.height / 2];
    L.trackHalf = [tw / 2, th / 2];
    L.trackR = 72 * scale;
    L.knobHalf = [knob / 2, knob / 2];
    L.halfKnob = knob / 2;
    L.knobR = 58 * scale;
    L.bevel = 26 * scale;
    L.travel = Math.max(1, tw - pad * 2 - knob);

    L.iconSize = ICON_BOX * scale;
    const ipx = Math.max(64, Math.round(L.iconSize * dpr));
    if (pixCanvas.width !== ipx) {
      pixCanvas.width = ipx; pixCanvas.height = ipx;
      glowCanvas.width = Math.max(32, Math.round(ipx / 2));
      glowCanvas.height = glowCanvas.width;
      for (const px of PIX) px.inited = false;
    }
  }

  /* state */
  let pos = clamp(initial, 0, 1);
  let targetState = pos > 0.5 ? 1 : 0;
  let vel = 0;
  let dragging = false, dragX = 0, dragPos = 0, moved = false;
  let press = 0, pressAnim = 0;
  let hover = 0, hoverAnim = 0, kick = 0, dir = 1;
  let prevPos = pos;
  let sp = easeIO(pos), spv = 0;
  let stretch = 0;
  let glowAngle = -PI / 2;
  let now = performance.now();
  let last = now;
  let running = true;
  let raf = 0;

  const setTarget = (v, hard = false) => {
    targetState = v > 0.5 ? 1 : 0;
    hit.setAttribute('aria-checked', targetState ? 'true' : 'false');
    if (hard) { pos = targetState; sp = easeIO(pos); spv = 0; vel = 0; }
    else kick = 1;
    onChange(targetState);
  };

  /* pointer */
  hit.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    hit.setPointerCapture(e.pointerId);
    dragging = true; moved = false; press = 1;
    dragX = e.clientX; dragPos = pos; vel = 0;
  });
  hit.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - dragX;
    if (Math.abs(dx) > 3) moved = true;
    let v = dragPos + dx / L.travel;
    if (v > 1) v = 1 + (v - 1) * 0.22;
    if (v < 0) v = v * 0.22;
    pos = v;
  });
  hit.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = 1; });
  hit.addEventListener('pointerleave', () => { hover = 0; });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false; press = 0;
    const next = moved ? (pos + vel * 0.02 > 0.5 ? 1 : 0) : (targetState ? 0 : 1);
    targetState = next;
    kick = moved ? 0.6 : 1;
    hit.setAttribute('aria-checked', next ? 'true' : 'false');
    onChange(next);
  };
  hit.addEventListener('pointerup', endDrag);
  hit.addEventListener('pointercancel', endDrag);
  hit.addEventListener('lostpointercapture', () => { if (dragging) endDrag(); });
  hit.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault(); setTarget(targetState ? 0 : 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault(); setTarget(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault(); setTarget(0);
    }
  });

  const setCommon = prog => {
    const u = prog.loc;
    gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    gl.uniform1f(u('uDpr'), L.dpr);
    gl.uniform2f(u('uCss'), L.w, L.h);
    gl.uniform2f(u('uCenter'), L.center[0], L.center[1]);
    gl.uniform2f(u('uTrackHalf'), L.trackHalf[0], L.trackHalf[1]);
    gl.uniform1f(u('uTrackR'), L.trackR);
    gl.uniform2f(u('uKnobHalf'), L.knobHalf[0], L.knobHalf[1]);
    gl.uniform1f(u('uKnobR'), L.knobR);
    gl.uniform1f(u('uKnobX'), (pos - 0.5) * L.travel);
    gl.uniform1f(u('uBevel'), L.bevel);
    const theme = smooth(0.18, 0.82, pos);
    gl.uniform1f(u('uTheme'), theme);
    gl.uniform1f(u('uGlowAngle'), glowAngle);
    gl.uniform1f(u('uHalfW'), CFG.halfW);
    gl.uniform1f(u('uTime'), now / 1000);
    gl.uniform1f(u('uLift'), hoverAnim * (1 - pressAnim) * L.scale);
    gl.uniform1f(u('uLed'), CFG.led + hoverAnim * CFG.hoverLed
      + Math.min(Math.abs(vel) * 0.05, 0.18) + pressAnim * CFG.pressLed + kick * CFG.kickLed);
    gl.uniform3f(u('uLight'),
      LIGHT_A[0] + (LIGHT_B[0] - LIGHT_A[0]) * theme,
      LIGHT_A[1] + (LIGHT_B[1] - LIGHT_A[1]) * theme,
      LIGHT_A[2] + (LIGHT_B[2] - LIGHT_A[2]) * theme);
    gl.uniform1f(u('uIconSize'), L.iconSize);
  };

  const draw = () => {
    gl.bindVertexArray(emptyVAO);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texPix);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texGlow);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.w, target.h);
    gl.useProgram(scene.p);
    setCommon(scene);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, target.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(glass.p);
    setCommon(glass);
    gl.uniform1i(glass.loc('uScene'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const nightEl = document.getElementById('capNight');
  const dayEl = document.getElementById('capDay');
  let inkKey = '';
  function syncUI () {
    if (nightEl) nightEl.style.opacity = (1 - smooth(0.15, 0.85, pos)).toFixed(3);
    if (dayEl) dayEl.style.opacity = smooth(0.15, 0.85, pos).toFixed(3);
    const theme = smooth(0.18, 0.82, pos);
    const dark = theme < 0.5;
    const key = dark ? 'n' : 'd';
    if (key !== inkKey) {
      inkKey = key;
      const root = { setProperty() {} };   // 组件内不写全局 CSS 变量
      if (dark) {
        root.setProperty('--ink', 'rgba(238,240,247,.92)');
        root.setProperty('--dim', 'rgba(238,240,247,.50)');
      } else {
        root.setProperty('--ink', 'rgba(22,23,26,.90)');
        root.setProperty('--dim', 'rgba(22,23,26,.55)');
      }
    }
  }

  function drawPixels (dt, vel, time) {
    const size = pixCanvas.width;
    const k = L.scale * L.dpr;
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, size, size);
    pctx.setTransform(k, 0, 0, k, size / 2, size / 2);
    pctx.fillStyle = '#fff';

    const pc = clamp(pos, 0, 1);
    const kvx = vel * L.travel / L.scale; // design px/s
    for (const px of PIX) {
      const t = clamp((pc - px.delay) / 0.62, 0, 1);
      const e = easeIO(t);
      const ox = (px.a.x - C0) * PITCH, oy = (px.a.y - C0) * PITCH;
      const tx = (px.b.x - C0) * PITCH, ty = (px.b.y - C0) * PITCH;
      const dx = tx - ox, dy = ty - oy, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const arc = Math.sin(PI * e);
      let x = ox + dx * e + nx * px.curl * CFG.swirl * arc;
      let y = oy + dy * e + ny * px.curl * CFG.swirl * arc;
      const r = Math.hypot(x, y) || 1;
      x += x / r * px.lift * arc * 1.4 * CFG.burst;
      y += y / r * px.lift * arc * 1.4 * CFG.burst;

      if (!px.inited) { px.x = x; px.y = y; px.vx = 0; px.vy = 0; px.inited = true; }
      const kk = px.k, cc = 2 * Math.sqrt(kk) * CFG.partDamp;
      px.vx += (-kk * (px.x - x) - cc * px.vx) * dt;
      px.vy += (-kk * (px.y - y) - cc * px.vy) * dt;
      px.x += px.vx * dt; px.y += px.vy * dt;

      let ba = px.ba, bb = px.bb;
      if (px.ka === 'star') ba *= 0.45 + 0.55 * Math.pow(Math.sin(time * px.tw + px.phase), 2);
      if (px.kb === 'ray') bb *= 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(time * 2.2 - px.ang));
      const bright = (ba + (bb - ba) * e) * (1 + 0.3 * arc);
      if (bright < 0.004) continue;
      const drag = clamp(-kvx * px.drag, -14, 14);
      const sz = PSIZE * (1 - 0.45 * arc);
      pctx.globalAlpha = clamp(bright, 0, 1);
      pctx.fillRect(px.x + drag - sz / 2, px.y - sz / 2, sz, sz);
    }
    pctx.globalAlpha = 1;

    const gs = glowCanvas.width;
    gctx.setTransform(1, 0, 0, 1, 0, 0);
    gctx.clearRect(0, 0, gs, gs);
    if (HAS_FILTER) {
      gctx.filter = `blur(${Math.max(1, 4 * L.scale * L.dpr / 2)}px)`;
      gctx.drawImage(pixCanvas, 0, 0, gs, gs);
      gctx.filter = 'none';
    } else {
      gctx.globalAlpha = 0.35;
      gctx.drawImage(pixCanvas, 0, 0, gs, gs);
      gctx.globalAlpha = 1;
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texPix);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pixCanvas);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texGlow);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glowCanvas);
  }

  function frame (t) {
    if (!running) return;
    now = t;
    const dt = Math.min(0.033, Math.max(0.0005, (t - last) / 1000));
    last = t;

    if (!dragging) {
      const k = CFG.knobK, c = 2 * Math.sqrt(k) * CFG.knobDamp;
      const steps = 4, h = dt / steps;
      for (let i = 0; i < steps; i++) {
        const a = -k * (pos - targetState) - c * vel;
        vel += a * h; pos += vel * h;
      }
      if (Math.abs(targetState - pos) < 0.0006 && Math.abs(vel) < 0.02) { pos = targetState; vel = 0; }
    } else {
      vel = clamp((pos - prevPos) / Math.max(dt, 0.0005), -14, 14);
    }

    // the strip has its own eased, lagging orbit: bottom ⇄ top via the leading side
    const goal = easeIO(clamp(pos, 0, 1));
    const ks = CFG.stripK, cs = 2 * Math.sqrt(ks);
    spv += (-ks * (sp - goal) - cs * spv) * dt;
    sp += spv * dt;
    // the orbit is latched to the last direction of travel, so a return
    // switch sweeps around the other side instead of retracing
    if (sp < 0.015) dir = 1; else if (sp > 0.985) dir = -1;
    glowAngle = dir > 0 ? -PI / 2 + PI * clamp(sp, 0, 1) : PI / 2 + PI * (1 - clamp(sp, 0, 1));
    stretch += (Math.min(Math.abs(vel) * CFG.stretchGain, CFG.stretchMax) - stretch) * Math.min(1, dt * 12);

    hoverAnim += (hover - hoverAnim) * Math.min(1, dt * 10);
    pressAnim += (press - pressAnim) * Math.min(1, dt * 18);
    kick *= Math.exp(-dt * CFG.kickDecay);

    // speed stretch of the glass, like a soft body
    const sx = stretch * L.scale;
    const sq = 1 - pressAnim * CFG.pressSqueeze;
    L.knobHalf = [(99 * L.scale + sx) * sq, Math.max(99 * L.scale - sx * 0.45, 88 * L.scale) * sq];
    prevPos = pos;

    syncUI();
    drawPixels(dt, vel, now / 1000);
    draw();
    raf = requestAnimationFrame(frame);
  }

  const onVisible = () => {
    if (document.hidden) running = false;
    else { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  };
  document.addEventListener('visibilitychange', onVisible);

  resize();
  raf = requestAnimationFrame(frame);
  const ro = new ResizeObserver(() => resize());
  ro.observe(root);

  return {
    get value () { return pos; },
    get state () { return pos > 0.5 ? 'day' : 'night'; },
    set (v, animate = true) {
      const s = v === 'day' ? 1 : v === 'night' ? 0 : clamp(Number(v), 0, 1);
      if (!animate) {
        pos = s; targetState = s; vel = 0; prevPos = s; sp = easeIO(s); spv = 0;
        hit.setAttribute('aria-checked', s > 0.5 ? 'true' : 'false');
        syncUI(); draw();
      } else {
        setTarget(s > 0.5 ? 1 : 0);
      }
    },
    toggle () { setTarget(targetState ? 0 : 1); },
    destroy () {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    }
  };
}
