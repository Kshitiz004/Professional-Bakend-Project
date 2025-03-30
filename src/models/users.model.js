import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        userName: 
        {
            type: String,
            required: [true, "Please provide a username"],
            unique: true,
            lowercase: true,
            trim: true,
            index:true,
            minlength: 3,
            maxlength: 20
        },
        email:
        {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: 
        {
            type: String,
            required: true,
            trim: true,
            index:true,
        },
        avatar:
        {
            type: String,
            required: true,
        },
        coverImage:
        {
            type: String,
        },
        watchHistory:[
        {
            type: Schema.Types.ObjectId,
            ref: "Video",
        }
        ],
        password:
        {
            type: String,
            required: [true, "Please provide a password"],
        },
        refreshToken:
        {
            type: String,
        },
    },
    { timestamps: true }
);

// Runnig mongoose pre hook to execute before  using save event

// Not using arrow functions beacuse it doesn't have (this.) reference and passing next since it is a middleware
userSchema.pre("save", async function(next) {
    if (!this.isModified("password"))
        return next();
        this.password = await bcrypt.hash(this.password, 10);
        next();
});

// Creating custom methods

//to check if password is correct
userSchema.methods.isPasswordCorrect = async function (password)
{
    return await bcrypt.compare(password, this.password)
}

// Generate JWT token
userSchema.methods.generateAccessToken = function ()
{
    return jwt.sign(
        {
            id: this._id,
            email: this.email,
            userName: this.userName,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

// Generate refresh token
userSchema.methods.generateRefreshToken = function ()
{
    return jwt.sign(
        {
            id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema);