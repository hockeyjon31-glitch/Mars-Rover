import * as THREE from 'three';
import { ArmPose, RoverSkinConfig } from '../types';
import { RoverNodes } from './RoverModel';

export const LUNAR_ROVER_SKINS: Record<string, RoverSkinConfig> = {
  apollo_historic: {
    id: 'apollo_historic',
    name: 'Apollo 15/17 Historic',
    description: 'Authentic 1971 Boeing/Delco Lunar Roving Vehicle with aluminized mylar thermal blankets, high-gain umbrella antenna, and zinc-mesh wire tires.',
    primaryColor: 0xd8dde4, // Spacecraft aluminum
    secondaryColor: 0x3a3f47, // Frame brackets & dark fittings
    chassisFoilColor: 0xd4af37, // Gold Kapton / Mylar thermal protection
    accentColor: 0xc92a2a, // NASA red markings & camera accents
    wheelColor: 0x9aa2ac, // Galvanized wire mesh & titanium chevron treads
    roughness: 0.38,
    metalness: 0.8,
  },
  artemis_gold: {
    id: 'artemis_gold',
    name: 'Artemis Moonwalker',
    description: 'Next-generation lunar terrain vehicle with gold multi-layer insulation and bright solar reflective surfaces.',
    primaryColor: 0xffffff,
    secondaryColor: 0x1f2329,
    chassisFoilColor: 0xe5a93b,
    accentColor: 0x0284c7,
    wheelColor: 0xa1a8b5,
    roughness: 0.25,
    metalness: 0.85,
  },
  lunar_carbon: {
    id: 'lunar_carbon',
    name: 'Mare Imbrium Tactical',
    description: 'Midnight carbon fiber chassis with high-contrast safety orange beacons and matte black regolith mudguards.',
    primaryColor: 0x1a1c20,
    secondaryColor: 0x111315,
    chassisFoilColor: 0x2e323b,
    accentColor: 0xf97316,
    wheelColor: 0x474c55,
    roughness: 0.5,
    metalness: 0.75,
  },
};

/**
 * Procedural 3D model of the Apollo Lunar Roving Vehicle (LRV).
 * Features:
 * - Tubular aluminum truss chassis (forward, center, aft chassis)
 * - 2 folding astronaut lawn-chair crew seats with open webbing
 * - T-shaped center control hand controller (drive stick) & console display
 * - 4 wire-mesh wheels with titanium chevron chevrons and fiberglass fenders
 * - Front equipment console with high-gain parabolic umbrella mesh antenna
 * - Color TV camera on panning mount & 70mm Hasselblad film camera mount
 * - Sample collection tongs / drill tool mounted on the aft tool palette
 * - Low-angle headlights with authentic warm beam projection
 */
export function createLunarRoverModel(skinId: string = 'apollo_historic'): {
  rover: THREE.Group;
  nodes: RoverNodes;
  updateSkin: (newSkinId: string) => void;
} {
  const currentSkin = LUNAR_ROVER_SKINS[skinId] || LUNAR_ROVER_SKINS.apollo_historic;
  const root = new THREE.Group();
  root.name = 'ApolloLunarRoverRoot';

  // Materials
  const materials = {
    primary: new THREE.MeshStandardMaterial({
      color: currentSkin.primaryColor,
      roughness: currentSkin.roughness,
      metalness: currentSkin.metalness,
    }),
    secondary: new THREE.MeshStandardMaterial({
      color: currentSkin.secondaryColor,
      roughness: 0.5,
      metalness: 0.6,
    }),
    foil: new THREE.MeshStandardMaterial({
      color: currentSkin.chassisFoilColor,
      roughness: 0.3,
      metalness: 0.85,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: currentSkin.accentColor,
      roughness: 0.4,
      metalness: 0.4,
    }),
    wheel: new THREE.MeshStandardMaterial({
      color: currentSkin.wheelColor,
      roughness: 0.65,
      metalness: 0.75,
      wireframe: false,
    }),
    treadMesh: new THREE.MeshStandardMaterial({
      color: 0xb5bcc6,
      wireframe: true,
      roughness: 0.8,
      metalness: 0.9,
    }),
    seatWebbing: new THREE.MeshStandardMaterial({
      color: 0x85361b, // Orange-brown nylon safety webbing
      roughness: 0.8,
      metalness: 0.1,
    }),
    suitWhite: new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.7,
      metalness: 0.1,
    }),
    visorGold: new THREE.MeshStandardMaterial({
      color: 0xe6b800,
      roughness: 0.1,
      metalness: 0.95,
    }),
  };

  const explodeNodes: { node: THREE.Object3D; basePos: THREE.Vector3; dir: THREE.Vector3 }[] = [];

  // 1. Chassis Frame (Tubular 3-part chassis)
  const chassis = new THREE.Group();
  chassis.name = 'LRV_Chassis';
  root.add(chassis);

  // Main center tubular floor frame
  const floorGeom = new THREE.BoxGeometry(1.65, 0.12, 2.2);
  const floorMesh = new THREE.Mesh(floorGeom, materials.primary);
  floorMesh.position.y = 0.42;
  floorMesh.castShadow = true;
  floorMesh.receiveShadow = true;
  chassis.add(floorMesh);

  // Gold thermal foil blanket over forward battery/electronics bay
  const forwardFoilGeom = new THREE.BoxGeometry(1.4, 0.45, 0.85);
  const forwardFoilMesh = new THREE.Mesh(forwardFoilGeom, materials.foil);
  forwardFoilMesh.position.set(0, 0.65, 0.95);
  forwardFoilMesh.castShadow = true;
  chassis.add(forwardFoilMesh);

  // Forward bumper and tow ring
  const bumperGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 12);
  bumperGeom.rotateZ(Math.PI / 2);
  const bumperMesh = new THREE.Mesh(bumperGeom, materials.secondary);
  bumperMesh.position.set(0, 0.42, 1.45);
  chassis.add(bumperMesh);

  // Center chassis handrails / structural tubes
  const railGeom = new THREE.CylinderGeometry(0.025, 0.025, 1.8, 8);
  railGeom.rotateX(Math.PI / 2);
  const leftRail = new THREE.Mesh(railGeom, materials.secondary);
  leftRail.position.set(-0.84, 0.52, 0);
  const rightRail = new THREE.Mesh(railGeom, materials.secondary);
  rightRail.position.set(0.84, 0.52, 0);
  chassis.add(leftRail, rightRail);

  // 2. Astronaut Lawn Chair Seats (Commander on Left, LMP on Right)
  const seatsGroup = new THREE.Group();
  seatsGroup.name = 'AstronautSeats';
  seatsGroup.position.set(0, 0.48, -0.15);
  chassis.add(seatsGroup);

  [-0.38, 0.38].forEach((seatX, sIdx) => {
    const seat = new THREE.Group();
    seat.position.set(seatX, 0, 0);

    // Seat bottom
    const seatBottom = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.5), materials.seatWebbing);
    seatBottom.position.set(0, 0.15, 0);
    seat.add(seatBottom);

    // Seat back tilted backwards ~15 deg
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.65, 0.04), materials.seatWebbing);
    seatBack.position.set(0, 0.45, -0.24);
    seatBack.rotation.x = -0.22;
    seat.add(seatBack);

    // Tubular chair frame
    const chairTubeMat = materials.secondary;
    const chairLeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), chairTubeMat);
    chairLeg1.position.set(-0.24, 0.05, 0.2);
    const chairLeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), chairTubeMat);
    chairLeg2.position.set(0.24, 0.05, 0.2);
    seat.add(chairLeg1, chairLeg2);

    // Footrest pan
    const footrest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.35), materials.primary);
    footrest.position.set(0, 0.02, 0.42);
    seat.add(footrest);

    // Stylized Apollo EVA Astronaut seated (Commander on left)
    const astroGroup = new THREE.Group();
    astroGroup.name = `Astronaut_${sIdx === 0 ? 'CDR' : 'LMP'}`;

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.28), materials.suitWhite);
    torso.position.set(0, 0.46, -0.1);
    torso.rotation.x = -0.15;
    astroGroup.add(torso);

    // PLSS Backpack (Portable Life Support System)
    const plss = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.48, 0.2), materials.primary);
    plss.position.set(0, 0.48, -0.28);
    astroGroup.add(plss);

    // Helmet & Gold Sun Visor
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), materials.suitWhite);
    helmet.position.set(0, 0.78, -0.06);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16, 0, Math.PI), materials.visorGold);
    visor.rotation.y = Math.PI / 2;
    visor.position.set(0, 0.78, -0.01);
    astroGroup.add(helmet, visor);

    // Legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.14), materials.suitWhite);
    legL.position.set(-0.12, 0.22, 0.16);
    legL.rotation.x = 0.55;
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.14), materials.suitWhite);
    legR.position.set(0.12, 0.22, 0.16);
    legR.rotation.x = 0.55;
    astroGroup.add(legL, legR);

    // Arms
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.32, 0.11), materials.suitWhite);
    armL.position.set(-0.24, 0.44, 0.05);
    armL.rotation.x = -0.6;
    armL.rotation.z = -0.2;
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.32, 0.11), materials.suitWhite);
    armR.position.set(0.24, 0.44, 0.05);
    armR.rotation.x = -0.6;
    armR.rotation.z = 0.2;
    astroGroup.add(armL, armR);

    seat.add(astroGroup);
    seatsGroup.add(seat);
  });

  // 3. T-Handle Control Console (Center Stick)
  const consoleGroup = new THREE.Group();
  consoleGroup.name = 'ControlConsole';
  consoleGroup.position.set(0, 0.48, 0.25);
  chassis.add(consoleGroup);

  const consolePillar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), materials.secondary);
  consolePillar.position.set(0, 0.22, 0);
  consolePillar.rotation.x = -0.2;
  consoleGroup.add(consolePillar);

  // T-bar hand controller
  const tHandleGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.26, 8);
  tHandleGeom.rotateZ(Math.PI / 2);
  const tHandle = new THREE.Mesh(tHandleGeom, materials.accent);
  tHandle.position.set(0, 0.44, -0.04);
  consoleGroup.add(tHandle);

  // Speedometer & Gyro Heading display panel
  const displayPanel = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.04), materials.secondary);
  displayPanel.position.set(0, 0.38, 0.06);
  displayPanel.rotation.x = -0.5;
  consoleGroup.add(displayPanel);

  // 4. High-Gain Umbrella Mesh Antenna & Color TV Camera
  const forwardMastBase = new THREE.Group();
  forwardMastBase.name = 'HighGainAntennaBase';
  forwardMastBase.position.set(-0.35, 0.88, 1.15);
  chassis.add(forwardMastBase);

  const antennaMastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), materials.secondary);
  antennaMastPole.position.set(0, 0.4, 0);
  forwardMastBase.add(antennaMastPole);

  const antennaDishHead = new THREE.Group();
  antennaDishHead.name = 'AntennaDishHead';
  antennaDishHead.position.set(0, 0.8, 0);
  forwardMastBase.add(antennaDishHead);

  // Authentic Apollo High-Gain Parabolic Umbrella Antenna
  const umbrellaDishGeom = new THREE.ConeGeometry(0.65, 0.22, 16, 1, true);
  umbrellaDishGeom.rotateX(Math.PI / 2);
  const umbrellaDishMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Gold mesh
    wireframe: true,
    roughness: 0.3,
    metalness: 0.9,
  });
  const umbrellaDish = new THREE.Mesh(umbrellaDishGeom, umbrellaDishMat);
  umbrellaDish.rotation.set(-0.35, 0.3, 0);
  antennaDishHead.add(umbrellaDish);

  // Antenna Feed Horn
  const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.35, 8), materials.accent);
  feedHorn.position.set(0, 0, 0.18);
  feedHorn.rotation.x = Math.PI / 2;
  umbrellaDish.add(feedHorn);

  // Color TV Camera (RCA ground-controlled television assembly) on front right
  const tvCameraGroup = new THREE.Group();
  tvCameraGroup.name = 'RCA_ColorTV_Camera';
  tvCameraGroup.position.set(0.35, 0.88, 1.15);
  chassis.add(tvCameraGroup);

  const tvCameraPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 8), materials.secondary);
  tvCameraPole.position.set(0, 0.32, 0);
  tvCameraGroup.add(tvCameraPole);

  const cameraHead = new THREE.Group();
  cameraHead.name = 'TVCameraHead';
  cameraHead.position.set(0, 0.65, 0);
  tvCameraGroup.add(cameraHead);

  const cameraBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.32), materials.primary);
  cameraHead.add(cameraBox);

  // Optical zoom lens
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.15, 16), materials.secondary);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0, 0.22);
  cameraHead.add(lens);

  // Laser beam simulation for target distance measuring
  const laserBeamGeom = new THREE.CylinderGeometry(0.02, 0.02, 18, 8);
  laserBeamGeom.rotateX(Math.PI / 2);
  const laserBeamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
  });
  const laserBeam = new THREE.Mesh(laserBeamGeom, laserBeamMat);
  laserBeam.position.set(0, 0, 9);
  cameraHead.add(laserBeam);

  // 5. Lunar Headlights (forward navigation lamps)
  const headlights: THREE.SpotLight[] = [];
  [-0.55, 0.55].forEach((lampX) => {
    const lampGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 16);
    lampGeom.rotateX(Math.PI / 2);
    const lampHousing = new THREE.Mesh(lampGeom, materials.secondary);
    lampHousing.position.set(lampX, 0.62, 1.35);
    chassis.add(lampHousing);

    const light = new THREE.SpotLight(0xfff8ee, 4.0, 45, Math.PI / 5, 0.45, 1.2);
    light.position.set(lampX, 0.62, 1.4);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(lampX, -0.2, 12);
    chassis.add(targetObj);
    light.target = targetObj;
    light.castShadow = true;
    chassis.add(light);
    headlights.push(light);
  });

  // 6. Aft Science Tool Palette & Lunar Core Drill
  const aftPalette = new THREE.Group();
  aftPalette.name = 'AftToolPalette';
  aftPalette.position.set(0, 0.45, -1.25);
  chassis.add(aftPalette);

  const palettePlate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.75), materials.secondary);
  aftPalette.add(palettePlate);

  // Sample rock collection boxes
  const boxGeom = new THREE.BoxGeometry(0.35, 0.25, 0.4);
  const sampleBox1 = new THREE.Mesh(boxGeom, materials.foil);
  sampleBox1.position.set(-0.35, 0.16, 0);
  const sampleBox2 = new THREE.Mesh(boxGeom, materials.primary);
  sampleBox2.position.set(0.35, 0.16, 0);
  aftPalette.add(sampleBox1, sampleBox2);

  // Lunar Core Drill Tool (Articulated arm proxy)
  const drillGroup = new THREE.Group();
  drillGroup.name = 'LunarCoreDrill';
  drillGroup.position.set(0, 0.15, 0.1);
  aftPalette.add(drillGroup);

  const armShoulder = new THREE.Group();
  armShoulder.position.set(0, 0, 0);
  drillGroup.add(armShoulder);

  const armUpper = new THREE.Group();
  armUpper.position.set(0, 0.2, 0);
  armShoulder.add(armUpper);

  const armUpperMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 8), materials.primary);
  armUpperMesh.position.y = 0.22;
  armUpper.add(armUpperMesh);

  const armFore = new THREE.Group();
  armFore.position.set(0, 0.45, 0);
  armUpper.add(armFore);

  const armForeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), materials.secondary);
  armForeMesh.position.y = 0.2;
  armFore.add(armForeMesh);

  const armWrist = new THREE.Group();
  armWrist.position.set(0, 0.4, 0);
  armFore.add(armWrist);

  const armTurret = new THREE.Group();
  armWrist.add(armTurret);

  // Rotary Apollo Lunar Surface Drill (ALSD) bit
  const drillBitGeom = new THREE.CylinderGeometry(0.02, 0.035, 0.45, 12);
  const drillBit = new THREE.Mesh(drillBitGeom, materials.accent);
  drillBit.position.set(0, 0.22, 0);
  armTurret.add(drillBit);

  // 7. Suspension & Wire-Mesh Chevrons 4WD Wheels
  // Real Apollo LRV used double-wishbone independent suspension with individual 1/4 HP DC electric motors on all 4 wheels
  const rockerLeft = new THREE.Group();
  rockerLeft.name = 'LeftSuspensionWishbones';
  chassis.add(rockerLeft);

  const rockerRight = new THREE.Group();
  rockerRight.name = 'RightSuspensionWishbones';
  chassis.add(rockerRight);

  const bogieLeft = new THREE.Group();
  bogieLeft.name = 'BogieLeft_Proxy';
  chassis.add(bogieLeft);

  const bogieRight = new THREE.Group();
  bogieRight.name = 'BogieRight_Proxy';
  chassis.add(bogieRight);

  const wheels: THREE.Group[] = [];
  const steerPivots: (THREE.Group | null)[] = [];

  // Wheel coordinates: [FL, ML(proxy), RL, FR, MR(proxy), RR]
  // In Apollo LRV, Front Left and Rear Left steer; Middle is a virtual center pivot
  const wheelConfigs = [
    { x: -1.02, z: 1.15, side: 'L', isSteer: true, name: 'Wheel_FL' },
    { x: -1.02, z: 0.0, side: 'L', isSteer: false, name: 'Wheel_ML_Center' },
    { x: -1.02, z: -1.15, side: 'L', isSteer: true, name: 'Wheel_RL' },
    { x: 1.02, z: 1.15, side: 'R', isSteer: true, name: 'Wheel_FR' },
    { x: 1.02, z: 0.0, side: 'R', isSteer: false, name: 'Wheel_MR_Center' },
    { x: 1.02, z: -1.15, side: 'R', isSteer: true, name: 'Wheel_RR' },
  ];

  wheelConfigs.forEach((cfg) => {
    // If middle wheel (which LRV does not have), make an invisible anchor to keep RoverNodes 6-wheel array happy
    if (cfg.name.includes('_ML_') || cfg.name.includes('_MR_')) {
      const dummyPivot = new THREE.Group();
      dummyPivot.position.set(cfg.x, 0.45, cfg.z);
      dummyPivot.name = cfg.name;
      chassis.add(dummyPivot);

      const dummyWheel = new THREE.Group();
      dummyPivot.add(dummyWheel);

      wheels.push(dummyWheel);
      steerPivots.push(null);
      return;
    }

    const steerPivot = new THREE.Group();
    steerPivot.name = `SteerPivot_${cfg.name}`;
    steerPivot.position.set(cfg.x, 0.42, cfg.z);
    chassis.add(steerPivot);

    // Iconic Apollo Curved Fiberglass Fender (Mudguard)
    const fenderGeom = new THREE.CylinderGeometry(0.52, 0.52, 0.32, 24, 1, true, 0, Math.PI);
    fenderGeom.rotateZ(Math.PI / 2);
    const fenderMesh = new THREE.Mesh(fenderGeom, materials.secondary);
    fenderMesh.position.set(cfg.side === 'L' ? -0.05 : 0.05, 0.18, 0);
    steerPivot.add(fenderMesh);

    // Double wishbone suspension arm
    const armGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.38, 8);
    armGeom.rotateZ(cfg.side === 'L' ? Math.PI / 4 : -Math.PI / 4);
    const armMesh = new THREE.Mesh(armGeom, materials.secondary);
    armMesh.position.set(cfg.side === 'L' ? 0.12 : -0.12, -0.05, 0);
    steerPivot.add(armMesh);

    // Wheel Group (Spins as rover rolls)
    const wheelGroup = new THREE.Group();
    wheelGroup.name = cfg.name;
    steerPivot.add(wheelGroup);

    // Authentic Apollo Wire-Mesh Tire
    // Outer mesh cylinder
    const tireGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 32);
    tireGeom.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeom, materials.wheel);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    // Wire mesh overlay
    const wireOverlay = new THREE.Mesh(tireGeom, materials.treadMesh);
    wheelGroup.add(wireOverlay);

    // Titanium Chevron Treads (V-shaped stripsriveted to wire mesh)
    const hubGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.28, 16);
    hubGeom.rotateZ(Math.PI / 2);
    const hubMesh = new THREE.Mesh(hubGeom, materials.primary);
    wheelGroup.add(hubMesh);

    // Inboard traction drive motor (1/4 HP DC motor + harmonic drive)
    const motorGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12);
    motorGeom.rotateZ(Math.PI / 2);
    const motorMesh = new THREE.Mesh(motorGeom, materials.foil);
    motorMesh.position.x = cfg.side === 'L' ? 0.14 : -0.14;
    wheelGroup.add(motorMesh);

    wheels.push(wheelGroup);
    steerPivots.push(steerPivot);
  });

  // Explode view nodes setup
  explodeNodes.push(
    { node: forwardMastBase, basePos: forwardMastBase.position.clone(), dir: new THREE.Vector3(0, 1.2, 0.8) },
    { node: tvCameraGroup, basePos: tvCameraGroup.position.clone(), dir: new THREE.Vector3(0.8, 1.0, 0.8) },
    { node: seatsGroup, basePos: seatsGroup.position.clone(), dir: new THREE.Vector3(0, 1.4, 0) },
    { node: consoleGroup, basePos: consoleGroup.position.clone(), dir: new THREE.Vector3(0, 1.2, 0.5) },
    { node: aftPalette, basePos: aftPalette.position.clone(), dir: new THREE.Vector3(0, 0.6, -1.2) }
  );

  steerPivots.forEach((p, idx) => {
    if (p) {
      const dirX = idx < 3 ? -1.0 : 1.0;
      const dirZ = idx === 0 || idx === 3 ? 0.8 : -0.8;
      explodeNodes.push({ node: p, basePos: p.position.clone(), dir: new THREE.Vector3(dirX, 0, dirZ) });
    }
  });

  const nodes: RoverNodes = {
    root,
    chassis,
    mastBase: forwardMastBase,
    mastHead: cameraHead,
    laserBeam,
    headlights,
    armGroup: drillGroup,
    armShoulder,
    armUpper,
    armFore,
    armWrist,
    armTurret,
    drillBit,
    antennaDish: antennaDishHead,
    rtgGenerator: aftPalette,
    rockerLeft,
    rockerRight,
    bogieLeft,
    bogieRight,
    wheels,
    steerPivots,
    explodeNodes,
  };

  function updateSkin(newSkinId: string) {
    const skin = LUNAR_ROVER_SKINS[newSkinId] || LUNAR_ROVER_SKINS.apollo_historic;
    materials.primary.color.setHex(skin.primaryColor);
    materials.primary.roughness = skin.roughness;
    materials.primary.metalness = skin.metalness;

    materials.secondary.color.setHex(skin.secondaryColor);
    materials.foil.color.setHex(skin.chassisFoilColor);
    materials.accent.color.setHex(skin.accentColor);
    materials.wheel.color.setHex(skin.wheelColor);
  }

  return { rover: root, nodes, updateSkin };
}
