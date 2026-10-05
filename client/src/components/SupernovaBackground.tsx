import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface SupernovaBackgroundProps {
  className?: string;
  particleCount?: number;
}

export function SupernovaBackground({
  className = "",
  particleCount = 14000,
}: SupernovaBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId: number;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050811, 0.007);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 95);

    const renderer = new THREE.WebGLRenderer({
      powerPreference: "high-performance",
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x050811, 1);
    container.appendChild(renderer.domElement);

    // 2. Geometry & Instanced Mesh
    const count = particleCount;
    const geometry = new THREE.TetrahedronGeometry(0.3);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);

    // 3. Pre-allocated mathematical structures & precomputed particle seeds
    const dummy = new THREE.Object3D();
    const pColor = new THREE.Color();
    const target = new THREE.Vector3();

    // Cache seeds to prevent GC thrashing and keep 60 FPS
    const pos = new Float32Array(count * 3);
    const randA = new Float32Array(count);
    const randB = new Float32Array(count);
    const randC = new Float32Array(count);
    const dirX = new Float32Array(count);
    const dirY = new Float32Array(count);
    const dirZ = new Float32Array(count);
    const isRemnant = new Uint8Array(count);
    const starPick = new Uint8Array(count);
    const shellOffset = new Float32Array(count);

    const blastRadius = 70;
    const shockSpeed = 5.5;
    const coreFlash = 2.5;
    const debris = 1.8;
    const shellCount = 3;
    const orbitGap = 12;
    const orbitSpeed = 1.5;

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;

      const fi = i / count;
      isRemnant[i] = fi < 0.035 ? 1 : 0;

      const seedA = Math.sin(i * 12.9898) * 43758.5453;
      randA[i] = seedA - Math.floor(seedA);

      const seedB = Math.sin(i * 78.233 + 3.1) * 12345.678;
      randB[i] = seedB - Math.floor(seedB);

      const seedC = Math.sin(i * 45.164 + 7.7) * 98765.432;
      randC[i] = seedC - Math.floor(seedC);

      starPick[i] = i % 2;

      // Spherical direction
      const phi = randA[i] * Math.PI * 2;
      const costh = randB[i] * 2 - 1;
      const sinth = Math.sqrt(Math.max(0, 1 - costh * costh));
      dirX[i] = sinth * Math.cos(phi);
      dirY[i] = costh;
      dirZ[i] = sinth * Math.sin(phi);

      const shellId = Math.floor(randC[i] * shellCount);
      shellOffset[i] = shellId * (200 / Math.max(shellCount, 1));
    }

    // 4. Mouse interaction parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouseX = (e.clientX - halfW) / halfW;
      mouseY = (e.clientY - halfH) / halfH;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 5. Animation loop
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      // Smooth camera / scene orbit & mouse tilt
      targetRotY = mouseX * 0.35 + time * 0.06;
      targetRotX = -mouseY * 0.25 + Math.sin(time * 0.08) * 0.1;

      instancedMesh.rotation.y += (targetRotY - instancedMesh.rotation.y) * 0.05;
      instancedMesh.rotation.x += (targetRotX - instancedMesh.rotation.x) * 0.05;

      // Supernova explosion physics per particle
      for (let i = 0; i < count; i++) {
        const star = starPick[i];
        const isRem = isRemnant[i] === 1;

        // Binary remnants orbiting at the core
        const orbitAngle = time * orbitSpeed + star * Math.PI;
        const remX = Math.cos(orbitAngle) * orbitGap * star;
        const remY = Math.sin(orbitAngle * 0.6) * orbitGap * 0.3 * star;
        const remZ = Math.sin(orbitAngle) * orbitGap * star;
        const remJitter = (randA[i] - 0.5) * 3;

        // Shockwave ejecta
        const sOff = shellOffset[i];
        const cycleSpan = blastRadius + sOff + 10;
        const dist = (time * shockSpeed + randC[i] * 10 + sOff * 3) % cycleSpan;
        const wobble =
          Math.sin(dist * 0.3 + time * 2 + i * 0.05) *
          debris *
          (dist / (blastRadius + 1));
        const shockPulse =
          0.5 + 0.5 * Math.sin(time * 2 - dist * 0.15 + (randC[i] * 3));

        const ejectaX = dirX[i] * dist + wobble;
        const ejectaY = dirY[i] * dist + wobble * 0.8;
        const ejectaZ = dirZ[i] * dist + wobble;

        target.set(
          isRem ? remX + remJitter : ejectaX,
          isRem ? remY + remJitter : ejectaY,
          isRem ? remZ + remJitter : ejectaZ
        );

        // Calculate Supernova HSL palette
        const coreProximity = Math.max(0, 1 - dist / 16);
        const shellFactor = Math.max(
          0,
          1 - Math.abs((dist % (cycleSpan / shellCount)) - 8) / 8
        );

        const hue = isRem
          ? star === 0
            ? 0.58 // Electric Cyan
            : 0.06 // Golden Supernova Core
          : 0.13 - coreProximity * 0.1 - shellFactor * 0.05;

        const sat = isRem ? 0.9 : Math.max(0.92 - coreProximity * 0.3, 0.45);
        const light = isRem
          ? 0.65 + coreFlash * 0.12
          : Math.min(
              0.28 +
                coreProximity * coreFlash * 0.4 +
                shellFactor * shockPulse * 0.4,
              0.98
            );

        pColor.setHSL(Math.max(hue, 0.0), sat, light);

        // Smooth position interpolation
        const idx3 = i * 3;
        pos[idx3] += (target.x - pos[idx3]) * 0.1;
        pos[idx3 + 1] += (target.y - pos[idx3 + 1]) * 0.1;
        pos[idx3 + 2] += (target.z - pos[idx3 + 2]) * 0.1;

        dummy.position.set(pos[idx3], pos[idx3 + 1], pos[idx3 + 2]);
        dummy.updateMatrix();

        instancedMesh.setMatrixAt(i, dummy.matrix);
        instancedMesh.setColorAt(i, pColor);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 6. Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [particleCount]);

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}

export default SupernovaBackground;
