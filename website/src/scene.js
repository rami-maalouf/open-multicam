// the hero's scene: the icon's two sculpted frames, each one a live camera. the back camera
// plays in the aqua frame, the front camera in the teal one, and the two move between the
// layouts the app records: picture in picture, split, and two files. slow, quiet, and it stops
// when nobody can see it.

import {
  AdditiveBlending,
  Color,
  Group,
  MathUtils,
  Mesh,
  NormalBlending,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector4,
  VideoTexture,
  WebGLRenderer,
} from "three";

// the icon's colours: the rear frame aqua, the front one petrol teal, their walls a shade deeper
const AQUA = new Color("#4fc6d1");
const TEAL = new Color("#168e99");
const AQUA_WALL = new Color("#1f7c86");
const TEAL_WALL = new Color("#0a4f57");
const SHADOW = new Color("#000000");

// one video holds both feeds side by side: the back camera on the left, the front on the right,
// each 9:16. one decoder keeps them in sync.
const FEEDS = "/media/feeds.mp4";
const POSTER = "/media/feeds.jpg";
const FEED_ASPECT = 9 / 16;

// a full portrait frame, and the box every layout stays inside (world units)
const H = 3.6;
const W = H * FEED_ASPECT;
const BOX = { w: 3.1, h: 4.1 };

// where each frame goes in each layout: [x, y, z, width, height]. frame 0 is the back camera.
function layout(mode) {
  if (mode === "pip") {
    const pw = W * 0.36;
    const ph = pw / FEED_ASPECT;
    const m = 0.17;
    return [
      [0, 0, 0, W, H],
      [W / 2 - m - pw / 2, H / 2 - m - ph / 2, 0.16, pw, ph],
    ];
  }
  if (mode === "split") {
    const gap = 0.07;
    const h = (H - gap) / 2;
    return [
      [0, gap / 2 + h / 2, 0, W, h],
      [0, -gap / 2 - h / 2, 0, W, h],
    ];
  }
  // two files: the icon itself, one frame behind and above the other
  const s = 0.84;
  return [
    [-0.5, 0.42, -0.35, W * s, H * s],
    [0.5, -0.42, 0.35, W * s, H * s],
  ];
}

// how the whole pair turns toward the words in each layout: [tilt back, turn]
const POSE = { two: [0.1, -0.46], pip: [0.06, -0.3], split: [0.06, -0.3] };

const sdf = /* glsl */ `
  float box(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
`;

const vertex = /* glsl */ `
  uniform vec2 uSize;
  uniform float uPad;
  varying vec2 vPos;
  void main() {
    vec2 p = position.xy * (uSize + 2.0 * uPad);
    vPos = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
  }
`;

// the face: a rounded rim lit from the upper left like the icon's satin bevels, and the camera
// inside it, its edge falling into a soft shadow
const faceFragment = /* glsl */ `
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uRim;
  uniform vec3 uColor;
  uniform sampler2D uMap;
  uniform vec4 uCrop;
  uniform float uOpacity;
  uniform float uSheen;
  varying vec2 vPos;
  ${sdf}
  void main() {
    vec2 b = uSize * 0.5;
    float d = box(vPos, b, uRadius);
    float aa = max(fwidth(d), 1e-4);
    float alpha = 1.0 - smoothstep(-aa, aa, d);
    if (alpha <= 0.001) discard;

    // the rim's profile is half a tube: 0 at the opening, 1 at the outside
    float s = clamp((d + uRim) / uRim, 0.0, 1.0);
    float c = s * 2.0 - 1.0;
    float h = sqrt(max(1.0 - c * c, 0.0));
    const float e = 0.002;
    vec2 g = vec2(
      box(vPos + vec2(e, 0.0), b, uRadius) - box(vPos - vec2(e, 0.0), b, uRadius),
      box(vPos + vec2(0.0, e), b, uRadius) - box(vPos - vec2(0.0, e), b, uRadius)
    );
    g = normalize(g + 1e-6);
    vec3 n = normalize(vec3(g * c, h * 0.85 + 0.15));
    vec3 l = normalize(vec3(-0.5, 0.7, 0.75));
    float diffuse = max(dot(n, l), 0.0);
    float spec = pow(max(dot(n, normalize(l + vec3(0.0, 0.0, 1.0))), 0.0), 34.0);
    vec3 rim = uColor * (0.3 + 0.85 * diffuse) + vec3(0.82, 1.0, 1.0) * spec * 0.42;

    vec2 uv = clamp((vPos + b) / uSize, 0.0, 1.0);
    // the feed arrives as display (srgb) values; turn it to linear light before shading
    vec3 feed = pow(texture2D(uMap, uCrop.xy + uv * uCrop.zw).rgb, vec3(2.2));
    float inside = -(d + uRim);
    feed *= 1.0 - 0.55 * (1.0 - smoothstep(0.0, uRim * 1.3, inside));
    // a faint sheen across the glass in front of the camera
    float band = uv.x * 0.8 + uv.y * 0.55 + uSheen;
    feed += vec3(0.85, 1.0, 1.0) * 0.045 * smoothstep(0.62, 0.78, band) * (1.0 - smoothstep(0.78, 0.98, band));

    float onRim = smoothstep(-uRim - aa, -uRim + aa, d);
    gl_FragColor = vec4(mix(feed, rim, onRim), alpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

// the walls: the same ring, drawn a few times behind the face so the frame has depth
const wallFragment = /* glsl */ `
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uRim;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vPos;
  ${sdf}
  void main() {
    vec2 b = uSize * 0.5;
    float d = box(vPos, b, uRadius);
    float aa = max(fwidth(d), 1e-4);
    float alpha = (1.0 - smoothstep(-aa, aa, d)) * smoothstep(-uRim - aa, -uRim + aa, d);
    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(uColor, alpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

// a soft rounded shape: a shadow under each frame, or a glow behind it
const softFragment = /* glsl */ `
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uPad;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vPos;
  ${sdf}
  void main() {
    float d = box(vPos, uSize * 0.5, uRadius);
    float a = 1.0 - smoothstep(-uPad * 0.6, uPad, d);
    gl_FragColor = vec4(uColor, a * a * uOpacity);
    #include <colorspace_fragment>
  }
`;

const WALLS = 6;

// a frame and everything that travels with it. its place eases toward its target on a spring.
function frame(color, wallColor, map) {
  const size = { value: new Vector2(W, H) };
  const radius = { value: 0.3 };
  const rim = { value: 0.1 };
  const opacity = { value: 0 };
  const crop = { value: new Vector4(0, 0, 0.5, 1) };
  const sheen = { value: 0 };
  const plane = new PlaneGeometry(1, 1);
  const group = new Group();

  const face = new Mesh(
    plane,
    new ShaderMaterial({
      uniforms: { uSize: size, uPad: { value: 0.02 }, uRadius: radius, uRim: rim, uColor: { value: color }, uMap: map, uCrop: crop, uOpacity: opacity, uSheen: sheen },
      vertexShader: vertex,
      fragmentShader: faceFragment,
      transparent: true,
    }),
  );
  face.renderOrder = 3;
  group.add(face);

  const wallMaterial = new ShaderMaterial({
    uniforms: { uSize: size, uPad: { value: 0.02 }, uRadius: radius, uRim: rim, uColor: { value: wallColor }, uOpacity: opacity },
    vertexShader: vertex,
    fragmentShader: wallFragment,
    transparent: true,
  });
  const walls = Array.from({ length: WALLS }, () => {
    const m = new Mesh(plane, wallMaterial);
    m.renderOrder = 2;
    group.add(m);
    return m;
  });

  const soft = (tint, pad, additive) =>
    new Mesh(
      plane,
      new ShaderMaterial({
        uniforms: { uSize: size, uPad: { value: pad }, uRadius: radius, uColor: { value: tint }, uOpacity: { value: 0 } },
        vertexShader: vertex,
        fragmentShader: softFragment,
        transparent: true,
        depthWrite: false,
        blending: additive ? AdditiveBlending : NormalBlending,
      }),
    );
  const shadow = soft(SHADOW, 0.32, false);
  shadow.renderOrder = 1;
  const glow = soft(color, 0.9, true);
  glow.renderOrder = 0;
  group.add(glow, shadow);

  // x, y, z, width, height, opacity; each with a velocity
  const at = [0, 0, -4, W, H, 0];
  const vel = [0, 0, 0, 0, 0, 0];
  let to = [0, 0, 0, W, H, 1];

  function step(dt, stiffness, damping) {
    for (let i = 0; i < at.length; i++) {
      vel[i] += ((to[i] - at[i]) * stiffness - vel[i] * damping) * dt;
      at[i] += vel[i] * dt;
    }
  }

  function apply(half, t) {
    const [x, y, z, w, h, o] = at;
    const small = Math.max(Math.min(w, h), 0.05);
    size.value.set(w, h);
    radius.value = small * 0.13;
    rim.value = small * 0.06;
    opacity.value = MathUtils.clamp(o, 0, 1);
    sheen.value = Math.sin(t * 0.3 + half) * 0.25;

    // the feed fills the opening and keeps its shape, as the app crops it
    const a = w / h;
    if (a > FEED_ASPECT) {
      const sy = FEED_ASPECT / a;
      crop.value.set(half * 0.5, (1 - sy) / 2, 0.5, sy);
    } else {
      const sx = 0.5 * (a / FEED_ASPECT);
      crop.value.set(half * 0.5 + (0.5 - sx) / 2, 0, sx, 1);
    }

    face.position.set(x, y, z);
    const depth = rim.value * 1.5;
    walls.forEach((m, i) => m.position.set(x, y, z - (depth * (i + 1)) / WALLS));
    shadow.position.set(x + small * 0.06, y - small * 0.1, z - depth - 0.25);
    shadow.material.uniforms.uOpacity.value = opacity.value * 0.75;
    glow.position.set(x, y, z - depth - 0.6);
    glow.material.uniforms.uOpacity.value = opacity.value * 0.14;
  }

  return {
    group,
    step,
    apply,
    set target(v) {
      to = [...v, 1];
    },
    snap() {
      for (let i = 0; i < at.length; i++) {
        at[i] = to[i];
        vel[i] = 0;
      }
    },
  };
}

export async function startScene(canvas, slot) {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "default" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.1, 100);
  const DISTANCE = 12;
  camera.position.set(0, 0, DISTANCE);

  // the poster shows first; the video takes over once it is playing. both stay as raw
  // display values (no colour space), and the shader decodes them the same way
  const poster = await new TextureLoader().loadAsync(POSTER);
  const map = { value: poster };

  const video = document.createElement("video");
  video.src = FEEDS;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  const feed = new VideoTexture(video);
  video.addEventListener("playing", () => (map.value = feed), { once: true });

  const pair = new Group();
  scene.add(pair);
  const frames = [frame(AQUA, AQUA_WALL, map), frame(TEAL, TEAL_WALL, map)];
  for (const f of frames) pair.add(f.group);

  // the pair's own turn, on a slower spring, with a swing each time the layout changes
  const pose = { at: [...POSE.two], vel: [0, 0], to: [...POSE.two] };

  let mode = "two";
  let pending = null;
  function setMode(next) {
    mode = next;
    const targets = layout(next);
    frames[0].target = targets[0];
    // the second camera follows a beat later, so the move reads as one gesture
    pending = { at: clock + 0.09, target: targets[1] };
    pose.to = [...POSE[next]];
    pose.vel[1] -= 0.55;
    if (still) {
      frames[1].target = targets[1];
      pending = null;
      for (const f of frames) f.snap();
      pose.at = [...pose.to];
      render(0, 0);
    }
  }

  const initial = layout("two");
  frames[0].target = initial[0];
  frames[1].target = initial[1];
  if (still) for (const f of frames) f.snap();

  // place the pair over the slot in the page, at the size that fits it
  const home = { x: 0, y: 0, scale: 1 };
  function measure() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const viewH = 2 * DISTANCE * Math.tan(MathUtils.degToRad(camera.fov / 2));
    const perUnit = h / viewH;
    const c = canvas.getBoundingClientRect();
    const s = slot.getBoundingClientRect();
    home.x = ((s.left + s.width / 2 - c.left) / w - 0.5) * viewH * camera.aspect;
    home.y = -((s.top + s.height / 2 - c.top) / h - 0.5) * viewH;
    home.scale = Math.min(s.height / (BOX.h * perUnit), s.width / (BOX.w * perUnit));
  }
  measure();
  const resized = () => {
    measure();
    if (still) render(0, 0);
  };
  new ResizeObserver(resized).observe(canvas);
  new ResizeObserver(resized).observe(slot);

  // the pointer leans the pair a little
  const lean = new Vector2();
  const leanTo = new Vector2();
  addEventListener(
    "pointermove",
    (e) => leanTo.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1),
    { passive: true },
  );

  let clock = 0;
  function render(t, dt) {
    if (pending && t >= pending.at) {
      frames[1].target = pending.target;
      pending = null;
    }
    // small fixed steps keep the springs steady at any frame rate
    for (let left = dt; left > 0; left -= 1 / 120) {
      const h = Math.min(left, 1 / 120);
      for (const f of frames) f.step(h, 70, 13);
      for (let i = 0; i < 2; i++) {
        pose.vel[i] += ((pose.to[i] - pose.at[i]) * 26 - pose.vel[i] * 7.5) * h;
        pose.at[i] += pose.vel[i] * h;
      }
    }
    frames.forEach((f, i) => f.apply(i, t));

    lean.lerp(leanTo, 0.04);
    pair.position.set(home.x, home.y + Math.sin(t * 0.8) * 0.05, 0);
    pair.scale.setScalar(home.scale);
    pair.rotation.set(
      pose.at[0] + lean.y * 0.12 + Math.sin(t * 0.6) * 0.02,
      pose.at[1] + lean.x * 0.2,
      Math.sin(t * 0.45) * 0.012,
    );
    renderer.render(scene, camera);
  }

  if (still) {
    render(0, 0);
    return { setMode };
  }

  // run only while the hero can be seen and the tab is in front; the video plays only then too
  let visible = true;
  let running = false;
  let last = performance.now();
  function frameLoop(now) {
    if (!visible || document.hidden) {
      running = false;
      video.pause();
      return;
    }
    const dt = Math.min((now - last) / 1000, 0.05);
    clock += dt;
    last = now;
    render(clock, dt);
    requestAnimationFrame(frameLoop);
  }
  function run() {
    if (running) return;
    running = true;
    last = performance.now();
    // low power mode can refuse to play; the poster stays then
    video.play().catch(() => {});
    requestAnimationFrame(frameLoop);
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) run();
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => !document.hidden && run());

  render(0, 0);
  run();
  return { setMode };
}
