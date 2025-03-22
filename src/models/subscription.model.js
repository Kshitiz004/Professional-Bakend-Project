import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subsciber: {
        type : Schema.Types.ObjectId, // One who is subscribing.
        ref : "User"
    },
    channel : {
        type : Schema.Types.ObjectId, // One who is being subscribed to.
        ref : "User"
    },
},
    {timestamps : true});

export const subscription = mongoose.model("Subscription", subscriptionSchema)