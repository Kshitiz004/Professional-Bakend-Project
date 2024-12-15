// Using Error class and overriding constructor.
class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = "",
    
){
    // To override the default message.
    super(message);
    this.statusCode = statusCode,
    this.message = message,
    this.data = null,
    this.success = false;
    this.errors = errors;

    if (stack) {
        this.stack = stack;
    }else{
        Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError }