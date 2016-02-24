var azure = require("azure");
//var say = require("say");
var winsay = require("winsay");

function checkForMessages(sbService, queueName, callback) {
    sbService.receiveQueueMessage(queueName, { isPeekLock: true }, function (err, lockedMessage) {
        if (err) {
            if (err === "No messages to receive") {
                //console.log("No messages");
            } else {
                callback(err);
            }
        } else {
            callback(null, lockedMessage);
        }
    });
}

function speakMessage(message) {
    //say.speak(message);
    winsay.speak("Red", message, function(error, result) {
        if (error) {
            console.log("Failed to speak the message '" + message + "'\nResult: " + result, error);
        }
    });
}

function processBuildCompleted(build) {

    var name = build.requestedFor.displayName;

    if (build.result === "succeeded") {
        speakMessage("Hey everybody! " + name + " finally checked something in that didn't break the build! Yay!")
    }
    else if (build.result === "failed") {
        var msg = name + ", that code you just built is probably the most insanely idiotic code I have ever seen. At no point in your scattered, incoherent logic were you even close to anything that could be considered a decent application. Everyone in this room is now dumber for having seen it. I award you no points, and may God have mercy on your soul."
        speakMessage(msg);
    }
}

function processPullRequest(pullRequest) {

    var name = pullRequest.createdBy.displayName;

    speakMessage("Everyone drop everything! " + name + " wants you to review what is sure to be the greatest code ever written. Probably.")
}

function processMessage(sbService, err, lockedMsg) {
    if (err) {
        console.log("Error on Rx: ", err);
        if (lockedMsg) {
            console.log("Message will be unlocked.");
            sbService.unlockMessage(lockedMsg, function(err2) {
                console.log("Failed to unlock message: ", err2);
            });
        }
    } else {
        console.log("Rx: ", lockedMsg);

        try {
            var message = JSON.parse(lockedMsg.body);
            if (message.eventType === "build.complete") {
                processBuildCompleted(message.resource);
            }
            else if (message.eventType === "git.pullrequest.created") {
                processPullRequest(message.resource);
            }
        } catch (e) {
            console.log("Error parsing service bus message: " + e);
        }

        sbService.deleteMessage(lockedMsg, function (err2) {
            if (err2) {
                console.log("Failed to delete message: ", err2);
            } else {
                console.log("Deleted message.");
            }
        });
    }
}

// Sends a service bus message. TODO: Move to tests
var idx = 0;
function sendMessages(sbService, queueName) {
    var msg = "Message # " + (++idx);
    sbService.sendQueueMessage(queueName, msg, function (err) {
        if (err) {
            console.log("Failed Tx: ", err);
        } else {
            console.log("Sent " + msg);
        }
    });
}

var queueName = process.argv[2];
if (!queueName) throw new Error("Must provide queue name");

var connStr = process.argv[3];
if (!connStr) throw new Error("Must provide connection string");

console.log("Build Alert System online. Waiting for messages...");
//speakMessage("Build Alert System online. Waiting for messages...");

console.log("Connecting to " + connStr + " queue " + queueName);
var sbService = azure.createServiceBusService(connStr);
sbService.createQueueIfNotExists(queueName, function (err) {
    if (err) {
        console.log("Failed to create queue: ", err);
    } else {
        setInterval(checkForMessages.bind(null, sbService, queueName, processMessage.bind(null, sbService)), 5000);
    }
});
