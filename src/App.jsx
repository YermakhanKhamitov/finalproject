import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Overlay from "./ui/Overlay";
import { Model as Revolver } from "./components/Revolver";
import "./App.css";

function Scene() {
  const texture = new THREE.TextureLoader().load("/futuristic-christmas-celebration-concept.jpg");
  texture.mapping = THREE.EquirectangularReflectionMapping;

  return (
    <>
      <Environment map={texture} background />
      <ambientLight intensity={1.5} />
      <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={3} castShadow />
      <pointLight position={[-10, -10, -10]} color="#00ff88" intensity={2} />
      
      <Suspense fallback={null}>
        <Revolver />
      </Suspense>

      <OrbitControls 
        enableZoom={false} 
        minPolarAngle={Math.PI / 3} 
        maxPolarAngle={Math.PI / 1.5} 
      />
    </>
  );
}

export default function App() {
  return (
    <div className="app-container">
      <Canvas shadows camera={{ position: [0, 0, 4.5], fov: 40 }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Overlay />
    </div>
  );
}