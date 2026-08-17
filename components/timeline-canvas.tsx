'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { LoomPoint, TrunkLayout } from '@/lib/loom/points'
import { xToYear } from '@/lib/loom/time'

const UP = new THREE.Vector3(0, 1, 0)

class PolyCurve extends THREE.Curve<THREE.Vector3> {
  private readonly lens: number[]
  private readonly total: number
  constructor(private readonly pts: THREE.Vector3[]) {
    super()
    this.lens = [0]
    let acc = 0
    for (let i = 1; i < pts.length; i++) {
      acc += pts[i]!.distanceTo(pts[i - 1]!)
      this.lens.push(acc)
    }
    this.total = acc
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const d = t * this.total
    let i = 1
    while (i < this.pts.length - 1 && this.lens[i]! < d) i++
    const a = this.pts[i - 1]!
    const b = this.pts[i]!
    const seg = this.lens[i]! - this.lens[i - 1]! || 1
    return target.copy(a).lerp(b, (d - this.lens[i - 1]!) / seg)
  }
}

class TwistCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly base: THREE.Curve<THREE.Vector3>,
    private readonly radius: number,
    private readonly twists: number,
    private readonly phase: number,
  ) {
    super()
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const p = this.base.getPoint(t)
    const tan = this.base.getTangent(t).normalize()
    const n = new THREE.Vector3().crossVectors(tan, UP)
    if (n.lengthSq() < 1e-6) n.set(1, 0, 0)
    else n.normalize()
    const b = new THREE.Vector3().crossVectors(tan, n).normalize()
    const a = t * this.twists * Math.PI * 2 + this.phase
    return target
      .copy(p)
      .addScaledVector(n, Math.cos(a) * this.radius)
      .addScaledVector(b, Math.sin(a) * this.radius)
  }
}

function hexRgba(hex: string, alpha: number) {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

function radialTexture(hex: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  const grad = ctx.createRadialGradient(128, 128, 3, 128, 128, 128)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.2, hexRgba(hex, 0.8))
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(canvas)
}

function makeLabel(point: LoomPoint) {
  const title = point.title.length > 34 ? `${point.title.slice(0, 33)}…` : point.title
  const note = point.note || `[${point.reality || 'UNKNOWN'}]`
  const canvas = document.createElement('canvas')
  const measure = canvas.getContext('2d')
  if (!measure) throw new Error('2D canvas unavailable')
  measure.font = '600 21px "Courier New",monospace'
  canvas.width = Math.ceil(
    Math.max(measure.measureText(title).width, measure.measureText(note).width) + 54,
  )
  canvas.height = 60
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  ctx.fillStyle = 'rgba(4,7,14,0.72)'
  ctx.fillRect(0, 0, canvas.width, 60)
  ctx.fillStyle = point.color
  ctx.beginPath()
  ctx.arc(14, 17, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = '600 21px "Courier New",monospace'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = point.color
  ctx.shadowBlur = 9
  ctx.fillStyle = '#f3f6ff'
  ctx.fillText(title, 28, 19)
  ctx.font = '13px "Courier New",monospace'
  ctx.shadowBlur = 0
  ctx.fillStyle = '#9fb0d8'
  ctx.fillText(note, 28, 44)
  const tex = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
  )
  sprite.scale.set(canvas.width * 0.028, 60 * 0.028, 1)
  sprite.userData.baseScale = sprite.scale.clone()
  return sprite
}

type Branch = {
  point: LoomPoint
  pivot: THREE.Group
  inner: THREE.Group
  marker: THREE.Mesh
  glow: THREE.Sprite
  junction: THREE.Sprite
  label: THREE.Sprite
  materials: THREE.MeshBasicMaterial[]
  markerMaterial: THREE.MeshBasicMaterial
  hiddenByScrub: boolean
  baseEst: { markS: number; glowS: number; junS: number; labS: THREE.Vector3 }
}

export type LoomSelection = {
  point: LoomPoint
  pinned: boolean
  clientX?: number
  clientY?: number
}

export type LoomHandle = {
  setLabels: (on: boolean) => void
  setFocus: (on: boolean) => void
  setAnim: (on: boolean) => void
  setSpeed: (value: number) => void
  setActiveEarth: (reality: string | null) => void
  setScrub: (value: number) => void
  setScrubPlaying: (on: boolean) => void
  flyTo: (id: string) => void
  pin: (id: string | null) => void
  scrubLabel: () => string
}

type Props = {
  points: readonly LoomPoint[]
  layout: TrunkLayout
  onSelect: (selection: LoomSelection | null) => void
  onScrubLabel: (label: string) => void
  onScrubValue: (value: number) => void
  apiRef: React.MutableRefObject<LoomHandle | null>
}

export function TimelineCanvas({
  points,
  layout,
  onSelect,
  onScrubLabel,
  onScrubValue,
  apiRef,
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const selectRef = useRef(onSelect)
  const scrubLabelRef = useRef(onScrubLabel)
  const scrubValueRef = useRef(onScrubValue)

  useEffect(() => {
    selectRef.current = onSelect
    scrubLabelRef.current = onScrubLabel
    scrubValueRef.current = onScrubValue
  }, [onSelect, onScrubLabel, onScrubValue])

  useEffect(() => {
    if (!host.current) return
    const scene = new TemporalLoomScene(host.current, points, layout, {
      onSelect: (selection) => selectRef.current(selection),
      onScrubLabel: (label) => scrubLabelRef.current(label),
      onScrubValue: (value) => scrubValueRef.current(value),
    })
    apiRef.current = scene.handle
    return () => {
      apiRef.current = null
      scene.dispose()
    }
  }, [apiRef, layout, points])

  return <div ref={host} id="app" role="img" aria-label="Three-dimensional temporal loom" />
}

class TemporalLoomScene {
  readonly handle: LoomHandle
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 4000)
  private readonly renderer: THREE.WebGLRenderer
  private readonly loom = new THREE.Group()
  private readonly ray = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly target = new THREE.Vector3(0, 4, 0)
  private readonly sphere = { theta: 0.98, phi: 1.2, r: 450 }
  private readonly observer: ResizeObserver
  private readonly disposables: Array<{ dispose: () => void }> = []
  private readonly hitMeshes: THREE.Mesh[] = []
  private readonly branches = new Map<string, Branch>()
  private frame = 0
  private labelsEnabled = false
  private focusOn = false
  private animOn = true
  private speed = 0.6
  private activeEarth: string | null = null
  private scrub = 1000
  private scrubPlaying = false
  private hovered: Branch | null = null
  private pinned: Branch | null = null
  private fly: { pos: THREE.Vector3; r: number } | null = null
  private dragging = false
  private rightDragging = false
  private moved = 0
  private lastPtr = { x: 0, y: 0 }
  private lastHover = 0

  constructor(
    private readonly host: HTMLElement,
    points: readonly LoomPoint[],
    private readonly layout: TrunkLayout,
    private readonly callbacks: {
      onSelect: (selection: LoomSelection | null) => void
      onScrubLabel: (label: string) => void
      onScrubValue: (value: number) => void
    },
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.host.appendChild(this.renderer.domElement)
    this.scene.background = new THREE.Color(0x05060a)
    this.scene.fog = new THREE.Fog(0x05060a, 1100, 2000)
    this.scene.add(this.loom)
    this.buildStars()
    this.buildTrunk()
    this.buildBranches(points)
    this.bind()
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(this.host)
    this.resize()
    this.animate(0)
    this.handle = {
      setLabels: (on) => {
        this.labelsEnabled = on
        this.applyDim()
      },
      setFocus: (on) => {
        this.focusOn = on
        this.applyDim()
      },
      setAnim: (on) => {
        this.animOn = on
      },
      setSpeed: (value) => {
        this.speed = value / 40
      },
      setActiveEarth: (reality) => {
        this.activeEarth = reality
        this.applyDim()
      },
      setScrub: (value) => {
        this.scrub = value
        this.applyScrub()
      },
      setScrubPlaying: (on) => {
        this.scrubPlaying = on
      },
      flyTo: (id) => this.flyTo(id),
      pin: (id) => this.pin(id),
      scrubLabel: () => this.scrubLabel(),
    }
  }

  private track<T extends { dispose: () => void }>(resource: T) {
    this.disposables.push(resource)
    return resource
  }

  private buildStars() {
    const starGeo = this.track(new THREE.BufferGeometry())
    const count = 1500
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 950 + Math.random() * 700
      const theta = Math.acos(2 * Math.random() - 1)
      const phi = Math.random() * Math.PI * 2
      positions[i * 3] = radius * Math.sin(theta) * Math.cos(phi)
      positions[i * 3 + 1] = radius * Math.cos(theta) * 0.8
      positions[i * 3 + 2] = radius * Math.sin(theta) * Math.sin(phi)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.scene.add(
      new THREE.Points(
        starGeo,
        this.track(
          new THREE.PointsMaterial({
            color: 0xa9c1f0,
            size: 1.5,
            transparent: true,
            opacity: 0.85,
            sizeAttenuation: true,
            depthWrite: false,
            fog: false,
          }),
        ),
      ),
    )
    const nebCols = ['#3a2f7a', '#4a2f8a', '#1b3a6b', '#6a3a1b', '#2f6b5a', '#ffb35a']
    for (let i = 0; i < 10; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 1900,
        (Math.random() - 0.5) * 1200,
        (Math.random() - 0.5) * 1900,
      )
      if (pos.length() < 450) pos.multiplyScalar(450 / pos.length())
      const sprite = new THREE.Sprite(
        this.track(
          new THREE.SpriteMaterial({
            map: this.track(radialTexture(nebCols[i % nebCols.length]!)),
            transparent: true,
            opacity: 0.05 + Math.random() * 0.04,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false,
          }),
        ),
      )
      sprite.position.copy(pos)
      sprite.scale.setScalar(460 + Math.random() * 460)
      this.scene.add(sprite)
    }
  }

  private buildTrunk() {
    const trunk = new THREE.Group()
    this.loom.add(trunk)
    const pts: THREE.Vector3[] = []
    const steps = 240
    for (let i = 0; i <= steps; i++) {
      const x = this.layout.trunkMin + ((this.layout.trunkMax - this.layout.trunkMin) * i) / steps
      pts.push(new THREE.Vector3(x, Math.sin(x * 0.035) * 0.9, Math.cos(x * 0.027) * 0.7))
    }
    const base = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5)
    trunk.add(
      new THREE.Mesh(
        this.track(new THREE.TubeGeometry(base, 220, 1.4, 8, false)),
        this.track(
          new THREE.MeshBasicMaterial({
            color: 0xffc95c,
            transparent: true,
            opacity: 0.08,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      ),
    )
    const strands: Array<[number, number]> = [
      [0xf7c94d, 0],
      [0xffb84d, Math.PI],
      [0xf7a33d, Math.PI / 2],
      [0xffd76b, Math.PI * 1.5],
      [0xe6a84e, Math.PI / 4],
    ]
    for (const [color, phase] of strands) {
      trunk.add(
        new THREE.Mesh(
          this.track(
            new THREE.TubeGeometry(new TwistCurve(base, 0.2, 7, phase), 220, 0.12, 5, false),
          ),
          this.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })),
        ),
      )
    }
  }

  private buildBranches(points: readonly LoomPoint[]) {
    for (const point of points) {
      const L = point.length
      const dx = 0.9
      const dy = Math.sin(point.theta) * 1.05
      const dz = Math.sin(point.phi) * 0.8
      const X = new THREE.Vector3(1, 0, 0)
      const pt = (s: number) => new THREE.Vector3(dx * s, dy * s, dz * s)
      let curve: THREE.Curve<THREE.Vector3>
      let pts: THREE.Vector3[]
      if (point.zig) {
        pts = [
          new THREE.Vector3(0, 0, 0),
          pt(L * 0.66),
          pt(L * 0.34).addScaledVector(X, -L * 0.22),
          pt(L * 0.9).addScaledVector(X, L * 0.6),
          pt(L * 1.08).addScaledVector(X, L * 0.8),
        ]
        curve = new PolyCurve(pts)
      } else {
        pts = [
          new THREE.Vector3(0, 0, 0),
          pt(L * 0.42),
          pt(L).addScaledVector(X, L * 0.38),
          pt(L * 1.05).addScaledVector(X, L * 0.72),
        ]
        curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5)
      }
      const markerPos = pts[pts.length - 1]!.clone()
      const dN = new THREE.Vector3(dx, dy, dz).normalize()
      const labelPos = markerPos
        .clone()
        .addScaledVector(dN, 5)
        .addScaledVector(X, L * 0.16)
      const pivot = new THREE.Group()
      pivot.position.set(point.x0, 0, 0)
      pivot.rotation.order = 'YXZ'
      pivot.userData.phase1 = point.index * 1.7
      pivot.userData.phase2 = point.index * 0.9
      pivot.userData.sway = 0.035 + (point.index % 5) * 0.005
      const inner = new THREE.Group()
      pivot.add(inner)
      const matA = this.track(
        new THREE.MeshBasicMaterial({ color: point.color, transparent: true, opacity: 0.96 }),
      )
      const matB = this.track(
        new THREE.MeshBasicMaterial({ color: point.color, transparent: true, opacity: 0.85 }),
      )
      const matGlow = this.track(
        new THREE.MeshBasicMaterial({
          color: point.color,
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      inner.add(
        new THREE.Mesh(
          this.track(
            new THREE.TubeGeometry(new TwistCurve(curve, 0.045, 9, 0), 44, 0.08, 6, false),
          ),
          matA,
        ),
      )
      inner.add(
        new THREE.Mesh(
          this.track(
            new THREE.TubeGeometry(new TwistCurve(curve, 0.045, 9, Math.PI), 44, 0.08, 6, false),
          ),
          matB,
        ),
      )
      inner.add(
        new THREE.Mesh(this.track(new THREE.TubeGeometry(curve, 36, 0.18, 5, false)), matGlow),
      )
      const markerMaterial = this.track(
        new THREE.MeshBasicMaterial({ color: point.color, transparent: true, opacity: 1 }),
      )
      const marker = new THREE.Mesh(
        this.track(new THREE.SphereGeometry(0.5, 16, 12)),
        markerMaterial,
      )
      marker.position.copy(markerPos)
      inner.add(marker)
      const glow = new THREE.Sprite(
        this.track(
          new THREE.SpriteMaterial({
            map: this.track(radialTexture(point.color)),
            transparent: true,
            opacity: 0.42,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      )
      glow.position.copy(markerPos)
      glow.scale.setScalar(3.6)
      inner.add(glow)
      const junction = new THREE.Sprite(
        this.track(
          new THREE.SpriteMaterial({
            map: this.track(radialTexture(point.color)),
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      )
      junction.scale.setScalar(2.2)
      inner.add(junction)
      const label = makeLabel(point)
      if (label.material.map) this.track(label.material.map)
      this.track(label.material)
      label.position.copy(labelPos)
      inner.add(label)
      const dir = markerPos.clone().normalize()
      const len = markerPos.length()
      const hit = new THREE.Mesh(
        this.track(new THREE.CylinderGeometry(0.9, 0.9, len, 6, 1)),
        this.track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
      )
      hit.position.copy(markerPos.clone().multiplyScalar(0.5))
      hit.quaternion.setFromUnitVectors(UP, dir)
      inner.add(hit)
      this.hitMeshes.push(hit)
      const branch: Branch = {
        point,
        pivot,
        inner,
        marker,
        glow,
        junction,
        label,
        materials: [matA, matB, matGlow],
        markerMaterial,
        hiddenByScrub: false,
        baseEst: {
          markS: 1,
          glowS: glow.scale.x,
          junS: junction.scale.x,
          labS: label.userData.baseScale.clone(),
        },
      }
      hit.userData.branch = branch
      this.branches.set(point.id, branch)
      this.loom.add(pivot)
    }
  }

  private bind() {
    const dom = this.renderer.domElement
    dom.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
    window.addEventListener('mousemove', this.onMouseMove)
    dom.addEventListener('wheel', this.onWheel, { passive: false })
    dom.addEventListener('contextmenu', this.onContextMenu)
    dom.addEventListener('click', this.onClick)
    dom.addEventListener('dblclick', this.onDblClick)
    dom.addEventListener('mouseleave', this.onMouseLeave)
  }

  private onMouseDown = (event: MouseEvent) => {
    if (event.button === 1) event.preventDefault()
    this.dragging = true
    this.rightDragging = event.button === 2 || event.shiftKey
    this.lastPtr = { x: event.clientX, y: event.clientY }
    this.moved = 0
  }
  private onMouseUp = () => {
    this.dragging = false
  }
  private onMouseMove = (event: MouseEvent) => {
    if (this.dragging) {
      const ddx = event.clientX - this.lastPtr.x
      const ddy = event.clientY - this.lastPtr.y
      this.moved += Math.abs(ddx) + Math.abs(ddy)
      this.lastPtr = { x: event.clientX, y: event.clientY }
      if (this.rightDragging) {
        const camRight = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0)
        const camUp = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1)
        const scale =
          (this.sphere.r * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 2) /
          this.renderer.domElement.clientHeight
        this.target.addScaledVector(camRight, -ddx * scale).addScaledVector(camUp, ddy * scale)
      } else {
        this.sphere.theta -= ddx * 0.005
        this.sphere.phi = Math.min(Math.PI - 0.1, Math.max(0.1, this.sphere.phi + ddy * 0.005))
      }
      return
    }
    const now = Date.now()
    if (now - this.lastHover < 24) return
    this.lastHover = now
    this.setHover(this.pick(event), event.clientX, event.clientY)
  }
  private onWheel = (event: WheelEvent) => {
    event.preventDefault()
    this.sphere.r = Math.min(1700, Math.max(80, this.sphere.r * (1 + event.deltaY * 0.001)))
  }
  private onContextMenu = (event: Event) => event.preventDefault()
  private onClick = (event: MouseEvent) => {
    if (this.moved > 5) return
    const branch = this.pick(event)
    this.pinned = this.pinned === branch ? null : branch
    this.emitSelection(event.clientX, event.clientY)
  }
  private onDblClick = (event: MouseEvent) => {
    const branch = this.pick(event)
    if (!branch) return
    this.fly = {
      pos: branch.pivot.localToWorld(branch.marker.position.clone()),
      r: Math.min(this.sphere.r, 60),
    }
  }
  private onMouseLeave = () => this.setHover(null)

  private pick(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.ray.setFromCamera(this.pointer, this.camera)
    const hits = this.ray.intersectObjects(this.hitMeshes, false)
    for (const hit of hits) {
      const branch = hit.object.userData.branch as Branch | undefined
      if (branch && !branch.hiddenByScrub) return branch
    }
    return null
  }

  private setHover(branch: Branch | null, x?: number, y?: number) {
    const prev = this.hovered
    this.hovered = branch
    if (branch !== prev) this.applySel(branch)
    if (!this.pinned) this.emitSelection(x, y)
  }

  private applySel(branch: Branch | null) {
    for (const item of this.branches.values()) this.restoreSel(item)
    if (branch) {
      branch.marker.scale.setScalar(branch.baseEst.markS * 1.9)
      branch.junction.scale.setScalar(branch.baseEst.junS * 1.4)
      branch.glow.scale.setScalar(branch.baseEst.glowS * 1.45)
      branch.glow.material.opacity = 0.75
      branch.label.scale.copy(branch.baseEst.labS).multiplyScalar(1.16)
    }
    this.applyDim()
  }

  private restoreSel(branch: Branch) {
    branch.marker.scale.setScalar(branch.baseEst.markS)
    branch.junction.scale.setScalar(branch.baseEst.junS)
    branch.glow.scale.setScalar(branch.baseEst.glowS)
    branch.glow.material.opacity = 0.42
    branch.label.scale.copy(branch.baseEst.labS)
  }

  private applyDim() {
    const dimBase = this.focusOn ? 0.05 : 0.5
    const target =
      this.activeEarth || (this.focusOn && this.hovered ? this.hovered.point.reality : null)
    const onlyTarget = !!(this.activeEarth || (this.focusOn && this.hovered))
    for (const branch of this.branches.values()) {
      const on = onlyTarget ? branch.point.reality === target : true
      const dim = on ? 1 : dimBase
      branch.materials[0]!.opacity = 0.96 * dim
      branch.materials[1]!.opacity = 0.85 * dim
      branch.materials[2]!.opacity = 0.16 * dim
      branch.markerMaterial.opacity = dim
      branch.glow.material.opacity = 0.42 * dim
      branch.junction.material.opacity = 0.22 * dim
      const isCur = branch === this.hovered || branch === this.pinned
      const showLab =
        this.labelsEnabled ||
        isCur ||
        (this.activeEarth && branch.point.reality === this.activeEarth)
      branch.label.material.opacity = dim * (showLab ? 1 : 0)
    }
  }

  private applyScrub() {
    const x = this.layout.trunkMin + this.layout.spanX * (this.scrub / 1000)
    for (const branch of this.branches.values()) {
      const on = branch.point.x0 <= x + 0.2
      branch.hiddenByScrub = !on
      branch.inner.visible = on
    }
    this.callbacks.onScrubLabel(this.scrubLabel())
  }

  private scrubLabel() {
    if (this.scrub >= 1000) return 'ALL TEMPORAL POINTS'
    const x = this.layout.trunkMin + this.layout.spanX * (this.scrub / 1000)
    return `LOOM TIME / YEAR ${xToYear(x)}`
  }

  private flyTo(id: string) {
    const branch = this.branches.get(id)
    if (!branch) return
    this.pinned = branch
    this.applySel(branch)
    this.fly = { pos: branch.pivot.localToWorld(branch.marker.position.clone()), r: 62 }
    this.emitSelection()
  }

  private pin(id: string | null) {
    this.pinned = id ? (this.branches.get(id) ?? null) : null
    this.applySel(this.pinned)
    this.emitSelection()
  }

  private emitSelection(x?: number, y?: number) {
    const branch = this.pinned || this.hovered
    if (!branch) {
      this.callbacks.onSelect(null)
      return
    }
    this.callbacks.onSelect({
      point: branch.point,
      pinned: this.pinned === branch,
      clientX: x,
      clientY: y,
    })
  }

  private resize() {
    const width = this.host.clientWidth || window.innerWidth
    const height = this.host.clientHeight || window.innerHeight
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(height, 1)
    this.camera.updateProjectionMatrix()
  }

  private animate = (t: number) => {
    this.frame = requestAnimationFrame(this.animate)
    const time = t / 1000
    const speed = this.animOn ? this.speed : 0
    if (this.animOn) {
      this.loom.rotation.y = time * 0.04 * this.speed
      for (const branch of this.branches.values()) {
        branch.pivot.rotation.y =
          Math.sin(time * 0.55 * this.speed + branch.pivot.userData.phase1) *
          branch.pivot.userData.sway
        branch.pivot.rotation.z =
          Math.sin(time * 0.4 * this.speed + branch.pivot.userData.phase2) * 0.05
      }
    }
    if (this.scrubPlaying) {
      this.scrub = (this.scrub + 1 * speed * 1.6) % 1001
      this.applyScrub()
      this.callbacks.onScrubValue(this.scrub)
    }
    if (this.fly) {
      this.target.lerp(this.fly.pos, 0.055)
      this.sphere.r += (this.fly.r - this.sphere.r) * 0.055
      if (this.target.distanceTo(this.fly.pos) < 0.8 && Math.abs(this.sphere.r - this.fly.r) < 1)
        this.fly = null
    }
    const cs = Math.sin(this.sphere.phi)
    this.camera.position.set(
      this.target.x + this.sphere.r * cs * Math.sin(this.sphere.theta),
      this.target.y + this.sphere.r * Math.cos(this.sphere.phi),
      this.target.z + this.sphere.r * cs * Math.cos(this.sphere.theta),
    )
    this.camera.lookAt(this.target)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    cancelAnimationFrame(this.frame)
    this.observer.disconnect()
    const dom = this.renderer.domElement
    dom.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mouseup', this.onMouseUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    dom.removeEventListener('wheel', this.onWheel)
    dom.removeEventListener('contextmenu', this.onContextMenu)
    dom.removeEventListener('click', this.onClick)
    dom.removeEventListener('dblclick', this.onDblClick)
    dom.removeEventListener('mouseleave', this.onMouseLeave)
    this.disposables.forEach((resource) => resource.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
