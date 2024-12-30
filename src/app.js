import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

// Configuration for Handling CORS URLs,

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// Putting a limit when receiving json through a form,

app.use(express.json({limit: "20KB"}));

// When recieving data through url(extended is used to pass objects inside objects)

app.use(express.urlencoded({extended: true}));

// To store files in server

app.use(express.static('uploads'));

// To set & access cookies in the browser though server

app.use(cookieParser());

// Routes (import declared as userRoute because the export is default as route)

import userRoute from './routes/users.routes.js';

//Routes Declarations

app.use("/api/users", userRoute);

export { app };