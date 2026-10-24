import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Stars,
  Sparkles,
} from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function CricketBall() {
  const ballRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ballRef.current) return;

    const time = state.clock.getElapsedTime();

    ballRef.current.rotation.x += 0.018;
    ballRef.current.rotation.y += 0.025;

    ballRef.current.position.y = 2.4 + Math.sin(time * 1.5) * 0.15;
  });

  return (
    <mesh ref={ballRef} position={[0, 2.4, 0]}>
      <sphereGeometry args={[0.35, 48, 48]} />

      <meshStandardMaterial
        color="#b51224"
        roughness={0.32}
        metalness={0.1}
      />
    </mesh>
  );
}

function Pitch() {
  return (
    <group>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[30, 24]} />

        <meshStandardMaterial
          color="#163d27"
          roughness={0.9}
        />
      </mesh>

      {/* Cricket pitch */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
      >
        <planeGeometry args={[3.1, 18]} />

        <meshStandardMaterial
          color="#b99b70"
          roughness={1}
        />
      </mesh>

      {/* Pitch center line */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.035, 0]}
      >
        <planeGeometry args={[0.06, 17]} />

        <meshStandardMaterial color="#e5d7b9" />
      </mesh>
    </group>
  );
}

function Stumps({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[-0.22, 0, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 1, 16]} />

          <meshStandardMaterial
            color="#e8d5a5"
            roughness={0.65}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.52, 0.035, 0.04]} />

        <meshStandardMaterial color="#d7b56d" />
      </mesh>
    </group>
  );
}

function StadiumLights() {
  const positions: [number, number, number][] = [
    [-10, 7, -8],
    [10, 7, -8],
    [-10, 7, 8],
    [10, 7, 8],
  ];

  return (
    <group>
      {positions.map((position, index) => (
        <group key={index} position={position}>
          {/* Pole */}
          <mesh position={[0, -3.5, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 7, 12]} />

            <meshStandardMaterial color="#22252b" />
          </mesh>

          {/* Light panel */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.5, 0.5, 0.25]} />

            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={2}
            />
          </mesh>

          <pointLight
            intensity={15}
            distance={25}
            decay={2}
            color="#ffffff"
          />
        </group>
      ))}
    </group>
  );
}

function StadiumRing() {
  return (
    <group>
      {/* Back stadium */}
      <mesh position={[0, 2, -10]}>
        <cylinderGeometry args={[15, 15, 4, 64, 1, true]} />

        <meshStandardMaterial
          color="#111827"
          roughness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Stadium upper ring */}
      <mesh position={[0, 5, -10]}>
        <torusGeometry args={[14, 1.2, 12, 64]} />

        <meshStandardMaterial
          color="#26384d"
          roughness={0.6}
        />
      </mesh>
    </group>
  );
}

function SceneContent() {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[0, 5, 14]}
        fov={45}
      />

      <color attach="background" args={["#050914"]} />

      <fog
        attach="fog"
        args={["#050914", 12, 40]}
      />

      <ambientLight intensity={0.35} />

      <directionalLight
        position={[0, 12, 5]}
        intensity={1.5}
        castShadow
      />

      <Stars
        radius={60}
        depth={30}
        count={1800}
        factor={2}
        saturation={0}
        fade
        speed={0.3}
      />

      <Sparkles
        count={80}
        scale={[20, 8, 20]}
        size={1.5}
        speed={0.25}
      />

      <Pitch />

      <Stumps position={[0, 0, 7]} />
      <Stumps position={[0, 0, -7]} />

      <StadiumLights />

      <StadiumRing />

      <CricketBall />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.25}
        minPolarAngle={Math.PI / 2.7}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

export default function StadiumScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
      }}
    >
      <SceneContent />
    </Canvas>
  );
}