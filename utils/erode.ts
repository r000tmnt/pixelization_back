// OpenCV
import { getOpenCv } from '../lib/opencv.ts'

export const applyErode = async(src: any, strength: number) => {
    const { cv } = await getOpenCv()
    // console.log("OpenCV.js is ready!");

    let dst = new cv.Mat();

    // ====== 功能：Erode (腐蝕效果) ======
    // 建立結構元素 (Kernel)，通常是 3x3 或 5x5 的矩形
    // 核心尺寸越大，腐蝕（線條變細、白色縮小）的效果越劇烈
    const volume = Math.round(strength / 3)
    // console.log(volume)
    const size = strength < 1? 1 : strength + volume 
    let E = cv.getStructuringElement(cv.MORPH_CROSS, new cv.Size(size, size));
    // let D = cv.getStructuringElement(cv.MORPH_CROSS, new cv.Size(1, 1));

    // 直接對「彩色原圖」執行腐蝕效果
    // 參數說明：輸入, 輸出, 結構元素, 錨點(預設-1,-1為中心), 迭代次數(重覆執行幾次)
    cv.erode(src, dst, E, new cv.Point(-1, -1), 1);                  
    // cv.dilate(dstRGBA, dst, D, new cv.Point(-1, -1), 1)  

    E.delete();         // 不要忘記釋放結構元素！
    // D.delete();    

    return dst
}