var updte_service = require("./update_server")

var configs = require(process.argv[2]);
var config = configs.update_srver();

updte_service.start(config);