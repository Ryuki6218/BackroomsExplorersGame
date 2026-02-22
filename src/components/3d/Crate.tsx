import { useBox } from '@react-three/cannon';
import { useState, useMemo } from 'react';
import * as THREE from 'three';
import { AlmondWater } from './AlmondWater';
import { CannedFood } from './CannedFood';

export const Crate = ({ position }: { position: [number, number, number] }) => {
    const [isBroken, setIsBroken] = useState(false);
    const [droppedItem, setDroppedItem] = useState<'water' | 'food' | null>(null);

    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Base wood color
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, 256, 256);

        // Planks
        ctx.strokeStyle = '#5D2E0C';
        ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
            ctx.strokeRect(i * 64, 0, 64, 256);
        }

        // Grain and nails
        ctx.fillStyle = '#5D2E0C';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            ctx.fillRect(x, y, 2, 10);
        }

        const tex = new THREE.CanvasTexture(canvas);
        return tex;
    }, []);

    const [ref] = useBox(() => ({
        mass: 10, // Make them heavy but interactive
        position,
        material: { friction: 0.5, restitution: 0 },
        onCollide: (e) => {
            if (!isBroken && e.contact.impactVelocity > 5) {
                breakCrate();
            }
        }
    }));

    const breakCrate = () => {
        if (isBroken) return;
        setIsBroken(true);
        const rand = Math.random();
        if (rand < 0.3) setDroppedItem('water');
        else if (rand < 0.6) setDroppedItem('food');
    };

    return (
        <group>
            {!isBroken && (
                <mesh ref={ref as any} onClick={breakCrate}>
                    <boxGeometry args={[1.2, 1.2, 1.2]} />
                    <meshLambertMaterial map={texture} color="#ffffff" />
                </mesh>
            )}

            {isBroken && droppedItem === 'water' && <AlmondWater position={[position[0], position[1] - 0.2, position[2]]} />}
            {isBroken && droppedItem === 'food' && <CannedFood position={[position[0], position[1] - 0.2, position[2]]} />}
        </group>
    );
};
