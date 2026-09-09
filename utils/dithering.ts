import { getClosestColorIndex } from './color.ts';

//bayerMatrix 
import matrix from '../config/matrix.ts';

const channelOffset = (x: number, y: number, outputWidth: number, outputChannels: number) =>
    (y * outputWidth + x) * outputChannels;

const clampChannel = (value: number) => Math.max(0, Math.min(255, value));

const fsDithering = async(payload: {
    color: number[][],
    rawData: Buffer<ArrayBuffer>, 
    width: number, 
    height: number,
    channels: number,
    strength: number
}) => {
    const { color, rawData, width, height, strength, channels } = payload

    const workingPixels = Float32Array.from(rawData);

    // Floyd-Steinberg dithering carries the colour not represented by one
    // palette pixel into neighbouring unprocessed pixels.
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const offset = channelOffset(x, y, width, channels);

            // Preserve fully transparent pixels and do not dither into them.
            if (rawData[offset + 3] === 0) continue;

            const r = clampChannel(workingPixels[offset]);
            const g = clampChannel(workingPixels[offset + 1]);
            const b = clampChannel(workingPixels[offset + 2]);   
            
            const colorIndex = getClosestColorIndex({ palette: color, r, g, b });
            const colorSelect = color[colorIndex];

            const errorR = r - colorSelect[0];
            const errorG = g - colorSelect[1];
            const errorB = b - colorSelect[2];          
            
            rawData[offset] = colorSelect[0];
            rawData[offset + 1] = colorSelect[1];
            rawData[offset + 2] = colorSelect[2];

            const distributeError = (targetX: number, targetY: number, weight: number) => {
                if (targetX < 0 || targetX >= width || targetY >= height) return;

                const targetOffset = channelOffset(targetX, targetY, width, channels);
                if (rawData[targetOffset + 3] === 0) return;

                workingPixels[targetOffset] += errorR * weight * strength;
                workingPixels[targetOffset + 1] += errorG * weight * strength;
                workingPixels[targetOffset + 2] += errorB * weight * strength;
            };

            distributeError(x + 1, y, 7 / 16);
            distributeError(x - 1, y + 1, 3 / 16);
            distributeError(x, y + 1, 5 / 16);
            distributeError(x + 1, y + 1, 1 / 16);            
        }
    }    

    return rawData
}

const baDithering = async(payload: {
    color: number[][],
    rawData: Buffer<ArrayBuffer>, 
    width: number, 
    height: number,
    channels: number,
    strength: number    
})=> {
    const { color, rawData, width, height, strength, channels } = payload

    const workingPixels = Float32Array.from(rawData);

    // Helper to safely add color error to neighboring pixels
    const addError = (x: number, y: number, errR: number, errG: number, errB: number) => {
        if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4;
            workingPixels[idx]     += errR * strength;
            workingPixels[idx + 1] += errG * strength;
            workingPixels[idx + 2] += errB * strength;
        }
    }
    
    // Bill Atkinson's dithering algorithm is an error-diffusion technique developed at Apple for MacPaint. 
    // It differs from Floyd-Steinberg because it only diffuses 75% of the error across 6 neighboring pixels (each receiving 1/8 of the total error) instead of 100%. 
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const offset = channelOffset(x, y, width, channels);

            // Preserve fully transparent pixels and do not dither into them.
            if (rawData[offset + 3] === 0) continue;

            const r = clampChannel(workingPixels[offset]);
            const g = clampChannel(workingPixels[offset + 1]);
            const b = clampChannel(workingPixels[offset + 2]);          
            
            const colorIndex = getClosestColorIndex({ palette: color, r, g, b });
            const colorSelect = color[colorIndex];

            const errorR = Math.floor((r - colorSelect[0]) / 8);
            const errorG = Math.floor((g - colorSelect[1]) / 8);
            const errorB = Math.floor((b - colorSelect[2]) / 8);              
            
            rawData[offset] = colorSelect[0];
            rawData[offset + 1] = colorSelect[1];
            rawData[offset + 2] = colorSelect[2];

            // Diffuse the 1/8th error to the 6 Atkinson neighbors
            if (errorR !== 0 || errorG !== 0 || errorB !== 0) {  
                addError(x + 1, y,     errorR, errorG, errorB); // Right
                addError(x + 2, y,     errorR, errorG, errorB); // Two Right
                addError(x - 1, y + 1, errorR, errorG, errorB); // Bottom Left
                addError(x,     y + 1, errorR, errorG, errorB); // Bottom
                addError(x + 1, y + 1, errorR, errorG, errorB); // Bottom Right
                addError(x,     y + 2, errorR, errorG, errorB); // Two Down
             }                 
        }
    }    

    return rawData    
}

const ordered = async(payload: {
    color: number[][],
    rawData: Buffer<ArrayBuffer>, 
    width: number, 
    height: number,
    channels: number,
    strength: number
}) => {
    const { color, rawData, width, height, channels, strength } = payload

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const offset = channelOffset(x, y, width, channels);

            // Preserve fully transparent pixels and do not dither into them.
            if (rawData[offset + 3] === 0) continue;
            

            // 1. Get matrix value (0 to max) and map it to a central bias (-128 to 128 scale)
            const config = matrix[String(strength) as keyof typeof matrix];
            const matrixValue = config.map[y % strength][x % strength];
            const maxColor = ((strength * strength) - 1) / 2
            const bias = (matrixValue - maxColor) * config.spread;

            // console.log(`maxColor Value: ${maxColor}, Bias: ${bias}`);

            // 2. Apply dither bias to the raw pixel channels
            // Clamp between 0-255 so we don't blow out color math
            const r = Math.min(255, Math.max(0, rawData[offset]     + bias));
            const g = Math.min(255, Math.max(0, rawData[offset + 1] + bias));
            const b = Math.min(255, Math.max(0, rawData[offset + 2] + bias));                        


            const colorIndex = getClosestColorIndex({ palette: color, r, g, b });
            const colorSelect = color[colorIndex];

            rawData[offset] = colorSelect[0];
            rawData[offset + 1] = colorSelect[1];
            rawData[offset + 2] = colorSelect[2];            

        }        
    }

    return rawData
}

export {
    fsDithering,
    baDithering,
    ordered
}