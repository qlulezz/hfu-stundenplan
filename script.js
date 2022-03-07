const timings = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const apiUrl = "https://hfu.qlulezz.de/api/"

let setupdiv = document.getElementById("setup");
let timetable = document.getElementById("timetable");
let tableContent = document.getElementById("tablecontent");
let grid = document.getElementById("grid-dates");
let dateSelector = document.getElementById("selector-text");
let temp = "";
let col = "";

// Add listeners for date changer
document.getElementById("pageLast").addEventListener("click", pageLast);
document.getElementById("pageNext").addEventListener("click", pageNext);
document.getElementById("endsetup").addEventListener("click", setupNow);
document.getElementById("reset").addEventListener("click", resetSetup)

// Setup time tables
timings.forEach(time => {
    tableContent.innerHTML += `<tr><td>${time}</td></tr>`;
});

let data;

if (localStorage.getItem("ical-link")) {
    console.log("ICal found:", localStorage.getItem("ical-link"));
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
    localStorage.setItem("ical-link", input)

    startProcess(input);
    timetable.style.display = "block";
    setupdiv.style.display = "none";
}

function resetSetup() {
    localStorage.removeItem("ical-link");
    location.reload();
}

// Calculate current week and build based on initial ICAL
async function startProcess(_url) {
    await getData(_url);

    var startWeek = moment().startOf('week').toDate();
    var endWeek = moment().endOf('week').toDate();
    dateSelector.innerHTML = `${formatDate(startWeek).split(", ")[0]} - ${formatDate(endWeek).split(", ")[0]}`

    buildData(startWeek, endWeek);
}

// Fetch JSON Data from API
let studiengang = "";
async function getData(_url) {
    let encodedURL = encodeURIComponent(_url);
    data = await (await fetch(apiUrl + encodedURL)).json();

    // Set Header
    studiengang = data[0].DESCRIPTION.split("\\n")[data[0].DESCRIPTION.split("\\n").length - 2]
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
        }
        buildHTML(output);
    }
}

// Format information and build HTML content
function buildHTML(content) {
    let diff = content.end - content.start;
    let length = diff / 900000;

    let start = (content.start.getHours() * 4 + content.start.getMinutes() / 15) - 31;
    let end = start + length;

    let dateStart = formatDate(content.start).split(", ");
    let dateEnd = formatDate(content.end).split(", ");
    let time = `${dateStart[1]} - ${dateEnd[1]}`
    let date = `${dateStart[0].split(".")[0]}.${dateStart[0].split(".")[1]}`
    let course = content.desc.split("\\")[0].split("(")[0];
    let loc = content.loc.replaceAll("\\", "");

    let desc = content.desc.split("\\n");
    let prof = "";
    desc.forEach(item => {
        if (!item.includes("OMB") && !item.includes(course) && !item.includes(studiengang)) {
            prof += item + "<br>";
        }
    })
    prof = prof.substring(0, prof.length - 4).replaceAll("\\", "")

    // Funfact: If you write React-like code, you eventually need to actually use it
    grid.innerHTML += `
    <div class="grid-item ${weekday[content.start.getDay()]}" style="grid-row-start: ${Math.round(start)}; grid-row-end: ${Math.round(end)}; filter: hue-rotate(${getColor(content.loc)}deg)">
        <div class="datetime">
            <p class="big">${date}, ${time}</p>
            <p class="big loc">${loc}</p>
        </div>
        <div class="line"></div>
        <p>${course}</p><br>
        <p>${prof}</p>
    </div>
    `;
}

// Week selector
let weeks = 0;
function pageNext() {
    weeks++;
    let startWeek = moment().startOf('week').toDate().addDays(weeks * 7);
    let endWeek = moment().endOf('week').toDate().addDays(weeks * 7);
    dateSelector.innerHTML = `${formatDate(startWeek).split(", ")[0]} - ${formatDate(endWeek).split(", ")[0]}`
    buildData(startWeek, endWeek);
}

function pageLast() {
    weeks--;
    let startWeek = moment().startOf('week').toDate().addDays(weeks * 7);
    let endWeek = moment().endOf('week').toDate().addDays(weeks * 7);
    dateSelector.innerHTML = `${formatDate(startWeek).split(", ")[0]} - ${formatDate(endWeek).split(", ")[0]}`
    buildData(startWeek, endWeek);
}

// Helper Functions

// Random color for courses
function getColor(name) {
    if (temp == name) {
        return col;
    }
    temp = name;
    col = Math.floor(Math.random() * 360)
    return col;
}

// Format Date
function formatDateIcs(date) {
    return parseIcsDate(date).addHours(-1).toLocaleDateString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDate(date) {
    return date.addHours(-1).toLocaleDateString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function parseIcsDate(icsDate) {
    if (!/^[0-9]{8}T[0-9]{6}$/.test(icsDate))
        throw new Error("ICS Date is wrongly formatted: " + icsDate);

    var year = icsDate.substr(0, 4);
    var month = icsDate.substr(4, 2);
    var day = icsDate.substr(6, 2);

    var hour = icsDate.substr(9, 2);
    var minute = icsDate.substr(11, 2);
    var second = icsDate.substr(13, 2);

    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

// Check of date is between two dates
function dateCheck(from, to, check) {
    var fDate, lDate, cDate;
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
}

// Add days to date
Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}