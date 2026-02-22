import { useMapGeneration, CellType } from '../../hooks/useMapGeneration';
import { useCompoundBody, useBox } from '@react-three/cannon';
import { useMemo, useRef, useState, memo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AlmondWater } from './AlmondWater';
import { Sky } from '@react-three/drei';
import { FluorescentLight } from './FluorescentLight';

const SCALE = 3;
const L0_CHUNK = 12;
const L0_VIEW = 2;

// Deterministic random from coordinates
const hash = (x: number, z: number) => {
    const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return h - Math.floor(h);
};

// Procedural Yagasuri (Arrow Feather) Texture
const useYagasuriTexture = () => {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = '#d4c98b';
        ctx.fillRect(0, 0, 512, 512);

        ctx.lineWidth = 10;
        ctx.strokeStyle = '#b8a65e';

        const patternSize = 64;
        for (let y = -patternSize; y < 512 + patternSize; y += patternSize) {
            for (let x = 0; x < 512; x += patternSize) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + patternSize / 2, y + patternSize / 2);
                ctx.lineTo(x + patternSize, y);
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + patternSize);
                ctx.moveTo(x + patternSize, y);
                ctx.lineTo(x + patternSize, y + patternSize);
                ctx.stroke();
            }
        }

        const imageData = ctx.getImageData(0, 0, 512, 512);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 20;
            data[i] += noise;
            data[i + 1] += noise;
            data[i + 2] += noise;
        }
        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        return texture;
    }, []);
};

const Ceiling = ({ width, height }: { width: number, height: number }) => {
    return (
        <mesh position={[width / 2, 5, height / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial color="#e3d586" roughness={0.5} emissive="#222" />
        </mesh>
    );
};

// ========== CHUNK: 1 compound physics body + visual-only meshes ==========
const MazeChunk = memo(({ cx, cz, grid, texture, mapW, mapH }: {
    cx: number; cz: number; grid: CellType[][]; texture: THREE.Texture | null;
    mapW: number; mapH: number;
}) => {
    const startX = cx * L0_CHUNK;
    const startZ = cz * L0_CHUNK;
    const endX = Math.min(startX + L0_CHUNK, mapW);
    const endZ = Math.min(startZ + L0_CHUNK, mapH);

    // Pre-compute physics shapes + visual positions
    const { wallShapes, wallVisuals, items, lights, decor } = useMemo(() => {
        const wallShapes: Array<{ type: 'Box'; position: [number, number, number]; args: [number, number, number] }> = [];
        const wallVisuals: Array<{ p: [number, number, number]; k: string }> = [];
        const items: JSX.Element[] = [];
        const lights: JSX.Element[] = [];
        const decor: Array<{ p: [number, number, number]; k: string }> = [];

        for (let z = startZ; z < endZ; z++) {
            for (let x = startX; x < endX; x++) {
                if (grid[z]?.[x] === 'wall') {
                    const pos: [number, number, number] = [x * SCALE, 2.5, z * SCALE];
                    wallShapes.push({ type: 'Box', position: pos, args: [SCALE, 5, SCALE] });
                    wallVisuals.push({ p: pos, k: `w${x}_${z}` });
                }

                // Almond water: 1% chance
                if (grid[z]?.[x] === 'floor' && hash(x, z) < 0.01) {
                    items.push(<AlmondWater key={`aw-${x}-${z}`} position={[x * SCALE, 0.25, z * SCALE]} />);
                }
            }
        }

        // Dense decorative (visual-only) fluorescent fixtures: every 3 cells
        for (let x = Math.ceil(startX / 3) * 3; x < endX; x += 3) {
            for (let z = Math.ceil(startZ / 3) * 3; z < endZ; z += 3) {
                decor.push({ p: [x * SCALE, 4.9, z * SCALE], k: `dl${x}_${z}` });
            }
        }

        // Sparse real lights with actual pointLight: every 12 cells, real every 36
        for (let x = Math.ceil(startX / 12) * 12; x < endX; x += 12) {
            for (let z = Math.ceil(startZ / 12) * 12; z < endZ; z += 12) {
                const isReal = (x % 36 === 0 && z % 36 === 0);
                lights.push(
                    <FluorescentLight
                        key={`l-${x}-${z}`}
                        position={[x * SCALE, 4.9, z * SCALE]}
                        lightEnabled={isReal}
                        intensity={4}
                    />
                );
            }
        }

        return { wallShapes, wallVisuals, items, lights, decor };
    }, [startX, startZ, endX, endZ, grid]);

    // SINGLE compound body for ALL walls in this chunk
    const [physRef] = useCompoundBody(() => ({
        type: 'Static' as const,
        position: [0, 0, 0] as [number, number, number],
        shapes: wallShapes.length > 0
            ? wallShapes.map(s => ({ type: 'Box' as const, position: s.position, args: s.args }))
            : [{ type: 'Box' as const, position: [0, -200, 0] as [number, number, number], args: [0.1, 0.1, 0.1] as [number, number, number] }],
    }));

    return (
        <group>
            <group ref={physRef as any} />
            {/* Visual-only wall meshes */}
            {wallVisuals.map(v => (
                <mesh key={v.k} position={v.p}>
                    <boxGeometry args={[SCALE, 5, SCALE]} />
                    <meshStandardMaterial map={texture} color="#d4c98b" roughness={0.8} />
                </mesh>
            ))}
            {/* Dense decorative fluorescent fixtures (visual only, no light, no physics) */}
            {decor.map(d => (
                <group key={d.k} position={d.p}>
                    <mesh position={[0, 0.1, 0]}>
                        <boxGeometry args={[1.5, 0.1, 0.3]} />
                        <meshStandardMaterial color="#333333" />
                    </mesh>
                    <mesh>
                        <boxGeometry args={[1.4, 0.05, 0.1]} />
                        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
                    </mesh>
                </group>
            ))}
            {items}
            {lights}
        </group>
    );
});

// Floor: rendered only AFTER grid is loaded (inside return, not before early-return)
const Floor = ({ width, height }: { width: number, height: number }) => {
    const [ref] = useBox(() => ({
        type: 'Static',
        position: [width / 2, -1.0, height / 2],
        args: [width, 2.0, height],
        material: { friction: 0, restitution: 0 }
    }));
    return (
        <mesh ref={ref as any}>
            <boxGeometry args={[width, 2.0, height]} />
            <meshStandardMaterial color="#b8a65e" roughness={0.9} />
        </mesh>
    );
};

export const Level0 = () => {
    // Set tab title
    useEffect(() => { document.title = 'Backrooms | Level 0'; }, []);

    const map = useMapGeneration(71, 71);
    const wallTexture = useYagasuriTexture();

    // Player chunk tracking (must be before early return — hooks rules)
    const viewRef = useRef<[number, number]>([0, 0]);
    const [viewCenter, setViewCenter] = useState<[number, number]>([0, 0]);

    useFrame(({ camera }) => {
        const gx = camera.position.x / SCALE;
        const gz = camera.position.z / SCALE;
        const ncx = Math.floor(gx / L0_CHUNK);
        const ncz = Math.floor(gz / L0_CHUNK);
        if (ncx !== viewRef.current[0] || ncz !== viewRef.current[1]) {
            viewRef.current = [ncx, ncz];
            setViewCenter([ncx, ncz]);
        }
    });

    if (!map.grid.length) return null;

    const scaledWidth = map.width * SCALE;
    const scaledHeight = map.height * SCALE;

    // Only render nearby chunks
    const numCX = Math.ceil(map.width / L0_CHUNK);
    const numCZ = Math.ceil(map.height / L0_CHUNK);
    const chunks: JSX.Element[] = [];
    for (let cx = 0; cx < numCX; cx++) {
        for (let cz = 0; cz < numCZ; cz++) {
            if (Math.abs(cx - viewCenter[0]) <= L0_VIEW && Math.abs(cz - viewCenter[1]) <= L0_VIEW) {
                chunks.push(
                    <MazeChunk key={`mc-${cx}-${cz}`}
                        cx={cx} cz={cz} grid={map.grid}
                        texture={wallTexture} mapW={map.width} mapH={map.height} />
                );
            }
        }
    }

    return (
        <group>
            <Sky sunPosition={[100, 20, 100]} />
            <Floor width={scaledWidth} height={scaledHeight} />
            <Ceiling width={scaledWidth} height={scaledHeight} />
            {chunks}
            <ambientLight intensity={0.6} color="#ffdca8" />
        </group>
    );
};
