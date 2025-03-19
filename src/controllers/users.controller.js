import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import {User} from '../models/users.model.js';
import {uploadOncloudinary} from '../utils/cloudinary.js';

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

const resgisterUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message: "Ok"
    // })
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

})

const loginUser = asyncHandler(async(req, res) => {

    // req body = data
    // find the user through userName or email
    // password check
    // access refresh token
    // send cookie
    
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

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken: undefined
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
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully")
    )
    

})

export {
    resgisterUser,
    loginUser,
    logoutUser
}