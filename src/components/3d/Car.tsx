import { useBox } from '@react-three/cannon';
import { useMemo } from 'react';
import * as THREE from 'three';

const COLORS = ['#880000', '#000088', '#eeeeee', '#111111', '#444444'];

export const Car = ({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) => {
    const [ref] = useBox(() => ({
        type: 'Static',
        mass: 500,
        position,
        rotation,
        args: [2.2, 1.5, 4.5]
    }));

    const color = useMemo(() => COLORS[Math.floor(Math.random() * COLORS.length)], []);

    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 128, 128);

        // Add dirt/scratches/noise
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = 0; i < 150; i++) {
            ctx.fillRect(Math.random() * 128, Math.random() * 128, Math.random() * 4, 1);
        }
        for (let i = 0; i < 500; i++) {
            const val = Math.random() * 50;
            ctx.fillStyle = `rgba(${val},${val},${val},0.05)`;
            ctx.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }, []);

    return (
        <group ref={ref as any}>
            {/* Body */}
            <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[2.2, 1, 4.5]} />
                <meshStandardMaterial
                    color={color}
                    map={texture}
                    roughness={0.4}
                    metalness={0.6}
                />
            </mesh>
            {/* Top */}
            <mesh position={[0, 0.8, -0.5]}>
                <boxGeometry args={[2, 0.8, 2.8]} />
                <meshStandardMaterial
                    color={color}
                    map={texture}
                    roughness={0.4}
                    metalness={0.6}
                />
            </mesh>
            {/* Wheels */}
            <mesh position={[1.1, -0.5, 1.4]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.45, 0.45, 0.3, 16]} />
                <meshLambertMaterial color="#111" />
            </mesh>
            <mesh position={[-1.1, -0.5, 1.4]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.45, 0.45, 0.3, 16]} />
                <meshLambertMaterial color="#111" />
            </mesh>
            <mesh position={[1.1, -0.5, -1.4]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.45, 0.45, 0.3, 16]} />
                <meshLambertMaterial color="#111" />
            </mesh>
            <mesh position={[-1.1, -0.5, -1.4]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.45, 0.45, 0.3, 16]} />
                <meshLambertMaterial color="#111" />
            </mesh>

            {/* Windows */}
            <mesh position={[0, 0.85, -0.5]}>
                <boxGeometry args={[2.02, 0.7, 2.5]} />
                <meshStandardMaterial color="#223344" roughness={0.05} metalness={1.0} transparent opacity={0.6} />
            </mesh>

            {/* Headlights */}
            <mesh position={[0.7, 0.1, 2.26]}>
                <planeGeometry args={[0.5, 0.3]} />
                <meshBasicMaterial color="#ffffcc" />
            </mesh>
            <mesh position={[-0.7, 0.1, 2.26]}>
                <planeGeometry args={[0.5, 0.3]} />
                <meshBasicMaterial color="#ffffcc" />
            </mesh>
        </group>
    );
};
