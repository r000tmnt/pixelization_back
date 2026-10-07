import express, { type Express, type Request, type Response } from 'express';
import formidable, {errors as formidableErrors} from 'formidable';
import sharp from 'sharp';
import palettes from '../config/palette.ts';
import { 
    fsDithering, 
    baDithering,
    ordered 
} from '../utils/dithering.ts';
import logger from '../utils/logger.ts';
// import fs from 'fs'

const router = express.Router();

router.post('/convert', async (req: Request, res: Response) => {
    sharp.cache(false);

    const form = formidable({})

    try {
        const [fields, files] = await form.parse(req);

        // console.log('fields', fields);

        const { 
            pixelSize, 
            palette, 
            ditherStrength, 
            erodeStrength,
            contrastStrength,
            ditherStyle,
            customColors 
        } = fields;

        if (!files.file) {
            res.status(400).send('No file uploaded');
            return;
        }
        else{
            // console.log('files.file[0]', files.file[0])
            // Handle the uploaded file here

            // Read the metadata from the image file

            let min = 0

            switch(Number(pixelSize)){
                case 2:
                    min = 256;
                break;
                case 4:
                    min = 170;
                break;
                case 6:
                    min = 113;
                break;
                case 8:
                    min = 75;
                break;
            }

            const metadata = await sharp(files.file[0].filepath).metadata();
            
            // Destructure width and height
            const { width, height } = metadata;
            
            // console.log(`Width: ${width}px, Height: ${height}px`);

            const isLandscape = width >= height;

            const newWidth = isLandscape
                ? min
                : Math.max(1, Math.round(min * (width / height)));

            const newHeight = isLandscape
                ? Math.max(1, Math.round(min * (height / width)))
                : min;
            // console.log(`tempWidth: ${tempWidth}px, tempHeight: ${tempHeight}px`)

            if(palette && palette[0] && palette[0] !== 'original'){
                // console.log(palette)

                let color : number[][] = []
                
                // if(customColors && customColors[0]){
                
                // console.log('customColors', customColors)

                if(customColors && customColors[0]){
                    customColors[0].split(';').map((hex: string) => {
                        // Parse the hex substrings into base-10 integers
                        const r = parseInt(hex.substring(1, 3), 16);
                        const g = parseInt(hex.substring(3, 5), 16);
                        const b = parseInt(hex.substring(5, 7), 16);

                        color.push([r, g, b]);
                    })
                }else{
                    color = palettes[palette[0]]
                }

                // console.log(color)

                const rawBytes = await sharp(files.file[0].filepath, { failOn: 'none' })
                .autoOrient()
                .resize({ width: newWidth, height: newHeight, fit: 'inside',})
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

                logger.info('Image loaded for conversion', { image: rawBytes.info });

                const { width: outputWidth, height: outputHeight, channels: outputChannels } = rawBytes.info;

                const style = ditherStyle? ditherStyle[0] : 'default'

                let result: Buffer<ArrayBuffer>

                switch(style){
                    case 'default':
                        result = await fsDithering({
                            color,
                            rawData: rawBytes.data,
                            width: outputWidth,
                            height: outputHeight,
                            strength: Number(ditherStrength),
                            erode: Number(erodeStrength),
                            contrast: Number(contrastStrength),
                            channels: outputChannels
                        })                        
                    break;
                    case 'matted':
                        result = await baDithering({
                            color,
                            rawData: rawBytes.data,
                            width: outputWidth,
                            height: outputHeight,
                            strength: Number(ditherStrength),
                            erode: Number(erodeStrength),
                            contrast: Number(contrastStrength),                            
                            channels: outputChannels
                        })                            
                    break;
                    case 'grid':
                        result = await ordered({
                            color,
                            rawData: rawBytes.data,
                            width: outputWidth,
                            height: outputHeight,               
                            channels: outputChannels,
                            erode: Number(erodeStrength),
                            contrast: Number(contrastStrength),                            
                            strength: Number(ditherStrength),         
                        })                        
                    break;
                    default:
                        result = await fsDithering({
                            color,
                            rawData: rawBytes.data,
                            width: outputWidth,
                            height: outputHeight,
                            strength: Number(ditherStrength),
                            erode: Number(erodeStrength),
                            contrast: Number(contrastStrength),                            
                            channels: outputChannels
                        })                          
                    break;
                }

                // 7. 使用 Sharp 將 OpenCV 的數據寫回圖片檔案                
                await sharp(result, {
                    raw: {
                        width: rawBytes.info.width,
                        height: rawBytes.info.height,
                        channels: rawBytes.info.channels
                    }
                })
                // .resize({ width: newWidth, height: newHeight, fit: 'inside', kernel: sharp.kernel.nearest})
                .png()
                .toBuffer()
                .then(async function (data) {
                    // console.log(data);
                    // const result = await sharp(data).resize({ width: width, height: height, kernel: sharp.kernel.nearest }).toBuffer();

                    let base64Encoded = data.toString("base64");
                    const url = `data:image/png;base64,${base64Encoded}`;

                    // res.status(200).send({ data: url, width: newWidth, height: newHeight });
                    res.status(200).send({ data: url, width: rawBytes.info.width, height: rawBytes.info.height });
                });                   
            }else{
                const rawBytes = await sharp(files.file[0].filepath, { failOn: 'none' })
                                .autoOrient()
                                .resize({ width: newWidth, height: newHeight, fit: 'inside', kernel: sharp.kernel.lanczos3})
                                .ensureAlpha()
                                .raw()
                                .toBuffer({ resolveWithObject: true });

                await sharp(rawBytes.data, {
                    raw: {
                        width: rawBytes.info.width,
                        height: rawBytes.info.height,
                        channels: rawBytes.info.channels
                    }
                })
                .png()
                .toBuffer()    
                .then(async function (data) {
                    // console.log(data);
                    // const result = await sharp(data).resize({ width: width, height: height, kernel: sharp.kernel.nearest }).toBuffer();

                    let base64Encoded = data.toString("base64");
                    const url = `data:image/png;base64,${base64Encoded}`;

                    res.status(200).send({ data: url, width: rawBytes.info.width, height: rawBytes.info.height });
                });                
            }


        }
    } catch (err: any) {
        // example to check for a very specific error
        // if (err.code === formidableErrors.maxFieldsExceeded) {

        // }
        logger.error('Image conversion failed', {
            error: {
                name: err instanceof Error ? err.name : 'Error',
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
            },
        });
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));
        return;
    }
})

export default router
