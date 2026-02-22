import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/useGameStore';
import { Vector3 } from 'three';
import * as THREE from 'three';

export const CannedFood = ({ position }: { position: [number, number, number] }) => {
    const [visible, setVisible] = useState(true);
    const [pickupProgress, setPickupProgress] = useState(0);
    const { heal, recoverStamina } = useGameStore();
    const ref = useRef<THREE.Group>(null);

    useFrame(({ clock, camera }, delta) => {
        if (!visible || !ref.current) return;

        // Float animation
        ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 1.5) * 0.05;

        // Fast spin while picking up
        const spinSpeed = 0.005 + (pickupProgress * 0.3);
        ref.current.rotation.y += spinSpeed;

        // Pickup Logic
        const itemPos = new Vector3(position[0], position[1], position[2]);
        if (camera.position.distanceTo(itemPos) < 2.5) {
            const nextProgress = pickupProgress + delta;
            if (nextProgress >= 1.2) { // 1.2 seconds for food
                heal(50);
                recoverStamina(50);
                setVisible(false);
                console.log("Picked up Canned Food");
            } else {
                setPickupProgress(nextProgress);
            }
        } else {
            if (pickupProgress > 0) setPickupProgress(0);
        }
    });

    if (!visible) return null;

    return (
        <group ref={ref} position={position}>
            {/* Can */}
            <mesh>
                <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
                <meshStandardMaterial color="#aaaaaa" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Label */}
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.151, 0.151, 0.1, 16]} />
                <meshStandardMaterial color="#883333" />
            </mesh>

            <pointLight intensity={0.2} distance={1} color="#ffffff" decay={2} />
        </group>
    );
};
