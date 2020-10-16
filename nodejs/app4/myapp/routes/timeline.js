var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

  console.log('timeline!');


});

router.post('/', function(req, res, next) {

  var timelines = [
    { data:'会社に出社すべきか？', roomId: '00000001'},
    { data:'日本でもベーシックインカムを導入したほうがいい', roomId: '00000002'},
    { data:'タイトル１', roomId: '00000003'},
    { data:'タイトル２', roomId: '00000004'},
    { data:'タイトル３', roomId: '00000005'},
    { data:'タイトル４', roomId: '00000005'},
  ];

  res.render('timeline',{timelines:timelines, user_name:req.body['user_name']});
});

module.exports = router;
