// OpenCV
import { getOpenCv } from '../lib/opencv.ts'
import { applyContrast } from './contrast.ts';
import { applyErode } from './erode.ts';

import sharp from 'sharp';

const getOpenCVsrc = async(
    rawData: Buffer<ArrayBuffer>, 
    width: number, 
    height: number,       
) => {
    const { cv } = await getOpenCv()
    // console.log("OpenCV.js is ready!");    

    const src = cv.matFromImageData({
        data: new Uint8ClampedArray(rawData),
        width,
        height
    });  
    
    return src
}

const alterSourceImage = async(
    rawData: Buffer<ArrayBuffer>, 
    width: number, 
    height: number,
    erode= 2,
    contrast= 1
) => {
    const src = await getOpenCVsrc(rawData, width, height)

    const dstContrast = contrast !== 0? await applyContrast(src, contrast) : {}

    const dstErode = await applyErode(contrast !== 0? dstContrast : src, erode)
    
    const newBytes = erode > 0? 
        await sharp(Buffer.from(dstErode.data), {
            raw: {
                width: width,
                height: height,
                channels: 4
            }
        })
        .ensureAlpha()
        .toBuffer() :
    
        contrast !== 0?
        await sharp(Buffer.from(dstContrast.data), {
            raw: {
                width: width,
                height: height,
                channels: 4
            }
        })
        .ensureAlpha()
        .toBuffer() : 

        Buffer.from([])     

    // Release memory
    if(contrast !== 0) dstContrast.delete()
    dstErode.delete()

    return newBytes.length > 0? newBytes : rawData
}

export {
    getOpenCVsrc,
    alterSourceImage
}