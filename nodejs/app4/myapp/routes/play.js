var express = require('express');
var router = express.Router();

router.post('/', function(req, res, next) {

  res.render('play',{ roomID:req.body['roomID'], 
                      theme:req.body['theme'],
                      item_type:req.body['item_type'],
                      user_name:req.body['user_name']});
});

module.exports = router;
