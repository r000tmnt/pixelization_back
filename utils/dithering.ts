import { getClosestColorIndex } from './color.ts';

//bayerMatrix 
const bayerMatrix_8x8 = [
    [ 0, 32,  8, 40,  2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44,  4, 36, 14, 46,  6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [ 3, 35, 11, 43,  1, 33,  9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47,  7, 39, 13, 45,  5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
];

const spread = 255 / 64;   

const channelOffset = (x: number, y: number, outputWidth: number, outputChannels: number) =>
    (y * outputWidth + x) * outputChannels;

const clampChannel = (value: number) => Math.max(0, Math.min(255, value));

const errorDiffusion = async(payload: {
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

const ordered = async(payload: {
    color: number[][],
    rawData: Buffer<ArrayBuffer>, 
    width: number, 
    height: number,
    channels: number
}) => {
    const { color, rawData, width, height, channels } = payload

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const offset = channelOffset(x, y, width, channels);

            // Preserve fully transparent pixels and do not dither into them.
            if (rawData[offset + 3] === 0) continue;

            // 1. Get matrix value (0 to 63) and map it to a central bias (-128 to 128 scale)
            const matrixValue = bayerMatrix_8x8[y % 8][x % 8];
            const bias = (matrixValue - 31.5) * spread;

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
    errorDiffusion,
    ordered
}