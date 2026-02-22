import { useCompoundBody, useBox } from '@react-three/cannon';
import { useMemo, useRef, useState, memo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GRID = 60;
const CS = 3;
const CHUNK = 10;
const VIEW = 2;
const WT = 0.3;

const hash = (x: number, z: number) => {
    const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return h - Math.floor(h);
};
const hash2 = (x: number, z: number) => {
    const h = Math.sin(x * 37.719 + z * 91.133) * 21317.8731;
    return h - Math.floor(h);
};

const useTileTexture = () => {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 16; i++) {
            ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 512);
            ctx.moveTo(0, i * 32); ctx.lineTo(512, i * 32);
        }
        ctx.stroke();
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 1);
        return tex;
    }, []);
};

// Wall-specific tile texture: repeat corrected for vertical aspect ratio
const useWallTileTexture = () => {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 16; i++) {
            ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 512);
            ctx.moveTo(0, i * 32); ctx.lineTo(512, i * 32);
        }
        ctx.stroke();
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        // Make tiles square on wall faces: height=11, width≈CS+WT=3.3
        tex.repeat.set(1, 11 / (CS + WT));
        return tex;
    }, []);
};

// Small ripple ring
const Ripple = ({ position, born }: { position: [number, number, number]; born: number }) => {
    const ref = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!ref.current) return;
        const age = clock.getElapsedTime() - born;
        const s = 0.2 + age * 0.8; // grows slowly from 0.2 to ~1.0
        const o = Math.max(0, 0.5 - age * 0.25); // fades from 0.5 to 0 over 2sec
        ref.current.scale.set(s, s, 1);
        (ref.current.material as THREE.MeshStandardMaterial).opacity = o;
        if (o <= 0) ref.current.visible = false;
    });
    return (
        <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.3, 24]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
    );
};

const WaterRipples = () => {
    const [ripples, setRipples] = useState<Array<{ id: number; pos: [number, number, number]; born: number }>>([]);
    const lastPos = useRef(new THREE.Vector3());
    const rippleId = useRef(0);
    const timer = useRef(0);

    useFrame(({ camera, clock }, delta) => {
        timer.current += delta;
        const dx = camera.position.x - lastPos.current.x;
        const dz = camera.position.z - lastPos.current.z;
        const moved = Math.sqrt(dx * dx + dz * dz);

        // Only spawn ripple if moving and enough time passed
        if (moved > 0.08 && timer.current > 0.5) {
            timer.current = 0;
            const newId = rippleId.current++;
            const now = clock.getElapsedTime();
            setRipples(prev => {
                const next = [...prev.filter(r => now - r.born < 2.5),
                { id: newId, pos: [camera.position.x, -0.25, camera.position.z] as [number, number, number], born: now }];
                return next.length > 4 ? next.slice(-4) : next;
            });
        }
        lastPos.current.copy(camera.position);
    });

    return <>{ripples.map(r => <Ripple key={r.id} position={r.pos} born={r.born} />)}</>;
};

const Water = ({ position, args }: { position: [number, number, number], args: [number, number] }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (meshRef.current) {
            const mat = meshRef.current.material as THREE.MeshStandardMaterial;
            if (mat.map) {
                mat.map.offset.y = state.clock.getElapsedTime() * 0.03;
                mat.map.offset.x = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.01;
            }
        }
    });
    const waterTex = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = '#00bfa5';
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 8; i++) {
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 70, 0, Math.PI * 2);
            ctx.stroke();
        }
        const t = new THREE.CanvasTexture(canvas);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    }, []);
    return (
        <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={args} />
            <meshStandardMaterial color="#69f0ae" map={waterTex} transparent opacity={0.65} roughness={0.01} metalness={0.2} />
        </mesh>
    );
};

// Room types: 0=normal, 1=floats, 2=stairs, 3=pillars
interface GridInfo {
    g: number[][];
    roomMap: number[][];
    roomTypes: number[];
    oX: number;
    oZ: number;
    off: number;
}

type VisualItem = { p: [number, number, number]; a: [number, number, number]; k: string; color?: string; isWall?: boolean };

const MapChunk = memo(({ cx, cz, info, floorTex, wallTex }: {
    cx: number; cz: number; info: GridInfo;
    floorTex: THREE.Texture | null; wallTex: THREE.Texture | null
}) => {
    const { g, roomMap, roomTypes, oX, oZ, off } = info;
    const sx = cx * CHUNK, sz = cz * CHUNK;
    const ex = Math.min(sx + CHUNK, GRID), ez = Math.min(sz + CHUNK, GRID);

    const { shapes, floorVis, wallVis, decorations } = useMemo(() => {
        const shapes: Array<{ type: 'Box'; position: [number, number, number]; args: [number, number, number] }> = [];
        const floorVis: VisualItem[] = [];
        const wallVis: VisualItem[] = [];
        const decorations: JSX.Element[] = [];

        for (let x = sx; x < ex; x++) {
            for (let z = sz; z < ez; z++) {
                if (g[x][z] !== 1) continue;
                const wx = x * CS - off + oX;
                const wz = z * CS - off + oZ;

                // Floor tile
                floorVis.push({ p: [wx, -1.5, wz], a: [CS + 0.05, 1, CS + 0.05], k: `f${x}_${z}` });

                const rId = roomMap[x][z];
                const rType = rId >= 0 ? roomTypes[rId] : -1;

                // Room decorations
                if (rType === 1 && hash(x, z) < 0.15) {
                    // Float/buoy room: torus rings
                    const fx = wx + (hash(x + 1, z) - 0.5) * 2;
                    const fz = wz + (hash(x, z + 1) - 0.5) * 2;
                    const col = hash(x, z) > 0.1 ? '#ff6b6b' : '#ffd93d';
                    decorations.push(
                        <mesh key={`ring${x}_${z}`} position={[fx, -0.1, fz]} rotation={[Math.PI / 2, 0, hash2(x, z) * Math.PI * 2]}>
                            <torusGeometry args={[0.5, 0.15, 8, 16]} />
                            <meshStandardMaterial color={col} roughness={0.3} />
                        </mesh>
                    );
                } else if (rType === 2 && hash(x, z) < 0.08) {
                    // Stairs room: stepped boxes WITH physics
                    for (let s = 0; s < 3; s++) {
                        const sp: [number, number, number] = [wx - 1 + s * 1, -0.5 + s * 0.5, wz];
                        const sa: [number, number, number] = [1, 0.5, 2];
                        shapes.push({ type: 'Box', position: sp, args: sa });
                        decorations.push(
                            <mesh key={`stair${x}_${z}_${s}`} position={sp}>
                                <boxGeometry args={sa} />
                                <meshStandardMaterial color="#e0e0e0" roughness={0.2} />
                            </mesh>
                        );
                    }
                } else if (rType === 3 && hash(x, z) < 0.25) {
                    // Pillar-heavy room
                    const pp: [number, number, number] = [wx + (hash(x + 3, z) - 0.5), 3.5, wz + (hash(x, z + 3) - 0.5)];
                    const pa: [number, number, number] = [0.8, 11, 0.8];
                    shapes.push({ type: 'Box', position: pp, args: pa });
                    wallVis.push({ p: pp, a: pa, k: `rp${x}_${z}`, isWall: true });
                } else if (rId < 0 && hash(x, z) < 0.03) {
                    // Corridor pillar
                    const pp: [number, number, number] = [wx, 3.5, wz];
                    const pa: [number, number, number] = [1.2, 11, 1.2];
                    shapes.push({ type: 'Box', position: pp, args: pa });
                    wallVis.push({ p: pp, a: pa, k: `p${x}_${z}`, isWall: true });
                }

                // Boundary walls — widened by WT to seal corner gaps
                const dirs = [
                    { dx: 1, dz: 0, wa: [WT, 11, CS + WT] as [number, number, number] },
                    { dx: -1, dz: 0, wa: [WT, 11, CS + WT] as [number, number, number] },
                    { dx: 0, dz: 1, wa: [CS + WT, 11, WT] as [number, number, number] },
                    { dx: 0, dz: -1, wa: [CS + WT, 11, WT] as [number, number, number] },
                ];
                dirs.forEach((d, i) => {
                    const nx = x + d.dx, nz = z + d.dz;
                    if (nx < 0 || nx >= GRID || nz < 0 || nz >= GRID || g[nx][nz] === 0) {
                        const wp: [number, number, number] = [wx + d.dx * CS / 2, 3.5, wz + d.dz * CS / 2];
                        shapes.push({ type: 'Box', position: wp, args: d.wa });
                        wallVis.push({ p: wp, a: d.wa, k: `w${x}_${z}_${i}`, isWall: true });
                    }
                });
            }
        }
        return { shapes, floorVis, wallVis, decorations };
    }, [sx, sz, ex, ez, g, roomMap, roomTypes, oX, oZ, off]);

    const [physRef] = useCompoundBody(() => ({
        type: 'Static' as const,
        position: [0, 0, 0] as [number, number, number],
        shapes: shapes.length > 0
            ? shapes.map(s => ({ type: 'Box' as const, position: s.position, args: s.args }))
            : [{ type: 'Box' as const, position: [0, -200, 0] as [number, number, number], args: [0.1, 0.1, 0.1] as [number, number, number] }],
    }));

    return (
        <group>
            <group ref={physRef as any} />
            {/* Floor tiles with floor texture */}
            {floorVis.map(v => (
                <mesh key={v.k} position={v.p}>
                    <boxGeometry args={v.a} />
                    <meshStandardMaterial map={floorTex} color="#ffffff" roughness={0.1} metalness={0.1} />
                </mesh>
            ))}
            {/* Wall / pillar meshes with wall texture (square tiles) */}
            {wallVis.map(v => (
                <mesh key={v.k} position={v.p}>
                    <boxGeometry args={v.a} />
                    <meshStandardMaterial map={wallTex} color="#ffffff" roughness={0.1} metalness={0.1} />
                </mesh>
            ))}
            {decorations}
        </group>
    );
});

export const Level37 = () => {
    const floorTex = useTileTexture();
    const wallTex = useWallTileTexture();

    // Set tab title
    useEffect(() => { document.title = 'Backrooms | Level 37'; }, []);

    const gridInfo = useMemo((): GridInfo => {
        const g: number[][] = [];
        const roomMap: number[][] = [];
        for (let i = 0; i < GRID; i++) {
            g[i] = []; roomMap[i] = [];
            for (let j = 0; j < GRID; j++) { g[i][j] = 0; roomMap[i][j] = -1; }
        }

        const rooms: { x: number; z: number; w: number; h: number }[] = [];
        rooms.push({ x: Math.floor(GRID / 2) - 1, z: Math.floor(GRID / 2) - 1, w: 3, h: 3 });

        let tries = 0;
        while (rooms.length < 30 && tries < 800) {
            tries++;
            const w = 2 + Math.floor(Math.random() * 3);
            const h = 2 + Math.floor(Math.random() * 3);
            const rx = 2 + Math.floor(Math.random() * (GRID - w - 4));
            const rz = 2 + Math.floor(Math.random() * (GRID - h - 4));
            if (!rooms.some(r => rx < r.x + r.w + 2 && rx + w > r.x - 2 && rz < r.z + r.h + 2 && rz + h > r.z - 2)) {
                rooms.push({ x: rx, z: rz, w, h });
            }
        }

        const roomTypes = rooms.map((r, i) => {
            if (i === 0) return 0;
            const h = Math.sin(r.x * 7.31 + r.z * 13.17) * 43758.5453;
            return Math.floor((h - Math.floor(h)) * 4);
        });

        rooms.forEach((r, ri) => {
            for (let x = r.x; x < r.x + r.w; x++)
                for (let z = r.z; z < r.z + r.h; z++) {
                    g[x][z] = 1;
                    roomMap[x][z] = ri;
                }
        });

        // Corridors connecting rooms
        for (let i = 1; i < rooms.length; i++) {
            let sx = Math.floor(rooms[i - 1].x + rooms[i - 1].w / 2);
            let sz = Math.floor(rooms[i - 1].z + rooms[i - 1].h / 2);
            const ex = Math.floor(rooms[i].x + rooms[i].w / 2);
            const ez = Math.floor(rooms[i].z + rooms[i].h / 2);
            while (sx !== ex) { g[sx][sz] = 1; sx += sx < ex ? 1 : -1; }
            while (sz !== ez) { g[sx][sz] = 1; sz += sz < ez ? 1 : -1; }
        }

        // Dead-end tunnels: short random passages branching from corridors/rooms
        for (let x = 2; x < GRID - 2; x++) {
            for (let z = 2; z < GRID - 2; z++) {
                if (g[x][z] !== 1) continue;
                if (hash2(x, z) > 0.04) continue; // ~4% of open cells spawn a tunnel

                // Pick a random direction
                const dir = Math.floor(hash(x + 7, z + 13) * 4);
                const dx = [1, -1, 0, 0][dir];
                const dz = [0, 0, 1, -1][dir];
                const len = 2 + Math.floor(hash(x + 11, z + 17) * 3); // 2-4 cells long
                let canPlace = true;
                // Check if tunnel path is all solid (uncarved)
                for (let s = 1; s <= len; s++) {
                    const nx = x + dx * s, nz = z + dz * s;
                    if (nx < 1 || nx >= GRID - 1 || nz < 1 || nz >= GRID - 1) { canPlace = false; break; }
                    // Allow carving only into solid cells (don't merge with other rooms)
                    if (g[nx][nz] === 1 && s > 1) { canPlace = false; break; }
                }
                if (canPlace) {
                    for (let s = 1; s <= len; s++) {
                        g[x + dx * s][z + dz * s] = 1;
                        // Tunnels have no room assignment (roomMap stays -1)
                    }
                }
            }
        }

        const off = (GRID * CS) / 2 - CS / 2;
        const sr = rooms[0];
        const wSRX = (sr.x + (sr.w - 1) / 2) * CS - off;
        const wSRZ = (sr.z + (sr.h - 1) / 2) * CS - off;
        return { g, roomMap, roomTypes, oX: 4.5 - wSRX, oZ: 4.5 - wSRZ, off };
    }, []);

    const [floorRef] = useBox(() => ({
        type: 'Static',
        position: [0, -1.5, 0],
        args: [500, 1, 500],
    }));

    const spawnC = Math.floor(Math.floor(GRID / 2) / CHUNK);
    const viewRef = useRef<[number, number]>([spawnC, spawnC]);
    const [viewCenter, setViewCenter] = useState<[number, number]>([spawnC, spawnC]);

    useFrame(({ camera }) => {
        const gx = (camera.position.x - gridInfo.oX + gridInfo.off) / CS;
        const gz = (camera.position.z - gridInfo.oZ + gridInfo.off) / CS;
        const ncx = Math.floor(gx / CHUNK);
        const ncz = Math.floor(gz / CHUNK);
        if (ncx !== viewRef.current[0] || ncz !== viewRef.current[1]) {
            viewRef.current = [ncx, ncz];
            setViewCenter([ncx, ncz]);
        }
    });

    const numC = Math.ceil(GRID / CHUNK);
    const chunks: JSX.Element[] = [];
    for (let cx = 0; cx < numC; cx++) {
        for (let cz = 0; cz < numC; cz++) {
            if (Math.abs(cx - viewCenter[0]) <= VIEW && Math.abs(cz - viewCenter[1]) <= VIEW) {
                chunks.push(<MapChunk key={`c-${cx}-${cz}`} cx={cx} cz={cz} info={gridInfo} floorTex={floorTex} wallTex={wallTex} />);
            }
        }
    }

    return (
        <group>
            <color attach="background" args={['#e0f2f1']} />
            <fog attach="fog" args={['#e0f2f1', 8, 60]} />
            <mesh ref={floorRef as any} visible={false}>
                <boxGeometry args={[500, 1, 500]} />
                <meshStandardMaterial />
            </mesh>
            {chunks}
            <mesh position={[0, 9, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2000, 2000]} />
                <meshStandardMaterial color="#fffde7" roughness={0.5} metalness={0} />
            </mesh>
            <Water position={[0, -0.3, 0]} args={[2000, 2000]} />
            <WaterRipples />
            <ambientLight intensity={1.1} />
            <pointLight position={[4.5, 7, 4.5]} intensity={50} color="#ffffff" />
            <directionalLight position={[10, 20, 10]} intensity={0.9} color="#f0f4c3" />
        </group>
    );
};
