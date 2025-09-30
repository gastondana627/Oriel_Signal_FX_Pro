# Oriel_FX - Audio-Reactive 3D Visualizer

A lightweight, customizable 3D visualizer that reacts to music in real-time, built with Three.js and the Web Audio API. This prototype serves as a demonstration and the foundation for a future pro version.

---

[Insert a GIF or WebM of the app in action here]

### ✨ Features

* **Real-time Audio Reactivity:** The 3D shape pulses in size with the bass and changes color with the treble of any audio file.
* **Customizable UI:** An interactive control panel allows users to change shapes, colors, and animation intensity on the fly.
* **Dynamic Shape Library:** A large, expandable library of classic and procedurally generated shapes. The "Randomize" button provides a new selection of three unique shapes each time.
* **User Audio Upload:** Users can upload their own MP3 or WAV files to drive the visualization.
* **WebM Video Export:** A built-in recorder captures a 30-second, high-quality `.webm` video file, including audio.
* **MP3 Audio Export:** A simple option to download the currently loaded audio track.
* **Usage Limiter:** A prototype download limiter tracks usage in the browser's `localStorage`.

### 🚀 Live Demo

[Link to your live Vercel demo will go here]

### ⚙️ How to Run Locally

1.  Clone the repository.
2.  Navigate into the `Oriel_Fx` directory.
3.  Run a simple local server:
    ```bash
    python3 -m http.server 8001
    ```
4.  Open your browser and go to `http://localhost:8001`.

### 🔧 Customization (for Developers)

This tool is designed to be easily customized. All the core visual parameters are located in the `config` object at the top of the `graph.js` file.

```javascript
window.config = {
    shape: 'cube',
    size: 4,
    baseColor: 0xffffff,
    glowColor: 0x8309D5,
    // ...and more
};
```

To add new shapes, simply add a new entry to the `allShapes` array in `script.js` and a corresponding `case` in the `recreateShape()` function in `graph.js`.