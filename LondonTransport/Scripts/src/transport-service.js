var transportServices = angular.module('TransportService', []);

transportServices.service('transportService', ['$http', '$q', function ($http, $q) {

    this._appId = 'fa44fb16';
    this._key = 'ded1b571fbf450b3814fc97a4af5c138';
    this._baseUrl = 'https://api.tfl.gov.uk'
    var context = this;

    /*  Returns promise object which contain answ
    *
    *
    */
    this.getJourneys = function (from, to) {
        var deffered = $q.defer();
        $http({
            url: this._baseUrl + '/Journey/JourneyResults' + '/' + from + '/to/' + to + '?nationalSearch=False&timeIs=Departing&journeyPreference=LeastTime&walkingSpeed=Average&cyclePreference=None&alternativeCycle=False&alternativeWalking=True&applyHtmlMarkup=False&useMultiModalCall=False&walkingOptimization=true&app_id='
                + this._appId + '&app_key=' + this._key, method: 'GET'
        })
        .then(function (response) {
            deffered.resolve(response.data);
        }, function (response) {
            if (response.status == 300) {
                deffered.resolve(response.data);
            }
        });
        return deffered.promise;
    };

    this.search = function (query) {
        var deffered = $q.defer();

        $http({
            url: this._baseUrl + '/Search?query=' + query + '&searchProviders=extraPlacesAutocomplete,stopPoints&app_id='
                + this._appId + '&app_key=' + this._key, method: 'GET'
        }).then(function (response) {
            deffered.resolve(response.data);
        }, function (response) {
            if (response.status == 300) {
                deffered.resolve(response.data.toLocationDisambiguation.disambiguationOptions);
            }
        });
        return deffered.promise;
    }

    this.getStadiumLocation = function (query) {
        var deffered = $q.defer();
        $http({
            url: this._baseUrl + '/Search?query=' + query + '&searchProviders=extraPlaces,extraPlacesAutocomplete&app_id='
                + this._appId + '&app_key=' + this._key, method: 'GET'
        })
        .then(function (response) {
            if(response.data[0].matches.length != 0)
            {
                deffered.resolve(response.data[0].matches[0])
            }
            else {
                console.log('Query' + response.data[1].matches[0].name);
                $http({
                    url: context._baseUrl + '/Search?query=' + response.data[1].matches[0].name + '&searchProviders=extraPlaces,extraPlacesAutocomplete&app_id='
                    + context._appId + '&app_key=' + context._key, method: 'GET'
                }).then(function (response) {
                    deffered.resolve(response.data[0].matches[0])
                })
            }
        }, function (response) {
            if (response.status == 300) {
                deffered.resolve(response);
            }
        });
        return deffered.promise;
    };

    this.getStopsLocations = function (stopsList) {
        var deffered = $q.defer();

        var url = this._baseUrl + '/StopPoint/'
        stopsList.forEach(function (stop) {
            url += stop.id + ',';
        });
        url = url.substring(0, url.length - 1) + '?app_id=' + this._appId + '&app_key=' + this._key;
        $http({
            url: url,
            method: 'GET'
        })
        .then(function (response) {
            var result = [];
            response.data.forEach(function (stop) {
                result.push({ lat: stop.lat, lon: stop.lon });
            });
           
            return deffered.resolve(result);
        });

        return deffered.promise;

    }



}]);