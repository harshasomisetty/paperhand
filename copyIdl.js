const fs = require("fs");
const exhibitIdl = require("./target/idl/exhibition.json");
const bazaarIdl = require("./target/idl/bazaar.json");

fs.writeFileSync("./app/exhibitIdl.json", JSON.stringify(exhibitIdl));
fs.writeFileSync("./app/bazaarIdl.json", JSON.stringify(bazaarIdl));
