/* eslint-disable no-undef */
const timings = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const apiUrl = "https://hfu.qlulezz.de/api/";
const holidaysUrl = "https://www.schulferien.org/media/ical/deutschland/feiertage_baden-wuerttemberg_2022.ics?k=9DCd6wSzlU7TLWBdfn1DAjGW3gxLX5JMKLZDfjYwAhU5ti70T4yycK3JOXjPDwvhMlnQ9iXmgK7RrlJu4F_7LsEXMxYZjkcs57ftachDPHs";

let setupdiv = document.getElementById("setup");
let timetable = document.getElementById("timetable");
let tableContent = document.getElementById("tablecontent");
let grid = document.getElementById("grid-dates");
let dateSelector = document.getElementById("selector-text");
let colorArr = [];

// Add listeners for date changer
document.getElementById("pageLast").addEventListener("click", pageLast);
document.getElementById("pageNext").addEventListener("click", pageNext);
document.getElementById("endsetup").addEventListener("click", setupNow);

// Set custom background if available
document.documentElement.style.setProperty("--bg-url", `url(${localStorage.getItem("background")})`);

// Setup time tables
timings.forEach(time => {
    tableContent.innerHTML += `<tr><td>${time}</td></tr>`;
});

let data;
let holidays;

if (localStorage.getItem("ical-link")) {
    console.log("ICal gefunden:", localStorage.getItem("ical-link"));
    setup(true);
}

function setupNow() {
    setup(false);
}

function setup(hasLocalStorage) {
    let input;
    if (hasLocalStorage) {
        input = localStorage.getItem("ical-link");
    } else {
        input = document.getElementById("icalurl").value.trim();
    }

    if (!input || input == "" || input.length == 0) {
        return;
    }
    localStorage.setItem("ical-link", input);

    startProcess(input);
    timetable.style.display = "block";
    setupdiv.style.display = "none";
}

// Calculate current week and build based on initial ICAL
async function startProcess(_url) {
    await getData(_url);
    setColors();

    let startWeek = moment().startOf("week").toDate();
    let endWeek = moment().endOf("week").toDate();
    dateSelector.innerHTML = `${formatDate(startWeek).split(", ")[0]} - ${formatDate(endWeek).split(", ")[0]}`;

    buildData(startWeek, endWeek);
}

// Calculate 15 min slot for time indicator and add minutes if necessary
function showCurrentTime() {
    let d = new Date();
    let timeSlot = Math.round((d.getHours() * 4 + d.getMinutes() / 15) - 27);
    let addMinutes = Math.round((d.getMinutes() % 15) / 20);
    let day = 239.25 * (d.getDay() - 1);
    if (timeSlot <= 56 && timeSlot >= 1 && d.getDay() != 6 && d.getDay() != 0) {
        grid.innerHTML += `<div id="indicator" class="${weekday[d.getDay()]}" style="grid-row-start: ${timeSlot}; grid-row-end: ${timeSlot}; margin-top: ${addMinutes}px; left: ${day}px"></div>`;
    }
}

// Set colors for courses
function setColors() {
    if (localStorage.getItem("colorArr") != null) {
        colorArr = JSON.parse(localStorage.getItem("colorArr"));
        return;
    }

    for (let i = 0; i < data.length; i++) {
        let course = data[i].DESCRIPTION.split("\\")[0].split("(")[0].trim();
        let courseExists = false;
        for (let j = 0; j < colorArr.length; j++) {
            if (colorArr[j].course == course) {
                courseExists = true;
                break;
            }
        }
        if (!courseExists) {
            colorArr.push({
                course: course,
                color: getColor()
            });
        }
    }
    colorArr.push({
        course: "Ferientage",
        color: getColor()
    });
    localStorage.setItem("colorArr", JSON.stringify(colorArr));
}

// Fetch JSON Data from API
let studiengang = "";
async function getData(_url) {
    let encodedURL = encodeURIComponent(_url);
    data = await (await fetch(apiUrl + encodedURL)).json();

    let encodedURLHolidays = encodeURIComponent(holidaysUrl);
    holidays = await (await fetch(apiUrl + encodedURLHolidays)).json();

    // New method of getting Studiengang: Search for most occurring entry
    let HeaderList = [];
    let count = {};

    for (let i = 0; i < data.length; i++) {
        let options = data[i].DESCRIPTION.split("\\n");
        HeaderList.push(options[options.length - 2]);
    }

    // Source: https://bobbyhadz.com/blog/javascript-count-occurrences-of-each-element-in-array
    for (const entry of HeaderList) {
        count[entry] ? count[entry] += 1 : count[entry] = 1;
    }

    let sortedCount = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; });
    studiengang = sortedCount[0];

    console.log("Studiengang basierend auf Anzahl der Einträge erraten:");
    console.table(count);

    // Set Studiengang as header 
    document.getElementById("header").innerHTML = `Stundenplan - ${studiengang}`;
}

// Check for validity of week and build object with information
function buildData(_start, _end) {
    grid.innerHTML = "";
    for (let i = 0; i < data.length; i++) {
        if (!dateCheck(_start, _end, parseIcsDate(data[i].DTSTART))) { continue; }

        let output = {
            desc: data[i].DESCRIPTION,
            start: parseIcsDate(data[i].DTSTART),
            end: parseIcsDate(data[i].DTEND),
            startFormat: formatDateIcs(data[i].DTSTART),
            endFormat: formatDateIcs(data[i].DTEND),
            loc: data[i].LOCATION,
            sum: data[i].SUMMARY
        };
        buildHTML("entry", output);
    }
    for (let i = 0; i < holidays.length; i++) {
        if (!dateCheck(_start, _end, parseIcsDate(holidays[i].DTSTART))) { continue; }

        let output = {
            start: parseIcsDate(holidays[i].DTSTART),
            sum: holidays[i].SUMMARY
        };
        buildHTML("holiday", output);
    }
    showCurrentTime();
}

// Format information and build HTML content
function buildHTML(type, content) {
    switch (type) {
        case ("entry"): {
            let diff = content.end - content.start;
            let length = diff / 900000;

            let start = (content.start.getHours() * 4 + content.start.getMinutes() / 15) - 35;
            let end = start + length;

            // Check if day is on saturday or sunday
            let day = weekday[content.start.getDay()];
            if (day == "saturday" || day == "sunday") {
                break;
            }

            let dateStart = formatDate(content.start).split(", ");
            let dateEnd = formatDate(content.end).split(", ");
            let time = `${dateStart[1]} - ${dateEnd[1]}`;
            let date = `${dateStart[0].split(".")[0]}.${dateStart[0].split(".")[1]}`;
            let course = content.desc.split("\\")[0].split("(")[0].trim();
            let loc = content.loc.replaceAll("\\", "");

            let desc = content.desc.split("\\n");
            let prof = "";
            desc.forEach(item => {
                if (!item.includes("OMB") && !item.includes(course) && !item.includes(studiengang)) {
                    prof += item + "<br>";
                }
            });
            prof = prof.substring(0, prof.length - 4).replaceAll("\\", "");

            let backgroundColor = "";
            for (let i = 0; i < colorArr.length; i++) {
                if (colorArr[i].course == course) {
                    backgroundColor = colorArr[i].color;
                    break;
                }
            }

            // Funfact: If you write React-like code, you eventually need to actually use it
            grid.innerHTML += `
            <div class="grid-item ${day}" style="grid-row-start: ${Math.round(start)}; grid-row-end: ${Math.round(end)}; background: ${backgroundColor};)">
                <div class="datetime">
                    <p class="big">${date}, ${time}</p>
                    <p class="big loc">${getRoom(loc)}</p>
                </div>
                <div class="line"></div>
                <p>${course}</p><br>
                <p>${prof}</p>
            </div>
            `;
            break;
        }
        case ("holiday"): {
            let dateStart = formatDate(content.start).split(", ");
            let date = `${dateStart[0]}`;
            let name = content.sum;

            // Check if day is on saturday or sunday
            let day = weekday[content.start.getDay()];
            if (day == "saturday" || day == "sunday") {
                break;
            }

            let backgroundColor = "";
            for (let i = 0; i < colorArr.length; i++) {
                if (colorArr[i].course == "Ferientage") {
                    backgroundColor = colorArr[i].color;
                    break;
                }
            }

            grid.innerHTML += `
            <div class="grid-item ${day} nohover" style="grid-row-start: 1; grid-row-end: 57; background: ${backgroundColor};)">
                <div class="datetime"><p class="big">${date}</p></div>
                <div class="line"></div>
                <p>${name}</p>
            </div>
            `;
            break;
        }
    }
}

// Week selector
let weeks = 0;
function pageNext() {
    weeks++;
    let startWeek = moment().startOf("week").toDate().addDays(weeks * 7);
    let endWeek = moment().endOf("week").toDate().addDays(weeks * 7);
    dateSelector.innerHTML = `${formatDate(startWeek).split(", ")[0]} - ${formatDate(endWeek).split(", ")[0]}`;
    buildData(startWeek, endWeek);
}

function pageLast() {
    weeks--;
    let startWeek = moment().startOf("week").toDate().addDays(weeks * 7);
    let endWeek = moment().endOf("week").toDate().addDays(weeks * 7);
    dateSelector.innerHTML = `${formatDate(startWeek).split(", ")[0]} - ${formatDate(endWeek).split(", ")[0]}`;
    buildData(startWeek, endWeek);
}

// Helper Functions

// Random HSL for course background color
function getColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * (100 - 50 + 1) + 50);
    return `hsl(${hue},${saturation}%,40%)`;
}

// Format Date
function formatDateIcs(date) {
    return parseIcsDate(date).addHours(-2).toLocaleDateString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDate(date) {
    return date.addHours(-2).toLocaleDateString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function parseIcsDate(icsDate) {
    if (!/^[0-9]{8}T[0-9]{6}$/.test(icsDate)) {
        let year = icsDate.substr(0, 4);
        let month = icsDate.substr(4, 2);
        let day = icsDate.substr(6, 2);

        return new Date(Date.UTC(year, month - 1, day));
    }
    let year = icsDate.substr(0, 4);
    let month = icsDate.substr(4, 2);
    let day = icsDate.substr(6, 2);

    let hour = icsDate.substr(9, 2);
    let minute = icsDate.substr(11, 2);
    let second = icsDate.substr(13, 2);

    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

// Check of date is between two dates
function dateCheck(from, to, check) {
    let fDate, lDate, cDate;
    fDate = Date.parse(from);
    lDate = Date.parse(to);
    cDate = Date.parse(check);

    if ((cDate <= lDate && cDate >= fDate)) {
        return true;
    }
    return false;
}

// Add hours to date
Date.prototype.addHours = function (h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
};

// Add days to date
Date.prototype.addDays = function (days) {
    let date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

// Get Alfa-View room link by name
function getRoom(name) {
    if (name.includes("DM")) {
        let room = "dm" + name.substring(name.indexOf("-") + 1).split(", ")[0];
        return `<a href="https://rooms.hs-furtwangen.de/rooms/${room}" target="_blank" class="rainbow">${name}</a>`;
    }
    return name;
}