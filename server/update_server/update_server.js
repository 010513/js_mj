var express = require('express');
var path = require('path');
var app = express();

exports.start = function(cfg){
    app.use(express.static(path.join(__dirname,cfg.UPDATE_DIR)));
    app.listen(cfg.PORT);
    console.log("update server is listening on " + cfg.PORT);
}
