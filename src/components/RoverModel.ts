import * as THREE from 'three';
import { ArmPose, RoverSkinConfig } from '../types';

export const ROVER_SKINS: Record<string, RoverSkinConfig> = {
  nasa_classic: {
    id: 'nasa_classic',
    name: 'Perseverance Classic',
    description: 'Authentic aerospace titanium white with gold multi-layer thermal insulation and NASA red accents.',
    primaryColor: 0xe6e9ed, // White / aluminum
    secondaryColor: 0x24282f, // Carbon dark
    chassisFoilColor: 0xd4af37, // Gold thermal foil
    accentColor: 0xd62828, // Red mission markings
    wheelColor: 0x2b2e35, // Machined aerospace aluminum
    roughness: 0.35,
    metalness: 0.75,
  },
  stealth_black: {
    id: 'stealth_black',
    name: 'Titanium Stealth',
    description: 'Blackened titanium frame with carbon-fiber panels and high-contrast hazard yellow indicators.',
    primaryColor: 0x18191c,
    secondaryColor: 0x0f1012,
    chassisFoilColor: 0x262930,
    accentColor: 0xf59e0b,
    wheelColor: 0x1f2024,
    roughness: 0.45,
    metalness: 0.85,
  },
  ares_orange: {
    id: 'ares_orange',
    name: 'Ares Exploration',
    description: 'High-visibility international safety orange bodywork optimized for optical tracking across Mars.',
    primaryColor: 0xe65c00,
    secondaryColor: 0x1c1e22,
    chassisFoilColor: 0xc8963e,
    accentColor: 0xffffff,
    wheelColor: 0x3a3d45,
    roughness: 0.3,
    metalness: 0.6,
  },
  martian_dust: {
    id: 'martian_dust',
    name: 'Weathered Regolith',
    description: 'Battle-hardened rover coated in reddish iron-oxide Martian dust and terrain weathering.',
    primaryColor: 0xa25539,
    secondaryColor: 0x482f25,
    chassisFoilColor: 0x8a5a36,
    accentColor: 0xdf8453,
    wheelColor: 0x5a3e35,
    roughness: 0.8,
    metalness: 0.35,
  },
};

export interface RoverNodes {
  root: THREE.Group;
  chassis: THREE.Group;
  mastBase: THREE.Group;
  mastHead: THREE.Group;
  laserBeam: THREE.Mesh;
  headlights: THREE.SpotLight[];
  armGroup: THREE.Group;
  armShoulder: THREE.Group;
  armUpper: THREE.Group;
  armFore: THREE.Group;
  armWrist: THREE.Group;
  armTurret: THREE.Group;
  drillBit: THREE.Mesh;
  antennaDish: THREE.Group;
  rtgGenerator: THREE.Group;
  rockerLeft: THREE.Group;
  rockerRight: THREE.Group;
  bogieLeft: THREE.Group;
  bogieRight: THREE.Group;
  wheels: THREE.Group[]; // [FL, ML, RL, FR, MR, RR]
  steerPivots: (THREE.Group | null)[]; // [FL, null, RL, FR, null, RR]
  explodeNodes: {
    node: THREE.Object3D;
    basePos: THREE.Vector3;
    dir: THREE.Vector3;
  }[];
}

export function createRoverModel(skinId: string = 'nasa_classic'): { rover: THREE.Group; nodes: RoverNodes; updateSkin: (newSkinId: string) => void } {
  const currentSkin = ROVER_SKINS[skinId] || ROVER_SKINS.nasa_classic;
  const root = new THREE.Group();
  root.name = 'MarsRoverRoot';

  // Materials map for dynamic updating
  const materials = {
    primary: new THREE.MeshStandardMaterial({
      color: currentSkin.primaryColor,
      roughness: currentSkin.roughness,
      metalness: currentSkin.metalness,
    }),
    secondary: new THREE.MeshStandardMaterial({
      color: currentSkin.secondaryColor,
      roughness: 0.5,
      metalness: 0.7,
    }),
    foil: new THREE.MeshStandardMaterial({
      color: currentSkin.chassisFoilColor,
      roughness: 0.25,
      metalness: 0.9,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: currentSkin.accentColor,
      roughness: 0.4,
      metalness: 0.4,
    }),
    wheel: new THREE.MeshStandardMaterial({
      color: currentSkin.wheelColor,
      roughness: 0.6,
      metalness: 0.8,
    }),
    darkMetal: new THREE.MeshStandardMaterial({
      color: 0x222428,
      roughness: 0.4,
      metalness: 0.8,
    }),
    lensGlass: new THREE.MeshPhysicalMaterial({
      color: 0x050c18,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      transparent: true,
      opacity: 0.95,
      ior: 1.52,
    }),
    headlightGlass: new THREE.MeshBasicMaterial({
      color: 0xfffaed,
    }),
    solarCell: new THREE.MeshStandardMaterial({
      color: 0x12243d,
      roughness: 0.2,
      metalness: 0.85,
    }),
    rtgFins: new THREE.MeshStandardMaterial({
      color: 0x323438,
      roughness: 0.6,
      metalness: 0.6,
    }),
    goldWiring: new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.85,
    }),
  };

  const explodeNodes: RoverNodes['explodeNodes'] = [];

  function registerExplode(node: THREE.Object3D, dir: THREE.Vector3) {
    explodeNodes.push({
      node,
      basePos: node.position.clone(),
      dir: dir.clone().normalize(),
    });
  }

  // ==========================================
  // 1. CHASSIS / WARM ELECTRONICS BOX (WEB)
  // ==========================================
  const chassis = new THREE.Group();
  chassis.name = 'Chassis';
  chassis.position.set(0, 0.85, 0);
  root.add(chassis);
  registerExplode(chassis, new THREE.Vector3(0, 1, 0));

  // Main hexagonal-tapered avionics body
  const chassisGeom = new THREE.BoxGeometry(1.2, 0.55, 2.0);
  const chassisMesh = new THREE.Mesh(chassisGeom, materials.primary);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  chassis.add(chassisMesh);

  // Underbelly gold insulation foil blanket
  const foilGeom = new THREE.BoxGeometry(1.16, 0.22, 1.94);
  const foilMesh = new THREE.Mesh(foilGeom, materials.foil);
  foilMesh.position.set(0, -0.22, 0);
  foilMesh.castShadow = true;
  foilMesh.receiveShadow = true;
  chassis.add(foilMesh);

  // Top Equipment Deck (avionics panels, calibration targets, wiring harnesses)
  const deckGeom = new THREE.BoxGeometry(1.14, 0.05, 1.9);
  const deckMesh = new THREE.Mesh(deckGeom, materials.secondary);
  deckMesh.position.set(0, 0.28, 0);
  deckMesh.castShadow = true;
  chassis.add(deckMesh);

  // Calibration target / Sundial (Marsdial) on top deck
  const sundialBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16), materials.primary);
  sundialBase.position.set(0.2, 0.31, 0.1);
  const sundialPin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8), materials.darkMetal);
  sundialPin.position.set(0.2, 0.35, 0.1);
  chassis.add(sundialBase, sundialPin);

  // Color calibration chips target (Red, Green, Blue, Yellow, Grayscale)
  const calibTarget = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.12), materials.accent);
  calibTarget.position.set(-0.25, 0.31, 0.2);
  chassis.add(calibTarget);

  // Front Hazcam (Hazard Avoidance Cameras) stereo pair
  const hazcamGeom = new THREE.BoxGeometry(0.25, 0.08, 0.08);
  const hazcamMesh = new THREE.Mesh(hazcamGeom, materials.secondary);
  hazcamMesh.position.set(0, -0.05, 1.03);
  chassis.add(hazcamMesh);

  // Stereo eye lenses
  const eyeGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16);
  eyeGeom.rotateX(Math.PI / 2);
  const leftEye = new THREE.Mesh(eyeGeom, materials.lensGlass);
  leftEye.position.set(-0.08, -0.05, 1.07);
  const rightEye = new THREE.Mesh(eyeGeom, materials.lensGlass);
  rightEye.position.set(0.08, -0.05, 1.07);
  chassis.add(leftEye, rightEye);

  // Rear Hazcam pair
  const rearHazcam = hazcamMesh.clone();
  rearHazcam.position.set(0, -0.05, -1.03);
  chassis.add(rearHazcam);

  // Headlights (Dual High-Intensity Searchlights on Front)
  const headlights: THREE.SpotLight[] = [];
  const headlightPositions = [-0.4, 0.4];
  headlightPositions.forEach((posX) => {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.08, 16), materials.secondary);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(posX, 0.15, 1.02);
    housing.castShadow = true;

    const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), materials.headlightGlass);
    bulb.position.set(posX, 0.15, 1.065);

    // Three.js Spotlight
    const spot = new THREE.SpotLight(0xfff3d6, 4.5, 35, Math.PI / 5, 0.35, 1.5);
    spot.position.set(posX, 0.15, 1.06);
    spot.target.position.set(posX, -0.5, 15);
    spot.castShadow = true;
    chassis.add(spot.target);
    chassis.add(spot);
    headlights.push(spot);

    chassis.add(housing, bulb);
  });

  // ==========================================
  // 2. MMRTG (Nuclear Generator at Aft)
  // ==========================================
  const rtgGenerator = new THREE.Group();
  rtgGenerator.name = 'MMRTG_Generator';
  rtgGenerator.position.set(0, 0.15, -1.22);
  chassis.add(rtgGenerator);
  registerExplode(rtgGenerator, new THREE.Vector3(0, 0.3, -1));

  // RTG Central core cylinder
  const rtgCore = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.65, 16), materials.darkMetal);
  rtgCore.rotation.x = Math.PI / 2;
  rtgCore.castShadow = true;
  rtgGenerator.add(rtgCore);

  // RTG Heat Dissipation Fins (8 radial fins)
  const finGeom = new THREE.BoxGeometry(0.65, 0.015, 0.62);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeom, materials.rtgFins);
    fin.rotation.z = (i * Math.PI) / 4;
    fin.castShadow = true;
    rtgGenerator.add(fin);
  }

  // RTG Mounting truss struts
  const strutMat = materials.darkMetal;
  const strutGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8);
  const leftStrut = new THREE.Mesh(strutGeom, strutMat);
  leftStrut.position.set(-0.25, -0.1, 0.15);
  leftStrut.rotation.z = Math.PI / 6;
  const rightStrut = new THREE.Mesh(strutGeom, strutMat);
  rightStrut.position.set(0.25, -0.1, 0.15);
  rightStrut.rotation.z = -Math.PI / 6;
  rtgGenerator.add(leftStrut, rightStrut);

  // ==========================================
  // 3. HIGH GAIN ANTENNA DISH & UHF OMNI
  // ==========================================
  const antennaDish = new THREE.Group();
  antennaDish.name = 'HighGainAntenna';
  antennaDish.position.set(0.38, 0.3, -0.5);
  chassis.add(antennaDish);
  registerExplode(antennaDish, new THREE.Vector3(0.5, 1, -0.5));

  // Gimbal mount base
  const antBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 12), materials.secondary);
  antennaDish.add(antBase);

  // Parabolic Hex dish
  const dishMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.05, 0.07, 24, 1, true), materials.primary);
  dishMesh.position.set(0, 0.12, 0);
  dishMesh.rotation.x = -Math.PI / 5;
  dishMesh.rotation.y = Math.PI / 4;
  dishMesh.castShadow = true;
  antennaDish.add(dishMesh);

  // Subreflector feed horn pin
  const feedHorn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 12), materials.accent);
  feedHorn.position.set(0.04, 0.18, 0.04);
  feedHorn.rotation.x = -Math.PI / 5;
  antennaDish.add(feedHorn);

  // Low Gain UHF helical antenna cylinder on opposite side
  const uhfBase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 12), materials.primary);
  uhfBase.position.set(-0.4, 0.5, -0.6);
  const uhfTop = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), materials.accent);
  uhfTop.position.set(-0.4, 0.72, -0.6);
  chassis.add(uhfBase, uhfTop);

  // ==========================================
  // 4. REMOTE SENSING MAST (MASTCAM / SUPERCAM)
  // ==========================================
  const mastBase = new THREE.Group();
  mastBase.name = 'RemoteSensingMast';
  mastBase.position.set(0.32, 0.3, 0.65);
  chassis.add(mastBase);
  registerExplode(mastBase, new THREE.Vector3(0.3, 1, 0.5));

  // Mast vertical telescoping column
  const mastColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.85, 16), materials.primary);
  mastColumn.position.set(0, 0.425, 0);
  mastColumn.castShadow = true;
  mastBase.add(mastColumn);

  // Cable guide and bracing rings
  for (let i = 1; i <= 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.008, 8, 16), materials.darkMetal);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, i * 0.22, 0);
    mastBase.add(ring);
  }

  // Mast Head (Azimuth & Elevation pivot)
  const mastHead = new THREE.Group();
  mastHead.name = 'MastCamHead';
  mastHead.position.set(0, 0.88, 0);
  mastBase.add(mastHead);

  // Head camera enclosure
  const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.22), materials.primary);
  headBox.castShadow = true;
  mastHead.add(headBox);

  // SuperCam central large circular telescope lens
  const superCamLens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 24), materials.lensGlass);
  superCamLens.rotation.x = Math.PI / 2;
  superCamLens.position.set(0, 0.02, 0.12);
  mastHead.add(superCamLens);

  // Stereo Mastcam lenses (left and right of SuperCam)
  const leftMastCam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), materials.lensGlass);
  leftMastCam.rotation.x = Math.PI / 2;
  leftMastCam.position.set(-0.09, -0.01, 0.12);

  const rightMastCam = leftMastCam.clone();
  rightMastCam.position.set(0.09, -0.01, 0.12);
  mastHead.add(leftMastCam, rightMastCam);

  // Navcam top stereo eyes
  const navCamGeom = new THREE.BoxGeometry(0.2, 0.04, 0.04);
  const navCam = new THREE.Mesh(navCamGeom, materials.secondary);
  navCam.position.set(0, 0.1, 0.05);
  mastHead.add(navCam);

  // Laser beam mesh (pulsed ChemCam/SuperCam laser shot effect)
  const laserGeom = new THREE.CylinderGeometry(0.015, 0.015, 12, 8);
  laserGeom.rotateX(Math.PI / 2);
  const laserMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0,
  });
  const laserBeam = new THREE.Mesh(laserGeom, laserMat);
  laserBeam.position.set(0, 0.02, 6.12);
  mastHead.add(laserBeam);

  // ==========================================
  // 5. ARTICULATED ROBOTIC SCIENCE ARM
  // ==========================================
  const armGroup = new THREE.Group();
  armGroup.name = 'RoboticArmGroup';
  armGroup.position.set(-0.45, 0.1, 0.85); // Front-left chassis corner mount
  chassis.add(armGroup);
  registerExplode(armGroup, new THREE.Vector3(-1, 0.5, 0.5));

  // Arm Shoulder azimuth turret
  const armShoulder = new THREE.Group();
  armShoulder.name = 'ArmShoulder';
  armGroup.add(armShoulder);

  const shoulderBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 16), materials.secondary);
  shoulderBase.castShadow = true;
  armShoulder.add(shoulderBase);

  // Upper arm boom
  const armUpper = new THREE.Group();
  armUpper.name = 'ArmUpper';
  armUpper.position.set(0, 0.06, 0);
  armShoulder.add(armUpper);

  const upperBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.65, 16), materials.primary);
  upperBoom.position.set(0, 0.325, 0);
  upperBoom.castShadow = true;
  armUpper.add(upperBoom);

  // Forearm boom
  const armFore = new THREE.Group();
  armFore.name = 'ArmFore';
  armFore.position.set(0, 0.65, 0);
  armUpper.add(armFore);

  const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), materials.secondary);
  armFore.add(elbowJoint);

  const foreBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.6, 16), materials.primary);
  foreBoom.position.set(0, 0.3, 0);
  foreBoom.castShadow = true;
  armFore.add(foreBoom);

  // Wrist assembly
  const armWrist = new THREE.Group();
  armWrist.name = 'ArmWrist';
  armWrist.position.set(0, 0.6, 0);
  armFore.add(armWrist);

  const wristJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 16), materials.secondary);
  wristJoint.rotation.z = Math.PI / 2;
  armWrist.add(wristJoint);

  // Turret Tool Head (Core drill, spectrometer, dusting tool)
  const armTurret = new THREE.Group();
  armTurret.name = 'ArmTurret';
  armTurret.position.set(0, 0.06, 0);
  armWrist.add(armTurret);

  const turretHousing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.22), materials.secondary);
  turretHousing.castShadow = true;
  armTurret.add(turretHousing);

  // Rotary percussive coring drill
  const drillHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 16), materials.darkMetal);
  drillHousing.position.set(0, 0, 0.14);
  drillHousing.rotation.x = Math.PI / 2;
  armTurret.add(drillHousing);

  // Drill bit
  const drillBit = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.005, 0.12, 12), materials.accent);
  drillBit.position.set(0, 0, 0.26);
  drillBit.rotation.x = Math.PI / 2;
  armTurret.add(drillBit);

  // PIXL / SHERLOC optical spectrometer sensor
  const specLens = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 16), materials.lensGlass);
  specLens.position.set(0.06, -0.06, 0.1);
  specLens.rotation.x = Math.PI / 2;
  armTurret.add(specLens);

  // Set initial stowed pose
  applyArmPose(armShoulder, armUpper, armFore, armWrist, armTurret, 'stowed');

  // ==========================================
  // 6. ROCKER-BOGIE 6-WHEEL SUSPENSION SYSTEM
  // ==========================================
  // Real Curiosity/Perseverance rocker-bogie kinematics:
  // - Main differential rocker pivot on left & right chassis walls (y=0, z=-0.1)
  // - Forward arm connects to Front Wheel
  // - Rear arm connects to Bogie Pivot
  // - Bogie carries Middle and Rear wheels

  const wheels: THREE.Group[] = [];
  const steerPivots: (THREE.Group | null)[] = [null, null, null, null, null, null];

  // Helper to build a single high-fidelity Mars Rover wheel
  function buildRoverWheel(isLeft: boolean): THREE.Group {
    const wheelGroup = new THREE.Group();
    wheelGroup.name = `RoverWheel_${isLeft ? 'Left' : 'Right'}`;

    const wheelRadius = 0.26;
    const wheelWidth = 0.24;

    // Outer cylindrical machined aluminum shell
    const rimGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24, 1, true);
    rimGeom.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeom, materials.wheel);
    rimMesh.castShadow = true;
    wheelGroup.add(rimMesh);

    // Chevron / Curved Traction Cleats (Grousers) along circumference
    const cleatCount = 16;
    const cleatGeom = new THREE.BoxGeometry(wheelWidth * 0.9, 0.018, 0.02);
    for (let i = 0; i < cleatCount; i++) {
      const angle = (i / cleatCount) * Math.PI * 2;
      const cleat = new THREE.Mesh(cleatGeom, materials.wheel);
      cleat.position.set(
        0,
        Math.cos(angle) * (wheelRadius + 0.009),
        Math.sin(angle) * (wheelRadius + 0.009)
      );
      cleat.rotation.x = -angle;
      cleat.rotation.y = (i % 2 === 0 ? 0.08 : -0.08); // slight chevron slant
      wheelGroup.add(cleat);
    }

    // Curved titanium spring spokes inside rim
    const spokeCount = 6;
    const spokeGeom = new THREE.CylinderGeometry(0.008, 0.008, wheelRadius * 0.9, 8);
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeom, materials.darkMetal);
      spoke.position.set(
        (isLeft ? -1 : 1) * 0.02,
        Math.cos(angle) * (wheelRadius * 0.45),
        Math.sin(angle) * (wheelRadius * 0.45)
      );
      spoke.rotation.x = -angle;
      spoke.rotation.z = (isLeft ? 0.2 : -0.2); // curved dish shape
      wheelGroup.add(spoke);
    }

    // Central hub drive motor casing & planetary gear cap
    const hubMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, wheelWidth + 0.04, 16), materials.darkMetal);
    hubMotor.rotation.z = Math.PI / 2;
    hubMotor.castShadow = true;
    wheelGroup.add(hubMotor);

    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), materials.accent);
    hubCap.rotation.z = Math.PI / 2;
    hubCap.position.set((isLeft ? -1 : 1) * (wheelWidth / 2 + 0.02), 0, 0);
    wheelGroup.add(hubCap);

    return wheelGroup;
  }

  // --- Left Suspension Side ---
  const rockerLeft = new THREE.Group();
  rockerLeft.name = 'RockerLeft';
  rockerLeft.position.set(-0.62, -0.05, 0.1);
  chassis.add(rockerLeft);
  registerExplode(rockerLeft, new THREE.Vector3(-1, 0, 0));

  // Left Rocker Main Pivot Tube & Tubes
  const rockerLeftPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 16), materials.secondary);
  rockerLeftPivot.rotation.z = Math.PI / 2;
  rockerLeft.add(rockerLeftPivot);

  // Front Rocker Arm reaching forward to Front-Left Wheel
  const flArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.95, 12), materials.primary);
  flArm.position.set(-0.15, -0.25, 0.42);
  flArm.rotation.x = -Math.PI / 4.8;
  flArm.rotation.y = 0.15;
  flArm.castShadow = true;
  rockerLeft.add(flArm);

  // Front-Left Steering Pivot
  const steerFL = new THREE.Group();
  steerFL.name = 'SteerFL';
  steerFL.position.set(-0.35, -0.48, 0.78);
  rockerLeft.add(steerFL);
  steerPivots[0] = steerFL;

  const steerFLActuator = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16), materials.secondary);
  steerFL.add(steerFLActuator);

  const wheelFL = buildRoverWheel(true);
  wheelFL.name = 'Wheel_FrontLeft';
  wheelFL.position.set(-0.12, -0.06, 0);
  steerFL.add(wheelFL);
  wheels[0] = wheelFL;

  // Rear Rocker Arm reaching down to Bogie Pivot
  const rlArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.65, 12), materials.primary);
  rlArm.position.set(-0.12, -0.2, -0.32);
  rlArm.rotation.x = Math.PI / 5;
  rlArm.rotation.y = -0.1;
  rlArm.castShadow = true;
  rockerLeft.add(rlArm);

  // Bogie Left Pivot Joint
  const bogieLeft = new THREE.Group();
  bogieLeft.name = 'BogieLeft';
  bogieLeft.position.set(-0.25, -0.38, -0.55);
  rockerLeft.add(bogieLeft);

  const bogieLeftPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 16), materials.secondary);
  bogieLeftPivot.rotation.z = Math.PI / 2;
  bogieLeft.add(bogieLeftPivot);

  // Mid-Left Wheel (attached to forward arm of bogie)
  const mlArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.48, 12), materials.primary);
  mlArm.position.set(-0.06, -0.06, 0.22);
  mlArm.rotation.x = -Math.PI / 6;
  bogieLeft.add(mlArm);

  const wheelML = buildRoverWheel(true);
  wheelML.name = 'Wheel_MidLeft';
  wheelML.position.set(-0.22, -0.16, 0.42);
  bogieLeft.add(wheelML);
  wheels[1] = wheelML;

  // Rear-Left Wheel (attached to rear arm of bogie with steering actuator)
  const rlBogieArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.52, 12), materials.primary);
  rlBogieArm.position.set(-0.06, -0.06, -0.25);
  rlBogieArm.rotation.x = Math.PI / 5.5;
  bogieLeft.add(rlBogieArm);

  const steerRL = new THREE.Group();
  steerRL.name = 'SteerRL';
  steerRL.position.set(-0.1, -0.16, -0.48);
  bogieLeft.add(steerRL);
  steerPivots[2] = steerRL;

  const steerRLActuator = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16), materials.secondary);
  steerRL.add(steerRLActuator);

  const wheelRL = buildRoverWheel(true);
  wheelRL.name = 'Wheel_RearLeft';
  wheelRL.position.set(-0.12, 0, 0);
  steerRL.add(wheelRL);
  wheels[2] = wheelRL;

  // --- Right Suspension Side (Mirror) ---
  const rockerRight = new THREE.Group();
  rockerRight.name = 'RockerRight';
  rockerRight.position.set(0.62, -0.05, 0.1);
  chassis.add(rockerRight);
  registerExplode(rockerRight, new THREE.Vector3(1, 0, 0));

  const rockerRightPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 16), materials.secondary);
  rockerRightPivot.rotation.z = Math.PI / 2;
  rockerRight.add(rockerRightPivot);

  // Front Rocker Arm reaching forward to Front-Right Wheel
  const frArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.95, 12), materials.primary);
  frArm.position.set(0.15, -0.25, 0.42);
  frArm.rotation.x = -Math.PI / 4.8;
  frArm.rotation.y = -0.15;
  frArm.castShadow = true;
  rockerRight.add(frArm);

  // Front-Right Steering Pivot
  const steerFR = new THREE.Group();
  steerFR.name = 'SteerFR';
  steerFR.position.set(0.35, -0.48, 0.78);
  rockerRight.add(steerFR);
  steerPivots[3] = steerFR;

  const steerFRActuator = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16), materials.secondary);
  steerFR.add(steerFRActuator);

  const wheelFR = buildRoverWheel(false);
  wheelFR.name = 'Wheel_FrontRight';
  wheelFR.position.set(0.12, -0.06, 0);
  steerFR.add(wheelFR);
  wheels[3] = wheelFR;

  // Rear Rocker Arm reaching down to Bogie Pivot
  const rrArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.65, 12), materials.primary);
  rrArm.position.set(0.12, -0.2, -0.32);
  rrArm.rotation.x = Math.PI / 5;
  rrArm.rotation.y = 0.1;
  rrArm.castShadow = true;
  rockerRight.add(rrArm);

  // Bogie Right Pivot Joint
  const bogieRight = new THREE.Group();
  bogieRight.name = 'BogieRight';
  bogieRight.position.set(0.25, -0.38, -0.55);
  rockerRight.add(bogieRight);

  const bogieRightPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 16), materials.secondary);
  bogieRightPivot.rotation.z = Math.PI / 2;
  bogieRight.add(bogieRightPivot);

  // Mid-Right Wheel
  const mrArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.48, 12), materials.primary);
  mrArm.position.set(0.06, -0.06, 0.22);
  mrArm.rotation.x = -Math.PI / 6;
  bogieRight.add(mrArm);

  const wheelMR = buildRoverWheel(false);
  wheelMR.name = 'Wheel_MidRight';
  wheelMR.position.set(0.22, -0.16, 0.42);
  bogieRight.add(wheelMR);
  wheels[4] = wheelMR;

  // Rear-Right Wheel with steering actuator
  const rrBogieArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.52, 12), materials.primary);
  rrBogieArm.position.set(0.06, -0.06, -0.25);
  rrBogieArm.rotation.x = Math.PI / 5.5;
  bogieRight.add(rrBogieArm);

  const steerRR = new THREE.Group();
  steerRR.name = 'SteerRR';
  steerRR.position.set(0.1, -0.16, -0.48);
  bogieRight.add(steerRR);
  steerPivots[5] = steerRR;

  const steerRRActuator = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16), materials.secondary);
  steerRR.add(steerRRActuator);

  const wheelRR = buildRoverWheel(false);
  wheelRR.name = 'Wheel_RearRight';
  wheelRR.position.set(0.12, 0, 0);
  steerRR.add(wheelRR);
  wheels[5] = wheelRR;

  // Differential cross-bar over the top linking left and right rockers
  const diffBar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.35, 16), materials.secondary);
  diffBar.rotation.z = Math.PI / 2;
  diffBar.position.set(0, 0.32, 0.1);
  chassis.add(diffBar);

  const nodes: RoverNodes = {
    root,
    chassis,
    mastBase,
    mastHead,
    laserBeam,
    headlights,
    armGroup,
    armShoulder,
    armUpper,
    armFore,
    armWrist,
    armTurret,
    drillBit,
    antennaDish,
    rtgGenerator,
    rockerLeft,
    rockerRight,
    bogieLeft,
    bogieRight,
    wheels,
    steerPivots,
    explodeNodes,
  };

  function updateSkin(newSkinId: string) {
    const skin = ROVER_SKINS[newSkinId] || ROVER_SKINS.nasa_classic;
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

// Function to animate the robotic arm smoothly into designated operational poses
export function applyArmPose(
  shoulder: THREE.Group,
  upper: THREE.Group,
  fore: THREE.Group,
  wrist: THREE.Group,
  turret: THREE.Group,
  pose: ArmPose
) {
  switch (pose) {
    case 'stowed':
      shoulder.rotation.set(0, 0, 0);
      upper.rotation.set(-Math.PI / 2.3, 0, 0.3);
      fore.rotation.set(Math.PI / 1.3, 0, 0);
      wrist.rotation.set(-Math.PI / 2.8, 0, 0);
      turret.rotation.set(0, 0, 0);
      break;
    case 'sample':
      shoulder.rotation.set(0, 0.4, 0);
      upper.rotation.set(-Math.PI / 3, 0, 0.2);
      fore.rotation.set(-Math.PI / 3.5, 0, 0);
      wrist.rotation.set(Math.PI / 4, 0, 0);
      turret.rotation.set(Math.PI / 2, 0, 0);
      break;
    case 'scan':
      shoulder.rotation.set(0, 0.8, 0);
      upper.rotation.set(-0.2, 0, 0);
      fore.rotation.set(-0.4, 0, 0);
      wrist.rotation.set(0.3, 0, 0);
      turret.rotation.set(0, 0.5, 0);
      break;
    case 'selfie':
      shoulder.rotation.set(0, -0.6, 0);
      upper.rotation.set(0.6, 0, -0.3);
      fore.rotation.set(0.8, 0, 0);
      wrist.rotation.set(0.4, 0, 0);
      turret.rotation.set(-Math.PI / 2, 0, 0.5);
      break;
  }
}
