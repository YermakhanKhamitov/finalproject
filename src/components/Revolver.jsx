import React, { useRef, useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { useStore } from '../hooks/useStore'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import * as THREE from 'three'

export function Model(props) {
  const drumGroupRef = useRef() 
  const drumRef = useRef()      
  const gunGroupRef = useRef()    
  const recoilGroupRef = useRef() 
  const bulletsGroupRef = useRef() 
  const flashRef = useRef() 
  const lightRef = useRef() 
  const bulletsRef = useRef([]) 
  
  const [showBullets, setShowBullets] = useState(false)
  const [visibleCount, setVisibleCount] = useState(0)

  const gun = useGLTF('/models/revolver_navy_colt_1851_silver.glb')
  const bulletModel = useGLTF('/models/bullet_9_mm.glb')
  
  const store = useStore()
  const { ammo, isAnimating, gameState, finishAnimation } = store

  const drumName = 'kogelhouder_Lowpoly_lambert2_0'
  const BULLET_SCALE = [0.7, 0.42, 0.42] 
  const BULLET_RADIUS = 0.47             
  const BULLET_Z_OFFSET = 0.25           
  const MUZZLE_POSITION = [-8.5, 5.2, 1.1]

  const drumData = useMemo(() => {
    const mesh = gun.nodes[drumName].clone()
    mesh.geometry = mesh.geometry.clone()
    
    mesh.geometry.computeBoundingBox()
    const center = new THREE.Vector3()
    mesh.geometry.boundingBox.getCenter(center)
    
    mesh.geometry.translate(-center.x, -center.y, -center.z)
    
    const worldPos = gun.nodes[drumName].position.clone().add(center)
    
    return {
      geometry: mesh.geometry,
      material: mesh.material,
      position: worldPos,
      localCenter: center
    }
  }, [gun.nodes])

  const bulletMesh = useMemo(() => {
    const mesh = Object.values(bulletModel.nodes).find(n => n.isMesh)
    if (mesh) {
      const cloned = mesh.clone()
      cloned.geometry.center()
      return cloned
    }
    return null
  }, [bulletModel])

  useGSAP(() => {
    if (isAnimating && drumGroupRef.current) {
      const tl = gsap.timeline({ 
        onComplete: () => {
          setShowBullets(false)
          finishAnimation()
        } 
      })
      
      setVisibleCount(0)
      setShowBullets(true)
      gsap.set([drumRef.current.rotation, bulletsGroupRef.current.rotation], { x: 0 })
      
      tl.to(drumGroupRef.current.position, { z: drumData.position.z + 1.2, duration: 0.6, ease: "power2.out" })
      
      const bulletsToLoad = Math.min(ammo, 6)
      for (let i = 0; i < bulletsToLoad; i++) {
        const currentRotation = (i * Math.PI * 2) / 6
        tl.fromTo(bulletsRef.current[i].position, 
          { x: Math.sin(currentRotation) * 2, y: Math.cos(currentRotation) * 2, z: BULLET_Z_OFFSET + 0.5 }, 
          { 
            x: Math.sin(currentRotation) * BULLET_RADIUS,
            y: Math.cos(currentRotation) * BULLET_RADIUS,
            z: BULLET_Z_OFFSET,
            duration: 0.25, 
            onStart: () => setVisibleCount(i + 1) 
          }
        )
        .to([drumRef.current.rotation, bulletsGroupRef.current.rotation], { 
          x: "-=" + (Math.PI * 2 / 6), 
          duration: 0.2,
          ease: "power2.inOut"
        })
      }
      
      tl.to(drumGroupRef.current.position, { 
        z: drumData.position.z, 
        duration: 0.5,
        onStart: () => setShowBullets(false) 
      })
      .to([drumRef.current.rotation, bulletsGroupRef.current.rotation], { 
        x: "-=" + (Math.PI * 2 * 3), 
        duration: 1.5, 
        ease: "power4.inOut" 
      })
    }
  }, [isAnimating, drumData])

  useEffect(() => {
    if (gameState === 'RESULT' && recoilGroupRef.current) {
      if (store.lastResult === 'WIN') {
        gsap.to(recoilGroupRef.current.rotation, { z: -0.05, duration: 0.05, yoyo: true, repeat: 1 });
        gsap.to([drumRef.current.rotation, bulletsGroupRef.current.rotation], { x: "-=" + (Math.PI * 2 / 6), duration: 0.1 });
      } else if (store.lastResult === 'LOSE') {
        if (flashRef.current) gsap.fromTo(flashRef.current.scale, { x: 0, y: 0, z: 0 }, { x: 1.5, y: 2, z: 1.5, duration: 0.05, yoyo: true, repeat: 1 });
        if (lightRef.current) gsap.fromTo(lightRef.current, { intensity: 15 }, { intensity: 0, duration: 0.15 });
        gsap.timeline()
          .to(recoilGroupRef.current.rotation, { z: -Math.PI / 3, duration: 0.08, ease: "power4.out" })
          .to(recoilGroupRef.current.rotation, { z: 0, duration: 0.6, ease: "back.out(2)" });
        gsap.to([drumRef.current.rotation, bulletsGroupRef.current.rotation], { x: "-=" + (Math.PI * 2 / 6), duration: 0.1 });
      }
    }
  }, [gameState, store.lastResult]);

  return (
    <group scale={0.28} position={[0, -0.8, 0]}>
      <group ref={gunGroupRef} rotation={[0, Math.PI / 35, 0]}>
        <group ref={recoilGroupRef}>
          <group position={MUZZLE_POSITION}>
            <pointLight ref={lightRef} color="#ffcc00" distance={8} intensity={0} />
            <group ref={flashRef} scale={[0, 0, 0]}>
              <mesh><sphereGeometry args={[0.3, 8, 8]} /><meshBasicMaterial color="#fff" transparent opacity={0.8} /></mesh>
              {[0, 1, 2].map((i) => (
                <mesh key={i} rotation={[Math.PI / 2, 0, (i * Math.PI) / 3]}>
                  <planeGeometry args={[1.8, 2.8]} />
                  <meshBasicMaterial color="#ff4400" transparent opacity={0.7} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
                </mesh>
              ))}
            </group>
          </group>

          <group ref={drumGroupRef} position={[drumData.position.x, drumData.position.y, drumData.position.z]}>
            <mesh 
              ref={drumRef} 
              geometry={drumData.geometry} 
              material={drumData.material} 
            />
            <group ref={bulletsGroupRef}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <group key={i} ref={(el) => (bulletsRef.current[i] = el)} visible={showBullets && i < visibleCount}>
                  <group rotation={[Math.PI / 2, Math.PI, 0]}>
                    {bulletMesh && <primitive object={bulletMesh.clone()} scale={BULLET_SCALE} />}
                  </group>
                </group>
              ))}
            </group>
          </group>

          {Object.keys(gun.nodes).map((name) => {
            const node = gun.nodes[name]
            if (!node.isMesh || name === drumName || name.includes('kogel')) return null
            return <mesh key={name} geometry={node.geometry} material={node.material} position={node.position} />
          })}
        </group>
      </group>
    </group>
  )
}