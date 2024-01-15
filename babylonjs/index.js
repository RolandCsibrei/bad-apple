const fs = require('fs');
const path = require('path');
const potrace = require('potrace');
const SvgParser = require('svg-path-parser')
const dom = require('dom-parser')
const Bezier = require('bezier-js')
const express = require('express');
const cors = require('cors');
const pngparse = require("pngparse")

const app = express();
app.use(cors());

const inputDirectory = '../desmos3/frames';
const outputFileName = 'output.json';

// Function to read PNG files from the input directory
const readPNGFiles = (frame) => {
  const files = fs.readdirSync(inputDirectory);
  return files.filter(file => file.toLowerCase().endsWith(`frame${frame}.png`));
};

// Function to convert PNG to SVG
const convertPNGtoSVG = (pngFilePath) => {
  return new Promise((resolve, reject) => {
    const pngData = fs.readFileSync(pngFilePath);

    potrace.trace(pngData, (err, svgPath) => {
      if (err) {
        reject(err);
      } else {
        resolve(svgPath);
      }
    });
  });
};

const convertPNGtoArray = (pngFilePath) => {
  return new Promise((resolve, reject) => {

    pngparse.parseFile(pngFilePath, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

// const pack = (imageData) => {
//   const w = imageData.w
//   const h = imageData.h
//   const packed = []
//   let lastPixel = pixels[0]
//   let counter = 1
//   let color = 'W'
//   for (let x = 1; x < w; x++) {
//     for (let y = 0; y < h; y++) {
//       const p = pixels[w * y + x]
//       console.log(p)
//       if (p === lastPixel) {
//         counter++
//       } else {
//         packed.push(color, counter)
//         color = color === 'W' ? 'B' : 'W'
//         counter = 0
//       }
//     }
//   }
//   return packed
// }

// Function to process all PNG files and create JSON output
const processPNGFiles = async (frame) => {
  const pngFiles = readPNGFiles(frame);

  for (const pngFile of pngFiles) {
    const svgData = [];
    console.log(pngFile)
    const pngFilePath = path.join(inputDirectory, pngFile);
    const svgPath = await convertPNGtoSVG(pngFilePath);
    const imageData = await convertPNGtoArray(pngFilePath)
    // console.log(pack(imageData))

    const grlPositions = SVG2GRL(svgPath)

    svgData.push(
      grlPositions
    );

    // svgData.push(svgPath)

    return svgData
  }

  const outputJson = {
    frames: svgData,
  };

  // Save JSON to file
  // fs.writeFileSync(outputFileName, JSON.stringify(outputJson, null, 2));
};


function SVG2GRL (source) {
  let positions = undefined
  let lines = []

  const doc = dom.parseFromString(source)
  // console.log(doc)
  const pathNodes = doc.getElementsByTagName('path')

  const pathNode = pathNodes[0]
  let x, y, ox, oy, px, py

  const path = pathNode.getAttribute('d')
  const parsed = SvgParser.parseSVG(path)
  const SMOOTHNES = 1

  let z = 0

  function addPos (x, y) {
    positions.push(x, -y, z)
  }

  function addLine (points) {
    lines.push([...points])
    points.length = 0
  }

  parsed.forEach((segment) => {
    // console.log(segment)
    if (segment.code === 'M') {
      x = segment.x
      y = segment.y
      ox = x
      oy = y
      if (positions) {
        addLine(positions)
      }
      positions = []

      addPos(x, y)
    } else if (segment.code === 'C') {
      const curve = [
        {
          x: segment.x1,
          y: segment.y1,
        },
        {
          x: segment.x,
          y: segment.y,
        },

        {
          x: segment.x2,
          y: segment.y2,
        },
      ]
      const b = new Bezier.Bezier(curve)
      const length = b.length()
      const numOfPoints = Math.round(length / SMOOTHNES)
      const points = b.getLUT(numOfPoints < 2 ? 2 : numOfPoints)
      points.forEach(p => {
        // x = px + p.x
        // y = py + p.y
        // addPos(p.x, p.y)
      })

      addPos(segment.x1, segment.y1)
      addPos(segment.x2, segment.y2)
      x = segment.x
      y = segment.y

    } else if (segment.code === 'c') {
      debugger
    } else if (segment.code === 'l') {
      x = px + segment.x
      y = py + segment.y
      addPos(x, y)
    } else if (segment.code === 'L') {
      x = segment.x
      y = segment.y
      addPos(x, y)
    } else if (segment.code === 'v') {
      x = px
      y = py + segment.y
      addPos(x, y)
    } else if (segment.code === 'h') {
      x = px + segment.x
      y = py
      addPos(x, y)
    } else if (segment.code === 'H') {
      x = segment.x
      y = py
      addPos(x, y)
    } else if (segment.code === 'V') {
      x = px
      y = segment.y
      addPos(x, y)
    } else if (segment.command === 'closepath') {
      x = ox
      y = oy
      addPos(x, y)
      addLine(positions)
    }
    px = x
    py = y
  })

  x = ox
  y = oy
  addPos(x, y)
  addLine(positions)

  // const greasedLines: GreasedLine[] = []
  // const float32Arrays: Float32Array[] = []
  // countries.forEach(function (c) {
  //     float32Arrays.push(new Float32Array(c.positions))
  // })
  // const greasedLine = makeLine("lajna", float32Arrays);
  // greasedLines.push(greasedLine)

  return lines

}

app.get('/', (req, res) => {
  const frame = req.query?.frame ?? 4838
  processPNGFiles(frame).then((points) => {
    res.json(points);
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});