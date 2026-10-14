(function (root) {
  "use strict";
  // Original compact 5x7 bitmap alphabet; no network fonts or image dependencies.
  const glyphs = {
    A:"01110/10001/10001/11111/10001/10001/10001",B:"11110/10001/10001/11110/10001/10001/11110",C:"01111/10000/10000/10000/10000/10000/01111",D:"11110/10001/10001/10001/10001/10001/11110",E:"11111/10000/10000/11110/10000/10000/11111",F:"11111/10000/10000/11110/10000/10000/10000",G:"01111/10000/10000/10111/10001/10001/01111",H:"10001/10001/10001/11111/10001/10001/10001",I:"11111/00100/00100/00100/00100/00100/11111",J:"00111/00010/00010/00010/10010/10010/01100",K:"10001/10010/10100/11000/10100/10010/10001",L:"10000/10000/10000/10000/10000/10000/11111",M:"10001/11011/10101/10101/10001/10001/10001",N:"10001/11001/10101/10011/10001/10001/10001",O:"01110/10001/10001/10001/10001/10001/01110",P:"11110/10001/10001/11110/10000/10000/10000",Q:"01110/10001/10001/10001/10101/10010/01101",R:"11110/10001/10001/11110/10100/10010/10001",S:"01111/10000/10000/01110/00001/00001/11110",T:"11111/00100/00100/00100/00100/00100/00100",U:"10001/10001/10001/10001/10001/10001/01110",V:"10001/10001/10001/10001/10001/01010/00100",W:"10001/10001/10001/10101/10101/10101/01010",X:"10001/10001/01010/00100/01010/10001/10001",Y:"10001/10001/01010/00100/00100/00100/00100",Z:"11111/00001/00010/00100/01000/10000/11111",
    "0":"01110/10001/10011/10101/11001/10001/01110","1":"00100/01100/00100/00100/00100/00100/01110","2":"01110/10001/00001/00010/00100/01000/11111","3":"11110/00001/00001/01110/00001/00001/11110","4":"00010/00110/01010/10010/11111/00010/00010","5":"11111/10000/10000/11110/00001/00001/11110","6":"01110/10000/10000/11110/10001/10001/01110","7":"11111/00001/00010/00100/01000/01000/01000","8":"01110/10001/10001/01110/10001/10001/01110","9":"01110/10001/10001/01111/00001/00001/01110",
    "-":"00000/00000/00000/11111/00000/00000/00000","/":"00001/00001/00010/00100/01000/10000/10000",".":"00000/00000/00000/00000/00000/00100/00100","&":"01100/10010/10100/01000/10101/10010/01101","|":"00100/00100/00100/00100/00100/00100/00100","?":"01110/10001/00001/00010/00100/00000/00100",":":"00000/00100/00100/00000/00100/00100/00000"
  };
  const width = 1200, height = 630;
  function draw(rect, resume, stats) {
    const text = (value, x, y, scale, max) => {
      let chars = String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[—–]/g, "-").toUpperCase();
      if (chars.length > max) chars = chars.slice(0, max - 3) + "...";
      [...chars].forEach((char, index) => {
        if (char === " ") return;
        (glyphs[char] || glyphs["?"]).split("/").forEach((row, iy) => [...row].forEach((pixel, ix) => {
          if (pixel === "1") rect(x + (index * 6 + ix) * scale, y + iy * scale, scale, scale, [239, 245, 220]);
        }));
      });
    };
    rect(0, 0, width, height, [22, 39, 31]);
    for (let y = 0; y < height; y += 30) for (let x = 0; x < width; x += 30) {
      if ((x / 30 + y / 30) % 3 === 0) rect(x, y, 30, 30, [27, 46, 35]);
    }
    rect(24, 24, 1152, 582, [117, 157, 77]);
    rect(32, 32, 1136, 566, [28, 48, 37]);
    rect(64, 66, 10, 120, [168, 211, 103]);
    text(stats ? "CAREER QUEST COMPLETE" : "CAREER OVERWORLD", 94, 70, 4, 43);
    text(resume.name, 94, 128, 5, 34);
    text(resume.title, 94, 191, 3, 55);
    if (stats) {
      const cards = [["ROLES VIEWED", `${stats.roles}/${stats.totalRoles}`], ["SECRETS FOUND", `${stats.secrets}/${stats.totalSecrets}`], ["BLOCKS WALKED", String(stats.blocks)]];
      cards.forEach(([label, value], i) => {
        const x = 64 + i * 360;
        rect(x, 292, 336, 182, [47, 72, 47]);
        text(label, x + 20, 318, 3, 16);
        text(value, x + 20, 380, 7, 7);
      });
    } else {
      const lines = [""];
      for (const word of String(resume.tagline || "").split(/\s+/)) {
        const last = lines.length - 1;
        if (lines[last] && lines[last].length + word.length + 1 > 58) lines.push(word);
        else lines[last] += (lines[last] ? " " : "") + word;
      }
      text(lines[0], 64, 302, 3, 58);
      text(lines.slice(1).join(" "), 64, 343, 3, 58);
      text("EXPLORE THE JOURNEY OR VIEW THE RESUME", 64, 421, 3, 58);
    }
    rect(64, 522, 1072, 6, [117, 157, 77]);
    text("RESUME FIRST. EXPLORATION OPTIONAL.", 64, 552, 3, 58);
  }
  function renderCanvas(canvas, resume, stats) {
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas rendering is not supported.");
    draw((x,y,w,h,c) => { context.fillStyle = `rgb(${c.join(",")})`; context.fillRect(x,y,w,h); }, resume, stats);
  }
  function raster(resume, stats) {
    const pixels = new Uint8Array(width * height * 3);
    draw((x,y,w,h,c) => {
      for (let py = y; py < Math.min(height,y+h); py++) for (let px = x; px < Math.min(width,x+w); px++) {
        if (px < 0 || py < 0) continue;
        pixels.set(c, (py * width + px) * 3);
      }
    }, resume, stats);
    return { width, height, pixels };
  }
  const api = { renderCanvas, raster };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ResumeShareCard = api;
})(typeof globalThis !== "undefined" ? globalThis : this);