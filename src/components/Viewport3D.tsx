import React from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { Group } from 'three';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import { ModelLoader } from './ModelLoader';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TransformControlsAny = TransformControls as any;

export const Viewport3D: React.FC = () => {
  const {
    placedComponents,
    selectedComponentUuid,
    selectComponent,
    updateComponentPosition,
    updateComponentRotation,
    activeLineId,
    isReadOnly,
  } = useConfiguratorStore();

  const [transformMode, setTransformMode] = React.useState<'translate' | 'rotate'>('translate');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = React.useRef<any>(null);
  const [transformTarget, setTransformTarget] = React.useState<Group | null>(null);

  const handleComponentClick = (e: ThreeEvent<MouseEvent>, uuid: string) => {
    e.stopPropagation();
    selectComponent(uuid);
  };

  const handleCanvasClick = () => {
    selectComponent(null);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#070a11',
      }}
    >
      <Canvas
        shadows
        camera={{ position: [8, 8, 8], fov: 45 }}
        onPointerMissed={handleCanvasClick}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#070a11']} />
        
        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          position={[10, 15, 10]}
          intensity={1.2}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <pointLight position={[-10, 8, -10]} intensity={0.3} />

        {/* Floor Grid & Shadow Catcher */}
        <gridHelper args={[40, 40, '#243b55', '#101d2c']} position={[0, -0.01, 0]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <shadowMaterial opacity={0.4} />
        </mesh>

        {/* Placed Components */}
        {placedComponents.filter((c) => c.lineId === activeLineId).map((c) => {
          const isSelected = c.uuid === selectedComponentUuid;
          if (isSelected && !isReadOnly) {
            return (
              <group key={c.uuid}>
                {transformTarget && (
                  <TransformControlsAny
                    mode={transformMode}
                    showY={true}
                    showX={transformMode === 'translate'}
                    showZ={transformMode === 'translate'}
                    object={transformTarget}
                    onMouseDown={() => {
                      if (orbitRef.current) {
                        orbitRef.current.enabled = false;
                      }
                    }}
                    onMouseUp={() => {
                      if (orbitRef.current) {
                        orbitRef.current.enabled = true;
                      }
                      if (transformTarget) {
                        const pos = transformTarget.position;
                        const rot = transformTarget.rotation;
                        updateComponentPosition(c.uuid, [pos.x, pos.y, pos.z]);
                        updateComponentRotation(c.uuid, [rot.x, rot.y, rot.z]);
                      }
                    }}
                  />
                )}
                <group
                  ref={setTransformTarget}
                  position={c.position}
                  rotation={c.rotation}
                  onClick={(e) => handleComponentClick(e, c.uuid)}
                >
                  <ModelLoader
                    modelPath={c.model_path}
                    name={c.name}
                    specs={c.specs}
                    componentType={c.componentType}
                    isSelected={true}
                  />
                </group>
              </group>
            );
          } else {
            return (
              <group
                key={c.uuid}
                position={c.position}
                rotation={c.rotation}
                onClick={(e) => handleComponentClick(e, c.uuid)}
              >
                <ModelLoader
                  modelPath={c.model_path}
                  name={c.name}
                  specs={c.specs}
                  componentType={c.componentType}
                  isSelected={isSelected}
                />
              </group>
            );
          }
        })}

        <OrbitControls
          ref={orbitRef}
          makeDefault
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={2}
          maxDistance={30}
        />
      </Canvas>

      {/* Transform Mode Toggle Overlay */}
      {selectedComponentUuid && !isReadOnly && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 10,
            display: 'flex',
            gap: '8px',
            background: 'rgba(11, 15, 25, 0.85)',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <button
            onClick={() => setTransformMode('translate')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: transformMode === 'translate' ? '#f28b05' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Mover XZ
          </button>
          <button
            onClick={() => setTransformMode('rotate')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: transformMode === 'rotate' ? '#f28b05' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Rotar Y
          </button>
        </div>
      )}
    </div>
  );
};

export default Viewport3D;
