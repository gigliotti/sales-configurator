import React, { Suspense, useMemo } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

interface ModelSpecs {
  length?: number | string;
  width?: number | string;
  height?: number | string;
  conveyor_length_mm?: number | string;
  conveyor_width_mm?: number | string;
  max_wrap_height_mm?: number | string;
}

interface ModelLoaderProps {
  modelPath: string | null;
  name: string;
  specs: ModelSpecs | null | undefined;
  componentType: string;
  isSelected: boolean;
}

// Subcomponent to handle useGLTF safely
const GLTFModel: React.FC<{ path: string }> = ({ path }) => {
  const { scene } = useGLTF(path);
  // Clone to avoid sharing materials across multiple instances
  const clonedScene = scene.clone();
  
  return <primitive object={clonedScene} />;
};

export const ModelLoader: React.FC<ModelLoaderProps> = ({
  modelPath,
  name,
  specs,
  componentType,
  isSelected,
}) => {
  // Determine physical dimensions for fallback bounding box (in meters)
  const toMeters = (val: unknown, defaultVal: number) => {
    if (typeof val === 'number') {
      return val > 10 ? val / 1000 : val;
    }
    if (typeof val === 'string') {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        return num > 10 ? num / 1000 : num;
      }
    }
    return defaultVal;
  };

  let defaultLength = 2.0;
  let defaultWidth = 1.5;
  let defaultHeight = 1.2;

  if (componentType === 'palletizer') {
    defaultLength = 2.8;
    defaultWidth = 2.8;
    defaultHeight = 3.5;
  } else if (componentType === 'conveyor') {
    defaultLength = 2.0;
    defaultWidth = 1.2;
    defaultHeight = 0.8;
  } else if (componentType === 'wrapper') {
    defaultLength = 2.2;
    defaultWidth = 2.2;
    defaultHeight = 2.5;
  } else if (componentType === 'turn_unit') {
    defaultLength = 1.5;
    defaultWidth = 1.5;
    defaultHeight = 0.9;
  } else if (componentType === 'pallet_dispenser') {
    defaultLength = 1.6;
    defaultWidth = 1.8;
    defaultHeight = 2.2;
  } else if (componentType === 'sheet_dispenser') {
    defaultLength = 1.4;
    defaultWidth = 1.6;
    defaultHeight = 1.8;
  } else if (componentType === 'manipulator') {
    defaultLength = 0.8;
    defaultWidth = 0.8;
    defaultHeight = 1.0;
  }

  let length = defaultLength;
  let width = defaultWidth;
  let height = defaultHeight;

  if (specs) {
    if (specs.length !== undefined && specs.length !== null) {
      length = toMeters(specs.length, defaultLength);
    } else if (componentType === 'conveyor' && specs.conveyor_length_mm !== undefined && specs.conveyor_length_mm !== null) {
      length = toMeters(specs.conveyor_length_mm, defaultLength);
    }

    if (specs.width !== undefined && specs.width !== null) {
      width = toMeters(specs.width, defaultWidth);
    } else if (componentType === 'conveyor' && specs.conveyor_width_mm !== undefined && specs.conveyor_width_mm !== null) {
      width = toMeters(specs.conveyor_width_mm, defaultWidth);
    }

    if (specs.height !== undefined && specs.height !== null) {
      height = toMeters(specs.height, defaultHeight);
    } else if (componentType === 'wrapper' && specs.max_wrap_height_mm !== undefined && specs.max_wrap_height_mm !== null) {
      height = toMeters(specs.max_wrap_height_mm, defaultHeight);
    }
  }

  // Memoize geometries based on dimensions
  const boxGeo = useMemo(() => new THREE.BoxGeometry(length, height, width), [length, height, width]);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(boxGeo), [boxGeo]);

  // Accent color for selection glow
  const selectionColor = isSelected ? '#f28b05' : '#00e5ff';

  return (
    <group>
      {/* 3D Model Loader with Fallback Box */}
      {modelPath ? (
        <Suspense
          fallback={
            <mesh castShadow receiveShadow geometry={boxGeo}>
              <meshStandardMaterial
                color="#2c3e50"
                roughness={0.4}
                metalness={0.6}
                transparent
                opacity={0.6}
              />
            </mesh>
          }
        >
          <GLTFModel path={modelPath} />
        </Suspense>
      ) : (
        /* Default Fallback Industrial Box Mesh */
        <mesh castShadow receiveShadow geometry={boxGeo}>
          <meshStandardMaterial
            color={isSelected ? 'hsl(24, 95%, 40%)' : '#1e272e'}
            roughness={0.2}
            metalness={0.8}
            transparent
            opacity={0.85}
          />
          {/* Wireframe helper to outline fallback geometry */}
          <lineSegments geometry={edgesGeo}>
            <lineBasicMaterial attach="material" color={selectionColor} linewidth={2} />
          </lineSegments>
        </mesh>
      )}

      {/* Connection snap points placeholder indicators */}
      {isSelected && (
        <group>
          {/* Connection inputs/outputs */}
          <mesh position={[-length / 2, 0, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color="#00e5ff" />
          </mesh>
          <mesh position={[length / 2, 0, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color="#00e5ff" />
          </mesh>
        </group>
      )}

      {/* Floating HTML Label above component */}
      <Html
        position={[0, height / 2 + 0.5, 0]}
        center
        distanceFactor={6}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(11, 15, 25, 0.85)',
            border: `1px solid ${isSelected ? 'hsl(24, 95%, 52%)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '4px',
            padding: '2px 8px',
            whiteSpace: 'nowrap',
            color: isSelected ? 'hsl(24, 95%, 52%)' : '#fff',
            fontSize: '11px',
            fontWeight: 600,
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
          }}
        >
          {name}
        </div>
      </Html>
    </group>
  );
};
