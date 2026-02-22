import { useState, useEffect } from 'react';

export type CellType = 'wall' | 'floor';

interface MapData {
    grid: CellType[][];
    width: number;
    height: number;
    startPosition: [number, number];
}

const WALL = 'wall';
const FLOOR = 'floor';

// Simple Depth-First Search (Recursive Backtracker) Maze Generation
export const useMapGeneration = (width: number = 20, height: number = 20): MapData => {
    const [mapData, setMapData] = useState<MapData>({
        grid: [],
        width,
        height,
        startPosition: [1, 1],
    });

    useEffect(() => {
        generateMap();
    }, [width, height]);

    const generateMap = () => {
        // Initialize grid with walls
        // Ensure dimensions are odd for the maze algorithm
        const actualWidth = width % 2 === 0 ? width + 1 : width;
        const actualHeight = height % 2 === 0 ? height + 1 : height;

        const newGrid: CellType[][] = Array(actualHeight).fill(null).map(() => Array(actualWidth).fill(WALL));

        const stack: [number, number][] = [];
        const startX = 1;
        const startY = 1;

        newGrid[startY][startX] = FLOOR;
        stack.push([startX, startY]);

        while (stack.length > 0) {
            const [currentX, currentY] = stack[stack.length - 1];

            const neighbors = getNeighbors(currentX, currentY, actualWidth, actualHeight, newGrid);

            if (neighbors.length > 0) {
                // Choose random neighbor
                const [nextX, nextY] = neighbors[Math.floor(Math.random() * neighbors.length)];

                // Remove wall between current and next
                newGrid[(currentY + nextY) / 2][(currentX + nextX) / 2] = FLOOR;
                newGrid[nextY][nextX] = FLOOR;

                stack.push([nextX, nextY]);
            } else {
                stack.pop();
            }
        }

        // Add some randomness/loops to make it less perfect maze (more like rooms)
        for (let i = 0; i < (actualWidth * actualHeight) * 0.1; i++) {
            const x = Math.floor(Math.random() * (actualWidth - 2)) + 1;
            const y = Math.floor(Math.random() * (actualHeight - 2)) + 1;
            if (newGrid[y][x] === WALL) {
                // Check if it connects two floor cells
                let connections = 0;
                if (newGrid[y - 1][x] === FLOOR) connections++;
                if (newGrid[y + 1][x] === FLOOR) connections++;
                if (newGrid[y][x - 1] === FLOOR) connections++;
                if (newGrid[y][x + 1] === FLOOR) connections++;

                if (connections >= 2) {
                    newGrid[y][x] = FLOOR;
                }
            }
        }

        setMapData({
            grid: newGrid,
            width: actualWidth,
            height: actualHeight,
            startPosition: [startX, startY],
        });
    };

    const getNeighbors = (x: number, y: number, w: number, h: number, grid: CellType[][]) => {
        const neighbors: [number, number][] = [];
        const directions = [
            [0, -2], // Up
            [0, 2],  // Down
            [-2, 0], // Left
            [2, 0],  // Right
        ];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && grid[ny][nx] === WALL) {
                neighbors.push([nx, ny]);
            }
        }

        return neighbors;
    };

    return mapData;
};
