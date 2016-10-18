﻿(function () {
    var londonApp = angular.module('londonApp', ['TransportService', 'ngMap', 'MassAutoComplete','ngSanitize']);
    
    londonApp.constant('Constants', {
        PickingMode: {
            1: 'None',
            2: 'Deaprture',
            3: 'Arrival'
        }
    });

    londonApp.controller('JourneyController', function JourneyController($scope, $sce, $q, NgMap, transportService, Constants) {
        $scope.constant = Constants;
        $scope.pickingMode = Constants.PickingMode[1];
    $scope.fromSearchResults = [];
    $scope.toSearchResults = [];
    $scope.journeys = {};
    $scope.currentJourney = {};

    $scope.fromMarkerIcon =
    {
        url: 'Content/images/icons.png',
        size: [32, 32],
        origin: [32, 1956],
        anchor: [1, 32]
    }
    $scope.toMarkerIcon =
    {
        url: 'Content/images/icons.png',
        size: [32, 32],
        origin: [0, 1956],
        anchor: [1, 32]
    }
        
    $scope.activateAddressPicking = function (mode) {
        $scope.pickingMode = mode;
    }

    $scope.clickOnMap = function (e) {
        if ($scope.pickingMode == Constants.PickingMode[1]) {
            return;
        }
        placeMarker(e.latLng.lat(), e.latLng.lng(), $scope.pickingMode);
        pickingMode = Constants.PickingMode[1];
    }

    $scope.init = function () {
    }


    $scope.validateForm = function (form) {
        form.fromName.$touched = true;
        form.toName.$touched = true;
    };

    function placeMarker(lat, lon, markerType) {
        if (markerType == 'Departure') {
            $scope.from.lat = lat;
            $scope.from.lon = lon;
        }
        else {
            $scope.to.lat = lat;
            $scope.to.lon = lon;
        }
    }

    function fitArrivalAndDestinationMarkers() {
        var bounds = new google.maps.LatLngBounds();
        if ($scope.from.lat != undefined) {
            var latlng = new google.maps.LatLng($scope.from.lat, $scope.from.lon);
            bounds.extend(latlng);
        }
        if ($scope.to.lat != undefined) {
            var latlng = new google.maps.LatLng($scope.to.lat, $scope.to.lon);
            bounds.extend(latlng);
        }
        NgMap.getMap().then(function (map) {
            map.setCenter(bounds.getCenter());
            map.fitBounds(bounds);
        });
    }


    $scope.reverseLocations = function () {
        var temp = $scope.from;
        $scope.from = $scope.to;
        $scope.to = temp;
        temp = $scope.fromMarker;
        $scope.fromMarker = $scope.toMarker;
        $scope.toMarker = temp;
    };

    $scope.getJourneys = function (from, to) {
        $scope.journeys = {};
        $scope.currentJourney = {};
        if (from.name == undefined || to.name == undefined) {
            return;
        }
        if (from.name != from.value) {
            from.parameterValue = undefined;
        }
        if (to.name != to.value) {
            to.parameterValue = undefined;
        }
        var departure = (from.parameterValue == undefined ? from.name : from.parameterValue);
        var arrival = (to.parameterValue == undefined ? to.name : to.parameterValue);
        transportService.getJourneys(departure , arrival).then(function (response) {
            if (response.hasOwnProperty('journeys')) {
                response.journeys.forEach(function (j) {
                    var date = new Date(j.startDateTime);
                    j.startDateTime = date;
                    date = new Date(j.arrivalDateTime);
                    j.arrivalDateTime = date;

                    j.isDetailsVisible = false;
                });
            }
            $scope.journeys = response;
        });
    }

    $scope.from = {};
    $scope.to = {};
    function search(query) {
        var deffered = $q.defer();
        transportService.search(query).then(function (response) {
            var results = [];
            for (var i = 0; i < response.length; i++) {
                for (var j = 0; j < response[i].matches.length; j++) {
                    if (response[i].matches[j].modes != undefined) {
                        var match = response[i].matches[j];
                        var label = ' <div class="row vertical-align"><div class="col-xs-7">' +
                               '<strong>' + match.name + '</strong></div><div class="col-xs-5"><ul class="types-list">' ;

                        for (var k = 0; k < response[i].matches[j].modes.length; k++) {
                            label += '<li class="icon ' + match.modes[k] + '-icon text-hide"></li>';
                        }
                        results.push({
                            value: match.name, name: match.name, lat: match.lat, lon: match.lon, parameterValue : match.icsId,
                            label: $sce.trustAsHtml(label + '</ul></div></div>')
                        });
                    }
                    else {
                        var match = response[i].matches[j];
                        results.push({
                            value: match.name, name: match.name, lat: match.lat, lon: match.lon,
                            label: $sce.trustAsHtml(
                                 ' <div class="row vertical-align"><div class="col-xs-7">' +
                               '<strong>' + match.name + '</strong></div><div class="col-xs-5"><ul class="types-list">' +
                               '<li class="icon ' + match.icon + '-icon text-hide"></li>'
                             )
                        });
                    }
                }
            }
            return deffered.resolve(results);
        });
        return deffered.promise;
    }

    function selectFromItem(selected) {
        $scope.from = selected;
        if (selected.lat != undefined) {
            placeMarker(selected.lat, selected.lon, 'Departure');
            fitArrivalAndDestinationMarkers();
        }
    }
    function selectToItem(selected) {
        $scope.to = selected;
        if (selected.lat != undefined) {
            placeMarker(selected.lat, selected.lon, 'Arrival');
            fitArrivalAndDestinationMarkers();
        }
    }

    function zoomToLocation(lat, lon) {
        $scope.map.setCenter({ lat: lat, lng: lon });
        $scope.map.setZoom(15);
    }

    $scope.autocomplete_from_options = {
        suggest: search,
        on_error: console.log,
        on_select: selectFromItem
    };
    $scope.autocomplete_to_options = {
        suggest: search,
        on_error: console.log,
        on_select: selectToItem,
    };


    $scope.pickDepartureAddress = function (journey) {
        $scope.from = {
            name: journey.place.commonName, parameterValue: journey.parameterValue, label: journey.place.commonName,
            lat: journey.place.lat, lon: journey.place.lon
        };
        placeMarker(journey.place.lat, journey.place.lon, 'Departure');
        fitArrivalAndDestinationMarkers();
    }
    $scope.pickArrivalAddress = function (journey) {
        $scope.to = {
            name: journey.place.commonName, parameterValue: journey.parameterValue, label: journey.place.commonName,
            lat: journey.place.lat, lon: journey.place.lon
        };
        placeMarker(journey.place.lat, journey.place.lon, 'Arrival');
        fitArrivalAndDestinationMarkers();
    }

    $scope.changeCurrentJourney = function (journey) {
        if (!journey.hasStopCoordinates) {
            loadStopCoordinates(journey);
        }
        $scope.currentJourney = journey;
    }

    $scope.checkTime = function (i) {
        return (i < 10) ? "0" + i : i;
    }

    var loadStopCoordinates = function (journey) {
        journey.legs.forEach(function (leg) {
            var stopPoints = [];

            leg.color = getLegColor(leg.mode.name)

            leg.path.stopPoints.forEach(function (point) {
                stopPoints.push(point);
            });

            if (stopPoints.length > 0) {
                transportService.getStopsLocations(stopPoints).then(function (locations) {
                    leg.path.stopPoints.forEach(function (point, i) {
                        point.lat = locations[i].lat;
                        point.lon = locations[i].lon;
                    });
                });
            }
        });
        journey.hasStopCoordinates = true;
    }

   var getLegColor = function (legType) {
        switch (legType) {
            case 'tube': 
                return '#F00000';
            case 'walking':
                return '#00FF00';
            default:
                return '#0000FF';
        }
    }
});
})();
