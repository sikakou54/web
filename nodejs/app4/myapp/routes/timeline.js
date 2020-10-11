var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

  console.log('timeline!');

  var timelines = [
    { data:'会社に出社すべきか？', roomId: '00000001'},
    { data:'1111111111111111？', roomId: '00000002'},
    { data:'2222222222222222？', roomId: '00000003'},
    { data:'3333333333333333？', roomId: '00000004'},
    { data:'4444444444444444？', roomId: '00000005'},
    { data:'5555555555555555？', roomId: '00000005'},
  ];

  res.render('timeline',{timelines});
});

module.exports = router;
