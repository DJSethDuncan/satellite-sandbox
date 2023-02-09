var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  // @TODO import TLE data here and pass it to the render page as a string I guess?

  res.render("index", { title: "Satellite Sandbox" });
});

module.exports = router;
