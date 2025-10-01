# Video Rendering System

This document describes the video rendering system implemented for the Oriel Signal FX Pro backend.

## Overview

The video rendering system uses Playwright (headless browser automation) and FFmpeg to generate MP4 videos from audio files and visualization configurations. The system is designed to run as background jobs in Redis Queue (RQ) workers.

## Components

### 1. Video Rendering Job (`render_video_job`)

The main job function that orchestrates the entire video rendering process:

- **Input**: Job ID, User ID, audio file path, render configuration
- **Output**: MP4 video file uploaded to cloud storage
- **Process**: Audio validation → Browser rendering → FFmpeg encoding → Cloud upload → Email notification

### 2. Browser-based Rendering (`render_video_with_browser`)

Uses Playwright to capture the audio visualizer in a headless browser:

- Launches Chromium in headless mode with optimized settings
- Creates a local HTML file with the visualizer and audio
- Records the browser tab as a WebM video file
- Handles audio synchronization and timing

### 3. FFmpeg Integration (`encode_video_with_ffmpeg`)

Processes the raw browser recording into an optimized MP4:

- Combines the recorded video with the original audio
- Applies H.264 encoding with optimized settings
- Ensures compatibility across devices and platforms
- Generates web-optimized MP4 files

## Dependencies

### Required Python Packages

```
playwright==1.40.0
ffmpeg-python==0.2.0
```

### System Dependencies

- **FFmpeg**: Video encoding and audio processing
- **Chromium**: Headless browser for visualization capture

## Installation

### 1. Install Python Dependencies

```bash
pip install playwright==1.40.0 ffmpeg-python==0.2.0
```

### 2. Install Playwright Browsers

```bash
python -m playwright install chromium
```

### 3. Install FFmpeg

**macOS (Homebrew):**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Docker (included in Dockerfile):**
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

## Configuration

### Render Configuration Options

The `render_config` parameter supports the following options:

```json
{
    "fftSize": 2048,
    "backgroundColor": "black",
    "visualizationType": "bars"
}
```

### Browser Settings

The system uses optimized Chromium settings for video rendering:

- Headless mode enabled
- Hardware acceleration disabled for consistency
- Audio autoplay enabled
- Security restrictions relaxed for local file access

### Video Output Settings

- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30 FPS
- **Video Codec**: H.264 (libx264)
- **Audio Codec**: AAC
- **Quality**: CRF 23 (high quality, reasonable file size)

## Usage

### In RQ Worker Context

```python
from app.jobs.queue import enqueue_job
from app.jobs.jobs import render_video_job

# Enqueue a video rendering job
job = enqueue_job(
    'video_rendering',
    render_video_job,
    job_id='unique_job_id',
    user_id=123,
    audio_file_path='/path/to/audio.wav',
    render_config={
        'fftSize': 2048,
        'backgroundColor': 'black'
    }
)
```

### Direct Function Call (Testing)

```python
from app.jobs.jobs import render_video_job

result = render_video_job(
    job_id='test_job',
    user_id=1,
    audio_file_path='/path/to/test_audio.wav',
    render_config={'fftSize': 1024}
)
```

## Testing

### Run Basic Tests

```bash
# Test video rendering functionality
python test_video_rendering.py

# Test integration with job system
python test_integration_render.py
```

### Test Dependencies

```bash
# Check if all dependencies are available
python -c "
from app.jobs.jobs import render_video_with_browser
from playwright.sync_api import sync_playwright
import ffmpeg
print('All dependencies available')
"
```

## Performance Considerations

### Resource Usage

- **CPU**: High during video encoding (FFmpeg)
- **Memory**: ~500MB per concurrent rendering job
- **Disk**: Temporary files require ~100MB per job
- **Time**: ~2-3x audio duration for complete processing

### Optimization Tips

1. **Limit Concurrent Jobs**: Run 1-2 video rendering jobs simultaneously
2. **Temporary File Cleanup**: Automatic cleanup prevents disk space issues
3. **Audio Duration Limits**: Consider limiting audio length (e.g., 5 minutes max)
4. **Quality vs Speed**: Adjust CRF value for quality/speed tradeoff

## Error Handling

### Common Issues

1. **Browser Launch Failure**: Check Playwright installation
2. **FFmpeg Encoding Error**: Verify FFmpeg installation and audio format
3. **Audio File Not Found**: Ensure audio file exists and is accessible
4. **Insufficient Disk Space**: Monitor temporary directory space

### Error Recovery

- Automatic cleanup of temporary files on failure
- Detailed error logging for debugging
- Job status updates for user feedback
- Retry mechanisms for transient failures

## Monitoring

### Job Progress Tracking

The system provides real-time progress updates:

- `initializing`: Setting up temporary files
- `loading_visualizer`: Creating HTML and loading browser
- `recording_video`: Capturing browser output
- `encoding_video`: Processing with FFmpeg
- `completed`: Video ready for download

### Logging

Comprehensive logging covers:

- Job lifecycle events
- Performance metrics (duration, file sizes)
- Error conditions and stack traces
- Resource usage and cleanup

## Security Considerations

### File Handling

- Temporary files are created in secure directories
- Automatic cleanup prevents file accumulation
- Audio files are validated before processing

### Browser Security

- Headless mode prevents UI-based attacks
- Local file access is restricted to job directory
- No network access during rendering

### Resource Limits

- Audio file size limits prevent abuse
- Processing timeouts prevent runaway jobs
- Memory usage monitoring prevents system overload