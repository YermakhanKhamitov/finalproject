import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import Overlay from "./ui/Overlay";
import { Model as Revolver } from "./components/Revolver";
import "./App.css";

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />
      <pointLight position={[-10, -10, -10]} intensity={1} />
      
      <Suspense fallback={null}>
        <Revolver />
        <Environment 
          files="/futuristic-christmas-celebration-concept.jpg" 
          background 
        />
        <ContactShadows 
          position={[0, -0.8, 0]} 
          opacity={0.4} 
          scale={10} 
          blur={2} 
          far={0.8} 
        />
      </Suspense>

      <OrbitControls 
        enablePan={false} 
        minDistance={2} 
        maxDistance={5} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.5} 
      />
    </>
  )
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas shadows camera={{ position: [0, 0, 4], fov: 45 }}>
        <Scene />
      </Canvas>
      <Overlay />
    </div>
  )
}