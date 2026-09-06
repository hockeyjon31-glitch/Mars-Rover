import * as THREE from 'three';
import { RoverGameControls, RoverTelemetry } from '../types';
import { RoverNodes } from './RoverModel';

export class RoverPhysicsController {
  private nodes: RoverNodes;
  private getTerrainHeight: (x: number, z: number) => number;

  // Position & Velocity
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public yaw: number = 0; // heading angle in radians
  public speed: number = 0; // m/s
  public steerAngle: number = 0; // current steering angle
  public distanceTraveled: number = 0;
  public batteryPct: number = 100;

  // Dynamic parameters
  private readonly MAX_SPEED = 6.2; // ~22 km/h arcade speed (real rovers are ~0.14 km/h, arcade tuned for game fun!)
  private readonly REVERSE_MAX = -3.5;
  private readonly ACCELERATION = 4.2;
  private readonly BRAKING = 7.5;
  private readonly DRAG = 2.2;
  private readonly MAX_STEER = 0.58; // ~33 degrees
  private readonly STEER_SPEED = 2.8;
  private readonly WHEEL_RADIUS = 0.26;

  // Dust Particle System
  private dustParticles: THREE.Points;
  private dustPositions: Float32Array;
  private dustVelocities: THREE.Vector3[];
  private dustLifetimes: Float32Array;
  private maxDust = 150;

  constructor(nodes: RoverNodes, scene: THREE.Scene, getTerrainHeight: (x: number, z: number) => number) {
    this.nodes = nodes;
    this.getTerrainHeight = getTerrainHeight;

    // Initialize initial position on ground
    const initY = getTerrainHeight(0, 0);
    this.position.set(0, initY + 0.55, 0);
    this.nodes.root.position.copy(this.position);

    // Build tire dust particle system
    const dustGeom = new THREE.BufferGeometry();
    this.dustPositions = new Float32Array(this.maxDust * 3);
    this.dustLifetimes = new Float32Array(this.maxDust);
    this.dustVelocities = [];

    for (let i = 0; i < this.maxDust; i++) {
      this.dustPositions[i * 3] = 0;
      this.dustPositions[i * 3 + 1] = -100; // start offscreen
      this.dustPositions[i * 3 + 2] = 0;
      this.dustLifetimes[i] = 0;
      this.dustVelocities.push(new THREE.Vector3());
    }

    dustGeom.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0xcd6945,
      size: 0.35,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    this.dustParticles = new THREE.Points(dustGeom, dustMat);
    scene.add(this.dustParticles);
  }

  public update(
    delta: number,
    controls: RoverGameControls,
    isStudioMode: boolean = false
  ): RoverTelemetry {
    if (isStudioMode) {
      // In studio mode, vehicle stays centered
      this.nodes.root.position.set(0, 0, 0);
      this.nodes.root.rotation.set(0, 0, 0);
      return {
        speedKmh: 0,
        speedMs: 0,
        headingDeg: 0,
        pitchDeg: 0,
        rollDeg: 0,
        batteryPct: this.batteryPct,
        powerDrawWatts: 110,
        distanceTraveledMeters: this.distanceTraveled,
        samplesCollected: 0,
        totalSamples: 4,
        isHeadlightsOn: true,
        isDrilling: false,
        isLaserFiring: false,
        mastAzimuth: 0,
        mastElevation: 0,
        driveGear: 'P',
      };
    }

    // --- 1. Process Controls & Acceleration ---
    const topSpeed = controls.boost ? this.MAX_SPEED * 1.5 : this.MAX_SPEED;
    const accel = controls.boost ? this.ACCELERATION * 1.6 : this.ACCELERATION;

    if (controls.pivotTurn) {
      // Zero-radius pivot turn (rover spins in place)
      this.speed = THREE.MathUtils.damp(this.speed, 0, this.BRAKING, delta);
      if (controls.left) {
        this.yaw += 1.2 * delta;
        this.setPivotWheelAngles(true);
      } else if (controls.right) {
        this.yaw -= 1.2 * delta;
        this.setPivotWheelAngles(false);
      } else {
        this.resetSteerAngles(delta);
      }
    } else {
      // Standard driving mode
      if (controls.forward) {
        this.speed = Math.min(topSpeed, this.speed + accel * delta);
      } else if (controls.backward) {
        this.speed = Math.max(this.REVERSE_MAX, this.speed - accel * delta);
      } else {
        // Coasting drag
        if (Math.abs(this.speed) < 0.05) {
          this.speed = 0;
        } else {
          this.speed = THREE.MathUtils.damp(this.speed, 0, this.DRAG, delta);
        }
      }

      if (controls.handbrake) {
        this.speed = THREE.MathUtils.damp(this.speed, 0, this.BRAKING * 2, delta);
      }

      // Steering with Ackermann geometry
      let targetSteer = 0;
      if (controls.left) targetSteer = this.MAX_STEER;
      if (controls.right) targetSteer = -this.MAX_STEER;

      this.steerAngle = THREE.MathUtils.damp(this.steerAngle, targetSteer, this.STEER_SPEED, delta);

      // Turning yaw rate proportional to speed and steer
      if (Math.abs(this.speed) > 0.02) {
        const turnRate = (this.speed / 2.2) * Math.sin(this.steerAngle);
        this.yaw += turnRate * delta;
      }

      // Apply 4-wheel steering angles to Front and Rear steer pivots
      this.applyAckermannSteer(this.steerAngle);
    }

    // Move forward in facing direction
    const forwardDir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const deltaDistance = this.speed * delta;
    this.position.addScaledVector(forwardDir, deltaDistance);
    this.distanceTraveled += Math.abs(deltaDistance);

    // Battery drain
    if (Math.abs(this.speed) > 0.1) {
      this.batteryPct = Math.max(5, this.batteryPct - Math.abs(this.speed) * 0.008 * delta);
    }

    // --- 2. Terrain Sampling & Rocker-Bogie Kinematics ---
    // Sample terrain height at 6 wheel positions
    const rightDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forwardDir).negate();

    // Wheel offsets in local rover frame
    // [FL, ML, RL, FR, MR, RR]
    const wheelOffsets = [
      { x: -1.15, z: 0.88 }, // FL
      { x: -1.05, z: -0.15 }, // ML
      { x: -1.15, z: -1.05 }, // RL
      { x: 1.15, z: 0.88 }, // FR
      { x: 1.05, z: -0.15 }, // MR
      { x: 1.15, z: -1.05 }, // RR
    ];

    const wheelHeights: number[] = [];
    for (let i = 0; i < wheelOffsets.length; i++) {
      const off = wheelOffsets[i];
      const wx = this.position.x + rightDir.x * off.x + forwardDir.x * off.z;
      const wz = this.position.z + rightDir.z * off.x + forwardDir.z * off.z;
      wheelHeights.push(this.getTerrainHeight(wx, wz));
    }

    // Rocker-Bogie heights
    const hFL = wheelHeights[0];
    const hML = wheelHeights[1];
    const hRL = wheelHeights[2];
    const hFR = wheelHeights[3];
    const hMR = wheelHeights[4];
    const hRR = wheelHeights[5];

    // Left & Right side heights
    const avgLeftH = (hFL + hML + hRL) / 3;
    const avgRightH = (hFR + hMR + hRR) / 3;
    const chassisH = (avgLeftH + avgRightH) / 2 + 0.58;

    this.position.y = THREE.MathUtils.lerp(this.position.y, chassisH, 0.25);
    this.nodes.root.position.copy(this.position);

    // Calculate Pitch (front-to-back tilt) and Roll (left-to-right tilt)
    const frontH = (hFL + hFR) / 2;
    const backH = (hRL + hRR) / 2;
    const targetPitch = Math.atan2(frontH - backH, 1.95);
    const targetRoll = Math.atan2(avgRightH - avgLeftH, 2.3);

    // Smoothly orient root rover
    this.nodes.root.rotation.y = this.yaw;
    this.nodes.chassis.rotation.x = THREE.MathUtils.lerp(this.nodes.chassis.rotation.x, -targetPitch, 0.15);
    this.nodes.chassis.rotation.z = THREE.MathUtils.lerp(this.nodes.chassis.rotation.z, targetRoll, 0.15);

    // Articulate Rocker Arms and Bogies based on independent wheel terrain heights
    const leftRockerPitch = Math.atan2(hFL - (hML + hRL) / 2, 1.4);
    const rightRockerPitch = Math.atan2(hFR - (hMR + hRR) / 2, 1.4);

    const leftBogiePitch = Math.atan2(hML - hRL, 0.9);
    const rightBogiePitch = Math.atan2(hMR - hRR, 0.9);

    this.nodes.rockerLeft.rotation.x = THREE.MathUtils.lerp(this.nodes.rockerLeft.rotation.x, -leftRockerPitch * 0.7, 0.2);
    this.nodes.rockerRight.rotation.x = THREE.MathUtils.lerp(this.nodes.rockerRight.rotation.x, -rightRockerPitch * 0.7, 0.2);

    this.nodes.bogieLeft.rotation.x = THREE.MathUtils.lerp(this.nodes.bogieLeft.rotation.x, -leftBogiePitch * 0.6, 0.2);
    this.nodes.bogieRight.rotation.x = THREE.MathUtils.lerp(this.nodes.bogieRight.rotation.x, -rightBogiePitch * 0.6, 0.2);

    // --- 3. Wheel Spin Rotation matching distance moved ---
    const wheelAngleDelta = deltaDistance / this.WHEEL_RADIUS;
    this.nodes.wheels.forEach((wheel, index) => {
      // Left and right wheels spin in appropriate orientation
      const spinDir = index < 3 ? 1 : -1;
      if (controls.pivotTurn && Math.abs(this.yaw) > 0.001) {
        // In pivot turn, left and right wheels turn in opposite directions
        wheel.rotation.x += (controls.left ? 1 : -1) * (index < 3 ? -1 : -1) * 3.5 * delta;
      } else {
        wheel.rotation.x += wheelAngleDelta * spinDir;
      }
    });

    // --- 4. Update Tire Dust Particles ---
    this.updateDustParticles(delta);

    // Determine current drive gear
    let gear: 'P' | 'D' | 'R' | 'PIVOT' = 'D';
    if (controls.pivotTurn) gear = 'PIVOT';
    else if (controls.handbrake) gear = 'P';
    else if (this.speed < -0.2) gear = 'R';
    else gear = 'D';

    return {
      speedKmh: Math.abs(this.speed * 3.6),
      speedMs: Math.abs(this.speed),
      headingDeg: ((THREE.MathUtils.radToDeg(-this.yaw) % 360) + 360) % 360,
      pitchDeg: THREE.MathUtils.radToDeg(targetPitch),
      rollDeg: THREE.MathUtils.radToDeg(targetRoll),
      batteryPct: Math.round(this.batteryPct),
      powerDrawWatts: Math.round(120 + Math.abs(this.speed) * 95 + (controls.boost ? 80 : 0)),
      distanceTraveledMeters: Math.round(this.distanceTraveled),
      samplesCollected: 0,
      totalSamples: 4,
      isHeadlightsOn: true,
      isDrilling: false,
      isLaserFiring: false,
      mastAzimuth: THREE.MathUtils.radToDeg(this.nodes.mastHead.rotation.y),
      mastElevation: THREE.MathUtils.radToDeg(this.nodes.mastHead.rotation.x),
      driveGear: gear,
    };
  }

  private applyAckermannSteer(angle: number) {
    // Front wheels steer towards angle
    if (this.nodes.steerPivots[0]) this.nodes.steerPivots[0]!.rotation.y = angle;
    if (this.nodes.steerPivots[3]) this.nodes.steerPivots[3]!.rotation.y = angle;

    // Rear wheels counter-steer (negative angle) for sharp turning
    if (this.nodes.steerPivots[2]) this.nodes.steerPivots[2]!.rotation.y = -angle * 0.75;
    if (this.nodes.steerPivots[5]) this.nodes.steerPivots[5]!.rotation.y = -angle * 0.75;
  }

  private setPivotWheelAngles(turnLeft: boolean) {
    // In zero-radius pivot turn, all 4 corner wheels angle tangent to circular path (~45 deg)
    const pivotAngle = turnLeft ? 0.78 : -0.78;
    if (this.nodes.steerPivots[0]) this.nodes.steerPivots[0]!.rotation.y = pivotAngle;
    if (this.nodes.steerPivots[3]) this.nodes.steerPivots[3]!.rotation.y = -pivotAngle;
    if (this.nodes.steerPivots[2]) this.nodes.steerPivots[2]!.rotation.y = -pivotAngle;
    if (this.nodes.steerPivots[5]) this.nodes.steerPivots[5]!.rotation.y = pivotAngle;
  }

  private resetSteerAngles(delta: number) {
    this.nodes.steerPivots.forEach((pivot) => {
      if (pivot) {
        pivot.rotation.y = THREE.MathUtils.damp(pivot.rotation.y, 0, 4.0, delta);
      }
    });
  }

  private updateDustParticles(delta: number) {
    const isMoving = Math.abs(this.speed) > 0.5;
    const emitRate = isMoving ? 3 : 0;

    // Emit dust from rear & middle wheels
    let emitted = 0;
    for (let i = 0; i < this.maxDust && emitted < emitRate; i++) {
      if (this.dustLifetimes[i] <= 0) {
        // Pick a wheel contact position
        const wheelIdx = Math.floor(Math.random() * 6);
        const wheelObj = this.nodes.wheels[wheelIdx];
        const worldPos = new THREE.Vector3();
        wheelObj.getWorldPosition(worldPos);

        this.dustPositions[i * 3] = worldPos.x + (Math.random() - 0.5) * 0.2;
        this.dustPositions[i * 3 + 1] = worldPos.y - 0.2;
        this.dustPositions[i * 3 + 2] = worldPos.z + (Math.random() - 0.5) * 0.2;

        this.dustVelocities[i].set(
          (Math.random() - 0.5) * 0.6,
          0.3 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.6 - (this.speed > 0 ? 0.8 : -0.8)
        );

        this.dustLifetimes[i] = 0.8 + Math.random() * 0.6;
        emitted++;
      }
    }

    // Step existing particles
    for (let i = 0; i < this.maxDust; i++) {
      if (this.dustLifetimes[i] > 0) {
        this.dustLifetimes[i] -= delta;
        this.dustPositions[i * 3] += this.dustVelocities[i].x * delta;
        this.dustPositions[i * 3 + 1] += this.dustVelocities[i].y * delta;
        this.dustPositions[i * 3 + 2] += this.dustVelocities[i].z * delta;
        // Gravity & drag on dust
        this.dustVelocities[i].y -= 0.6 * delta;
      } else {
        this.dustPositions[i * 3 + 1] = -100;
      }
    }

    this.dustParticles.geometry.attributes.position.needsUpdate = true;
  }
}
