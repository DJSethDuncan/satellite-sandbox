// @TODO move this token to an env
// Your access token can be found at: https://cesium.com/ion/tokens.
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NzI3YjFlOS03YWQ2LTQ0YjQtYmMwYS1lNmVkODU2ZWJlZGYiLCJpZCI6NDMwMDIsImlhdCI6MTYxMjEzODc0Nn0.jAnKhvAScH8REg8fwJHrU8jSupWcb9jEL1sIp-Wen_I";

// custom view variables
var satellitePixelSize = 2; // size of satellites in viewer
// var dataset = starlink; // irridiumDebris, starlink
var dataset = starlinkTLEs;
var updateInterval = 50; // default: 50
var realtimeMinstep = 0.0015625;
var customMinstep = 0.0015625; // this correlates to simulation speed -- .016~ is 1 second

var rotAngle = 0; // accrued rotation angle for the Earth
var minstep = 0; // minute step
var hrstep = 0; // hour step
var datestep = 0; // day step

// Declare orbital debris variables

var debrisRecords = [];
var datasetSize = getDatasetSize();
var posVel = [];

var viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: Cesium.createWorldTerrain(),
  infoBox: false,
  animation: false,
  baseLayerPicker: false,
  fullscreenButton: false,
  geocoder: false,
  selectionIndicator: false,
  homeButton: false,
  timeline: false,
  navigationHelpButton: false,
});

var scene = viewer.scene;
var clock = viewer.clock;
var camera = viewer.scene.camera;
var debrisID = 0;
var thing = [];
var timeSinceTleEpochMinutes = 1;

//  Or you can use a calendar date and time (obtained from Javascript Date).
var now = new Date();

var deg2rad = 0.0174533;

// Set the Observer at 122.03 West by 36.96 North, in RADIANS
var observerGd = {
  longitude: -122.0308 * deg2rad,
  latitude: 36.9613422 * deg2rad,
  height: 0.37,
};

function setCustomMinstep(value) {
  minstep = 0;
  customMinstep = value;
}

function chooseDataset(name) {
  debrisRecords = [];
  dataset = [];
  viewer.entities.removeAll();
  switch (name) {
    case "starlink":
      dataset = starlink;
      break;
    case "iridium":
      dataset = irridiumDebris; // i know it's spelled wrong gimme a break
      break;
  }
  datasetSize = getDatasetSize();
  initiateSimulation();
}

function getDatasetSize() {
  return dataset.length;
}

async function propagateOrbitalDebris() {
  var j = 0;

  dataset.map((data) =>
    debrisRecords.push(satellite.twoline2satrec(data.line1, data.line2))
  );

  // Propagate debris using time since epoch
  for (i = 0; i < datasetSize; i++) {
    if (debrisRecords[i] != undefined && !debrisRecords[i].error) {
      posVel[i] = satellite.sgp4(debrisRecords[i], timeSinceTleEpochMinutes);
    }
  }
  // Propagate debris using time since epoch
  for (i = 0; i < datasetSize; i++) {
    if (debrisRecords[i] != undefined) {
      posVel[i] = satellite.propagate(
        debrisRecords[i],
        now.getUTCFullYear(),
        now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      );
    } //endif
  } //next i
} //end propateOrbitalDebris

function initiateSimulation() {
  for (debrisID = 0; debrisID < dataset.length; debrisID++) {
    thing[debrisID] = viewer.entities.add({
      position: {
        value: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
        referenceFrame: Cesium.ReferenceFrame.FIXED,
      },
      point: {
        color: Cesium.Color.ALICEBLUE,
        pixelSize: satellitePixelSize, // ,
      },
    });
  } // next debrisID

  propagateOrbitalDebris();
  startUpdate();
}

function startUpdate() {
  var km = 1000; //1592.75 ; //3185.5 ;//6371 ;
  var debrisPos = new Cesium.Cartesian3(0, 0, 0);
  for (i = 0; i < datasetSize; i++) {
    if (debrisRecords[i] != undefined && !debrisRecords[i].error) {
      debrisPos.x = posVel[i].position.x * km;
      debrisPos.y = posVel[i].position.y * km;
      debrisPos.z = posVel[i].position.z * km;
      thing[i].position = debrisPos;
    } else {
      // drop this malformed tle
    }
  } //next i
  setInterval(function () {
    updatePosition();
  }, updateInterval);
}

function updatePosition() {
  if (minstep > 59) {
    hrstep = hrstep + 1;
    minstep = 0;
  }
  if (hrstep > 23) {
    datestep = datestep + 1;
    hrstep = 0;
  }

  // Propagate debris using time since epoch
  for (i = 0; i < datasetSize; i++) {
    if (debrisRecords[i] != undefined && !debrisRecords[i].error) {
      posVel[i] = satellite.propagate(
        debrisRecords[i],
        now.getUTCFullYear(),
        now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
        now.getUTCDate() + datestep,
        now.getUTCHours() + hrstep,
        now.getUTCMinutes() + minstep,
        now.getUTCSeconds()
      );
    } // endif
  } //next i

  minstep = minstep + customMinstep;

  var km = 1000; //3185.5 ; // 6371 ;
  var debrisPos = new Cesium.Cartesian3(0, 0, 0);
  for (i = 0; i < datasetSize; i++) {
    if (posVel[i] != undefined && "position" in posVel[i]) {
      debrisPos.x = posVel[i].position.x * km;
      debrisPos.y = posVel[i].position.y * km;
      debrisPos.z = posVel[i].position.z * km;

      thing[i].position = debrisPos;
    } //endif
  } //next i
}

// -------------------------------------------------------------------------

function icrf(scene, time) {
  if (scene.mode !== Cesium.SceneMode.SCENE3D) {
    // may not be necessary
    return;
  }
  var icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
  if (Cesium.defined(icrfToFixed)) {
    var offset = Cesium.Cartesian3.clone(camera.position);
    var transform = Cesium.Matrix4.fromRotationTranslation(icrfToFixed);
    camera.lookAtTransform(transform, offset);
  }
}

clock.multiplier = 2000; // speed of the simulation
scene.preRender.addEventListener(icrf); // enable Earth rotation

scene.globe.enableLighting = true;

// Set position with a top-down view
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(97.6269, 37.6221, 18100000.0),
});

initiateSimulation();
