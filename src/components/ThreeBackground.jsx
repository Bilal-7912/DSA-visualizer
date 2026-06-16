import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreeBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Layer parameters per specification
    const LAYERS = [
      { count: 80,  size: 3.5, speed: 0.08, opacity: 0.08, z: -30 }, // far
      { count: 100, size: 5.5, speed: 0.15, opacity: 0.12, z: -20 }, // mid
      { count: 40,  size: 8.5, speed: 0.25, opacity: 0.18, z: -10 }  // near
    ];

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 1, 1000);
    camera.position.z = 100;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Dynamic circular soft canvas texture
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 32;
    textureCanvas.height = 32;
    const ctx = textureCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const circleTexture = new THREE.CanvasTexture(textureCanvas);

    const pointLayers = [];

    // Create layered systems
    LAYERS.forEach(layer => {
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(layer.count * 3);
      const basePositions = new Float32Array(layer.count * 3);
      const phases = new Float32Array(layer.count);

      for (let i = 0; i < layer.count; i++) {
        const x = (Math.random() - 0.5) * width;
        const y = (Math.random() - 0.5) * height;
        const z = layer.z;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        basePositions[i * 3] = x;
        basePositions[i * 3 + 1] = y;
        basePositions[i * 3 + 2] = z;

        phases[i] = Math.random() * Math.PI * 2;
      }

      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.PointsMaterial({
        color: 0xc7d2fe,
        size: layer.size,
        transparent: true,
        opacity: layer.opacity,
        map: circleTexture,
        depthWrite: false
      });

      const points = new THREE.Points(geom, mat);
      scene.add(points);
      pointLayers.push({ points, basePositions, phases, speed: layer.speed });
    });

    // Dynamic extra insert particles array
    let bonusParticles = [];
    const bonusGeom = new THREE.BufferGeometry();
    const maxBonus = 30;
    const bonusPos = new Float32Array(maxBonus * 3);
    bonusGeom.setAttribute('position', new THREE.BufferAttribute(bonusPos, 3));
    const bonusMat = new THREE.PointsMaterial({
      color: 0xa5b4fc,
      size: 14,
      transparent: true,
      opacity: 0.5,
      map: circleTexture,
      depthWrite: false
    });
    const bonusPoints = new THREE.Points(bonusGeom, bonusMat);
    scene.add(bonusPoints);

    // Global listener for operations insert bursts
    const triggerBonus = () => {
      const now = Date.now();
      for (let i = 0; i < 3; i++) {
        bonusParticles.push({
          x: 0,
          y: 0,
          z: -12,
          vx: (Math.random() - 0.5) * 2.5,
          vy: (Math.random() - 0.5) * 2.5,
          birth: now
        });
      }
      if (bonusParticles.length > maxBonus) bonusParticles.shift();
    };

    window.addEventListener('three-particle-burst', triggerBonus);

    // Hook prefers-reduced-motion media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let freezeAnimation = mediaQuery.matches;
    const mediaQueryListener = (e) => { freezeAnimation = e.matches; };
    mediaQuery.addEventListener('change', mediaQueryListener);

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Render loop
    let animationFrameId;
    const start = Date.now();
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = (Date.now() - start) * 0.001;

      if (!freezeAnimation) {
        // Drift layer points
        pointLayers.forEach(layer => {
          const posAttr = layer.points.geometry.attributes.position;
          for (let i = 0; i < posAttr.count; i++) {
            const px = layer.basePositions[i * 3];
            const py = layer.basePositions[i * 3 + 1];
            const phase = layer.phases[i];

            posAttr.array[i * 3] = px + Math.sin(elapsed * layer.speed + phase) * 16;
            posAttr.array[i * 3 + 1] = py + Math.cos(elapsed * layer.speed * 0.8 + phase) * 16;
          }
          posAttr.needsUpdate = true;
        });

        // Drift bonus burst particles
        const now = Date.now();
        bonusParticles = bonusParticles.filter(p => now - p.birth < 2000);
        
        const bPosAttr = bonusPoints.geometry.attributes.position;
        // Reset buffers
        for (let i = 0; i < maxBonus; i++) {
          bPosAttr.array[i * 3] = 9999;
          bPosAttr.array[i * 3 + 1] = 9999;
        }

        bonusParticles.forEach((p, idx) => {
          p.x += p.vx;
          p.y += p.vy;
          bPosAttr.array[idx * 3] = p.x;
          bPosAttr.array[idx * 3 + 1] = p.y;
          bPosAttr.array[idx * 3 + 2] = p.z;
        });
        bPosAttr.needsUpdate = true;
        bonusMat.opacity = Math.max(0, 0.4 * (1 - (bonusParticles[0]?.birth ? (now - bonusParticles[0].birth) / 2000 : 0)));
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('three-particle-burst', triggerBonus);
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', mediaQueryListener);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div id="three-bg-container" ref={mountRef} />;
};
