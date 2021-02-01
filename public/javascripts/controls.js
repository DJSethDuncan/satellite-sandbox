$(document).ready(function() {
    $('.speedRealtime').click(function() {
        if (!$(this).hasClass('activeButton')) {
            $('.speedButton').removeClass('activeButton')
            $(this).addClass('activeButton')
            setCustomMinstep(realtimeMinstep)
        }
    })
    $('.speedFast').click(function() {
        if (!$(this).hasClass('activeButton')) {
            $('.speedButton').removeClass('activeButton')
            $(this).addClass('activeButton')
            setCustomMinstep(.05)
        }
    })
    $('.starlink').click(function () {
        if (!$(this).hasClass('activeButton')) {
            $('.constellationButton').removeClass('activeButton')
            $(this).addClass('activeButton')
            chooseDataset('starlink')
        }
    })
    $('.iridium').click(function () {
        if (!$(this).hasClass('activeButton')) {
            $('.constellationButton').removeClass('activeButton')
            $(this).addClass('activeButton')
            chooseDataset('iridium')
        }
    })
})