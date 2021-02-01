// Your access token can be found at: https://cesium.com/ion/tokens.
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NzI3YjFlOS03YWQ2LTQ0YjQtYmMwYS1lNmVkODU2ZWJlZGYiLCJpZCI6NDMwMDIsImlhdCI6MTYxMjEzODc0Nn0.jAnKhvAScH8REg8fwJHrU8jSupWcb9jEL1sIp-Wen_I';

// custom view variables
var satellitePixelSize = 2;         // size of satellites in viewer
var dataset = irridiumDebris;             // irridiumDebris, starlink
var updateInterval = 50;            // default: 50
var realtimeMinstep = 0.0015625
var customMinstep = 0.0015625       // this correlates to simulation speed -- .016~ is 1 second

var rotAngle = 0;                  // accrued rotation angle for the Earth
var minstep = 0;                   // minute step
var hrstep = 0;                    // hour step
var datestep = 0;                  // day step      

// Declare orbital debris variables

var debrisRecords = [];
var datasetSize = getDatasetSize()
var posVel = [];          

var viewer = new Cesium.Viewer('cesiumContainer', {
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

// Sample TLE
var tleLine1 = '1 25544U 98067A   13149.87225694  .00009369  00000-0  16828-3 0  9031',
    tleLine2 = '2 25544 051.6485 199.1576 0010128 012.7275 352.5669 15.50581403831869';

// Initialize a satellite record
var satrec = satellite.twoline2satrec(tleLine1, tleLine2);
var timeSinceTleEpochMinutes = 1;

//  Propagate satellite using time since epoch (in minutes).
var positionAndVelocity = satellite.sgp4(satrec, timeSinceTleEpochMinutes);

//  Or you can use a calendar date and time (obtained from Javascript Date).
var now = new Date();
// NOTE: while Javascript Date returns months in range 0-11, all satellite.js methods require
// months in range 1-12.
var positionAndVelocity = satellite.propagate(
    satrec,
    now.getUTCFullYear(),
    now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
);

// The position_velocity result is a key-value pair of ECI coordinates.
// These are the base results from which all other coordinates are derived.
var positionEci = positionAndVelocity.position,
    velocityEci = positionAndVelocity.velocity;

var deg2rad = 0.0174533;

// Set the Observer at 122.03 West by 36.96 North, in RADIANS
var observerGd = {
    longitude: -122.0308 * deg2rad,
    latitude: 36.9613422 * deg2rad,
    height: 0.370
};

// You will need GMST for some of the coordinate transforms.
// http://en.wikipedia.org/wiki/Sidereal_time#Definition
// NOTE: GMST, though a measure of time, is defined as an angle in radians.
// Also, be aware that the month range is 1-12, not 0-11.
// var gmst = satellite.gstimeFromDate(
//     now.getUTCFullYear(),
//     now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
//     now.getUTCDate(),
//     now.getUTCHours(),
//     now.getUTCMinutes(),
//     now.getUTCSeconds()
// );

// gstimeFromDate is deprecated -- use gstime
var gmst = satellite.gstime(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
);

// You can get ECF, Geodetic, Look Angles, and Doppler Factor.
var positionEcf = satellite.eciToEcf(positionEci, gmst),
    observerEcf = satellite.geodeticToEcf(observerGd),
    positionGd = satellite.eciToGeodetic(positionEci, gmst),
    lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
//  dopplerFactor = satellite.dopplerFactor(observerCoordsEcf, positionEcf, velocityEcf);

// The coordinates are all stored in key-value pairs.
// ECI and ECF are accessed by `x`, `y`, `z` properties.
var satelliteX = positionEci.x,
    satelliteY = positionEci.y,
    satelliteZ = positionEci.z;

// Look Angles may be accessed by `azimuth`, `elevation`, `range_sat` properties.
var azimuth = lookAngles.azimuth,
    elevation = lookAngles.elevation,
    rangeSat = lookAngles.rangeSat;

// Geodetic coords are accessed via `longitude`, `latitude`, `height`.
var longitude = positionGd.longitude,
    latitude = positionGd.latitude,
    height = positionGd.height;

//  Convert the RADIANS to DEGREES for pretty printing (appends "N", "S", "E", "W". etc).
var longitudeStr = satellite.degreesLong(longitude),
    latitudeStr = satellite.degreesLat(latitude);
                    // positions and velocities of orbital debris

function setCustomMinstep(value) {
    minstep = 0
    customMinstep = value
}

function chooseDataset(name) {
    debrisRecords = []
    dataset = []
    viewer.entities.removeAll()
    switch (name) {
        case 'starlink':
            dataset = starlink
            break;
        case 'iridium':
            dataset = irridiumDebris // i know it's spelled wrong gimme a break
            break;
    }
    datasetSize = getDatasetSize()
    initiateSimulation();
}

function getDatasetSize() {
    return dataset.length
}

function propagateOrbitalDebris() {
    var j = 0;
    for (i = 0; i < datasetSize; i++) {
        var tle1 = dataset[j];
        var tle2 = dataset[j + 1];
        //  console.log (tle1 + "  " + tle2) ;\
        if (typeof tle1 == 'string' || tle1 instanceof String || typeof tle2 == 'string' || tle2 instanceof String) {
            debrisRecords[i] = satellite.twoline2satrec(tle1, tle2);
        }
        j = j + 2;
    }

    // Propagate debris using time since epoch
    for (i = 0; i < datasetSize; i++) {
        if (debrisRecords[i] != undefined) { posVel[i] = satellite.sgp4(debrisRecords[i], timeSinceTleEpochMinutes); }
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
    }//next i

}//end propateOrbitalDebris


function initiateSimulation() {


    for (debrisID = 0; debrisID < dataset.length; debrisID++) {

        thing[debrisID] = viewer.entities.add({
            position: {
                value: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
                referenceFrame: Cesium.ReferenceFrame.FIXED
            },
            point: {
                color: Cesium.Color.ALICEBLUE,
                pixelSize: satellitePixelSize // ,
            }
        });
    }// next debrisID

    propagateOrbitalDebris();
    startUpdate();
}

function geodetic2Cartesian() {
    var trajectory = { x: 0, y: 0, z: 0 };   // trajectory object

    var ellipsoidHeight = 6356752.3142;  // polar radius in meters
    var majorAxis = 6378137;           // equatorial radius in meters
    var eccentricity2 = 0.0066943799014; // eccentricity squared
    var nu = majorAxis / Math.sqrt(1 - eccentricity2 * Math.sin(latitude) ^ 2);
    var x = (nu + ellipsoidHeight) * Math.cos(latitude) * Math.cos(longitude);
    var y = (nu + ellipsoidHeight) * Math.cos(latitude) * Math.sin(longitude);
    var z = ((1 - eccentricity2) * nu + ellipsoidHeight) * Math.sin(latitude);

    trajectory.x = satelliteX; trajectory.y = satelliteY; trajectory.z = satelliteZ;
    return trajectory;
}

function startUpdate() {
    // var trajectory = geodetic2Cartesian() ;  
    var km = 1000; //1592.75 ; //3185.5 ;//6371 ;
    var debrisPos = new Cesium.Cartesian3(0, 0, 0);
    for (i = 0; i < datasetSize; i++) {
        if (debrisRecords[i] != undefined) {
            debrisPos.x = posVel[i].position.x * km;
            debrisPos.y = posVel[i].position.y * km;
            debrisPos.z = posVel[i].position.z * km;
            // console.log("x " + debrisPos.x + " y " + debrisPos.y + " z " + debrisPos.z);
            thing[i].position = debrisPos;
            // debris.position = debrisPos ;
        } // endif 	
    } //next i
    setInterval(function () { updatePosition() }, updateInterval);
    // updatePosition()
};

function updatePosition() {
    var trajectory = geodetic2Cartesian();
    // Read the next set of coordinates from the mission JavaScript object.
    var pos = [trajectory.x, trajectory.y, trajectory.z];
    var xPos = pos[0];
    var yPos = pos[1];
    var zPos = pos[2];
    //  document.getElementById('satPosition').setAttribute('translation', xPos + " " + yPos + " " + zPos);
    //  console.log("x  " + Xpos + "  y  " + Ypos + "  z  " + Zpos) ;

    if (minstep > 59) { hrstep = hrstep + 1; minstep = 0; }
    if (hrstep > 23) { datestep = datestep + 1; hrstep = 0; }

    // positionAndVelocity = satellite.propagate(
    //     satrec,
    //     now.getUTCFullYear(),
    //     now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
    //     now.getUTCDate() + datestep,
    //     now.getUTCHours() + hrstep,
    //     now.getUTCMinutes() + minstep,
    //     now.getUTCSeconds()
    // );

    // Propagate debris using time since epoch
    for (i = 0; i < datasetSize; i++) {
        if (debrisRecords[i] != undefined) {
            posVel[i] = satellite.propagate(
                debrisRecords[i],
                now.getUTCFullYear(),
                now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
                now.getUTCDate() + datestep,
                now.getUTCHours() + hrstep,
                now.getUTCMinutes() + minstep,
                now.getUTCSeconds()
            );
        }// endif
    } //next i

    minstep = minstep + customMinstep;

    // positionEci = positionAndVelocity.position;
    satelliteX = positionEci.x;
    satelliteY = positionEci.y;
    satelliteZ = positionEci.z;

    var km = 1000; //3185.5 ; // 6371 ;
    var debrisPos = new Cesium.Cartesian3(0, 0, 0);
    for (i = 0; i < datasetSize; i++) {
        if (posVel[i] != undefined) {
            debrisPos.x = posVel[i].position.x * km;
            debrisPos.y = posVel[i].position.y * km;
            debrisPos.z = posVel[i].position.z * km;

            thing[i].position = debrisPos;
        } //endif
    }//next i
};

// -------------------------------------------------------------------------


function icrf(scene, time) {
    if (scene.mode !== Cesium.SceneMode.SCENE3D) {   // may not be necessary
        return;
    }
    var icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
    if (Cesium.defined(icrfToFixed)) {
        var offset = Cesium.Cartesian3.clone(camera.position);
        var transform = Cesium.Matrix4.fromRotationTranslation(icrfToFixed);
        camera.lookAtTransform(transform, offset);
    }
};

clock.multiplier = 2000;               // speed of the simulation
scene.preRender.addEventListener(icrf);  // enable Earth rotation

scene.globe.enableLighting = true;

// Set position with a top-down view
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(97.6269, 37.6221, 18100000.0)
});

initiateSimulation();