import express, { type Express, type Request, type Response } from 'express';
import formidable, {errors as formidableErrors} from 'formidable';
import sharp from 'sharp';
import palettes from '../config/palette.ts';
import colorluminance from 'color-luminance'
// import fs from 'fs'

// import { getClosestColorIndex } from '../utils/color.ts'

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
            const { width, height, channels } = metadata;
            
            console.log(`Width: ${width}px, Height: ${height}px`);

            const aspectRatioW = width / height;
            const aspectRatioH = height / width;

            const newWidth = Math.round(min * aspectRatioW)
            const newHeight = aspectRatioH > 1? min : Math.round(min * aspectRatioH)

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

                // Get luminance of the palette
                const palletLuminance = color.map(p => {
                    return colorluminance(p)
                })

                // console.log('palletLuminance', palletLuminance)

                let changed = 0

                console.log(`${rawBytes.data[0]}, ${rawBytes.data[1]}, ${rawBytes.data[2]}`)

                for (let i = 0; i < rawBytes.data.length; i += 4) {
                    const r = rawBytes.data[i] 
                    const g = rawBytes.data[i + 1] 
                    const b = rawBytes.data[i + 2] 
                    const lu = colorluminance(r, g, b)

                    // console.log('lu', lu)

                    // rawBytes.data[i] = 255
                    // rawBytes.data[i + 1] = 100
                    // rawBytes.data[i + 2] = 100      
                    // rawBytes.data[i + 3] = 255      

                    // changed++

                    // Find the closest color
                    // let colorIndex = getClosestColorIndex({ palette: color, r, g, b })
                    
                    const dist = palletLuminance.map(p => Math.abs(p - lu))

                    const minDist = Math.min(...dist)

                    const colorIndex = dist.findIndex(d => d === minDist)

                    const colorSelect = color[colorIndex]

                    // console.log('colorSelect', colorSelect)


                    // if (r !== colorSelect[0] || g !== colorSelect[1] || b !== colorSelect[2]) {
                    //     changed++;
                    // }

                    rawBytes.data[i] = colorSelect[0]
                    rawBytes.data[i + 1] = colorSelect[1]
                    rawBytes.data[i + 2] = colorSelect[2]              
                    // rawBytes.data[i + 3] = 255         
                }

                console.log('changed', changed)
                console.log("total pixels:", rawBytes.data.length / 4);

                console.log('done')
                console.log(`${rawBytes.data[0]}, ${rawBytes.data[1]}, ${rawBytes.data[2]}`)

                const output = await sharp(rawBytes.data, {
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