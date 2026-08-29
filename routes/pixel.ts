import express, { type Express, type Request, type Response } from 'express';
import formidable, {errors as formidableErrors} from 'formidable';
import sharp from 'sharp';
import palettes from '../config/palette.ts';
import { getClosestColorIndex } from '../utils/color.ts';
// import fs from 'fs'

const router = express.Router();

router.post('/convert', async (req: Request, res: Response) => {
    const form = formidable({})

    try {
        const [fields, files] = await form.parse(req);

        // console.log('fields', fields);

        const { pixelSize, palette } = fields;

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
                    min = 128;
                break;
                case 6:
                    min = 64;
                break;
                case 8:
                    min = 32;
                break;
            }

            const metadata = await sharp(files.file[0].filepath).metadata();
            
            // Destructure width and height
            const { width, height } = metadata;
            
            console.log(`Width: ${width}px, Height: ${height}px`);

            const isLandscape = width >= height;
            const newWidth = isLandscape
                ? min
                : Math.max(1, Math.round(min * (width / height)));
            const newHeight = isLandscape
                ? Math.max(1, Math.round(min * (height / width)))
                : min;

            if(palette && palette[0] && palette[0] !== 'original'){
                // console.log(palette)

                const color = palettes[palette[0]]

                console.log(color)

                const rawBytes = await sharp(files.file[0].filepath)
                .resize({ width: newWidth, height: newHeight, kernel: sharp.kernel.nearest })
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

                console.log('rawBytes', rawBytes.info)

                const { width: outputWidth, height: outputHeight, channels: outputChannels } = rawBytes.info;
                const workingPixels = Float32Array.from(rawBytes.data);
                const ditherStrength = 0.35;

                const channelOffset = (x: number, y: number) =>
                    (y * outputWidth + x) * outputChannels;

                const clampChannel = (value: number) => Math.max(0, Math.min(255, value));

                // Floyd-Steinberg dithering carries the colour not represented by one
                // palette pixel into neighbouring unprocessed pixels.
                for (let y = 0; y < outputHeight; y++) {
                    for (let x = 0; x < outputWidth; x++) {
                        const offset = channelOffset(x, y);

                        // Preserve fully transparent pixels and do not dither into them.
                        if (rawBytes.data[offset + 3] === 0) continue;

                        const r = clampChannel(workingPixels[offset]);
                        const g = clampChannel(workingPixels[offset + 1]);
                        const b = clampChannel(workingPixels[offset + 2]);
                        const colorIndex = getClosestColorIndex({ palette: color, r, g, b });
                        const colorSelect = color[colorIndex];
                        const errorR = r - colorSelect[0];
                        const errorG = g - colorSelect[1];
                        const errorB = b - colorSelect[2];

                        rawBytes.data[offset] = colorSelect[0];
                        rawBytes.data[offset + 1] = colorSelect[1];
                        rawBytes.data[offset + 2] = colorSelect[2];

                        const distributeError = (targetX: number, targetY: number, weight: number) => {
                            if (targetX < 0 || targetX >= outputWidth || targetY >= outputHeight) return;

                            const targetOffset = channelOffset(targetX, targetY);
                            if (rawBytes.data[targetOffset + 3] === 0) return;

                            workingPixels[targetOffset] += errorR * weight * ditherStrength;
                            workingPixels[targetOffset + 1] += errorG * weight * ditherStrength;
                            workingPixels[targetOffset + 2] += errorB * weight * ditherStrength;
                        };

                        distributeError(x + 1, y, 7 / 16);
                        distributeError(x - 1, y + 1, 3 / 16);
                        distributeError(x, y + 1, 5 / 16);
                        distributeError(x + 1, y + 1, 1 / 16);
                    }
                }

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

                    res.status(200).send({ data: url, width: newWidth, height: newHeight });
                });                   

                
                // await fs.promises.writeFile("test.png", output);
            }else{
                await sharp(files.file[0].filepath)
                .resize({ width: newWidth, height: newHeight, kernel: sharp.kernel.nearest })
                // .toColourspace('rgb16')
                .png()
                .toBuffer()    
                .then(async function (data) {
                    // console.log(data);
                    // const result = await sharp(data).resize({ width: width, height: height, kernel: sharp.kernel.nearest }).toBuffer();

                    let base64Encoded = data.toString("base64");
                    const url = `data:image/png;base64,${base64Encoded}`;

                    res.status(200).send({ data: url, width: newWidth, height: newHeight });
                });                
            }


        }
    } catch (err: any) {
        // example to check for a very specific error
        if (err.code === formidableErrors.maxFieldsExceeded) {

        }
        console.error(err);
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));
        return;
    }
})

export default router
