module.exports = class ResponseMiddleware {
    static success() {
        return (req, res, next) => {
            req.startTime = new Date();
            res.success = function(data, code) {
                return res.status(code || 200).json({
                    success: true,
                    date: new Date().toISOString(),
                    time: (new Date() - req.startTime) / 1000,
                    data: data
                });
            };
            return next();
        }
    }

    static error() {
        return (req, res, next) => {
            req.startTime = new Date();
            res.error = function(err, code) {
                if (err.toString()) err = err.toString();
                return res.status(code || 500).json({
                    success: false,
                    date: new Date().toISOString(),
                    time: (new Date() - req.startTime) / 1000,
                    err: err
                });
            };
            return next();
        }
    }
};