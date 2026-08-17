'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { TimelineEntry } from '@/lib/domain/timeline';

class TemporalLoomScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
  private readonly renderer: THREE.WebGLRenderer;
  private frame = 0;
  private observer: ResizeObserver;

  constructor(private readonly host: HTMLElement, entries: readonly TimelineEntry[]) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.host.appendChild(this.renderer.domElement);
    this.camera.position.set(0, 25, 125);
    this.build(entries);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.animate();
  }

  private build(entries: readonly TimelineEntry[]) {
    const trunk = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-70, 0, 0), new THREE.Vector3(70, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xffd24a }));
    this.scene.add(trunk);
    const realities = [...new Set(entries.map(({ reality }) => reality))];
    const vertices: number[] = [];
    const colors: number[] = [];
    entries.forEach((entry, index) => {
      const x = entry.yearStart == null ? 65 : THREE.MathUtils.clamp((entry.yearStart - 1900) * 0.8 - 55, -70, 70);
      const angle = (realities.indexOf(entry.reality) / Math.max(realities.length, 1)) * Math.PI * 2;
      const radius = 12 + (index % 7) * 1.2;
      vertices.push(x, Math.cos(angle) * radius, Math.sin(angle) * radius);
      const color = new THREE.Color().setHSL((realities.indexOf(entry.reality) * 0.137) % 1, 0.75, 0.62);
      colors.push(color.r, color.g, color.b);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, opacity: 0.9 })));
  }

  private resize() { const { clientWidth: width, clientHeight: height } = this.host; this.renderer.setSize(width, height, false); this.camera.aspect = width / Math.max(height, 1); this.camera.updateProjectionMatrix(); }
  private animate = () => { this.frame = requestAnimationFrame(this.animate); this.scene.rotation.x += 0.0007; this.renderer.render(this.scene, this.camera); };
  dispose() { cancelAnimationFrame(this.frame); this.observer.disconnect(); this.scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()); } }); this.renderer.dispose(); this.renderer.domElement.remove(); }
}

export function TimelineCanvas({ entries }: { entries: readonly TimelineEntry[] }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!host.current) return; const scene = new TemporalLoomScene(host.current, entries); return () => scene.dispose(); }, [entries]);
  return <div ref={host} className="h-[78vh] w-full" role="img" aria-label={`Three-dimensional temporal loom with ${entries.length} entries`} />;
}
