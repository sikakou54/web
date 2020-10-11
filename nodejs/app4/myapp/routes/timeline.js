var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

  console.log('timeline!');

  var timelines = [
    { data:'会社に出社すべきか？'},
    { data:'1111111111111111？'},
    { data:'2222222222222222？'},
    { data:'3333333333333333？'},
    { data:'4444444444444444？'},
    { data:'5555555555555555？'},
  ];

  res.render('timeline',{timelines});
});

module.exports = router;
