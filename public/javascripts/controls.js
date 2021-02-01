$(document).ready(function() {
    $('.speedRealtime').click(function() {
        $('.speedButton').removeClass('activeButton')
        $(this).addClass('activeButton')
        setMinstep(realtimeMinstep)
    })
    $('.speedFast').click(function() {
        $('.speedButton').removeClass('activeButton')
        $(this).addClass('activeButton')
        setMinstep(.05)
    })
    $('.starlink').click(function () {
        $('.constellationButton').removeClass('activeButton')
        $(this).addClass('activeButton')
        chooseDataset('starlink')
    })
    $('.iridium').click(function () {
        $('.constellationButton').removeClass('activeButton')
        $(this).addClass('activeButton')
        chooseDataset('iridium')
    })
})