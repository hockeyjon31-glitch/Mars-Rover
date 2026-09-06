import * as THREE from 'three';
import { ScienceSamplePoint } from '../types';

export interface MartianEnvironment {
  terrainMesh: THREE.Mesh;
  rocksGroup: THREE.Group;
  samplesGroup: THREE.Group;
  samplePoints: ScienceSamplePoint[];
  getTerrainHeight: (x: number, z: number) => number;
  sampleMarkers: { id: string; marker: THREE.Group }[];
}

export function createMartianTerrain(scene: THREE.Scene): MartianEnvironment {
  const TERRAIN_SIZE = 260;
  const TERRAIN_SEGMENTS = 140;

  // Multi-frequency procedural heightmap
  function getTerrainHeight(x: number, z: number): number {
    // Keep central area smooth for initial spawn
    const distFromOrigin = Math.sqrt(x * x + z * z);
    const originDamping = Math.min(1.0, Math.max(0.15, (distFromOrigin - 6) / 25));

    // Base dunes
    const dune1 = Math.sin(x * 0.035 + z * 0.02) * 1.8;
    const dune2 = Math.cos(x * 0.07 - z * 0.05) * 1.1;
    const ripples = Math.sin(x * 0.25 + z * 0.15) * 0.25;

    // Crater at (x: 35, z: 25, radius: 18)
    const dx1 = x - 35;
    const dz1 = z - 25;
    const distCrater1 = Math.sqrt(dx1 * dx1 + dz1 * dz1);
    let crater1 = 0;
    if (distCrater1 < 22) {
      const normDist = distCrater1 / 22;
      // Bowl depression with raised rim
      crater1 = -3.5 * Math.cos(normDist * (Math.PI / 2)) + (distCrater1 > 14 ? 1.2 * Math.sin((distCrater1 - 14) / 8 * Math.PI) : 0);
    }

    // Crater 2 at (x: -45, z: -35, radius: 14)
    const dx2 = x + 45;
    const dz2 = z + 35;
    const distCrater2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
    let crater2 = 0;
    if (distCrater2 < 18) {
      const normDist = distCrater2 / 18;
      crater2 = -2.6 * Math.cos(normDist * (Math.PI / 2));
    }

    return (dune1 + dune2 + ripples) * originDamping + crater1 + crater2;
  }

  // Create terrain plane geometry
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position;
  const colors: number[] = [];

  // Vertex colors for sand dunes vs exposed rock layers
  const baseColor = new THREE.Color(0xb5512b); // Rich Martian red
  const sandColor = new THREE.Color(0xd67243); // Lighter sand drift
  const darkRockColor = new THREE.Color(0x6e2c14); // Dark basaltic iron oxide

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = getTerrainHeight(vx, vz);
    posAttr.setY(i, vy);

    // Color gradient based on slope / height
    const factor = Math.min(1, Math.max(0, (vy + 4) / 8));
    const vertexColor = baseColor.clone().lerp(factor > 0.6 ? sandColor : darkRockColor, Math.abs(factor - 0.5) * 1.5);
    colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  // Terrain material with vertex colors and subtle roughness
  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.08,
    flatShading: true,
  });

  const terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
  terrainMesh.name = 'MartianTerrain';
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // Scatter Basalt Boulders across the landscape
  const rocksGroup = new THREE.Group();
  rocksGroup.name = 'MartianRocks';
  scene.add(rocksGroup);

  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x542617,
    roughness: 0.88,
    metalness: 0.15,
    flatShading: true,
  });

  const rockGeometries = [
    new THREE.DodecahedronGeometry(1, 1),
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.BoxGeometry(1.2, 0.8, 1.1),
  ];

  // Distribute rocks avoiding center spawn
  const ROCK_COUNT = 65;
  for (let i = 0; i < ROCK_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 8 + Math.random() * (TERRAIN_SIZE * 0.42);
    const rx = Math.cos(angle) * distance;
    const rz = Math.sin(angle) * distance;
    const ry = getTerrainHeight(rx, rz);

    const rockGeom = rockGeometries[i % rockGeometries.length];
    const rockMesh = new THREE.Mesh(rockGeom, rockMaterial);

    const scale = 0.4 + Math.random() * 1.6;
    rockMesh.scale.set(scale * (0.8 + Math.random() * 0.4), scale * (0.5 + Math.random() * 0.6), scale * (0.8 + Math.random() * 0.4));
    rockMesh.position.set(rx, ry + scale * 0.25, rz);
    rockMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    rocksGroup.add(rockMesh);
  }

  // Science Target Waypoints / Sample collection sites
  const samplePoints: ScienceSamplePoint[] = [
    {
      id: 'sample-1',
      name: 'Delta Clay Deposit',
      type: 'Silica Hydrate',
      position: [16, getTerrainHeight(16, 12), 12],
      collected: false,
      discovered: false,
      analysisText: 'Aqueous phyllosilicate layers indicative of an ancient sustained lacustrine (lakebed) environment.',
    },
    {
      id: 'sample-2',
      name: 'Belva Crater Outcrop',
      type: 'Hematite Spherules',
      position: [-22, getTerrainHeight(-22, 20), 20],
      collected: false,
      discovered: false,
      analysisText: 'Concretions ("Martian Blueberries") formed through mineral-rich groundwater percolation billions of years ago.',
    },
    {
      id: 'sample-3',
      name: 'Kodiak Butte Basalt',
      type: 'Basaltic Regolith',
      position: [34, getTerrainHeight(34, -28), -28],
      collected: false,
      discovered: false,
      analysisText: 'Igneous olivine-bearing rock unit from primeval volcanic outpourings, ideal for radiometric dating.',
    },
    {
      id: 'sample-4',
      name: 'Neretva Ancient Fan',
      type: 'Organic Carbon Candidate',
      position: [-38, getTerrainHeight(-38, -32), -32],
      collected: false,
      discovered: false,
      analysisText: 'Precipitated carbonaceous signatures encased within hydrothermal carbonate veins.',
    },
  ];

  const samplesGroup = new THREE.Group();
  samplesGroup.name = 'ScienceSamples';
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
    const targetRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), new THREE.MeshStandardMaterial({
      color: 0x8a3a20,
      roughness: 0.7,
      metalness: 0.3,
    }));
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
  };
}
