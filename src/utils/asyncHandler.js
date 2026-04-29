const asyncHandler = (fn) => (req, res) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler