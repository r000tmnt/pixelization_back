// import palettes from "../config/palette.ts";
// import colorLuminance from 'color-luminance'

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

// const getColorByLuminance = async(luminance: Record<string, number[]>, lu: number, range: number) => {
//     let color: number[][] = []

//     const oa = Object.entries(luminance)

//     for(const light in luminance){
        
//         if(lu <= Number(light)){
//             color.push(luminance[light])
//         }else
//         if(Math.abs(lu - Number(light)) <= range){
//             color.push(luminance[light])
//         }else 
//         if(lu > Number(light)){
//             console.log('Pick current or previous color')
//             const index = oa.findIndex(v => Number(v[0]) === Number(light))
//             const rng = Math.random() * range
//             color.push(index > 0? oa[index - 1][1] : rng <= range? luminance[light] : oa[index + 1][1])
//         }
//     }
//     // console.log(lu)
//     // console.log(color)

//     return color
// }

// const mapColorByLuminance = (palette: number[][]) => {
//     const result: Record<string, number[]> = {}

//     const lus = []

//     // const steps = palette.length

//     // const per = 255/steps

//     // // console.log(per)

//     // for(let i=0; i < steps; i++){
//     //     result.push(per * (i+1))
//     // }

//     for(let i=0; i < palette.length; i++){
//         const c = palette[i]
//         const lu = colorLuminance(c[0], c[1], c[2])

//         lus.push(lu)

//         result[`${lu}`] = c
//     }

//     console.log('result', Object.entries(result).length)
//     console.log('palette', palette.length)


//     return { result, range: Math.round(lus[lus.length - 1] - lus[0]) }
// }

// const sortColorByLuminance = (customPalette: number[][] = []) => {
//     if(!customPalette.length){
//         for(const style in palettes){
//             palettes[style].sort((a: number[], b: number[]) => {
//                 const cla = colorLuminance(a[0], a[1], a[2])
//                 const clb = colorLuminance(b[0], b[1], b[2])

//                 return cla - clb
//             })
//         }        

//         // console.log(palettes)

//         return palettes
//     }else{
//         customPalette.sort((a: number[], b: number[]) => {
//             const cla = colorLuminance(a[0], a[1], a[2])
//             const clb = colorLuminance(b[0], b[1], b[2])

//             return cla - clb
//         })

//         return customPalette
//     }
// }

// sortColorByLuminance()

export {
    getClosestColorIndex,
    // getColorByLuminance,
    // mapColorByLuminance
}