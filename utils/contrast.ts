// OpenCV
import { getOpenCv } from '../lib/opencv.ts'

export const applyContrast = async(src: any) => {
    const { cv } = await getOpenCv()
    console.log("OpenCV.js is ready!");

    // 建立所需要的 Mat 物件 
    // let dist = new cv.Mat();
    let bgr = new cv.Mat();
    let lab = new cv.Mat();

    // 由於 cv.matFromImageData 讀入的是 RGBA，我們先轉成 BGR（OpenCV 標準彩色格式）
    cv.cvtColor(src, bgr, cv.COLOR_RGBA2BGR);
    // 再將 BGR 轉換到 Lab 色彩空間
    cv.cvtColor(bgr, lab, cv.COLOR_BGR2Lab);     
    
    // 將 Lab 圖片拆分為三個獨立的通道：L（亮度）、a（紅綠）、b（黃藍）
    let labPlanes = new cv.MatVector();
    cv.split(lab, labPlanes);          
    
    // 建立 CLAHE 物件並套用到 L 通道（亮度通道）
    // clipLimit: 限制對比度的閾值，數字越大對比越強（預設通常是 20 ~ 40）
    // tileGridSize: 將圖片分塊處理的大小（通常設為 8x8）
    let clahe = new cv.CLAHE(1, new cv.Size(8, 8));
    let l_enhanced = new cv.Mat();
    clahe.apply(labPlanes.get(0), l_enhanced);         
    
    // 將增強後的 L 通道放回，並重新合併三個通道
    labPlanes.set(0, l_enhanced);
    cv.merge(labPlanes, lab);          
    
    // 將結果一路轉回 RGBA 格式以便 Sharp 輸出
    let dstBGR = new cv.Mat();
    let dstRGBA = new cv.Mat();
    cv.cvtColor(lab, dstBGR, cv.COLOR_Lab2BGR);
    cv.cvtColor(dstBGR, dstRGBA, cv.COLOR_BGR2RGBA); 
    
    // 8. 記憶體管理：釋放所有物件
    src.delete();
    bgr.delete();
    lab.delete();
    l_enhanced.delete();
    dstBGR.delete();
    // dstRGBA.delete();
    clahe.delete();
    // 釋放 MatVector 及其內部的 Mat
    for (let i = 0; i < labPlanes.size(); i++) {
        labPlanes.get(i).delete();
    }
    labPlanes.delete();  
    
    return dstRGBA
}