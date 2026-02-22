import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';

export const Ambience = ({ active, level }: { active: boolean, level: number }) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    useEffect(() => {
        let heartbeatTimeout: any;

        if (active) {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const audioContext = audioContextRef.current;
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            // Stop previous oscillator if any
            if (oscillatorRef.current) {
                try {
                    oscillatorRef.current.stop();
                    oscillatorRef.current.disconnect();
                } catch (e) { /* ignore */ }
            }

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            if (level === 0) {
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(50, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.02, audioContext.currentTime);
            } else if (level === 1) {
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(30, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.04, audioContext.currentTime);
            } else if (level === 37) {
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(40, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.015, audioContext.currentTime);
            } else if (level === 816) {
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(30, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
            }

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start();

            oscillatorRef.current = oscillator;
            gainNodeRef.current = gainNode;

            // Heartbeat Pulse Logic
            const triggerHeartbeat = () => {
                if (!audioContextRef.current || !active) return;
                const state = useGameStore.getState();
                const panic = state.panicLevel;

                if (panic > 0) {
                    const thump = audioContext.createOscillator();
                    const thumpGain = audioContext.createGain();
                    thump.type = 'sine';
                    thump.frequency.setValueAtTime(60, audioContext.currentTime);
                    thump.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + 0.1);
                    thumpGain.gain.setValueAtTime(0, audioContext.currentTime);
                    thumpGain.gain.linearRampToValueAtTime(0.3 * panic, audioContext.currentTime + 0.02);
                    thumpGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
                    thump.connect(thumpGain);
                    thumpGain.connect(audioContext.destination);
                    thump.start();
                    thump.stop(audioContext.currentTime + 0.4);
                }
                const nextInterval = 800 - (panic * 500);
                heartbeatTimeout = setTimeout(triggerHeartbeat, nextInterval);
            };
            triggerHeartbeat();
        } else {
            if (audioContextRef.current && audioContextRef.current.state === 'running') {
                audioContextRef.current.suspend();
            }
        }

        return () => {
            if (oscillatorRef.current) {
                try {
                    oscillatorRef.current.stop();
                    oscillatorRef.current.disconnect();
                } catch (e) { /* ignore */ }
                oscillatorRef.current = null;
            }
            if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
        };
    }, [active, level]);

    return null;
};
