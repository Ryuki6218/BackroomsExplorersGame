import { useBox } from '@react-three/cannon';
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

// Enhanced Void Cube Component
const EntityCube = ({ position, onPosUpdate }: { position: [number, number, number], onPosUpdate: (pos: [number, number, number]) => void }) => {
    const { damage, isPlaying, hp } = useGameStore();
    const initialPos = useRef(position);

    const [ref, api] = useBox(() => ({
        mass: 1,
        position,
        args: [1, 1, 1],
        type: 'Dynamic',
        linearDamping: 0.1,
        angularDamping: 0.1,
    }));

    const velocity = useRef([0, 0, 0]);
    useEffect(() => api.velocity.subscribe(v => (velocity.current = v)), [api.velocity]);

    const pos = useRef(position);
    useEffect(() => {
        return api.position.subscribe(p => {
            pos.current = p;
            onPosUpdate(p);
        });
    }, [api.position, onPosUpdate]);

    const shardsCount = 6;
    const shards = useRef<THREE.Group>(null);
    const lastDamageTime = useRef(0);
    const speed = 4.5;

    useFrame(({ camera, clock }) => {
        if (!isPlaying || hp <= 0) {
            api.velocity.set(0, 0, 0);
            return;
        }

        const currentPos = new THREE.Vector3(...pos.current);
        const dist = camera.position.distanceTo(currentPos);

        // Chase player if within 25m
        if (dist < 25) {
            const dir = new THREE.Vector3()
                .copy(camera.position)
                .sub(currentPos)
                .normalize();

            api.velocity.set(dir.x * speed, velocity.current[1], dir.z * speed);
        } else {
            api.velocity.set(0, velocity.current[1], 0);
        }

        // Entity Fall Protection: Warp back if falling too deep
        if (pos.current[1] < -15) {
            api.position.set(...initialPos.current);
            api.velocity.set(0, 0, 0);
        }

        // Damage logic
        if (dist < 1.5 && Date.now() - lastDamageTime.current > 1000) {
            damage(20);
            lastDamageTime.current = Date.now();
        }

        if (shards.current) {
            shards.current.rotation.y = clock.getElapsedTime() * 3;
            shards.current.rotation.z = clock.getElapsedTime() * 1.5;
        }
    });

    return (
        <group>
            <mesh ref={ref as any}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#000000" roughness={0} metalness={1} />
                <group ref={shards}>
                    {[...Array(shardsCount)].map((_, i) => {
                        const angle = (i / shardsCount) * Math.PI * 2;
                        return (
                            <mesh key={i} position={[Math.cos(angle) * 1.6, Math.sin(angle * 2) * 0.8, Math.sin(angle) * 1.6]}>
                                <boxGeometry args={[0.25, 0.25, 0.25]} />
                                <meshStandardMaterial
                                    color="#ff00ff"
                                    emissive="#ff00ff"
                                    emissiveIntensity={10}
                                />
                            </mesh>
                        );
                    })}
                </group>
                <pointLight distance={6} intensity={25} color="#ff00ff" />
            </mesh>
        </group>
    );
};

// Larger randomized platform positions
const generatePlatforms = (count: number) => {
    const list = [];
    // Start platform - Increased size
    list.push({ p: [4.5, 0, 4.5] as [number, number, number], s: [15, 0.5, 15] as [number, number, number] });

    const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
        // Larger range but keeping them somewhat close together for jumping
        const x = (seededRandom(i * 123.4) - 0.5) * 120;
        const y = (seededRandom(i * 567.8) - 0.5) * 15;
        const z = (seededRandom(i * 910.1) - 0.5) * 120;

        if (Math.abs(x - 4.5) < 12 && Math.abs(z - 4.5) < 12) continue;

        // Increased platform size: 10m to 18m
        const sx = 10 + seededRandom(i * 222) * 8;
        const sz = 10 + seededRandom(i * 333) * 8;
        list.push({ p: [x, y, z] as [number, number, number], s: [sx, 0.5, sz] as [number, number, number] });
    }
    return list;
};

// Enhanced Platform Component with stronger glow
const Platform = ({ position, size }: { position: [number, number, number], size: [number, number, number] }) => {
    useBox(() => ({ type: 'Static', position, args: size }));

    return (
        <group position={position}>
            <mesh>
                <boxGeometry args={size} />
                <meshStandardMaterial color="#020202" roughness={0.05} metalness={1} />
            </mesh>
            {/* Very Bright Neon Outline */}
            <mesh scale={[1.005, 1.005, 1.005]}>
                <boxGeometry args={size} />
                <meshStandardMaterial
                    color="#00ffff"
                    emissive="#00ffff"
                    emissiveIntensity={8}
                    wireframe
                    transparent
                    opacity={1}
                />
            </mesh>
            {/* Outer Glow Wireframe */}
            <mesh scale={[1.04, 1.04, 1.04]}>
                <boxGeometry args={size} />
                <meshStandardMaterial
                    color="#00ffff"
                    emissive="#00ffff"
                    emissiveIntensity={2}
                    wireframe
                    transparent
                    opacity={0.3}
                />
            </mesh>
        </group>
    );
};

export const Level816 = () => {
    const { setPanicLevel } = useGameStore();

    // Set tab title & Reset panic on unmount
    useEffect(() => {
        document.title = 'Backrooms | Level 816';
        return () => setPanicLevel(0);
    }, [setPanicLevel]);

    const platforms = useMemo(() => generatePlatforms(60), []);

    // Entities at some platforms
    const entities = useMemo(() => {
        return platforms
            .filter((_, i) => i > 0 && i % 5 === 0)
            .map(p => [p.p[0], p.p[1] + 3, p.p[2]] as [number, number, number]);
    }, [platforms]);

    const entityPositionsRef = useRef<{ [key: number]: [number, number, number] }>({});

    useFrame(({ camera }) => {
        let minPlayerDist = 100;

        Object.values(entityPositionsRef.current).forEach(p => {
            const d = camera.position.distanceTo(new THREE.Vector3(...p));
            if (d < minPlayerDist) minPlayerDist = d;
        });

        // 1.0 at 2m, 0.0 at 16m
        const p = Math.max(0, Math.min(1, 1 - (minPlayerDist - 2) / 14));
        setPanicLevel(p);
    });

    return (
        <group>
            <color attach="background" args={['#000000']} />
            <fog attach="fog" args={['#000000', 15, 75]} />

            {platforms.map((plat, i) => (
                <Platform key={i} position={plat.p} size={plat.s} />
            ))}

            {entities.map((pos, i) => (
                <EntityCube
                    key={i}
                    position={pos}
                    onPosUpdate={(p) => { entityPositionsRef.current[i] = p; }}
                />
            ))}

            <ambientLight intensity={0.03} />
            <pointLight position={[0, 80, 0]} intensity={3} color="#00ffff" />

            <points>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={1500}
                        array={new Float32Array([...Array(4500)].map(() => (Math.random() - 0.5) * 400))}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial size={1.2} color="#00ffff" transparent opacity={0.5} sizeAttenuation />
            </points>
        </group>
    );
};
