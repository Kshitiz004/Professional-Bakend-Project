import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import {User} from '../models/users.model.js';
import {uploadOncloudinary} from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        
        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
/*
    get users details from frontend
    check if user already exists: userName, email.
    validate user - not empty
    check for images & avatar
    upload the avatar to cloudinary
    create user object - create in db
    remove password and refreshToken from user response
    check for user creation
    return response
*/

const {fullName, email, userName, password} = req.body;

if (
    [fullName, email, password].some((field) => field?.trim() === "")
) {
    throw new ApiError(
        400,
        "All fields must not be empty"
    );   
}

const existingUser = await User.findOne(
    {$or: [{userName}, {email}]
});

if (existingUser) {
    throw new ApiError(
        409,
        "userName or email already exists"
    );
}

const avatarLocalPath = req.files?.avatar[0]?.path;
const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;

if (!avatarLocalPath) {
    throw new ApiError(
        400,
        "Avatar is required"
    )
}

// if (!coverImageLocalPath) {
//     throw new ApiError(
//         400,
//         "Cover Image is required"
//     )
// }

const avatar = await uploadOncloudinary(avatarLocalPath);
const coverImage = await uploadOncloudinary(coverImageLocalPath);

if (!avatar) {
    throw new ApiError(
        400,
        "Avatar is required"
    )
}

const user = await User.create({
    fullName,
    userName: userName.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
})

const createdUser = await User.findById(user._id).select("-password -refreshToken");


if (!createdUser) {
    throw new ApiError(
        500,
        "Failed to create user"
    )
}

return res.status(201).json(
    new ApiResponse(201, "User created successfully", createdUser)
);

});

const loginUser = asyncHandler(async(req, res) => {

    /*
    req body = data
    find the user through userName or email
    password check
    access refresh token
    send cookie
    */
    
    const { userName, email, password} = req.body;

    if (!(userName || email)) {
        throw new ApiError(
            400,
            "userName or email is required"
        )
    }

    const user = await User.findOne({
        $or: [{userName: userName}, {email: email}]
    })
    
    if (!user) {
        throw new ApiError(
            401,
            "User does not exist"
        )
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(
            401,
            "Invalid password"
        )
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    //To Provide user with only the necessary data
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    

    //To restrict the token change from frontend
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("access-token", accessToken, options)
    .cookie("refresh-token", refreshToken, options)

    //Sending token again to provide user to save token in local storage or for a mobile application use case
    .json(new ApiResponse(200,
        {
        user: loggedInUser, accessToken, refreshToken
        },
        "User logged in successfully"
    ))

});

const logoutUser = asyncHandler(async(req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset : {
                refreshToken: 1 // Removing the field from the document
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }


    return res.status(200)
        .clearCookie("access-token", options)
        .clearCookie("refresh-token", options)
        .json(new ApiResponse(200, {}, "User logged out successfully")
    )
    

});

const refreshAccessToken = asyncHandler(async(req, res) => {

    const incomingRefreshToken = req.cookies["refresh-token"] || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Refersh token is required");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token");
        }
    
        if(incomingRefreshToken !== user.refreshToken){
            throw new ApiError(401, "Refersh token is expired or used");
        }
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        const {accessToken, refreshToken : newRefreshAccessToken} = await (generateAccessAndRefreshToken(user._id));
    
        return res.status(200)
            .cookie("access-token", accessToken, options)
            .cookie("refresh-token", newRefreshAccessToken, options)
            .json(new ApiResponse(200, {accessToken, refreshToken : newRefreshAccessToken}, "Access token refreshed successfully")
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});

const changeCurrentPassword = asyncHandler(async(req, res) => {

    const  {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);

    const correctPassword = await user.isPasswordCorrect(oldPassword);

    if (!correctPassword){
        throw new ApiError(400, "Old Password is incorrect");
    }

    user.password = newPassword;

    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully!"))
});

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched Successfully"))
});

const updateAccountDetails = asyncHandler(async(req, res) => {

    const {fullName, email} = req.body

    if(!(fullName || email)){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {$set : {
            fullName: fullName, 
            email : email
        }},
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details Updated successfully"))
});

const updateUserAvatar = asyncHandler(async(req, res) => {

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOncloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Could not save Avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {$set: {
            avatar : avatar.url
        }},
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Image Updated successfully"))
});

const updateUserCoverImage = asyncHandler(async(req, res) => {

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file is missing");
    }

    const coverImage = await uploadOncloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400, "Could not update coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {$set: {
            coverImage : coverImage.url
        }},
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image Updated successfully"))
});


/// To Do:  ADD Delete logic to remove previous images before updating

const getUserChannelProfile = asyncHandler(async(req, res) => {
    
    const { userName } = req.params

    //Optionally Unchaning if username eixists to trim

    if(!userName?.trim()){
        throw new ApiError(400, "Username is missing");
    }

    const channel = await User.aggregate([
        {
            $match : {
                userName : userName?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subsciber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscibersCount : {
                    $size : "$subscribers"
                },
                channelsSubscibersToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {$in : [req.user._id, "&subscribers.subscriber"] },
                    then : true,
                    else : false
                }
            }
        },
        {
            $project : {
                fullName : 1,
                userName : 1,
                subscibersCount : 1,
                channelsSubscibersToCount : 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1,
                email: 1
            }
        }
    ])

    if (!channel?.length){
        throw new ApiError(404, "Channel does not exists")
    }

    return res
    .status(200)
    .josn(new ApiResponse(200, channel[0], "User channel fetched successfully"))
});

const getWatchHistory = asyncHandler(async(req, res) => {

    //Using the approach to aggregate through ID along with sub-piplines

    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(String(req.user._id)) // Converting _id to String Before Creating ObjectId
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        fullName : 1,
                                        userName : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched Successfully"))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}