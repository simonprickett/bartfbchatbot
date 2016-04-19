"use strict";

/* bartfbchatbot.js */

/*
 * TODO:
 *
 * - Use rich response example for departures
 * - Location response needs postback to work
 * - Welcome message via separate curl request
 */

var express = require('express'),
    httpRequest = require('request'),
    app = express(),
    http = require('http'),
    bodyParser = require('body-parser'),
    port = process.env.PORT || 8888,
    FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    BART_API_BASE = 'http://bart.crudworks.org/api';

function processMessage(sender, reqText) {
    var respText = 'Sorry I don\'t understand, try:\n\nstatus\nelevators\nstations\ndepartures <stationCode>',
        keywordPos = -1,
        stationCode;

    reqText = reqText.trim().toLowerCase();

    if (reqText.indexOf('stations') > -1) {
        httpRequest({
            url: BART_API_BASE + '/stations',
            method: 'GET'
        }, function(error, response, body) {
            var stations,
                n = 0;

            if (! error && response.statusCode === 200) {
                stations = JSON.parse(body);
                console.log(stations);
                respText = 'Ask me for departures for any of these station codes ';

                for (; n < stations.length; n++) {
                    respText += stations[n].abbr + ', ';
                }

                console.log(respText);
                respText = respText.substring(0, respText.length - 2);
            } else {
                respText = 'Sorry something happened: ' + error;
            }

            sendTextMessage(sender, respText);
        });
    } else if (reqText.indexOf('departures') > -1) {
        // Parse out a station code from:
        // departures from <code>
        // departures for <code>
        // departures at <code>
        // departures <code>

        keywordPos = reqText.indexOf('departures at');
        if (keywordPos > -1 && reqText.length >= keywordPos + 18) {
            stationCode = reqText.substring(keywordPos + 14, keywordPos + 18);
        } else {
            keywordPos = reqText.indexOf('departures for');
            if (keywordPos > -1 && reqText.length >= keywordPos + 19) {
                stationCode = reqText.substring(keywordPos + 15, keywordPos + 19);
            } else {
                keywordPos = reqText.indexOf('departures from');
                if (keywordPos > -1 && reqText.length >= keywordPos + 20) {
                    stationCode = reqText.substring(keywordPos + 16, keywordPos + 20);
                } else {
                    keywordPos = reqText.indexOf('departures');
                    if (reqText.length >= keywordPos + 15) {
                        stationCode = reqText.substring(keywordPos + 11, keywordPos + 15);
                    } else {
                        // Keyword found but no station code
                        keywordPos = -1;
                    }
                }
            }
        }

        if (keywordPos > -1) {
            stationCode = stationCode.trim();

            httpRequest({
                url: BART_API_BASE + '/departures/' + stationCode,
                method: 'GET'
            }, function(error, response, body) {
                var departures,
                    etd,
                    estimate,
                    n = 0,
                    m;

                if (! error && response.statusCode === 200) {
                    departures = JSON.parse(body);
                    respText = 'Sorry I don\'t know about a station with the code \'' + stationCode.toUpperCase() + '\': please try \'stations\' for a list of valid station codes.';

                    if (departures.etd && departures.etd.length > 0) {
                        respText = 'Departures from ' + departures.name;

                        for (; n < departures.etd.length; n++) {
                            etd = departures.etd[n];
                            respText += '\n\nPlatform ' + etd.estimate[0].platform + ': ' + etd.destination + '\n\n';

                            for (m = 0; m < etd.estimate.length; m++) {
                                estimate = etd.estimate[m];
                                if (estimate.minutes === 'Leaving') {
                                    respText += estimate.minutes;
                                } else {
                                    respText += estimate.minutes + (estimate.minutes > 1 ? ' mins' : ' min');
                                }
                                respText += ', ' + estimate['length'] + ' cars\n';
                            }
                        }
                    }

                    // until i can work this out...
                    // other formats allow >320 chars per message...
                    if (respText.length > 320) {
                        // need to work out ordering issue here
                        sendTextMessage(sender, respText.substring(0, 310) + '...');
                        sendTextMessage(sender, '...' + respText.substring(310));
                    } else {
                        sendTextMessage(sender, respText);
                    }
                }
            });
        } else {
            respText = 'I wasn\'t able to work out which station code you wanted to know about.  Please try\n\ndepartures from powl\n\ndepartures at powl\n\ndepartures powl'; 
            sendTextMessage(sender, respText);
        }
    } else if (reqText.indexOf('elevators') > -1) {
        httpRequest({
            url: BART_API_BASE + '/elevatorStatus',
            method: 'GET'
        }, function(error, response, body) {
            var elevatorStatus,
                messageData;

            respText = 'There are currently no known elevator issues.';

            if (! error && response.statusCode === 200) {
                elevatorStatus = JSON.parse(body);

                if (elevatorStatus.bsa && elevatorStatus.bsa.description) {
                    respText = elevatorStatus.bsa.description;
                }
            }

            sendTextMessage(sender, respText);
        }); 
    } else if (reqText.indexOf('status') > -1) {
        httpRequest({
            url: BART_API_BASE + '/status',
            method: 'GET'
        }, function(error, response, body) {
            var status, 
                numTrains;

            if (! error && response.statusCode === 200) {
                status = JSON.parse(body);

                httpRequest({
                    url: BART_API_BASE + '/serviceAnnouncements',
                    method: 'GET'
                }, function(err, resp, b) {
                    var serviceAnnouncements;
                    if (! err & resp.statusCode === 200) {
                        serviceAnnouncements = JSON.parse(b);

                        if (serviceAnnouncements.bsa && serviceAnnouncements.bsa.length > 0 && status && status.traincount) {
                            respText = 'There are ' + status.traincount + ' trains operating.\n\n' + serviceAnnouncements.bsa[0].description;
                        } else {
                            respText = 'Sorry I\'m unable to determine system status right now :(';
                        }
                    } else {
                        respText = 'Sorry I\'m unable to determine system status right now :(';
                    }

                    sendTextMessage(sender, respText);
                });
            } else {
                respText = 'Sorry I\'m unable to determine system status right now :(';
                sendTextMessage(sender, respText);
            }
        });
    } else {
        // Unknown command
        console.log(respText);
        sendTextMessage(sender, respText);
    }
}

function processLocation(sender, coords) {
    httpRequest({
        url: BART_API_BASE + '/station/' + coords.lat + '/' + coords.long,
        method: 'GET'
    }, function(error, response, body) {
        var station,
            messageData,
            directionsUrl;

        if (! error && response.statusCode === 200) {
            station = JSON.parse(body);
            directionsUrl = 'http://bing.com/maps/default.aspx?rtop=0~~&rtp=pos.' + coords.lat + '_' + coords.long + '~pos.' + station.gtfs_latitude + '_' + station.gtfs_longitude + '&mode=';

            // Walkable if 2 miles or under
            directionsUrl += (station.distance <= 2 ? 'W' : 'D');

            messageData = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [{
                            "title": "Closest BART: " + station.name,
                            "subtitle": station.distance.toFixed(2) + " miles",
                            "image_url": "http://staticmap.openstreetmap.de/staticmap.php?center=" + station.gtfs_latitude + "," + station.gtfs_longitude + "&zoom=18&size=640x480&maptype=osmarenderer&markers=" + station.gtfs_latitude + "," + station.gtfs_longitude,
                            "buttons": [{
                                "type": "web_url",
                                "url": "http://www.bart.gov/stations/" + station.abbr.toLowerCase(),
                                "title": "Station Information"
                            }, {
                                "type": "postback",
                                "title": "Departures",
                                "payload": "departures " + station.abbr,
                            }, {
                                "type": "web_url",
                                "url": directionsUrl,
                                "title": "Directions"
                            }]
                        }]
                    }
                }
            };

            sendGenericMessage(sender, messageData);
            //sendTextMessage(sender, 'Your closest BART station is ' + station.name + ' which is ' + station.distance.toFixed(2) + ' miles away.');
        } else {
            console.log(error);
            sendTextMessage(sender, 'Sorry I was unable to determine your closest BART station.');
        }
    });   
}

function sendTextMessage(sender, text) {
    var messageData = {
        text: text
    };

    httpRequest({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { 
            access_token: FACEBOOK_PAGE_ACCESS_TOKEN 
        },
        method: 'POST',
        json: {
            recipient: { 
                id: sender
            },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

function sendGenericMessage(sender, messageData) {
    httpRequest({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { 
            access_token: FACEBOOK_PAGE_ACCESS_TOKEN 
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

app.set('port', port);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', function(req, res) {
    res.send('BART Facebook Chatbot.');
});

app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'lets_talk_mass_trans1t') {
        res.send(req.query['hub.challenge']);
    }
    res.send('Error, wrong validation token');
});

app.post('/webhook/', function (req, res) {
    var messagingEvents, 
        i = 0,
        event,
        sender,
        text,
        attachment;

    if (req.body && req.body.entry) {
        messagingEvents = req.body.entry[0].messaging;

        for (; i < messagingEvents.length; i++) {
            event = messagingEvents[i];
            console.log('^^^^^^^^^^^^^^^^^^^^^^^^');
            console.log(JSON.stringify(event));
            console.log('^^^^^^^^^^^^^^^^^^^^^^^^');
            sender = event.sender.id;
            if (event.message && event.message.attachments && event.message.attachments.length > 0) {
                attachment = event.message.attachments[0];

                if (attachment.type === 'location') {
                    processLocation(sender, attachment.payload.coordinates);
                }
            } else if (event.postback && event.postback.payload) {
                sendTextMessage(sender, 'Thanks payload ' + event.postback.payload);
            } else {
                if (event.message && event.message.text) {
                    text = event.message.text;
                    processMessage(sender, text);
                }
            }
        }
    }

    res.sendStatus(200);
});

http.createServer(app).listen(port);
console.log('bartcfchatbot listening on port ' + port);
module.exports = app;