const Router = require('../config/express').router;

Router.get('/', function (req, res) {
    res.success('this is a test');
});

module.exports = Router;