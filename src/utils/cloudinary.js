import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOncloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        //Upload file on cloudinary
          const response = cloudinary.uploader.upload(localFilePath, {
                resource_type: "auto"
            })
        //Upload file on cloudinary successfull  
        console.log("File uploaded successfully", (await response).url);
          return response;
    } catch (error) {
        // Remove the locally saved temporary file as the upload failed
        fs.unlinkSync(localFilePath);
        console.error("Error uploading file to Cloudinary", error);
        throw new Error("Error uploading file to Cloudinary");
    }
}

export { uploadOncloudinary }