import * as THREE from 'three';
import { ScienceSamplePoint } from '../types';

export interface PlanetaryEnvironment {
  terrainMesh: THREE.Mesh;
  rocksGroup: THREE.Group;
  samplesGroup: THREE.Group;
  samplePoints: ScienceSamplePoint[];
  getTerrainHeight: (x: number, z: number) => number;
  sampleMarkers: { id: string; marker: THREE.Group }[];
  skyColor: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  groundFeatureGroup?: THREE.Group;
}

export function createLunarEnvironment(scene: THREE.Scene): PlanetaryEnvironment {
  const TERRAIN_SIZE = 280;
  const TERRAIN_SEGMENTS = 140;

  // Multi-frequency procedural heightmap of the lunar surface (highlands + craters)
  function getTerrainHeight(x: number, z: number): number {
    const distFromOrigin = Math.sqrt(x * x + z * z);
    const originDamping = Math.min(1.0, Math.max(0.1, (distFromOrigin - 5) / 25));

    // Rolling lunar maria undulations
    const wave1 = Math.sin(x * 0.03 + z * 0.025) * 2.2;
    const wave2 = Math.cos(x * 0.06 - z * 0.045) * 1.4;
    const fineRegolith = Math.sin(x * 0.22 + z * 0.18) * 0.22;

    // Hadley Rille / Large Crater 1 at (x: 40, z: 25)
    const dx1 = x - 40;
    const dz1 = z - 25;
    const d1 = Math.sqrt(dx1 * dx1 + dz1 * dz1);
    let crater1 = 0;
    if (d1 < 26) {
      const norm = d1 / 26;
      crater1 = -4.5 * Math.cos(norm * (Math.PI / 2)) + (d1 > 16 ? 1.6 * Math.sin(((d1 - 16) / 10) * Math.PI) : 0);
    }

    // Cone Crater at (x: -45, z: -35)
    const dx2 = x + 45;
    const dz2 = z + 35;
    const d2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
    let crater2 = 0;
    if (d2 < 20) {
      const norm2 = d2 / 20;
      crater2 = -3.2 * Math.cos(norm2 * (Math.PI / 2)) + (d2 > 12 ? 1.1 * Math.sin(((d2 - 12) / 8) * Math.PI) : 0);
    }

    // Small crater at (x: -15, z: 42)
    const dx3 = x + 15;
    const dz3 = z - 42;
    const d3 = Math.sqrt(dx3 * dx3 + dz3 * dz3);
    let crater3 = 0;
    if (d3 < 12) {
      crater3 = -1.8 * Math.cos((d3 / 12) * (Math.PI / 2));
    }

    return (wave1 + wave2 + fineRegolith) * originDamping + crater1 + crater2 + crater3;
  }

  // Create terrain plane geometry
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position;
  const colors: number[] = [];

  // Authentic lunar regolith shades (monochrome charcoal, ash gray, and bright anorthosite dust)
  const darkMare = new THREE.Color(0x3a3c42);
  const midRegolith = new THREE.Color(0x686c75);
  const highlandWhite = new THREE.Color(0xa2a8b3);

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = getTerrainHeight(vx, vz);
    posAttr.setY(i, vy);

    const factor = Math.min(1, Math.max(0, (vy + 5) / 10));
    const vertexColor = darkMare.clone().lerp(factor > 0.5 ? highlandWhite : midRegolith, Math.abs(factor - 0.5) * 2);
    colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0.05,
    flatShading: true,
  });

  const terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
  terrainMesh.name = 'LunarRegolithTerrain';
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // Lunar Boulders & Anorthosite rocks
  const rocksGroup = new THREE.Group();
  rocksGroup.name = 'LunarRocks';
  scene.add(rocksGroup);

  const lunarRockMat = new THREE.MeshStandardMaterial({
    color: 0x585c64,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });

  const rockGeometries = [
    new THREE.DodecahedronGeometry(1, 1),
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.BoxGeometry(1.2, 0.8, 1.1),
  ];

  const ROCK_COUNT = 75;
  for (let i = 0; i < ROCK_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 8 + Math.random() * (TERRAIN_SIZE * 0.44);
    const rx = Math.cos(angle) * distance;
    const rz = Math.sin(angle) * distance;
    const ry = getTerrainHeight(rx, rz);

    const rockGeom = rockGeometries[i % rockGeometries.length];
    const rockMesh = new THREE.Mesh(rockGeom, lunarRockMat);
    const scale = 0.35 + Math.random() * 1.8;
    rockMesh.scale.set(scale * (0.8 + Math.random() * 0.4), scale * (0.5 + Math.random() * 0.6), scale * (0.8 + Math.random() * 0.4));
    rockMesh.position.set(rx, ry + scale * 0.25, rz);
    rockMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    rocksGroup.add(rockMesh);
  }

  // Apollo 15/17 Historic Landing Site Landmarks:
  // 1. Lunar Module (LM) Descent Stage
  // 2. American Flag on wire crossbar
  const groundFeatureGroup = new THREE.Group();
  groundFeatureGroup.name = 'ApolloHistoricLandmarks';

  // Apollo Lunar Module Descent Stage at (x: 14, z: -16)
  const lmX = 14;
  const lmZ = -16;
  const lmY = getTerrainHeight(lmX, lmZ);

  const lmStage = new THREE.Group();
  lmStage.position.set(lmX, lmY + 1.2, lmZ);

  // Octagonal gold-foil descent stage body
  const lmBodyGeom = new THREE.CylinderGeometry(2.4, 2.6, 1.6, 8);
  const lmGoldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.25,
    metalness: 0.9,
  });
  const lmBody = new THREE.Mesh(lmBodyGeom, lmGoldFoilMat);
  lmBody.castShadow = true;
  lmStage.add(lmBody);

  // 4 Landing Gear Legs with footpads
  const legMat = new THREE.MeshStandardMaterial({ color: 0x8c9099, roughness: 0.4, metalness: 0.8 });
  [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach((legAngle) => {
    const legStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), legMat);
    legStrut.position.set(Math.cos(legAngle) * 2.4, -0.6, Math.sin(legAngle) * 2.4);
    legStrut.rotation.z = Math.PI / 4 * (legAngle < Math.PI ? -1 : 1);
    const footpad = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 16), lmGoldFoilMat);
    footpad.position.set(Math.cos(legAngle) * 3.4, -1.2, Math.sin(legAngle) * 3.4);
    lmStage.add(legStrut, footpad);
  });

  groundFeatureGroup.add(lmStage);

  // American Flag on wire crossbar at (x: 7, z: -8)
  const flagX = 7;
  const flagZ = -8;
  const flagY = getTerrainHeight(flagX, flagZ);
  const flagGroup = new THREE.Group();
  flagGroup.position.set(flagX, flagY, flagZ);

  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8), legMat);
  flagPole.position.y = 1.1;
  const flagBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 8), legMat);
  flagBar.rotation.z = Math.PI / 2;
  flagBar.position.set(0.5, 2.1, 0);

  // Flag cloth
  const flagClothMat = new THREE.MeshStandardMaterial({
    color: 0xcc2229,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const flagCloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), flagClothMat);
  flagCloth.position.set(0.48, 1.8, 0);
  flagGroup.add(flagPole, flagBar, flagCloth);

  groundFeatureGroup.add(flagGroup);
  scene.add(groundFeatureGroup);

  // Historic Apollo Lunar Science Targets
  const samplePoints: ScienceSamplePoint[] = [
    {
      id: 'sample-apollo-1',
      name: 'Apollo 15 Genesis Rock',
      type: 'Anorthosite Genesis Rock',
      position: [18, getTerrainHeight(18, 16), 16],
      collected: false,
      discovered: false,
      analysisText: 'Primeval anorthosite 4.1 billion years old, confirming early molten lunar magma ocean differentiation.',
    },
    {
      id: 'sample-apollo-2',
      name: 'Shorty Crater Pyroclastic Glass',
      type: 'Orange Pyroclastic Glass',
      position: [-26, getTerrainHeight(-26, 22), 22],
      collected: false,
      discovered: false,
      analysisText: 'Vitreous beads ejected during ancient lunar explosive volcanism, bearing interior volatile water signatures.',
    },
    {
      id: 'sample-apollo-3',
      name: 'Hadley Rille Vesicular Basalt',
      type: 'Vesicular Basalt Fragment',
      position: [36, getTerrainHeight(36, -30), -30],
      collected: false,
      discovered: false,
      analysisText: 'Porous volcanic lava crust formed in the floor of a massive collapsed subterranean lava tube.',
    },
    {
      id: 'sample-apollo-4',
      name: 'Cone Crater Impact Melt',
      type: 'Impact Melt Breccia',
      position: [-42, getTerrainHeight(-42, -28), -28],
      collected: false,
      discovered: false,
      analysisText: 'Shock-metamorphosed multi-ring basin ejecta revealing deep mantle fragments excavating the lunar crust.',
    },
  ];

  const samplesGroup = new THREE.Group();
  samplesGroup.name = 'LunarScienceSamples';
  scene.add(samplesGroup);

  const sampleMarkers: { id: string; marker: THREE.Group }[] = [];

  samplePoints.forEach((pt) => {
    const markerGroup = new THREE.Group();
    markerGroup.name = `SampleBeacon_${pt.id}`;
    markerGroup.position.set(pt.position[0], pt.position[1], pt.position[2]);

    // Holographic diamond / beacon floating above sample
    const beaconGeom = new THREE.OctahedronGeometry(0.5, 0);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
    });
    const beacon = new THREE.Mesh(beaconGeom, beaconMat);
    beacon.position.y = 1.6;
    beacon.name = 'BeaconMesh';
    markerGroup.add(beacon);

    // Glowing target ring on the ground
    const ringGeom = new THREE.RingGeometry(0.8, 1.1, 24);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.y = 0.08;
    markerGroup.add(ring);

    // Science target rock formation
    const targetRock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.65, 1),
      new THREE.MeshStandardMaterial({
        color: 0x8f95a0,
        roughness: 0.7,
        metalness: 0.25,
      })
    );
    targetRock.position.y = 0.25;
    targetRock.castShadow = true;
    markerGroup.add(targetRock);

    samplesGroup.add(markerGroup);
    sampleMarkers.push({ id: pt.id, marker: markerGroup });
  });

  return {
    terrainMesh,
    rocksGroup,
    samplesGroup,
    samplePoints,
    getTerrainHeight,
    sampleMarkers,
    groundFeatureGroup,
    skyColor: new THREE.Color(0x020306), // Deep vacuum black
    fogColor: new THREE.Color(0x020306),
    fogDensity: 0.0035, // Very light vacuum falloff
    sunColor: new THREE.Color(0xffffff), // Harsh unfiltered direct sunlight
    sunIntensity: 3.2,
  };
}
