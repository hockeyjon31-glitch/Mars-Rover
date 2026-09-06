import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  AppMode,
  ArmPose,
  CameraView,
  RoverGameControls,
  RoverSkin,
  RoverTelemetry,
  RoverVehicleType,
  ScienceSamplePoint,
} from '../types';
import { createMartianTerrain, MartianEnvironment } from './MartianTerrain';
import { createLunarEnvironment, PlanetaryEnvironment } from './LunarEnvironment';
import { applyArmPose, createRoverModel, RoverNodes } from './RoverModel';
import { createLunarRoverModel } from './LunarRoverModel';
import { RoverPhysicsController } from './RoverPhysics';
import { soundManager } from './SoundEffects';

interface RoverStudioProps {
  vehicleType: RoverVehicleType;
  mode: AppMode;
  cameraView: CameraView;
  currentSkin: RoverSkin;
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
  vehicleType,
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
  const vehicleTypeRef = useRef<RoverVehicleType>(vehicleType);
  vehicleTypeRef.current = vehicleType;

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
  const activeRoverRootRef = useRef<THREE.Group | null>(null);
  const updateSkinRef = useRef<((id: string) => void) | null>(null);

  // Environments
  const martianEnvRef = useRef<MartianEnvironment | null>(null);
  const lunarEnvRef = useRef<PlanetaryEnvironment | null>(null);
  const terrainGroupRef = useRef<THREE.Group | null>(null);

  // Lighting
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const studioGroupRef = useRef<THREE.Group | null>(null);

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

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffdfc4, 0x5a2617, 0.9);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const ambientLight = new THREE.AmbientLight(0xd97554, 0.6);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

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

    // Terrain parent group
    const terrainGroup = new THREE.Group();
    terrainGroup.name = 'PlanetaryTerrainGroup';
    scene.add(terrainGroup);
    terrainGroupRef.current = terrainGroup;

    // Create both Mars and Lunar environments
    const martianEnv = createMartianTerrain(scene);
    martianEnvRef.current = martianEnv;

    const lunarEnv = createLunarEnvironment(scene);
    lunarEnvRef.current = lunarEnv;

    // Initially configure based on vehicleType
    const isLunar = vehicleTypeRef.current === 'lunar_lrv';
    martianEnv.terrainMesh.visible = !isLunar;
    martianEnv.rocksGroup.visible = !isLunar;
    martianEnv.samplesGroup.visible = !isLunar;

    lunarEnv.terrainMesh.visible = isLunar;
    lunarEnv.rocksGroup.visible = isLunar;
    lunarEnv.samplesGroup.visible = isLunar;
    if (lunarEnv.groundFeatureGroup) lunarEnv.groundFeatureGroup.visible = isLunar;

    const activeHeightFunc = isLunar ? lunarEnv.getTerrainHeight : martianEnv.getTerrainHeight;

    // Create initial rover model
    const initialModel = isLunar
      ? createLunarRoverModel(currentSkin)
      : createRoverModel(currentSkin);

    scene.add(initialModel.rover);
    activeRoverRootRef.current = initialModel.rover;
    nodesRef.current = initialModel.nodes;
    updateSkinRef.current = initialModel.updateSkin;

    if (roverRefOutput) {
      roverRefOutput.current = initialModel.rover;
    }

    // Physics Controller
    const physics = new RoverPhysicsController(initialModel.nodes, scene, activeHeightFunc);
    physicsRef.current = physics;
    if (isLunar) {
      physics.setDustColor(0x8a9099); // Ash-grey lunar regolith dust
    } else {
      physics.setDustColor(0xcd6945); // Iron-oxide reddish dust
    }

    // Apply sky and environment settings
    if (modeRef.current === 'studio') {
      scene.background = new THREE.Color(0x13151b);
      scene.fog = new THREE.FogExp2(0x13151b, 0.025);
      studioGroup.visible = true;
      terrainGroup.visible = false;
    } else {
      studioGroup.visible = false;
      terrainGroup.visible = true;
      if (isLunar) {
        scene.background = lunarEnv.skyColor;
        scene.fog = new THREE.FogExp2(lunarEnv.fogColor.getHex(), lunarEnv.fogDensity);
        hemiLight.color.setHex(0xd0d5e0);
        hemiLight.groundColor.setHex(0x22242a);
        ambientLight.color.setHex(0x555a66);
        sunLight.color.setHex(0xffffff);
        sunLight.intensity = 3.2;
      } else {
        scene.background = new THREE.Color(0xd28264);
        scene.fog = new THREE.FogExp2(0xd28264, 0.012);
        hemiLight.color.setHex(0xffdfc4);
        hemiLight.groundColor.setHex(0x5a2617);
        ambientLight.color.setHex(0xd97554);
        sunLight.color.setHex(0xfff1de);
        sunLight.intensity = 2.2;
      }
    }

    // Resize handler
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

    // Actions
    triggerLaserRef &&
      (triggerLaserRef.current = () => {
        laserStateRef.current = { active: true, time: 0.4 };
        soundManager.playLaserSound();
      });

    triggerDrillRef &&
      (triggerDrillRef.current = () => {
        drillingStateRef.current = { active: true, time: 2.2 };
        soundManager.playDrillSound();

        const activeEnv = vehicleTypeRef.current === 'lunar_lrv' ? lunarEnvRef.current : martianEnvRef.current;
        if (physicsRef.current && activeEnv) {
          const rPos = physicsRef.current.position;
          activeEnv.samplePoints.forEach((sample) => {
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

    // Sound interaction
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

      if (physicsRef.current && nodesRef.current) {
        const isStudio = modeRef.current === 'studio';
        const currentControls = controlsRef.current;
        const currentCamView = cameraViewRef.current;

        const telemetry = physicsRef.current.update(delta, currentControls, isStudio);

        soundManager.updateMotorSpeed(telemetry.speedMs);

        // Sun light tracking
        if (sunLightRef.current && !isStudio) {
          sunLightRef.current.position.set(
            physicsRef.current.position.x + 35,
            physicsRef.current.position.y + 55,
            physicsRef.current.position.z + 25
          );
          sunLightRef.current.target.position.copy(physicsRef.current.position);
          sunLightRef.current.target.updateMatrixWorld();
        }

        // Check science targets
        const activeEnv = vehicleTypeRef.current === 'lunar_lrv' ? lunarEnvRef.current : martianEnvRef.current;
        if (!isStudio && activeEnv) {
          let foundNearby: ScienceSamplePoint | null = null;
          const rPos = physicsRef.current.position;

          activeEnv.samplePoints.forEach((sample) => {
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

          activeEnv.sampleMarkers.forEach((item) => {
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
          const roverPos = physicsRef.current.position;
          const roverYaw = physicsRef.current.yaw;

          if (isStudio) {
            orbitControlsRef.current.enabled = true;
            orbitControlsRef.current.target.set(0, 0.8, 0);
            orbitControlsRef.current.update();
          } else {
            if (currentCamView === 'chase') {
              orbitControlsRef.current.enabled = false;
              const camDist = 7.2;
              const camHeight = 3.4;
              const targetCamPos = new THREE.Vector3(
                roverPos.x - Math.sin(roverYaw) * camDist,
                roverPos.y + camHeight,
                roverPos.z - Math.cos(roverYaw) * camDist
              );
              cameraRef.current.position.lerp(targetCamPos, 0.12);
              cameraRef.current.lookAt(new THREE.Vector3(roverPos.x, roverPos.y + 1.1, roverPos.z));
            } else if (currentCamView === 'cockpit') {
              orbitControlsRef.current.enabled = false;
              const mastWorld = new THREE.Vector3();
              nodesRef.current.mastHead.getWorldPosition(mastWorld);
              const forward = new THREE.Vector3(Math.sin(roverYaw), -0.06, Math.cos(roverYaw));
              cameraRef.current.position.copy(mastWorld).addScaledVector(forward, 0.22);
              cameraRef.current.lookAt(mastWorld.clone().add(forward.multiplyScalar(20)));
            } else if (currentCamView === 'wheel') {
              orbitControlsRef.current.enabled = false;
              const wheelWorld = new THREE.Vector3();
              nodesRef.current.wheels[0].getWorldPosition(wheelWorld);
              cameraRef.current.position.set(
                wheelWorld.x - Math.sin(roverYaw - 0.4) * 2.2,
                wheelWorld.y + 0.35,
                wheelWorld.z - Math.cos(roverYaw - 0.4) * 2.2
              );
              cameraRef.current.lookAt(wheelWorld);
            } else {
              orbitControlsRef.current.enabled = true;
              orbitControlsRef.current.target.lerp(
                new THREE.Vector3(roverPos.x, roverPos.y + 0.8, roverPos.z),
                0.15
              );
              orbitControlsRef.current.update();
            }
          }
        }

        // Send telemetry back
        const collectedCount = activeEnv ? activeEnv.samplePoints.filter((s) => s.collected).length : 0;
        telemetry.samplesCollected = collectedCount;
        telemetry.isHeadlightsOn = isHeadlightsOnRef.current;
        telemetry.isDrilling = drillingStateRef.current.active;
        telemetry.isLaserFiring = laserStateRef.current.active;

        onTelemetryUpdateRef.current(telemetry);
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

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

  // 2. Switch Vehicle Type (Apollo Lunar Rover vs Mars Perseverance)
  useEffect(() => {
    if (!sceneRef.current || !physicsRef.current) return;
    const isLunar = vehicleType === 'lunar_lrv';

    // Remove old rover mesh
    if (activeRoverRootRef.current) {
      sceneRef.current.remove(activeRoverRootRef.current);
    }

    // Toggle planetary terrain visibility
    if (martianEnvRef.current) {
      martianEnvRef.current.terrainMesh.visible = !isLunar;
      martianEnvRef.current.rocksGroup.visible = !isLunar;
      martianEnvRef.current.samplesGroup.visible = !isLunar;
    }
    if (lunarEnvRef.current) {
      lunarEnvRef.current.terrainMesh.visible = isLunar;
      lunarEnvRef.current.rocksGroup.visible = isLunar;
      lunarEnvRef.current.samplesGroup.visible = isLunar;
      if (lunarEnvRef.current.groundFeatureGroup) {
        lunarEnvRef.current.groundFeatureGroup.visible = isLunar;
      }
    }

    const activeEnv = isLunar ? lunarEnvRef.current : martianEnvRef.current;
    const activeHeight = activeEnv ? activeEnv.getTerrainHeight : () => 0;

    // Build new rover model
    const newModel = isLunar
      ? createLunarRoverModel(currentSkin)
      : createRoverModel(currentSkin);

    sceneRef.current.add(newModel.rover);
    activeRoverRootRef.current = newModel.rover;
    nodesRef.current = newModel.nodes;
    updateSkinRef.current = newModel.updateSkin;

    if (roverRefOutput) {
      roverRefOutput.current = newModel.rover;
    }

    physicsRef.current.updateNodesAndTerrain(newModel.nodes, activeHeight);
    physicsRef.current.setDustColor(isLunar ? 0x8a9099 : 0xcd6945);

    // Update Lighting & Atmosphere if in Drive Mode
    if (mode === 'drive') {
      if (isLunar && lunarEnvRef.current) {
        sceneRef.current.background = lunarEnvRef.current.skyColor;
        sceneRef.current.fog = new THREE.FogExp2(
          lunarEnvRef.current.fogColor.getHex(),
          lunarEnvRef.current.fogDensity
        );
        if (hemiLightRef.current) {
          hemiLightRef.current.color.setHex(0xd0d5e0);
          hemiLightRef.current.groundColor.setHex(0x22242a);
        }
        if (ambientLightRef.current) ambientLightRef.current.color.setHex(0x555a66);
        if (sunLightRef.current) {
          sunLightRef.current.color.setHex(0xffffff);
          sunLightRef.current.intensity = 3.2;
        }
      } else {
        sceneRef.current.background = new THREE.Color(0xd28264);
        sceneRef.current.fog = new THREE.FogExp2(0xd28264, 0.012);
        if (hemiLightRef.current) {
          hemiLightRef.current.color.setHex(0xffdfc4);
          hemiLightRef.current.groundColor.setHex(0x5a2617);
        }
        if (ambientLightRef.current) ambientLightRef.current.color.setHex(0xd97554);
        if (sunLightRef.current) {
          sunLightRef.current.color.setHex(0xfff1de);
          sunLightRef.current.intensity = 2.2;
        }
      }
    }
  }, [vehicleType]);

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
          child.material.forEach((m) => {
            if ('wireframe' in m) m.wireframe = isWireframe;
          });
        } else if ('wireframe' in child.material) {
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
    const isLunar = vehicleType === 'lunar_lrv';

    studioGroupRef.current.visible = isStudio;
    terrainGroupRef.current.visible = !isStudio;

    if (isStudio) {
      sceneRef.current.background = new THREE.Color(0x13151b);
      sceneRef.current.fog = new THREE.FogExp2(0x13151b, 0.025);
    } else {
      if (isLunar && lunarEnvRef.current) {
        sceneRef.current.background = lunarEnvRef.current.skyColor;
        sceneRef.current.fog = new THREE.FogExp2(
          lunarEnvRef.current.fogColor.getHex(),
          lunarEnvRef.current.fogDensity
        );
      } else {
        sceneRef.current.background = new THREE.Color(0xd28264);
        sceneRef.current.fog = new THREE.FogExp2(0xd28264, 0.012);
      }
    }
  }, [mode, vehicleType]);

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
