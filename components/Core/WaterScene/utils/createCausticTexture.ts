/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';

// Helper to generate a random number within a range
const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Simple hash function for pseudo-randomness based on a seed
function hash(n: number) {
    let x = Math.sin(n) * 43758.5453;
    return x - Math.floor(x);
}

class CausticGenerator {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private texture: THREE.CanvasTexture;
    private points: { x: number; y: number; speed: number, offset: number }[] = [];
    private size: number;

    constructor(size = 256) {
        this.size = size;
        this.canvas = document.createElement('canvas');
        this.canvas.width = size;
        this.canvas.height = size;
        const context = this.canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get 2D context from canvas');
        }
        this.ctx = context;
        
        // Use a more intense blur for a softer effect
        this.ctx.filter = 'blur(10px)';

        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.wrapT = THREE.RepeatWrapping;

        this.generatePoints(30);
    }

    private generatePoints(count: number) {
        for (let i = 0; i < count; i++) {
            this.points.push({
                x: hash(i * 10.3) * this.size,
                y: hash(i * 20.7) * this.size,
                speed: rand(0.05, 0.15),
                offset: rand(0, Math.PI * 2)
            });
        }
    }

    public update(time: number) {
        // 1. Clear and set background
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.size, this.size);

        // 2. Draw the light shapes
        this.ctx.globalCompositeOperation = 'lighter';

        this.points.forEach(p => {
            const t = time * p.speed + p.offset;
            const x = p.x + Math.sin(t) * 20;
            const y = p.y + Math.cos(t * 0.8) * 20;

            this.drawSpot(x, y);
        });

        this.texture.needsUpdate = true;
    }

    private drawSpot(x: number, y: number) {
        const ctx = this.ctx;
        const size = this.size;
        
        // Create a radial gradient for a soft falloff
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 0.15);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

    public getTexture(): THREE.CanvasTexture {
        return this.texture;
    }
}

export const createCausticGenerator = (size = 256) => {
    return new CausticGenerator(size);
};
