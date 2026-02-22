import { create } from 'zustand';

interface GameState {
    isPlaying: boolean;
    isMenuOpen: boolean;
    volume: number;
    hp: number;
    maxHp: number;
    stamina: number;
    maxStamina: number;
    currentLevel: number;
    isLoading: boolean;
    panicLevel: number;
    setIsPlaying: (isPlaying: boolean) => void;
    setIsMenuOpen: (isOpen: boolean) => void;
    setVolume: (volume: number) => void;
    toggleMenu: () => void;
    setHp: (hp: number) => void;
    setStamina: (stamina: number) => void;
    heal: (amount: number) => void;
    damage: (amount: number) => void;
    consumeStamina: (amount: number) => void;
    recoverStamina: (amount: number) => void;
    setLevel: (level: number) => void;
    setIsLoading: (loading: boolean) => void;
    setPanicLevel: (level: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
    isPlaying: false,
    isMenuOpen: false,
    volume: 0.5,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    currentLevel: 0,
    isLoading: false,
    panicLevel: 0,

    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setIsMenuOpen: (isMenuOpen) => set({ isMenuOpen }),
    setVolume: (volume) => set({ volume }),
    toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),

    setHp: (hp) => set({ hp }),
    setStamina: (stamina) => set({ stamina }),
    heal: (amount) => set((state) => ({ hp: Math.min(state.hp + amount, state.maxHp) })),
    damage: (amount) => set((state) => ({ hp: Math.max(state.hp - amount, 0) })),
    consumeStamina: (amount) => set((state) => ({ stamina: Math.max(state.stamina - amount, 0) })),
    recoverStamina: (amount) => set((state) => ({ stamina: Math.min(state.stamina + amount, state.maxStamina) })),
    setLevel: (level) => set({ currentLevel: level, isPlaying: false, hp: 100, stamina: 100, panicLevel: 0 }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setPanicLevel: (panicLevel) => set({ panicLevel }),
}));
