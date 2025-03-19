import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/users.model.js"

// function wiht "_" in place of "res" as it is not required. Showcasing production grade code declaration 
export const verifyJWT = asyncHandler(async(req, _, next) => {
    // console.log("Cookies:", req.cookies);
    try {
        //Accessing token from either cookies or header and extrating token from authorization and replacing the Bearer and extra space with empty string

        const token = req.cookies["access-token"] || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Access token is required");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id || decodedToken?.id).select("-password -refreshToken");

    
        if(!user){
            throw new ApiError(401, "Invalid access token")
        }
    
        req.user = user
        next()

    } catch (error) {
        throw new ApiError(401, error.message || "Invalid Access Token")
    }
});