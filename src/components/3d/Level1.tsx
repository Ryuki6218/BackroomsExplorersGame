import { useBox } from '@react-three/cannon';
import { useMemo, useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Car } from './Car';
import { Crate } from './Crate';
import { FluorescentLight } from './FluorescentLight';
import { useGameStore } from '../../store/useGameStore';

const SECTION_SIZE = 120;
const PASSAGE_WIDTH = 30;
const FLOOR_THICKNESS = 0.75;
const RAMP_WIDTH = 15;

const useConcreteTexture = () => {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Base Concrete
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(0, 0, 512, 512);

        // Add Noise
        for (let i = 0; i < 5000; i++) {
            const val = Math.random() * 30;
            ctx.fillStyle = `rgba(${val},${val},${val},0.1)`;
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }

        // Add Stains (Water/Oil damage)
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = 20 + Math.random() * 60;
            const grd = ctx.createRadialGradient(x, y, 0, x, y, size);
            grd.addColorStop(0, 'rgba(0,0,0,0.3)');
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add Cracks
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            let x = Math.random() * 512;
            let y = Math.random() * 512;
            ctx.beginPath();
            ctx.moveTo(x, y);
            for (let j = 0; j < 5; j++) {
                x += (Math.random() - 0.5) * 30;
                y += (Math.random() - 0.5) * 30;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        return texture;
    }, []);
};

const Wall = ({ position, args, texture, color = "#888888", visible = true }: { position: [number, number, number], args: [number, number, number], texture?: THREE.Texture | null, color?: string, visible?: boolean }) => {
    const [ref] = useBox(() => ({ type: 'Static', position, args, material: { friction: 0 } }));
    if (!visible) return null;
    return (
        <mesh ref={ref as any}>
            <boxGeometry args={args} />
            <meshStandardMaterial map={texture || null} color={color} roughness={0.7} metalness={0.1} />
        </mesh>
    );
};

const Ramp = ({ position, rotation, texture }: { position: [number, number, number], rotation: [number, number, number], texture: THREE.Texture | null }) => {
    const args: [number, number, number] = [RAMP_WIDTH, 0.15, 36.4];
    const [ref] = useBox(() => ({ type: 'Static', position, rotation, args, material: { friction: 0 } }));
    return (
        <mesh ref={ref as any}>
            <boxGeometry args={args} />
            <meshStandardMaterial map={texture} color="#999999" roughness={0.8} />
        </mesh>
    );
};

const FloorBox = ({ position, args, texture, isCeiling = false }: { position: [number, number, number], args: [number, number, number], texture: THREE.Texture | null, isCeiling?: boolean }) => {
    const [ref] = useBox(() => ({
        type: 'Static',
        position: [position[0], position[1] - args[1] / 2, position[2]],
        args,
        material: { friction: 0 }
    }));
    return (
        <group>
            {/* Top Surface (for floors) */}
            {!isCeiling && (
                <mesh position={[position[0], position[1] + 0.05, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[args[0], args[2]]} />
                    <meshStandardMaterial map={texture} roughness={0.6} metalness={0.1} />
                </mesh>
            )}
            {/* Physical Box */}
            <mesh position={[position[0], position[1] - args[1] / 2, position[2]]}>
                <boxGeometry args={args} />
                <meshStandardMaterial map={texture} roughness={0.8} metalness={0.05} />
            </mesh>
            <mesh ref={ref as any} visible={false}>
                <boxGeometry args={args} />
            </mesh>
        </group>
    );
};

const TransitionTrigger = ({ position, onTrigger }: { position: [number, number, number], onTrigger: () => void }) => {
    const [ref] = useBox(() => ({
        type: 'Static',
        isTrigger: true,
        position,
        args: [6, 10, 6],
        onCollide: () => onTrigger()
    }));
    return <mesh ref={ref as any} visible={false}><boxGeometry args={[6, 10, 6]} /></mesh>;
};

const Puddle = ({ position, size }: { position: [number, number, number], size: number }) => {
    return (
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[size, 16]} />
            <meshStandardMaterial
                color="#222222"
                transparent
                opacity={0.6}
                roughness={0}
                metalness={0.8}
            />
        </mesh>
    );
};

export const Level1 = () => {
    const texture = useConcreteTexture();
    const { setIsLoading } = useGameStore();
    const [chunkId, setChunkId] = useState(0);
    const lastTransitionTime = useRef(0);

    const layout = useMemo(() => {
        const floorPlanes = [];
        const walls = [];
        const objects = [];
        const elements = [];
        const lights = [];

        for (let f = 0; f < 3; f++) {
            const y = f * 10;

            for (let ix = 0; ix <= 1; ix++) {
                for (let iz = 0; iz <= 1; iz++) {
                    const cx = ix * (SECTION_SIZE + PASSAGE_WIDTH);
                    const cz = iz * (SECTION_SIZE + PASSAGE_WIDTH);

                    const isHoleZone = (ix === 0 && iz === 0);
                    if (isHoleZone && f > 0) {
                        floorPlanes.push(<FloorBox key={`fs-l-${f}`} position={[cx - 33.75, y, cz]} args={[52.5, FLOOR_THICKNESS, 120]} texture={texture} />);
                        floorPlanes.push(<FloorBox key={`fs-r-${f}`} position={[cx + 33.75, y, cz]} args={[52.5, FLOOR_THICKNESS, 120]} texture={texture} />);
                        floorPlanes.push(<FloorBox key={`fs-f-${f}`} position={[cx, y, cz + 38.75]} args={[15, FLOOR_THICKNESS, 42.5]} texture={texture} />);
                        floorPlanes.push(<FloorBox key={`fs-b-${f}`} position={[cx, y, cz - 38.75]} args={[15, FLOOR_THICKNESS, 42.5]} texture={texture} />);
                    } else {
                        floorPlanes.push(<FloorBox key={`fs-${f}-${ix}-${iz}`} position={[cx, y, cz]} args={[120, FLOOR_THICKNESS, 120]} texture={texture} />);
                    }

                    if (ix < 1) floorPlanes.push(<FloorBox key={`px-${f}-${ix}-${iz}`} position={[cx + (SECTION_SIZE + PASSAGE_WIDTH) / 2, y, cz]} args={[PASSAGE_WIDTH, FLOOR_THICKNESS, SECTION_SIZE]} texture={texture} />);
                    if (iz < 1) floorPlanes.push(<FloorBox key={`pz-${f}-${ix}-${iz}`} position={[cx, y, cz + (SECTION_SIZE + PASSAGE_WIDTH) / 2]} args={[SECTION_SIZE, FLOOR_THICKNESS, PASSAGE_WIDTH]} texture={texture} />);
                    if (ix < 1 && iz < 1) floorPlanes.push(<FloorBox key={`pc-${f}-${ix}-${iz}`} position={[cx + (SECTION_SIZE + PASSAGE_WIDTH) / 2, y, cz + (SECTION_SIZE + PASSAGE_WIDTH) / 2]} args={[PASSAGE_WIDTH, FLOOR_THICKNESS, PASSAGE_WIDTH]} texture={texture} />);

                    for (let px = -1; px <= 1; px += 0.35) {
                        for (let pz = -1; pz <= 1; pz += 0.35) {
                            if (Math.abs(px) > 0.7 || Math.abs(pz) > 0.7) {
                                walls.push(<Wall key={`p-${f}-${ix}-${iz}-${px}-${pz}`} position={[cx + px * 50, y + 5, cz + pz * 50]} args={[3.5, 10, 3.5]} texture={texture} />);
                            }
                        }
                    }

                    for (let lx = -2; lx <= 2; lx++) {
                        for (let lz = -2; lz <= 2; lz++) {
                            const lPos = [cx + lx * 25, y + 9.15, cz + lz * 25];
                            const isAboveHole = (f < 2 && ix === 0 && iz === 0 && Math.abs(lx * 25) < 7.5 && Math.abs(lz * 25) < 17.5);
                            if (!isAboveHole) {
                                const isReal = (lx === 0 && lz === 0);
                                lights.push(<FluorescentLight key={`light-${f}-${ix}-${iz}-${lx}-${lz}`} position={lPos as [number, number, number]} lightEnabled={isReal} intensity={18} />);
                            }
                        }
                    }

                    // Puddles (New Ver 3.0)
                    for (let i = 0; i < 4; i++) {
                        const ox = (Math.random() - 0.5) * 110;
                        const oz = (Math.random() - 0.5) * 110;
                        const isNearHole = isHoleZone && (Math.abs(ox) < 15 && Math.abs(oz) < 25);
                        if (!isNearHole) {
                            objects.push(<Puddle key={`puddle-${f}-${ix}-${iz}-${i}`} position={[cx + ox, y + 0.06, cz + oz]} size={2 + Math.random() * 6} />);
                        }
                    }

                    // Cars (EXCLUSION ZONE + INCREASED DENSITY)
                    if (Math.random() < 0.8) {
                        const count = 3 + Math.floor(Math.random() * 3);
                        for (let c = 0; c < count; c++) {
                            const ox = (Math.random() - 0.5) * 110;
                            const oz = (Math.random() - 0.5) * 110;
                            const isNearHole = isHoleZone && (Math.abs(ox) < 15 && Math.abs(oz) < 25);
                            if (!isNearHole) {
                                objects.push(<Car key={`car-${f}-${ix}-${iz}-${c}`} position={[cx + ox, y + 1.0, cz + oz]} rotation={[0, Math.random() * Math.PI, 0]} />);
                            }
                        }
                    }
                    for (let i = 0; i < 8; i++) {
                        const ox = (Math.random() - 0.5) * 110;
                        const oz = (Math.random() - 0.5) * 110;
                        const isNearHole = isHoleZone && (Math.abs(ox) < 15 && Math.abs(oz) < 25);
                        if (!isNearHole) {
                            objects.push(<Crate key={`crate-${f}-${ix}-${iz}-${i}`} position={[cx + ox, y + 0.85, cz + oz]} />);
                        }
                    }
                }
            }

            const bMin = -60;
            const bMax = 210;
            const bCenter = 75;
            const exitPWidth = 20;

            if (f < 2) {
                for (let side of [-1, 1]) {
                    const zPos = side === 1 ? bMax : bMin;
                    walls.push(<Wall key={`wn1-${f}-${side}`} position={[(bCenter - exitPWidth / 2 + bMin) / 2, y + 5, zPos]} args={[(bCenter - exitPWidth / 2) - bMin, 10, 2]} texture={texture} />);
                    walls.push(<Wall key={`wn2-${f}-${side}`} position={[(bCenter + exitPWidth / 2 + bMax) / 2, y + 5, zPos]} args={[bMax - (bCenter + exitPWidth / 2), 10, 2]} texture={texture} />);
                    floorPlanes.push(<FloorBox key={`fpe-${f}-${side}`} position={[bCenter, y, zPos + side * 20]} args={[exitPWidth, FLOOR_THICKNESS, 40]} texture={texture} />);
                    walls.push(<Wall key={`fpe-sw1-${f}-${side}`} position={[bCenter - exitPWidth / 2, y + 5, zPos + side * 20]} args={[1, 10, 40]} texture={texture} />);
                    walls.push(<Wall key={`fpe-sw2-${f}-${side}`} position={[bCenter + exitPWidth / 2, y + 5, zPos + side * 20]} args={[1, 10, 40]} texture={texture} />);
                    walls.push(<Wall key={`fpe-stop-${f}-${side}`} position={[bCenter, y + 5, zPos + side * 41]} args={[exitPWidth + 2, 10, 2]} color="#000000" />);
                }
                for (let side of [-1, 1]) {
                    const xPos = side === 1 ? bMax : bMin;
                    walls.push(<Wall key={`we1-${f}-${side}`} position={[xPos, y + 5, (bCenter - exitPWidth / 2 + bMin) / 2]} args={[2, 10, (bCenter - exitPWidth / 2) - bMin]} texture={texture} />);
                    walls.push(<Wall key={`we2-${f}-${side}`} position={[xPos, y + 5, (bCenter + exitPWidth / 2 + bMax) / 2]} args={[2, 10, bMax - (bCenter + exitPWidth / 2)]} texture={texture} />);
                    floorPlanes.push(<FloorBox key={`fpe-x-${f}-${side}`} position={[xPos + side * 20, y, bCenter]} args={[40, FLOOR_THICKNESS, exitPWidth]} texture={texture} />);
                    walls.push(<Wall key={`fpe-x-sw1-${f}-${side}`} position={[xPos + side * 20, y + 5, bCenter - exitPWidth / 2]} args={[40, 10, 1]} texture={texture} />);
                    walls.push(<Wall key={`fpe-x-sw2-${f}-${side}`} position={[xPos + side * 20, y + 5, bCenter + exitPWidth / 2]} args={[40, 10, 1]} texture={texture} />);
                    walls.push(<Wall key={`fpe-x-stop-${f}-${side}`} position={[xPos + side * 41, y + 5, bCenter]} args={[2, 10, exitPWidth + 2]} color="#000000" />);
                }
            } else {
                walls.push(<Wall key={`w-n-top`} position={[bCenter, y + 5, bMax]} args={[270, 10, 2]} texture={texture} />);
                walls.push(<Wall key={`w-s-top`} position={[bCenter, y + 5, bMin]} args={[270, 10, 2]} texture={texture} />);
                walls.push(<Wall key={`w-e-top`} position={[bMax, y + 5, bCenter]} args={[2, 10, 270]} texture={texture} />);
                walls.push(<Wall key={`w-w-top`} position={[bMin, y + 5, bCenter]} args={[2, 10, 270]} texture={texture} />);
            }

            if (f < 2) {
                elements.push(<Ramp key={`ramp-${f}`} position={[0, y + 5, 0]} rotation={[0.278, 0, 0]} texture={texture} />);
            }
        }

        // Final Ceiling for Top Floor
        floorPlanes.push(<FloorBox key="top-ceiling" isCeiling position={[75, 30, 75]} args={[270, FLOOR_THICKNESS, 270]} texture={texture} />);

        return { floorPlanes, walls, objects, elements, lights };
    }, [texture, chunkId]);

    const handleTransition = () => {
        const now = Date.now();
        if (now - lastTransitionTime.current < 10000) return; // 10秒クールダウン
        lastTransitionTime.current = now;
        setIsLoading(true);
        setTimeout(() => {
            setChunkId(prev => prev + 1);
            setIsLoading(false);
        }, 2000);
    };

    const bCenter = 75;
    const bMin = -60;
    const bMax = 210;

    // Set tab title
    useEffect(() => { document.title = 'Backrooms | Level 1'; }, []);

    return (
        <group>
            <color attach="background" args={['#141414']} />
            <fog attach="fog" args={['#141414', 30, 250]} />

            {layout.floorPlanes}
            {layout.walls}
            {layout.objects}
            {layout.elements}
            {layout.lights}

            <TransitionTrigger position={[bCenter, 5, bMax + 35]} onTrigger={handleTransition} />
            <TransitionTrigger position={[bCenter, 5, bMin - 35]} onTrigger={handleTransition} />
            <TransitionTrigger position={[bMax + 35, 5, bCenter]} onTrigger={handleTransition} />
            <TransitionTrigger position={[bMin - 35, 5, bCenter]} onTrigger={handleTransition} />

            <ambientLight intensity={1.2} />
            <hemisphereLight args={['#ffffff', '#222222', 0.6]} />
        </group>
    );
};
