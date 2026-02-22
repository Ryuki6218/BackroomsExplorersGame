import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Level0 } from './components/3d/Level0'
import { Level1 } from './components/3d/Level1'
import { Player } from './components/3d/Player'
import { Menu } from './components/ui/Menu'
import { Ambience } from './components/audio/Ambience'
import { useGameStore } from './store/useGameStore'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { Level37 } from './components/3d/Level37'
import { Level816 } from './components/3d/Level816'

function App() {
    const { isPlaying, setIsPlaying, currentLevel, setLevel, isLoading, hp, panicLevel } = useGameStore();

    // Game Over handling
    useEffect(() => {
        if (hp <= 0 && isPlaying) {
            const timer = setTimeout(() => {
                setLevel(currentLevel); // Reset and back to title
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [hp, isPlaying, setLevel, currentLevel]);

    return (
        <div className="w-full h-screen bg-black relative overflow-hidden">
            {isLoading && <LoadingScreen />}
            <Canvas>
                <Physics gravity={[0, -9.8, 0]} defaultContactMaterial={{ friction: 0, restitution: 0, contactEquationStiffness: 1e7 }}>
                    {currentLevel === 0 && <Level0 />}
                    {currentLevel === 1 && <Level1 />}
                    {currentLevel === 37 && <Level37 />}
                    {currentLevel === 816 && <Level816 />}
                    <Player />
                </Physics>
            </Canvas>

            <Menu />
            <Ambience active={isPlaying && hp > 0} level={currentLevel} />

            {/* Panic Overlay */}
            {isPlaying && hp > 0 && (
                <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-30"
                    style={{
                        background: 'radial-gradient(circle, transparent 30%, rgba(180, 0, 0, 0.6) 100%)',
                        opacity: panicLevel
                    }}
                />
            )}

            {/* Game Over Screen */}
            {hp <= 0 && isPlaying && (
                <div className="absolute inset-0 bg-red-950/80 flex items-center justify-center z-50 animate-in fade-in duration-1000">
                    <div className="text-center">
                        <h2 className="text-8xl font-black text-red-600 tracking-tighter mb-4 blur-[1px] animate-pulse">LOST IN THE VOID</h2>
                        <p className="text-white/60 font-mono tracking-[0.5em] uppercase">Identity Dissolved...</p>
                        <div className="mt-12 h-1 w-64 bg-white/10 mx-auto overflow-hidden">
                            <div className="h-full bg-red-600 animate-[loading_4s_linear]" style={{ width: '100%' }} />
                        </div>
                    </div>
                </div>
            )}

            {!isPlaying && (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/90 text-white z-40 cursor-default">
                    <div className="text-center space-y-8">
                        <div>
                            <h1 className="text-6xl font-bold mb-2 text-yellow-600 tracking-widest uppercase">The Backrooms</h1>
                            <p className="text-gray-400 tracking-wider">Liminal Space Exploration</p>
                        </div>

                        <div className="flex flex-wrap gap-4 justify-center max-w-2xl px-4">
                            <button
                                onClick={(e) => { e.stopPropagation(); setLevel(0); setIsPlaying(true); }}
                                className={`px-8 py-4 border border-yellow-800 rounded hover:bg-yellow-900/50 transition-all ${currentLevel === 0 ? 'bg-yellow-900/30 ring-2 ring-yellow-600' : ''}`}
                            >
                                <h2 className="text-2xl font-bold mb-1">Level 0</h2>
                                <p className="text-sm text-yellow-500">"The Lobby"</p>
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); setLevel(1); setIsPlaying(true); }}
                                className={`px-8 py-4 border border-blue-900 rounded hover:bg-blue-900/50 transition-all ${currentLevel === 1 ? 'bg-blue-900/30 ring-2 ring-blue-600' : ''}`}
                            >
                                <h2 className="text-2xl font-bold mb-1">Level 1</h2>
                                <p className="text-sm text-blue-400">"Habitable Zone"</p>
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); setLevel(37); setIsPlaying(true); }}
                                className={`px-8 py-4 border border-teal-900 rounded hover:bg-teal-900/50 transition-all ${currentLevel === 37 ? 'bg-teal-900/30 ring-2 ring-teal-600' : ''}`}
                            >
                                <h2 className="text-2xl font-bold mb-1">Level 37</h2>
                                <p className="text-sm text-teal-400">"The Poolrooms"</p>
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); setLevel(816); setIsPlaying(true); }}
                                className={`px-8 py-4 border border-pink-900 rounded hover:bg-pink-900/50 transition-all ${currentLevel === 816 ? 'bg-pink-900/30 ring-2 ring-pink-600' : ''}`}
                            >
                                <h2 className="text-2xl font-bold mb-1">Level 816</h2>
                                <p className="text-sm text-pink-400">"The Neon Void"</p>
                            </button>
                        </div>

                        <div className="mt-8 text-sm text-gray-500">
                            <p className="animate-pulse">Select a Level to Enter</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
