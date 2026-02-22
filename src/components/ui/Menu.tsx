import { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';

export const Menu = () => {
    const {
        isMenuOpen, setIsMenuOpen,
        volume, setVolume,
        hp, maxHp,
        stamina, maxStamina,
        currentLevel, setLevel,
        isPlaying, setIsPlaying
    } = useGameStore();

    const levelInfo = currentLevel === 0
        ? { title: "Level 0", subtitle: "\"The Lobby\"", class: 1 }
        : currentLevel === 1
            ? { title: "Level 1", subtitle: "\"Habitable Zone\"", class: 1 }
            : currentLevel === 37
                ? { title: "Level 37", subtitle: "Sublimity / The Poolrooms", class: 1 }
                : { title: "Level 816", subtitle: "\"The Neon Void\"", class: 4 };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlaying) return;
            if (e.code === 'Escape') {
                if (!isMenuOpen) {
                    document.exitPointerLock();
                }
                setIsMenuOpen(!isMenuOpen);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMenuOpen, setIsMenuOpen, isPlaying]);

    if (!isPlaying) return null; // Hide HUD on title screen

    const openMenu = () => {
        document.exitPointerLock();
        setIsMenuOpen(true);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    // Logic to determine if stamina bar should be shown
    // Show if stamina is regenerating or consumed (not full)
    const showStamina = stamina < maxStamina;

    if (!isMenuOpen) return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Top Left: Menu Button */}
            <div className="absolute top-4 left-4 flex justify-between w-[calc(100%-2rem)]">
                <div>
                    <p className="text-xl font-mono text-white/50">{levelInfo.title}</p>
                    <p className="text-sm text-white/50">{levelInfo.subtitle}</p>
                    <p className="text-xs font-mono text-yellow-500/60 mt-1">Survival Class {levelInfo.class}</p>
                </div>
                <button
                    onClick={openMenu}
                    className="pointer-events-auto bg-neutral-800/50 hover:bg-neutral-700/80 text-white px-4 py-2 rounded border border-white/20 transition-all backdrop-blur-sm self-start pointer-cursor"
                >
                    ⚙️ MENU
                </button>
            </div>

            {/* Bottom Left: HP Bar */}
            <div className="absolute bottom-4 left-4 w-64">
                <div className="flex justify-between text-white/80 text-sm mb-1 uppercase font-bold tracking-wider">
                    <span>Health</span>
                    <span>{Math.ceil(hp)} / {maxHp}</span>
                </div>
                <div className="h-4 bg-black/50 border border-white/20 rounded-sm overflow-hidden backdrop-blur-sm">
                    <div
                        className="h-full bg-red-600 transition-all duration-300 ease-out"
                        style={{ width: `${(hp / maxHp) * 100}%` }}
                    />
                </div>
            </div>

            {/* Right Side: Stamina Bar (As requested: "画面右らへん") */}
            <div className={`absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center transition-opacity duration-500 ${showStamina ? 'opacity-100' : 'opacity-0'}`}>
                <div className="h-48 w-4 bg-black/50 border border-white/20 rounded-full overflow-hidden backdrop-blur-sm relative">
                    <div
                        className="absolute bottom-0 w-full bg-yellow-500 transition-all duration-100 ease-linear"
                        style={{ height: `${(stamina / maxStamina) * 100}%` }}
                    />
                </div>
                <span className="mt-2 text-yellow-500 font-bold text-xs uppercase tracking-widest drop-shadow-md">Stamina</span>
            </div>

            {/* Bottom Right: Hint */}
            <div className="absolute bottom-4 right-4 text-white/50 text-sm font-mono bg-black/40 px-3 py-1 rounded backdrop-blur-sm">
                Press <span className="text-yellow-500 font-bold">Esc</span> to show cursor
            </div>
        </div>
    );

    // Menu Modal
    return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white z-50">
            <div className="bg-neutral-900 p-8 rounded-lg max-w-md w-full border border-neutral-700 shadow-2xl shadow-yellow-900/20">
                <h2 className="text-3xl font-bold mb-6 text-yellow-600 tracking-widest border-b border-neutral-700 pb-4">PAUSED</h2>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-semibold mb-3 text-gray-200">Controls</h3>
                        <ul className="text-gray-400 space-y-2 text-sm">
                            <li className="flex justify-between"><span>Move</span> <span className="font-mono text-yellow-500">WASD</span></li>
                            <li className="flex justify-between"><span>Run</span> <span className="font-mono text-yellow-500">Shift + Move</span></li>
                            <li className="flex justify-between"><span>Look</span> <span className="font-mono text-yellow-500">Mouse</span></li>
                            <li className="flex justify-between"><span>Menu</span> <span className="font-mono text-yellow-500">ESC / Button</span></li>
                        </ul>
                    </div>

                    <div className="pt-4 border-t border-neutral-700">
                        <h3 className="text-xl font-semibold mb-3 text-gray-200">Settings</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-gray-400">
                                <label>Master Volume</label>
                                <span>{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-full accent-yellow-600 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <button
                        onClick={closeMenu}
                        className="w-full mt-6 py-3 bg-yellow-700 hover:bg-yellow-600 text-white font-bold rounded transition-colors uppercase tracking-wider"
                    >
                        Resume Game
                    </button>

                    <button
                        onClick={() => {
                            setLevel(currentLevel);
                            setIsPlaying(false);
                            setIsMenuOpen(false);
                        }}
                        className="w-full mt-4 py-3 bg-red-900/20 border border-red-900/50 text-red-400 hover:bg-red-900/40 font-bold rounded transition-colors uppercase tracking-wider"
                    >
                        Quit to Title
                    </button>
                </div>
            </div>
        </div>
    );
};
