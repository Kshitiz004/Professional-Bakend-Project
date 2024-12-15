//Using Promises High Order Funtion
const asyncHandler = (asyncHandler) => {
    (req, res, next) => {
        Promise.resolve(asyncHandler(req, res, next))
       .catch((error) => next(error));
    }
}

/*
// Using Try Catch High Order Funtion
const asyncHandler = (asyncHandler) => async (req, res, next) => {
    try {
        await asyncHandler(req, res, next);
    } catch (error){
        res.status(error.code || 500).json(
            {
            success: false,
            message: error.message,
            })
    }
}
*/

export { asyncHandler }