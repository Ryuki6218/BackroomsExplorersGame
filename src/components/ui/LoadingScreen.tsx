import React from 'react';

export const LoadingScreen: React.FC = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            color: '#b8a65e',
            fontFamily: '"Courier New", Courier, monospace',
            userSelect: 'none'
        }}>
            <div style={{
                fontSize: '2rem',
                letterSpacing: '0.5rem',
                marginBottom: '1rem',
                animation: 'pulse 1s infinite alternate'
            }}>
                LOADING NEW AREA
            </div>
            <div style={{
                width: '300px',
                height: '4px',
                backgroundColor: '#333',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#b8a65e',
                    animation: 'load 2s ease-in-out infinite'
                }} />
            </div>

            <style>
                {`
                    @keyframes pulse {
                        from { opacity: 1; }
                        to { opacity: 0.3; }
                    }
                    @keyframes load {
                        0% { transform: translateX(-100%); }
                        50% { transform: translateX(0); }
                        100% { transform: translateX(100%); }
                    }
                `}
            </style>
        </div>
    );
};
