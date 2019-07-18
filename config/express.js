const Config = require('./config.json');
const path = require('path');
const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const compress = require('compression');
const methodOverride = require('method-override');
const cors = require('cors');
const helmet = require('helmet');
const ResponseMiddleware = require('../middlewares/response');

const app = express();
const router = express.Router();
const http = require('http').createServer(app);

if (Config.DEBUG == true) app.use(logger('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(cookieParser());
app.use(compress());
app.use(methodOverride());
app.use(helmet());
app.use(cors());
app.use(ResponseMiddleware.success());
app.use(ResponseMiddleware.error());

app.use('/', express.static(path.resolve(__dirname + '/../public')));

app.use('/api', router);

// Angular no /#/ prefix
app.get('/*', function (req, res) {
    res.sendFile(path.resolve(__dirname + '/../public/index.html'));
});


exports.app = app;
exports.router = router;
exports.http = http;