// SETTINGS PAGE
let colorDiv = document.getElementById("colors");
let colorArr = JSON.parse(localStorage.getItem("colorArr"));
let template = document.querySelector("[color-template]");

// Reset setup button
document.getElementById("reset").addEventListener("click", resetSetup)
document.getElementById("icalurl").value = localStorage.getItem("ical-link");
function resetSetup() {
    localStorage.removeItem("ical-link");
    localStorage.removeItem("colorArr");
    window.location = "./index.html";
}

// Draw colors used for courses
for (let i = 0; i < colorArr.length; i++) {
    let color = template.content.cloneNode(true).children[0];
    let input = color.querySelector("input");
    let p = color.querySelector("p");

    let hsl = colorArr[i].color.split(",");
    input.value = hslToHex(hsl[0].split("(")[1].trim(), hsl[1].split("%")[0].trim(), hsl[2].split("%")[0].trim());
    p.innerHTML = colorArr[i].course;

    colorDiv.appendChild(color);
}

// Lets user choose color of individual courses and saves choice in LocalStorage
let colorPickers = document.querySelectorAll(".colorinput");
colorPickers.forEach(color => {
    color.onchange = () => {
        color.parentElement.style.backgroundColor = color.value;

        let course = color.parentElement.parentElement.firstElementChild.innerHTML;
        for (let i = 0; i < colorArr.length; i++) {
            if (colorArr[i].course == course) {
                let rgb = color.parentElement.style.backgroundColor.split(", ");
                let hsl = RGBToHSL(rgb[0].split("(")[1], rgb[1], rgb[2].split(")")[0]);
                colorArr[i].color = hsl;
                localStorage.setItem("colorArr", JSON.stringify(colorArr))
            }
        }
    }
    color.parentElement.style.backgroundColor = color.value;
});

// Helper functions for converting color spaces

// Source: https://stackoverflow.com/questions/36721830/convert-hsl-to-rgb-and-hex
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// Source: https://css-tricks.com/converting-color-spaces-in-javascript/
function RGBToHSL(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    let cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        l = 0;

    if (delta == 0)
        h = 0;
    else if (cmax == r)
        h = ((g - b) / delta) % 6;
    else if (cmax == g)
        h = (b - r) / delta + 2;
    else
        h = (r - g) / delta + 4;

    h = Math.round(h * 60);

    if (h < 0)
        h += 360;

    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return "hsl(" + h + "," + s + "%," + l + "%)";
}