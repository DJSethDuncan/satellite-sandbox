var express = require("express");
var router = express.Router();
var getData = require("../repositories/getData");

router.get("/", async function (req, res, next) {
  const starlinkTLEs = await getData.starlink();
  res.render("index", {
    title: "Satellite Sandbox",
    starlinkTLEs: JSON.stringify(starlinkTLEs), // necessary because of pug I guess
  });
});

module.exports = router;
