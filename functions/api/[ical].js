// ICal to JSON parser
// Source: https://www.npmjs.com/package/ical2json
var NEW_LINE = /\r\n|\n|\r/;
var COLON = ":";
var SPACE = " ";
function convert(source) {
    var currentKey = "",
        currentValue = "",
        parentObj = {},
        splitAt;

    var output = {};
    var lines = source.split(NEW_LINE);

    var currentObj = output;
    var parents = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.charAt(0) === SPACE) {
            currentObj[currentKey] += line.substr(1);
        } else {
            splitAt = line.indexOf(COLON);

            if (splitAt < 0) {
                continue;
            }

            currentKey = line.substr(0, splitAt);
            currentValue = line.substr(splitAt + 1);

            switch (currentKey) {
                case "BEGIN":
                    parents.push(parentObj);
                    parentObj = currentObj;
                    if (parentObj[currentValue] == null) {
                        parentObj[currentValue] = [];
                    }
                    // Create a new object, store the reference for future uses
                    currentObj = {};
                    parentObj[currentValue].push(currentObj);
                    break;
                case "END":
                    currentObj = parentObj;
                    parentObj = parents.pop();
                    break;
                default:
                    if (currentObj[currentKey]) {
                        if (!Array.isArray(currentObj[currentKey])) {
                            currentObj[currentKey] = [currentObj[currentKey]];
                        }
                        currentObj[currentKey].push(currentValue);
                    } else {
                        currentObj[currentKey] = currentValue;
                    }
            }
        }
    }
    return output;
}

let jsonData;
async function getData(_url) {
    let icalRaw = await (await fetch(_url)).text();
    let icalJSON = convert(icalRaw);
    jsonData = icalJSON.VCALENDAR[0].VEVENT;

    // Fix fucked obj names
    jsonData.forEach(obj => {
        obj.DTSTART = obj["DTSTART;TZID=Europe/Berlin"] || obj["DTSTART;VALUE=DATE"];
        obj.DTEND = obj["DTEND;TZID=Europe/Berlin"] || obj["DTSTART;VALUE=DATE"];
        delete obj["DTSTART;TZID=Europe/Berlin"];
        delete obj["DTEND;TZID=Europe/Berlin"];
        delete obj["DTSTART;VALUE=DATE"];
        delete obj["DTEND;VALUE=DATE"];
    })
}

export async function onRequest(context) {
    // Contents of context object
    const {
        request, // same as existing Worker API
        env, // same as existing Worker API
        params, // if filename includes [id] or [[path]]
        waitUntil, // same as ctx.waitUntil in existing Worker API
        next, // used for middleware or to fetch assets
        data, // arbitrary space for passing data between middlewares
    } = context;

    await getData(decodeURIComponent(params.ical));

    return new Response(JSON.stringify(jsonData), {
        headers: { 'content-type': 'application/json' },
    })
}