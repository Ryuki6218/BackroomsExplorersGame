export interface FluorescentLightProps {
    position: [number, number, number];
    intensity?: number;
    color?: string;
    lightEnabled?: boolean;
}

export const FluorescentLight = ({
    position,
    intensity = 5,
    color = "#ffffff",
    lightEnabled = true
}: FluorescentLightProps) => {
    return (
        <group position={position}>
            {/* Light fixture - updated body color to be more industrial */}
            <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[1.5, 0.1, 0.3]} />
                <meshStandardMaterial color="#333333" />
            </mesh>
            {/* Glowing tube - uses emissive if light is enabled */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1.4, 0.05, 0.1]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={lightEnabled ? 2 : 0.5}
                />
            </mesh>
            {/* Actual light source - only if enabled */}
            {lightEnabled && (
                <pointLight
                    intensity={intensity}
                    distance={25}
                    decay={2}
                    color={color}
                />
            )}
        </group>
    );
};
