const getClosestColorIndex = (
    config: {
        palette: number[][], 
        r: number, 
        g: number, 
        b: number
    }
) => {
    let bestIndex = 0;
    let bestDistance = Infinity;

    const { palette, r, g ,b } = config

    for (let i = 0; i < palette.length; i++) {
        const [pr, pg, pb] = palette[i];

        const dr = r - pr;
        const dg = g - pg;
        const db = b - pb;

        const distance =
            dr * dr +
            dg * dg +
            db * db;

        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
        }
    }

    return bestIndex;
}

export {
    getClosestColorIndex
}