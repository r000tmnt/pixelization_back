// OpenCV
import { getOpenCv } from '../lib/opencv.ts'

export const getOpenCVsrc = async(
    rawData: Buffer<ArrayBuffer>, 
    width: number, 
    height: number,       
) => {
    const { cv } = await getOpenCv()
    console.log("OpenCV.js is ready!");    

    const src = cv.matFromImageData({
        data: new Uint8ClampedArray(rawData),
        width,
        height
    });  
    
    return src
}