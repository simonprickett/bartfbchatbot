"use strict";

/* bartfbchatbot.js */

/*
 * TODO:
 *
 * - Use rich response example for departures
 * - Add link to station as a button
 * - Add postback ???
 * - When user sends location respond nearest station and postback to departures
 */

 /*
 Message with location example:
 {"sender":{"id":975552755856163},"recipient":{"id":212581079113917},"timestamp":1460870859085,"message":{"mid":"mid.1460870858914:f7997bafab09f38617","seq":286,"attachments":[{"title":"Simon's Location","url":"https://www.facebook.com/l.php?u=https%3A%2F%2Fwww.bing.com%2Fmaps%2Fdefault.aspx%3Fv%3D2%26pc%3DFACEBK%26mid%3D8100%26where1%3D32.721345192706%252C%2B-117.1642067299%26FORM%3DFBKPL1%26mkt%3Den-US&h=MAQHg8oYv&s=1&enc=AZOQ8WYuMPobIxQRY1mJJQzrFajOwni-AuFLT2EMiaSNc2LOLddqU3EaSSs1ulMS8OLcNDlCiXxqZVvffwAgxP857v9AiQw_vFW56piG_iq1Ug","type":"location","payload":{"coordinates":{"lat":32.721345192706,"long":-117.1642067299}}}]}}
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
                respText = 'Ask me for departures for any of ';

                for (; n < stations.length; n++) {
                    respText += stations[n].abbr + ', ';
                }

                console.log(respText);
                respText = respText.substring(0, respText.length - 2);
            } else {
                respText = 'Sorry something happened: ' + error;
            }

            console.log(respText);
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
                        // No station code
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
    } else if (reqText.indexOf('simontest') > -1) {
        sendGenericMessage(sender);
    } else if (reqText.indexOf('elevators') > -1) {
        httpRequest({
            url: BART_API_BASE + '/elevatorStatus',
            method: 'GET'
        }, function(error, response, body) {
            var elevatorStatus;

            if (! error && response.statusCode === 200) {
                elevatorStatus = JSON.parse(body);
                respText = 'There are currently no known elevator outages.';

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
        var station;

        if (! error && response.statusCode === 200) {
            station = JSON.parse(body);
            sendTextMessage(sender, 'Your closest BART station is ' + station.name + ' which is ' + station.distance.toFixed(2) + ' miles away.');
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
            recipient: {id:sender},
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
    var messageD = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "First card",
                    "subtitle": "Element #1 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.messenger.com/",
                        "title": "Web url"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for first element in a generic bubble",
                    }]
                }, {
                    "title": "Second card",
                    "subtitle": "Element #2 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
                    "buttons": [{
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for second element in a generic bubble",
                    }]
                }]
            }
        }
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
            message: message,
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
    var messaging_events = req.body.entry[0].messaging, 
        i = 0,
        event,
        sender,
        text,
        attachment;

    for (; i < messaging_events.length; i++) {
        event = req.body.entry[0].messaging[i];
        console.log('^^^^^^^^^^^^^^^^^^^^^^^^');
        console.log(JSON.stringify(event));
        console.log('^^^^^^^^^^^^^^^^^^^^^^^^');
        sender = event.sender.id;
        if (event.message && event.message.attachments && event.message.attachments.length > 0) {
            attachment = event.message.attachments[0];

            if (attachment.type === 'location') {
                processLocation(sender, attachment.payload.coordinates);
            }
        } else {
            if (event.message && event.message.text) {
                text = event.message.text;
                processMessage(sender, text);
            }
        }
    }

    res.sendStatus(200);
});

http.createServer(app).listen(port);
console.log('bartcfchatbot listening on port ' + port);
module.exports = app;