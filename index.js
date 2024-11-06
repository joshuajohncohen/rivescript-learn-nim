// Globals


/*
[
    {"r": "s", "c": "hi"},
    {"r": "r", "c": "hello"}
]
*/
const startingMessage = "Hi! Would you like to get started? (yes or no)";
const errorMessage = "Sorry, but I don't know what you mean. Try asking again. Your new message will overwrite your previous one.";
let messagesGlobal = [{"r":"r", "c":startingMessage}];

let bot;

let lock = false;


// Functions

function b64e(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
}

function b64d(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function init() {
    try {
        bot = new RiveScript({
            errors: {
                replyNotMatched: errorMessage
            },
        });
        bot.loadFile("brain.txt").then(() => {
            return bot.sortReplies();
        }).then(() => {
            loadMessages();
        }).catch(e => {
            alert("Error: " + e);
        });
    } catch (e) {
        alert("Error: " + e)
    }
}

function loadMessages() {
    try {
        let fragment = location.hash.replace("#", "");
        if (fragment) {
            fragment = JSON.parse(b64d(fragment));
            messagesGlobal = Object.assign(messagesGlobal, fragment);
        }
    } catch (e) {
        alert("Error: " + e);
    }
    updateUI();
}

function updateUI() {
    let htmlString = "";
    for (let i = 0; i < messagesGlobal.length; i++) {
        let message = messagesGlobal[i];
        if (message["r"] == "s") {
            htmlString += `
            <div class="message sent">
                <div class="message-content">${HtmlSanitizer.SanitizeHtml(message["c"])}</div>
                <div class="icon-bubble sent-bubble"></div>
            </div>`;
        } else if (message["r"] == "r") {
            htmlString += `
            <div class="message received">
                <div class="message-content">${HtmlSanitizer.SanitizeHtml(message["c"])}</div>
                <div class="icon-bubble received-bubble"></div>
            </div>`;
        }
    }
    try {
        let chatEl = $(".chat-container")[0];
        chatEl.innerHTML = htmlString;

        const messages = chatEl.getElementsByClassName('message');
        if (messages.length > 0) {
            messages[messages.length - 1].scrollIntoView({"behavior": "smooth"});
        }
    } catch (e) {
        alert("Unable to update message HTML - " + e);
    }
}

function updateURL() {
    let payload = b64e(JSON.stringify(messagesGlobal));
    if (messagesGlobal.length == 1) {
        payload = "";
    }
    location.hash = payload;
}

function keyUp(e) {
    e.which = e.which || e.keyCode;
    if (e.which == 13) {
        if (!lock) {
            updateUI();
            processMessage($(".message-input")[0].value);
            $(".message-input")[0].value = "";
        }
    }
}

function processMessage(message) {
    lock = true;
    try {
        if (messagesGlobal.length > 2 && messagesGlobal[messagesGlobal.length - 1]["c"] === errorMessage) {
            messagesGlobal.pop();
            messagesGlobal.pop();
        }
        messagesGlobal.push({"r": "s", "c": message});
        bot.reply("local-user", message).then(response => {
            messagesGlobal.push({"r": "r", "c": response});
            updateUI();
            updateURL();
        }).catch(e => {
            alert("ERROR: " + e);
        }).finally(() => {
            lock = false;
        });
    } catch (e) {
        alert("ERROR: " + e);
        lock = false;
    }
}

function clearChat() {
    messagesGlobal = [{"r":"r", "c": startingMessage}];
    updateUI();
    updateURL();
}