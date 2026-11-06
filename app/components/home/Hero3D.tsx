/**
 * Optional interactive 3D product presentation for the hero.
 *
 * Progressive enhancement only:
 *  - three.js is code-split and loaded after hydration (never blocks LCP)
 *  - skipped when: prefers-reduced-motion, Save-Data / 2G connections, low
 *    device memory/CPU, no WebGL, or the tab is hidden
 *  - the static image composition (rendered by the parent) stays visible
 *    until the canvas is ready, and remains if anything fails
 *  - rendering pauses when off-screen
 */
import {useEffect, useRef, useState} from 'react';

interface Hero3DProps {
  images: {url: string; altText?: string | null}[];
  className?: string;
  /** Called once the canvas has rendered its first frame. */
  onReady?: () => void;
}

interface NavigatorWithHints extends Navigator {
  connection?: {saveData?: boolean; effectiveType?: string};
  deviceMemory?: number;
}

export function shouldEnable3D(win: Window = window): boolean {
  try {
    if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const nav = win.navigator as NavigatorWithHints;
    if (nav.connection?.saveData) return false;
    if (nav.connection?.effectiveType && /(^|-)2g$/.test(nav.connection.effectiveType)) return false;
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) return false;
    if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency < 4) return false;
    const canvas = win.document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

/** Shopify CDN resize param keeps texture downloads small. */
function textureUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname === 'cdn.shopify.com' || u.hostname.endsWith('.shopify.com')) {
      u.searchParams.set('width', '800');
    }
    return u.toString();
  } catch {
    return url;
  }
}

export function Hero3D({images, className, onReady}: Hero3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const imageKey = images.map((i) => i.url).join('|');

  useEffect(() => {
    const urls = imageKey ? imageKey.split('|') : [];
    const container = containerRef.current;
    if (!container || !urls.length || !shouldEnable3D()) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    // Defer until the browser is idle so the hero LCP image paints first.
    const idle =
      (window as Window & {requestIdleCallback?: (cb: () => void) => number}).requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 300));

    const run = async () => {
      const THREE = await import('three');
      if (disposed) return;

      const width = container.clientWidth;
      const height = container.clientHeight;
      const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'low-power'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
      camera.position.set(0, 0, 9);

      scene.add(new THREE.AmbientLight(0xffffff, 1.6));
      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(3, 4, 6);
      scene.add(key);

      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');

      const cards: InstanceType<typeof THREE.Mesh>[] = [];
      const textures = await Promise.all(
        urls.slice(0, 3).map(
          (url) =>
            new Promise<InstanceType<typeof THREE.Texture> | null>((resolve) => {
              loader.load(textureUrl(url), (t) => resolve(t), undefined, () => resolve(null));
            }),
        ),
      );
      if (disposed) {
        renderer.dispose();
        return;
      }
      const loadedTextures = textures.filter((t): t is NonNullable<typeof t> => t !== null);
      if (!loadedTextures.length) {
        renderer.dispose();
        return; // keep static fallback
      }

      const layout = [
        {x: 0, y: 0, z: 0.6, r: 0, s: 1},
        {x: -1.9, y: -0.25, z: -0.4, r: 0.28, s: 0.82},
        {x: 1.9, y: 0.2, z: -0.6, r: -0.28, s: 0.82},
      ];

      loadedTextures.forEach((texture, i) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const img = texture.image as {width: number; height: number};
        const aspect = img.width && img.height ? img.width / img.height : 0.8;
        const h = 3.6;
        const geometry = new THREE.PlaneGeometry(h * aspect, h, 1, 1);
        const material = new THREE.MeshStandardMaterial({map: texture, roughness: 0.55, metalness: 0.05});
        const mesh = new THREE.Mesh(geometry, material);
        const l = layout[i];
        mesh.position.set(l.x, l.y, l.z);
        mesh.rotation.y = l.r;
        mesh.scale.setScalar(l.s);
        mesh.userData = {baseY: l.y, phase: i * 1.7};
        scene.add(mesh);
        cards.push(mesh);
      });

      // Soft particle field.
      const particleCount = 220;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
      }
      const particlesGeometry = new THREE.BufferGeometry();
      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particles = new THREE.Points(
        particlesGeometry,
        new THREE.PointsMaterial({color: 0xffffff, size: 0.03, transparent: true, opacity: 0.55}),
      );
      scene.add(particles);

      container.appendChild(renderer.domElement);

      const pointer = {x: 0, y: 0};
      const onPointerMove = (e: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      };
      window.addEventListener('pointermove', onPointerMove, {passive: true});

      const onResize = () => {
        const w = container.clientWidth;
        const hgt = container.clientHeight;
        renderer.setSize(w, hgt);
        camera.aspect = w / hgt;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      let visible = true;
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      });
      observer.observe(container);

      const clock = new THREE.Clock();
      let frame = 0;
      const tick = () => {
        frame = requestAnimationFrame(tick);
        if (!visible || document.hidden) return;
        const t = clock.getElapsedTime();
        cards.forEach((card) => {
          const {baseY, phase} = card.userData as {baseY: number; phase: number};
          card.position.y = baseY + Math.sin(t * 0.8 + phase) * 0.08;
        });
        scene.rotation.y += (pointer.x * 0.18 - scene.rotation.y) * 0.04;
        scene.rotation.x += (pointer.y * 0.08 - scene.rotation.x) * 0.04;
        particles.rotation.y = t * 0.02;
        renderer.render(scene, camera);
      };
      tick();
      setReady(true);
      onReadyRef.current?.();

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('resize', onResize);
        scene.traverse((obj) => {
          const mesh = obj as InstanceType<typeof THREE.Mesh>;
          mesh.geometry?.dispose?.();
          const mat = mesh.material as InstanceType<typeof THREE.MeshStandardMaterial> | undefined;
          mat?.map?.dispose?.();
          mat?.dispose?.();
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    };
    idle(() => {
      void run();
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [imageKey]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      data-ready={ready}
      className={`${className ?? ''} transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
