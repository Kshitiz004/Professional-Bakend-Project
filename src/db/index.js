import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        // connection.host used to know the exact database.
        console.log(`\n Databse Connected Successfully! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("Database Connection Error", error);
        //Used procss.exit instead of throwing  an error for an alternative approach.
        process.exit(1);
    }
}

export default connectDB;