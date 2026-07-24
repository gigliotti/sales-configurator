import React from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, TransformControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import type { PlacedComponent } from '../store/useConfiguratorStore';
import { useShallow } from 'zustand/shallow';
import { ModelLoader } from './ModelLoader';
import { getComponentPhysicalDimensions } from '../lib/geometry';
import { registerSceneCapture } from '../lib/sceneCapture';
import { useEditorShortcuts } from '../hooks/useEditorShortcuts';

// Enable global Three.js cache for loaded assets
THREE.Cache.enabled = true;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TransformControlsAny = TransformControls as any;

/**
 * Registra la función global de captura del canvas mientras la escena está
 * montada. Para más resolución sube temporalmente el pixel ratio, renderiza,
 * captura y restaura.
 */
const SceneCaptureBridge: React.FC = () => {
  const { gl, scene, camera } = useThree();

  React.useEffect(() => {
    registerSceneCapture((opts) => {
      const canvas = gl.domElement;
      const prevRatio = gl.getPixelRatio();
      try {
        const baseWidth = canvas.clientWidth || canvas.width || 1;
        const baseHeight = canvas.clientHeight || canvas.height || 1;
        let ratio = Math.max(2, window.devicePixelRatio || 1);
        if (opts?.width) ratio = Math.max(ratio, opts.width / baseWidth);
        if (opts?.height) ratio = Math.max(ratio, opts.height / baseHeight);
        gl.setPixelRatio(ratio);
        gl.render(scene, camera);
        return canvas.toDataURL('image/png');
      } catch (err) {
        console.error('[Viewport3D] Error capturando la escena:', err);
        return null;
      } finally {
        gl.setPixelRatio(prevRatio);
        gl.render(scene, camera);
      }
    });
    return () => registerSceneCapture(null);
  }, [gl, scene, camera]);

  return null;
};

interface CameraFitterProps {
  fitRef: React.MutableRefObject<(() => void) | null>;
  components: PlacedComponent[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orbitRef: React.MutableRefObject<any>;
}

/**
 * Helper dentro del Canvas: expone via ref una función que encuadra el
 * bounding box de los componentes de la línea activa (centro + radio),
 * moviendo la cámara y el target de OrbitControls.
 */
const CameraFitter: React.FC<CameraFitterProps> = ({ fitRef, components, orbitRef }) => {
  const { camera } = useThree();

  React.useEffect(() => {
    fitRef.current = () => {
      const controls = orbitRef.current;

      if (components.length === 0) {
        camera.position.set(8, 8, 8);
        if (controls) {
          controls.target.set(0, 0, 0);
          controls.update();
        } else {
          camera.lookAt(0, 0, 0);
        }
        return;
      }

      const box = new THREE.Box3();
      components.forEach((c) => {
        const dims = getComponentPhysicalDimensions(c);
        const rotY = c.rotation ? c.rotation[1] : 0;
        const cos = Math.abs(Math.cos(rotY));
        const sin = Math.abs(Math.sin(rotY));
        const halfX = (dims.length * cos + dims.width * sin) / 2;
        const halfZ = (dims.length * sin + dims.width * cos) / 2;
        const [x, y, z] = c.position;
        box.expandByPoint(new THREE.Vector3(x - halfX, y, z - halfZ));
        box.expandByPoint(new THREE.Vector3(x + halfX, y + dims.height, z + halfZ));
      });

      const center = box.getCenter(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const radius = Math.max(sphere.radius, 1);

      const persp = camera as THREE.PerspectiveCamera;
      const fovRad = (persp.fov * Math.PI) / 180;
      // Distancia para que la esfera quepa en el encuadre, con algo de margen,
      // acotada a los límites de OrbitControls (minDistance 2 / maxDistance 30).
      const distance = THREE.MathUtils.clamp((radius * 1.35) / Math.sin(fovRad / 2), 3, 28);

      const dir = new THREE.Vector3(1, 0.8, 1).normalize();
      camera.position.copy(center).addScaledVector(dir, distance);
      camera.lookAt(center);
      if (controls) {
        controls.target.copy(center);
        controls.update();
      }
    };
    return () => {
      fitRef.current = null;
    };
  }, [camera, fitRef, orbitRef, components]);

  return null;
};

const overlayButtonStyle = (active: boolean, disabled = false): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: '4px',
  border: 'none',
  background: active ? '#f28b05' : 'rgba(255, 255, 255, 0.1)',
  color: '#fff',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '12px',
  fontWeight: 600,
  opacity: disabled ? 0.4 : 1,
});

export const Viewport3D: React.FC = () => {
  const {
    placedComponents,
    selectedComponentUuid,
    selectComponent,
    commitComponentTransform,
    activeLineId,
    isReadOnly,
    undo,
    redo,
    canUndo,
    canRedo,
    t,
  } = useConfiguratorStore(
    useShallow((state) => ({
      placedComponents: state.placedComponents,
      selectedComponentUuid: state.selectedComponentUuid,
      selectComponent: state.selectComponent,
      commitComponentTransform: state.commitComponentTransform,
      activeLineId: state.activeLineId,
      isReadOnly: state.isReadOnly,
      undo: state.undo,
      redo: state.redo,
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      t: state.t,
    }))
  );

  // Atajos de teclado del editor (Delete, Ctrl+Z/Y, Escape), activos solo montado.
  useEditorShortcuts();

  const lineComponents = React.useMemo(
    () => placedComponents.filter((c) => c.lineId === activeLineId),
    [placedComponents, activeLineId]
  );

  // Precarga bajo demanda: solo los modelos de los componentes de la línea activa.
  React.useEffect(() => {
    lineComponents.forEach((c) => {
      if (c.model_path) {
        useGLTF.preload(c.model_path);
      }
    });
  }, [lineComponents]);

  const [transformMode, setTransformMode] = React.useState<'translate' | 'rotate'>('translate');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = React.useRef<any>(null);
  const [transformTarget, setTransformTarget] = React.useState<THREE.Group | null>(null);
  const fitCameraRef = React.useRef<(() => void) | null>(null);

  const handleComponentClick = (e: ThreeEvent<MouseEvent>, uuid: string) => {
    e.stopPropagation();
    selectComponent(uuid);
  };

  const handleCanvasClick = () => {
    selectComponent(null);
  };

  const undoLabel = t('editor.undo', 'Deshacer');
  const redoLabel = t('editor.redo', 'Rehacer');
  const fitCameraLabel = t('editor.fit_camera', 'Centrar cámara');
  const moveLabel = t('editor.move_xz', 'Mover XZ');
  const rotateLabel = t('editor.rotate_y', 'Rotar Y');

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

        <SceneCaptureBridge />
        <CameraFitter fitRef={fitCameraRef} components={lineComponents} orbitRef={orbitRef} />

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
        {lineComponents.map((c) => {
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
                        // Snap geométrico + una sola entrada de undo
                        commitComponentTransform(
                          c.uuid,
                          [pos.x, pos.y, pos.z],
                          [rot.x, rot.y, rot.z]
                        );
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

      {/* Toolbar Overlay: modo de transformación + undo/redo + centrar cámara */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'stretch',
          gap: '8px',
          background: 'rgba(11, 15, 25, 0.85)',
          padding: '8px',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {selectedComponentUuid && !isReadOnly && (
          <>
            <button
              onClick={() => setTransformMode('translate')}
              title={moveLabel}
              aria-label={moveLabel}
              style={overlayButtonStyle(transformMode === 'translate')}
            >
              {moveLabel}
            </button>
            <button
              onClick={() => setTransformMode('rotate')}
              title={rotateLabel}
              aria-label={rotateLabel}
              style={overlayButtonStyle(transformMode === 'rotate')}
            >
              {rotateLabel}
            </button>
            <div
              style={{
                width: '1px',
                alignSelf: 'stretch',
                background: 'rgba(255, 255, 255, 0.15)',
              }}
            />
          </>
        )}
        {!isReadOnly && (
          <>
            <button
              onClick={undo}
              disabled={!canUndo}
              title={undoLabel}
              aria-label={undoLabel}
              style={overlayButtonStyle(false, !canUndo)}
            >
              ↶
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title={redoLabel}
              aria-label={redoLabel}
              style={overlayButtonStyle(false, !canRedo)}
            >
              ↷
            </button>
          </>
        )}
        <button
          onClick={() => fitCameraRef.current?.()}
          title={fitCameraLabel}
          aria-label={fitCameraLabel}
          style={overlayButtonStyle(false)}
        >
          ⌖
        </button>
      </div>
    </div>
  );
};

export default Viewport3D;
