const sharp = require("sharp");
const exif = require("exif-reader");
const fs = require("fs");

async function test() {
  try {
    const buffer = fs.readFileSync("../surf-share/public/home/latest/latest1.jpg");
    const metadata = await sharp(buffer).metadata();
    if (metadata.exif) {
      console.log("Has EXIF");
      const parsed = exif(metadata.exif);
      console.log("DateTimeOriginal:", parsed?.Photo?.DateTimeOriginal);
      console.log("DateTime:", parsed?.Image?.DateTime);
    } else {
      console.log("No EXIF found in test image");
    }
  } catch (e) {
    console.error(e);
  }
}
test();
