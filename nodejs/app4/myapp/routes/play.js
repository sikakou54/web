var express = require('express');
var router = express.Router();

router.post('/', function(req, res, next) {

  var roomID = req.body['roomID'];
  var theme = req.body['theme'];
  var item_type = req.body['item_type'];

  res.render('play',{roomID, theme, item_type});
});

module.exports = router;
