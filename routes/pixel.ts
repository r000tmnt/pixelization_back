import express, { type Express, type Request, type Response } from 'express';
import formidable, {errors as formidableErrors} from 'formidable';
import sharp from 'sharp';
const router = express.Router();

const min = 256;

router.post('/convert', async (req: Request, res: Response) => {
    const form = formidable({})

    try {
        const [fields, files] = await form.parse(req);

        if (!files.file) {
            res.status(400).send('No file uploaded');
            return;
        }
        else{
            // console.log('files.file[0]', files.file[0])
            // Handle the uploaded file here

            // Read the metadata from the image file
            const metadata = await sharp(files.file[0].filepath).metadata();
            
            // Destructure width and height
            const { width, height } = metadata;
            
            console.log(`Width: ${width}px, Height: ${height}px`);

            const aspectRatioW = width / height;
            const aspectRatioH = height / width;

            const newWidth = Math.round(min * aspectRatioW)
            const newHeight = aspectRatioH > 1? min : Math.round(min * aspectRatioH)

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
    } catch (err) {
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