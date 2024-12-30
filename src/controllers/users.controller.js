import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/User.js';
import {uploadOncloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';

const resgisterUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message: "Ok"
    // })
/*
    get users details from frontend
    check if user already exists: username, email.
    validate user - not empty
    check for images & avatar
    upload the avatar to cloudinary
    create user object - create in db
    remove password and refreshToken from user response
    check for user creation
    return response
*/

const {fullName, email, username, password} = req.body;
console.log(fullname);

if (
    [fullName, email, password, avatar].some((field) => field?.trim() === "")
) {
    throw new ApiError(
        400,
        "All fields must not be empty"
    );   
}

const existeUser = await User.findOne(
    {$or: [{username}, {email}]
});

if (existeUser) {
    throw new ApiError(
        409,
        "Username or email already exists"
    );
}

const avatarLocalPath = req.files?.avatar[0].path;
const coverImageLocalPath = req.files?.coverImage[0].path;

if (!avatarLocalPath) {
    throw new ApiError(
        400,
        "Avatar is required"
    )
}

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
    username: username.toLowerCase(),
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
    ApiResponse(201, "User created successfully", createdUser)
);

})

export {resgisterUser}