import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/useGameStore';
import { Vector3 } from 'three';
import * as THREE from 'three';

export const AlmondWater = ({ position }: { position: [number, number, number] }) => {
    const [visible, setVisible] = useState(true);
    const [pickupProgress, setPickupProgress] = useState(0);
    const { heal, recoverStamina } = useGameStore();
    const ref = useRef<THREE.Group>(null);

    // Floating animation and pickup logic
    useFrame(({ clock, camera }, delta) => {
        if (!visible || !ref.current) return;

        // Float
        ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.1;

        // Dynamic rotation based on progress
        const spinSpeed = 0.01 + (pickupProgress * 0.2);
        ref.current.rotation.y += spinSpeed;

        // Pickup check (distance < 2.0)
        const dist = camera.position.distanceTo(new Vector3(position[0], position[1], position[2]));
        if (dist < 2.0) {
            const nextProgress = pickupProgress + delta; // delta is in seconds
            if (nextProgress >= 1.0) { // 1.0 second to pick up
                heal(30);
                recoverStamina(100);
                setVisible(false);
                console.log("Picked up Almond Water");
            } else {
                setPickupProgress(nextProgress);
            }
        } else {
            // Reset progress if move away
            if (pickupProgress > 0) setPickupProgress(0);
        }
    });

    if (!visible) return null;

    return (
        <group ref={ref} position={position}>
            {/* Bottle Body */}
            <mesh>
                <cylinderGeometry args={[0.1, 0.1, 0.4, 16]} />
                <meshStandardMaterial color="#eeeeee" transparent opacity={0.3} roughness={0.1} />
            </mesh>
            {/* Liquid */}
            <mesh position={[0, -0.05, 0]}>
                <cylinderGeometry args={[0.09, 0.09, 0.25, 16]} />
                <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} opacity={0.8} transparent />
            </mesh>
            {/* Label */}
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.101, 0.101, 0.15, 16]} />
                <meshStandardMaterial color="#d2b48c" />
            </mesh>
            {/* Cap */}
            <mesh position={[0, 0.22, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.05, 16]} />
                <meshStandardMaterial color="#dddddd" />
            </mesh>
        </group>
    );
};
