import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AppMode, ArmPose, CameraView, RoverGameControls, RoverTelemetry, ScienceSamplePoint } from '../types';
import { createMartianTerrain, MartianEnvironment } from './MartianTerrain';
import { applyArmPose, createRoverModel, RoverNodes } from './RoverModel';
import { RoverPhysicsController } from './RoverPhysics';
import { soundManager } from './SoundEffects';

interface RoverStudioProps {
  mode: AppMode;
  cameraView: CameraView;
  currentSkin: string;
  explodeProgress: number; // 0 to 1
  isWireframe: boolean;
  isHeadlightsOn: boolean;
  armPose: ArmPose;
  controls: RoverGameControls;
  onTelemetryUpdate: (telemetry: RoverTelemetry) => void;
  onSampleDiscovered?: (sample: ScienceSamplePoint) => void;
  onSampleCollected?: (sample: ScienceSamplePoint) => void;
  roverRefOutput?: React.MutableRefObject<THREE.Group | null>;
  triggerLaserRef?: React.MutableRefObject<(() => void) | null>;
  triggerDrillRef?: React.MutableRefObject<(() => void) | null>;
}

export const RoverStudio: React.FC<RoverStudioProps> = ({
  mode,
  cameraView,
  currentSkin,
  explodeProgress,
  isWireframe,
  isHeadlightsOn,
  armPose,
  controls,
  onTelemetryUpdate,
  onSampleDiscovered,
  onSampleCollected,
  roverRefOutput,
  triggerLaserRef,
  triggerDrillRef,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Prop reference holders to avoid stale closures in requestAnimationFrame loop
  const controlsRef = useRef<RoverGameControls>(controls);
  controlsRef.current = controls;

  const cameraViewRef = useRef<CameraView>(cameraView);
  cameraViewRef.current = cameraView;

  const modeRef = useRef<AppMode>(mode);
  modeRef.current = mode;

  const isHeadlightsOnRef = useRef<boolean>(isHeadlightsOn);
  isHeadlightsOnRef.current = isHeadlightsOn;

  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  onTelemetryUpdateRef.current = onTelemetryUpdate;

  const onSampleDiscoveredRef = useRef(onSampleDiscovered);
  onSampleDiscoveredRef.current = onSampleDiscovered;

  const onSampleCollectedRef = useRef(onSampleCollected);
  onSampleCollectedRef.current = onSampleCollected;

  // Scene object references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const physicsRef = useRef<RoverPhysicsController | null>(null);
  const nodesRef = useRef<RoverNodes | null>(null);
  const updateSkinRef = useRef<((id: string) => void) | null>(null);
  const martianEnvRef = useRef<MartianEnvironment | null>(null);

  // Studio lighting vs Martian landscape references
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const studioGroupRef = useRef<THREE.Group | null>(null);
  const terrainGroupRef = useRef<THREE.Group | null>(null);

  // Animation state refs
  const drillingStateRef = useRef<{ active: boolean; time: number }>({ active: false, time: 0 });
  const laserStateRef = useRef<{ active: boolean; time: number }>({ active: false, time: 0 });
  const nearbySampleRef = useRef<ScienceSamplePoint | null>(null);

  // 1. Initial Three.js Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd28264); // Martian dusty sky
    scene.fog = new THREE.FogExp2(0xd28264, 0.012);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 800);
    camera.position.set(0, 3.5, 7.5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.maxDistance = 50;
    orbit.minDistance = 1.5;
    orbit.maxPolarAngle = Math.PI / 2 - 0.02; // Don't clip under ground
    orbitControlsRef.current = orbit;

    // Martian Ambient & Hemisphere Lighting
    const hemiLight = new THREE.HemisphereLight(0xffdfc4, 0x5a2617, 0.9);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xd97554, 0.6);
    scene.add(ambientLight);

    // Sun Directional Light (Mars low solar intensity with sharp shadows)
    const sunLight = new THREE.DirectionalLight(0xfff1de, 2.2);
    sunLight.position.set(40, 60, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 180;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Studio lighting group (for inspection mode)
    const studioGroup = new THREE.Group();
    studioGroup.name = 'StudioLighting';
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(5, 8, 6);
    const fillLight = new THREE.DirectionalLight(0x90b0d0, 1.2);
    fillLight.position.set(-6, 4, -5);
    const rimLight = new THREE.DirectionalLight(0xff9944, 2.5);
    rimLight.position.set(0, 6, -8);
    studioGroup.add(keyLight, fillLight, rimLight);
    scene.add(studioGroup);
    studioGroupRef.current = studioGroup;

    // Studio pedestal platform
    const pedestalGeom = new THREE.CylinderGeometry(3.5, 3.8, 0.25, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1a1d24,
      metalness: 0.6,
      roughness: 0.35,
    });
    const pedestal = new THREE.Mesh(pedestalGeom, pedestalMat);
    pedestal.position.y = -0.125;
    pedestal.receiveShadow = true;
    studioGroup.add(pedestal);

    // Pedestal accent glowing circular ring
    const ringGeom = new THREE.RingGeometry(3.2, 3.35, 48);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.position.y = 0.01;
    studioGroup.add(ringMesh);

    // Terrain group
    const terrainGroup = new THREE.Group();
    terrainGroup.name = 'MartianTerrainGroup';
    scene.add(terrainGroup);
    terrainGroupRef.current = terrainGroup;

    const martianEnv = createMartianTerrain(scene);
    martianEnvRef.current = martianEnv;
    terrainGroup.add(martianEnv.terrainMesh);
    terrainGroup.add(martianEnv.rocksGroup);
    terrainGroup.add(martianEnv.samplesGroup);

    // Create Rover Model
    const { rover, nodes, updateSkin } = createRoverModel(currentSkin);
    scene.add(rover);
    nodesRef.current = nodes;
    updateSkinRef.current = updateSkin;

    if (roverRefOutput) {
      roverRefOutput.current = rover;
    }

    // Physics Controller
    const physics = new RoverPhysicsController(nodes, scene, martianEnv.getTerrainHeight);
    physicsRef.current = physics;

    // Resize handler with ResizeObserver
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Expose Actions for Laser and Drill
    triggerLaserRef &&
      (triggerLaserRef.current = () => {
        laserStateRef.current = { active: true, time: 0.4 };
        soundManager.playLaserSound();
      });

    triggerDrillRef &&
      (triggerDrillRef.current = () => {
        drillingStateRef.current = { active: true, time: 2.2 };
        soundManager.playDrillSound();

        // Check if close to any science target
        if (physicsRef.current && martianEnvRef.current) {
          const rPos = physicsRef.current.position;
          martianEnvRef.current.samplePoints.forEach((sample) => {
            const dx = rPos.x - sample.position[0];
            const dz = rPos.z - sample.position[2];
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 4.2 && !sample.collected) {
              setTimeout(() => {
                sample.collected = true;
                soundManager.playSampleCollectChime();
                if (onSampleCollected) onSampleCollected(sample);
              }, 1200);
            }
          });
        }
      });

    // Start Web Audio motor sound on first user touch/click
    const handleFirstInteraction = () => {
      soundManager.startMotorSound();
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    // Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Update Physics & Telemetry
      if (physicsRef.current && nodesRef.current) {
        const isStudio = modeRef.current === 'studio';
        const currentControls = controlsRef.current;
        const currentCamView = cameraViewRef.current;

        const telemetry = physicsRef.current.update(delta, currentControls, isStudio);

        // Sound sync
        soundManager.updateMotorSpeed(telemetry.speedMs);

        // Sun light follows rover position in drive mode
        if (sunLightRef.current && !isStudio) {
          sunLightRef.current.position.set(
            physicsRef.current.position.x + 35,
            physicsRef.current.position.y + 55,
            physicsRef.current.position.z + 25
          );
          sunLightRef.current.target.position.copy(physicsRef.current.position);
          sunLightRef.current.target.updateMatrixWorld();
        }

        // Check proximity to science waypoints
        if (!isStudio && martianEnvRef.current) {
          let foundNearby: ScienceSamplePoint | null = null;
          const rPos = physicsRef.current.position;

          martianEnvRef.current.samplePoints.forEach((sample) => {
            const dx = rPos.x - sample.position[0];
            const dz = rPos.z - sample.position[2];
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 18 && !sample.discovered) {
              sample.discovered = true;
              if (onSampleDiscoveredRef.current) onSampleDiscoveredRef.current(sample);
            }

            if (dist < 4.5 && !sample.collected) {
              foundNearby = sample;
            }
          });

          nearbySampleRef.current = foundNearby;

          // Rotate beacons
          martianEnvRef.current.sampleMarkers.forEach((item) => {
            const beacon = item.marker.getObjectByName('BeaconMesh');
            if (beacon) beacon.rotation.y += delta * 1.5;
          });
        }

        // Laser beam animation
        if (laserStateRef.current.active) {
          laserStateRef.current.time -= delta;
          if (nodesRef.current.laserBeam.material instanceof THREE.MeshBasicMaterial) {
            nodesRef.current.laserBeam.material.opacity = Math.max(0, laserStateRef.current.time * 2.5);
          }
          if (laserStateRef.current.time <= 0) {
            laserStateRef.current.active = false;
          }
        }

        // Drill animation
        if (drillingStateRef.current.active) {
          drillingStateRef.current.time -= delta;
          nodesRef.current.drillBit.rotation.z += delta * 45;
          if (drillingStateRef.current.time <= 0) {
            drillingStateRef.current.active = false;
          }
        }

        // Camera Management
        if (cameraRef.current && orbitControlsRef.current) {
          if (isStudio) {
            orbitControlsRef.current.enabled = true;
            orbitControlsRef.current.target.set(0, 0.8, 0);
            orbitControlsRef.current.update();
          } else {
            // Drive mode camera perspectives
            const roverPos = physicsRef.current.position;
            const roverYaw = physicsRef.current.yaw;

            if (currentCamView === 'chase') {
              orbitControlsRef.current.enabled = false;
              // Smooth spring follow behind rover
              const camDist = 7.2;
              const camHeight = 3.4;
              const targetCamPos = new THREE.Vector3(
                roverPos.x - Math.sin(roverYaw) * camDist,
                roverPos.y + camHeight,
                roverPos.z - Math.cos(roverYaw) * camDist
              );

              cameraRef.current.position.lerp(targetCamPos, 0.12);
              const lookTarget = new THREE.Vector3(roverPos.x, roverPos.y + 1.1, roverPos.z);
              cameraRef.current.lookAt(lookTarget);
            } else if (currentCamView === 'cockpit') {
              orbitControlsRef.current.enabled = false;
              // MastCam FPV POV - position slightly in front of head enclosure to prevent clipping
              const mastWorld = new THREE.Vector3();
              nodesRef.current.mastHead.getWorldPosition(mastWorld);
              const forward = new THREE.Vector3(Math.sin(roverYaw), -0.06, Math.cos(roverYaw));
              cameraRef.current.position.copy(mastWorld).addScaledVector(forward, 0.22);
              cameraRef.current.lookAt(mastWorld.clone().add(forward.multiplyScalar(20)));
            } else if (currentCamView === 'wheel') {
              orbitControlsRef.current.enabled = false;
              // Low angle wheel rocker-bogie view
              const wheelWorld = new THREE.Vector3();
              nodesRef.current.wheels[0].getWorldPosition(wheelWorld);
              cameraRef.current.position.set(
                wheelWorld.x - Math.sin(roverYaw - 0.4) * 2.2,
                wheelWorld.y + 0.35,
                wheelWorld.z - Math.cos(roverYaw - 0.4) * 2.2
              );
              cameraRef.current.lookAt(wheelWorld);
            } else {
              // Free orbit around rover
              orbitControlsRef.current.enabled = true;
              orbitControlsRef.current.target.lerp(
                new THREE.Vector3(roverPos.x, roverPos.y + 0.8, roverPos.z),
                0.15
              );
              orbitControlsRef.current.update();
            }
          }
        }

        // Send telemetry back to UI
        const collectedCount = martianEnvRef.current
          ? martianEnvRef.current.samplePoints.filter((s) => s.collected).length
          : 0;

        telemetry.samplesCollected = collectedCount;
        telemetry.isHeadlightsOn = isHeadlightsOnRef.current;
        telemetry.isDrilling = drillingStateRef.current.active;
        telemetry.isLaserFiring = laserStateRef.current.active;

        onTelemetryUpdateRef.current(telemetry);
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Responsive Camera View Switching Effect
  useEffect(() => {
    if (!cameraRef.current || !physicsRef.current || mode === 'studio') return;
    const roverPos = physicsRef.current.position;
    const roverYaw = physicsRef.current.yaw;

    if (cameraView === 'free' && orbitControlsRef.current) {
      orbitControlsRef.current.enabled = true;
      orbitControlsRef.current.target.set(roverPos.x, roverPos.y + 0.8, roverPos.z);
      cameraRef.current.position.set(
        roverPos.x - Math.sin(roverYaw + 0.5) * 6.5,
        roverPos.y + 3.0,
        roverPos.z - Math.cos(roverYaw + 0.5) * 6.5
      );
      orbitControlsRef.current.update();
    } else if (cameraView === 'chase' && orbitControlsRef.current) {
      orbitControlsRef.current.enabled = false;
      const camDist = 7.2;
      const camHeight = 3.4;
      cameraRef.current.position.set(
        roverPos.x - Math.sin(roverYaw) * camDist,
        roverPos.y + camHeight,
        roverPos.z - Math.cos(roverYaw) * camDist
      );
      cameraRef.current.lookAt(new THREE.Vector3(roverPos.x, roverPos.y + 1.1, roverPos.z));
    } else if (cameraView === 'cockpit' && orbitControlsRef.current && nodesRef.current) {
      orbitControlsRef.current.enabled = false;
      const mastWorld = new THREE.Vector3();
      nodesRef.current.mastHead.getWorldPosition(mastWorld);
      const forward = new THREE.Vector3(Math.sin(roverYaw), -0.06, Math.cos(roverYaw));
      cameraRef.current.position.copy(mastWorld).addScaledVector(forward, 0.22);
      cameraRef.current.lookAt(mastWorld.clone().add(forward.multiplyScalar(20)));
    } else if (cameraView === 'wheel' && orbitControlsRef.current && nodesRef.current) {
      orbitControlsRef.current.enabled = false;
      const wheelWorld = new THREE.Vector3();
      nodesRef.current.wheels[0].getWorldPosition(wheelWorld);
      cameraRef.current.position.set(
        wheelWorld.x - Math.sin(roverYaw - 0.4) * 2.2,
        wheelWorld.y + 0.35,
        wheelWorld.z - Math.cos(roverYaw - 0.4) * 2.2
      );
      cameraRef.current.lookAt(wheelWorld);
    }
  }, [cameraView, mode]);

  // Update Skin
  useEffect(() => {
    if (updateSkinRef.current) {
      updateSkinRef.current(currentSkin);
    }
  }, [currentSkin]);

  // Update Wireframe
  useEffect(() => {
    if (!nodesRef.current) return;
    nodesRef.current.root.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => (m.wireframe = isWireframe));
        } else {
          child.material.wireframe = isWireframe;
        }
      }
    });
  }, [isWireframe]);

  // Update Headlights
  useEffect(() => {
    if (!nodesRef.current) return;
    nodesRef.current.headlights.forEach((light) => {
      light.intensity = isHeadlightsOn ? 4.5 : 0;
    });
  }, [isHeadlightsOn]);

  // Update Arm Pose
  useEffect(() => {
    if (!nodesRef.current) return;
    applyArmPose(
      nodesRef.current.armShoulder,
      nodesRef.current.armUpper,
      nodesRef.current.armFore,
      nodesRef.current.armWrist,
      nodesRef.current.armTurret,
      armPose
    );
  }, [armPose]);

  // Update Mode (Studio vs Drive)
  useEffect(() => {
    if (!sceneRef.current || !studioGroupRef.current || !terrainGroupRef.current) return;
    const isStudio = mode === 'studio';

    studioGroupRef.current.visible = isStudio;
    terrainGroupRef.current.visible = !isStudio;

    if (isStudio) {
      sceneRef.current.background = new THREE.Color(0x13151b);
      sceneRef.current.fog = new THREE.FogExp2(0x13151b, 0.025);
    } else {
      sceneRef.current.background = new THREE.Color(0xd28264);
      sceneRef.current.fog = new THREE.FogExp2(0xd28264, 0.012);
    }
  }, [mode]);

  // Update Explode View Progress
  useEffect(() => {
    if (!nodesRef.current) return;
    const explodeDist = explodeProgress * 1.8;
    nodesRef.current.explodeNodes.forEach(({ node, basePos, dir }) => {
      node.position.copy(basePos).addScaledVector(dir, explodeDist);
    });
  }, [explodeProgress]);

  return (
    <div
      id="rover-canvas-container"
      ref={mountRef}
      tabIndex={0}
      onPointerDown={() => {
        if (mountRef.current) mountRef.current.focus();
      }}
      className="w-full h-full relative cursor-grab active:cursor-grabbing outline-none"
    />
  );
};
