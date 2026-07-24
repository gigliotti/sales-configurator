import React, { Suspense, useMemo } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_DIMENSIONS, GENERIC_DIMENSIONS, parseDimensionToMeters } from '../lib/geometry';
import { SceneErrorBoundary } from './SceneErrorBoundary';

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

const SELECTION_EMISSIVE = '#f28b05';
const SELECTION_EMISSIVE_INTENSITY = 0.25;

interface OrigEmissive {
  color: number;
  intensity: number;
}

// Subcomponent to handle useGLTF safely
const GLTFModel: React.FC<{ path: string; isSelected: boolean }> = ({ path, isSelected }) => {
  const { scene } = useGLTF(path);

  // Clona la escena y sus materiales UNA sola vez por escena base: así cada
  // instancia tiene materiales propios y nunca mutamos los compartidos del cache.
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const cloneMaterial = (mat: THREE.Material): THREE.Material => {
        const copy = mat.clone();
        const std = copy as THREE.MeshStandardMaterial;
        if (std.emissive) {
          const orig: OrigEmissive = {
            color: std.emissive.getHex(),
            intensity: std.emissiveIntensity,
          };
          copy.userData.__origEmissive = orig;
        }
        return copy;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(cloneMaterial)
        : cloneMaterial(mesh.material);
    });
    return clone;
  }, [scene]);

  // Libera los materiales clonados al desmontar o al cambiar la escena base.
  React.useEffect(() => {
    return () => {
      clonedScene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => mat.dispose());
      });
    };
  }, [clonedScene]);

  // Alterna el resaltado emissive de selección sobre los materiales privados del clon.
  React.useEffect(() => {
    clonedScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        const std = mat as THREE.MeshStandardMaterial;
        if (!std.emissive) return;
        if (isSelected) {
          std.emissive.set(SELECTION_EMISSIVE);
          std.emissiveIntensity = SELECTION_EMISSIVE_INTENSITY;
        } else {
          const orig = mat.userData.__origEmissive as OrigEmissive | undefined;
          std.emissive.setHex(orig ? orig.color : 0x000000);
          std.emissiveIntensity = orig ? orig.intensity : 1;
        }
      });
    });
  }, [clonedScene, isSelected]);

  return <primitive object={clonedScene} />;
};

export const ModelLoader: React.FC<ModelLoaderProps> = ({
  modelPath,
  name,
  specs,
  componentType,
  isSelected,
}) => {
  // Dimensiones físicas (metros) desde la única fuente de verdad: src/lib/geometry.ts
  const { length, width, height } = useMemo(() => {
    const base = DEFAULT_DIMENSIONS[componentType] || GENERIC_DIMENSIONS;
    let l = base.length;
    let w = base.width;
    let h = base.height;

    if (specs) {
      if (specs.length !== undefined && specs.length !== null) {
        l = parseDimensionToMeters(specs.length, base.length);
      } else if (
        componentType === 'conveyor' &&
        specs.conveyor_length_mm !== undefined &&
        specs.conveyor_length_mm !== null
      ) {
        l = parseDimensionToMeters(specs.conveyor_length_mm, base.length);
      }

      if (specs.width !== undefined && specs.width !== null) {
        w = parseDimensionToMeters(specs.width, base.width);
      } else if (
        componentType === 'conveyor' &&
        specs.conveyor_width_mm !== undefined &&
        specs.conveyor_width_mm !== null
      ) {
        w = parseDimensionToMeters(specs.conveyor_width_mm, base.width);
      }

      if (specs.height !== undefined && specs.height !== null) {
        h = parseDimensionToMeters(specs.height, base.height);
      } else if (
        componentType === 'wrapper' &&
        specs.max_wrap_height_mm !== undefined &&
        specs.max_wrap_height_mm !== null
      ) {
        h = parseDimensionToMeters(specs.max_wrap_height_mm, base.height);
      }
    }

    return { length: l, width: w, height: h };
  }, [componentType, specs]);

  // Memoize geometries based on dimensions
  const boxGeo = useMemo(() => new THREE.BoxGeometry(length, height, width), [length, height, width]);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(boxGeo), [boxGeo]);

  // Accent color for selection glow
  const selectionColor = isSelected ? '#f28b05' : '#00e5ff';

  /* Default Fallback Industrial Box Mesh (sin modelo o modelo roto) */
  const fallbackBox = (
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
  );

  return (
    <group>
      {/* 3D Model Loader with Fallback Box; un GLB roto nunca tumba el canvas */}
      {modelPath ? (
        <SceneErrorBoundary resetKey={modelPath} fallback={fallbackBox}>
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
            <GLTFModel path={modelPath} isSelected={isSelected} />
          </Suspense>
        </SceneErrorBoundary>
      ) : (
        fallbackBox
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
            background: 'hsl(var(--bg-secondary) / 0.9)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: `1px solid ${isSelected ? 'hsl(var(--brand-primary))' : 'hsl(var(--border-color))'}`,
            borderRadius: '4px',
            padding: '2px 8px',
            whiteSpace: 'nowrap',
            color: isSelected ? 'hsl(var(--brand-primary))' : 'hsl(var(--text-primary))',
            fontSize: '11px',
            fontWeight: 600,
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {name}
        </div>
      </Html>
    </group>
  );
};
