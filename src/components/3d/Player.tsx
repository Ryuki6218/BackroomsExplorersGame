import { useRef, useEffect } from 'react';
import { useSphere } from '@react-three/cannon';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { PointerLockControls } from '@react-three/drei';
import { useGameStore } from '../../store/useGameStore';

const WALK_SPEED = 5;
const RUN_SPEED = 16;
const JUMP_FORCE = 5;
const STAMINA_DRAIN = 0.5;
const STAMINA_REGEN = 0.3;
const FATIGUE_RECOVERY_THRESHOLD = 30;

export const Player = () => {
    const { camera } = useThree();
    const { stamina, maxStamina, consumeStamina, recoverStamina, isPlaying, currentLevel, hp } = useGameStore();

    const [ref, api] = useSphere(() => {
        // Randomize spawn for Level 1 as requested
        let startPos: [number, number, number] = [4.5, 2, 4.5];
        if (currentLevel === 1) {
            startPos = [
                Math.random() * 60 + 10, // 10 to 70
                2,
                Math.random() * 60 + 10  // 10 to 70
            ];
        }

        return {
            mass: 1,
            type: 'Dynamic',
            position: startPos,
            fixedRotation: true,
            args: [0.5],
            material: { friction: 0, restitution: 0 }
        };
    });

    const velocity = useRef([0, 0, 0]);
    useEffect(() => api.velocity.subscribe((v) => (velocity.current = v)), [api.velocity]);

    const pos = useRef([0, 0, 0]);
    useEffect(() => api.position.subscribe((p) => (pos.current = p)), [api.position]);

    const movement = useRef({
        forward: false,
        backward: false,
        left: false,
        right: false,
        run: false,
        jump: false,
    });

    const isFatigued = useRef(false);
    const isGrounded = useRef(false);
    const lastJumpTime = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlaying) return;
            switch (e.code) {
                case 'KeyW': movement.current.forward = true; break;
                case 'KeyS': movement.current.backward = true; break;
                case 'KeyA': movement.current.left = true; break;
                case 'KeyD': movement.current.right = true; break;
                case 'ShiftLeft':
                case 'ShiftRight': movement.current.run = true; break;
                case 'Space':
                    // Set flag - logic inside useFrame handles the rest
                    movement.current.jump = true;
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (!isPlaying) return;
            switch (e.code) {
                case 'KeyW': movement.current.forward = false; break;
                case 'KeyS': movement.current.backward = false; break;
                case 'KeyA': movement.current.left = false; break;
                case 'KeyD': movement.current.right = false; break;
                case 'ShiftLeft':
                case 'ShiftRight': movement.current.run = false; break;
                case 'Space': movement.current.jump = false; break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [isPlaying]);

    useFrame(() => {
        if (!ref.current) return;

        // Ground check
        isGrounded.current = Math.abs(velocity.current[1]) < 0.15;

        camera.position.copy(new Vector3(pos.current[0], pos.current[1] + 0.6, pos.current[2]));

        // Fall detection (for Levels with bottomless pits like 816)
        if (pos.current[1] < -15) {
            api.position.set(0, 5, 0);
            api.velocity.set(0, 0, 0);
        }

        if (!isPlaying || hp <= 0) {
            api.velocity.set(0, velocity.current[1], 0);
            return;
        }

        const forward = new Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new Vector3();
        right.crossVectors(forward, new Vector3(0, 1, 0)).normalize();

        const direction = new Vector3();
        if (movement.current.forward) direction.add(forward);
        if (movement.current.backward) direction.sub(forward);
        if (movement.current.right) direction.add(right);
        if (movement.current.left) direction.sub(right);

        if (direction.length() > 0) direction.normalize();

        let currentSpeed = WALK_SPEED;
        if (direction.length() > 0 && movement.current.run && !isFatigued.current) {
            if (stamina > 0) {
                currentSpeed = RUN_SPEED;
                consumeStamina(STAMINA_DRAIN);
                if (stamina <= STAMINA_DRAIN * 2) isFatigued.current = true;
            } else {
                isFatigued.current = true;
            }
        } else {
            if (stamina < maxStamina) recoverStamina(STAMINA_REGEN);
            if (isFatigued.current && stamina > FATIGUE_RECOVERY_THRESHOLD) isFatigued.current = false;
        }

        direction.multiplyScalar(currentSpeed);

        // Simple velocity set for tight control
        api.velocity.set(direction.x, velocity.current[1], direction.z);

        // Jump Control - Only if grounded and cooldown passed
        if (movement.current.jump && isGrounded.current && Date.now() - lastJumpTime.current > 700) {
            api.velocity.set(velocity.current[0], JUMP_FORCE, velocity.current[2]);
            lastJumpTime.current = Date.now();
            // Note: we don't clear movement.current.jump because the key might be held,
            // but isGrounded being false will prevent loop
        }
    });

    return (
        <>
            {isPlaying && <PointerLockControls />}
            <mesh ref={ref as any} visible={false} />
        </>
    );
};
