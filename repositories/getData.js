const fs = require("fs").promises;

// these should return an array formatted like this:
/*

  someArray = [
    {
      label: 'sat label', (optional)
      line1: 'TLE line 1 string',
      line2: 'TLE line 2 string'
    }
  ]

*/
module.exports = {
  async starlink() {
    let TLEs = [];
    let TLERow = 1;
    let tempTLE = {};

    const TLEStream = await fs.readFile("./TLEdata/starlink.tle", {
      encoding: "utf-8",
    });

    const TLErows = TLEStream.split("\n");

    TLErows.map((row) => {
      if (TLERow === 1) {
        TLELabel = row.trim();
        tempTLE.label = TLELabel;
      } else {
        switch (TLERow) {
          case 2:
            tempTLE.line1 = row;
            break;
          case 3:
            tempTLE.line2 = row;
            break;
          default:
            console.error("Dropping extra TLE row: ", row);
        }
      }
      if (TLERow === 3) {
        TLEs.push(tempTLE);
        tempTLE = {};
        TLERow = 1;
      } else {
        TLERow++;
      }
    });

    return TLEs;
  },
};
