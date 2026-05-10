# STROOMpoint Interactive Card Detection Map

Browser-based prototype for a STROOMpoint pop-up stall experience. Visitors hold printed cards up to a laptop camera, the map highlights matching Groene Hart opportunities, and a QR code opens a mocked mobile email follow-up page.

## Setup

1. Clone the repo.
2. Open `index.html` in Chrome or Firefox.
3. Allow camera access when prompted.

If browser security blocks ES module loading from local files, run a tiny static server from the project folder:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Training your own card model

1. Go to teachablemachine.withgoogle.com.
2. Create an Image Project.
3. Create one class per card: 21 total, including `no_card`.
4. For each class, record or upload about 40-60 photos of that card in different lighting conditions and angles.
5. Train the model.
6. Click Export, TensorFlow.js, Upload, and copy the URL.
7. In `js/config.js`, set `MODEL_URL` to your exported model URL.

## Mock mode (development)

If `MODEL_URL` is empty, the app runs in mock mode. Press keyboard keys to simulate card detection:

```text
1: Job Seeker   2: Student     3: Professional  4: Returning  5: Employer
6: Plumber      7: Electrician 8: Carpenter     9: Catering   0: Healthcare
Q: IT           W: Admin       E: Driver
A: Flexible     S: Part-time   D: Full-time     F: Near Home
Z: No Exp       X: Training    C: Career Change
```

## Printable cards

Open `cards.html` to view and print the 20 physical card designs. The page uses the same card labels and model class names as `js/config.js`.

Each printable card includes a QR marker. The main camera reader can scan that marker immediately, so the prototype works without training a Teachable Machine model. A trained visual model can still be added later by setting `MODEL_URL`.

## Adding the SVG map

Replace `assets/map.svg` with your Groene Hart SVG. Ensure the SVG has a `viewBox` attribute. The `map.js` file reads the `viewBox` and places markers using normalized 0-100 percent coordinates.

## Eye tracking (future)

Eye tracking will be added using WebGazer.js. The camera architecture supports this without modification because `js/camera.js` creates one shared video stream.

WebGazer.js: https://webgazer.cs.brown.edu/
