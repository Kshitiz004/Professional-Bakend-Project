import mongoose, {Schema} from "mongoose";

const likeSchema = new Schema(
    {
        video : {
            type : Schema.Types.ObjectId,
            ref : "Videos"
        },
        comment : {
            type : Schema.Types.ObjectId,
            ref : "Comments"
        },
        tweet : {
            type : Schema.Types.ObjectId,
            ref : "Tweets"
        },
        likedBy : {
            type : Schema.Types.ObjectId,
            ref : "User"
        },

    },
    { timestamps : true }
);

export const Like = new mongoose.model("Likes", likeSchema);