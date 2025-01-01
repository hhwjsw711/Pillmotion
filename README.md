# Pillmotion

A flexible video generation system that makes it easy to create videos using different templates while sharing core functionality like audio generation and subtitle synchronization. Easily extendable to your own templates, and your own agents.

## Features

-   Multiple video template support (Story mode, Meme coin mode)
-   Automated audio generation and subtitle synchronization
-   Word-to-word transcription using whisper_timestamped
-   Extensible template system
-   Trading view integration for meme coin data

## Example videos

-   [Story mode](./out/story-video.mp4)
-   [Meme coin mode](./out/meme-video.mp4)

## Setup

### Prerequisites

-   Docker
-   Bun
-   FFmpeg

### Installation

1. Build the transcription service:

```bash
docker build -t transcribe .
```

2. Start the transcription service:

```bash
docker run -d \
 --name transcribe \
 -p 5005:5005 \
 -v $(pwd)/public:/app/video/public \
 transcribe \
 gunicorn \
 --timeout 120 \
 -w 1 \
 -b 0.0.0.0:5005 \
 --access-logfile access.log \
 --error-logfile error.log \
 --chdir /app/video \
 "transcribe:app"
```

3. Add .env file based on .env.example

-   OpenAI API key (for generating transcript)
-   Claude API key (cleans srt files)
-   ElevenLabs API key + voice ids (for audio generation)
-   Social Data API key (if you want to use the meme coin template)

4. Run `bun install` to install dependencies

## Usage

### Generate Story Video

```bash
bun run build.ts -t story
```

### Generate Meme Coin Video

```bash
bun run build.ts -t meme -s <COIN_SYMBOL>
# Example:
bun run build.ts -t meme -s PILLZUMI
```

## How It Works

### Core Functionality

The system uses whisper_timestamped for precise word-to-word transcription, which is then converted to SRT format. The transcription is cleaned up using the original transcript as context to correct any model errors.

Audio files are mapped to specific speakers using the transcript data. When generating SRT files, each audio segment (e.g., 'redpill-0.mp3') gets a corresponding SRT file ('redpill-0.srt'). All audio files are ultimately concatenated into a single `public/audio.mp3` file, while maintaining speaker timing information through the SRT files.

### Templates

The project includes two main templates:

1. **Story Template**

    - Uses pre-generated story transcript
    - Example data provided in the `data` folder
    - Requires external story transcript generation system. We use Eliza for our story generation pipeline.

2. **Meme Coin Template**
    - End-to-end implementation
    - Fetches solana memecoin data from Trading View
    - Generates transcripts automatically
    - Uses the same core audio and subtitle generation system

## Extending with New Templates

To add a new template (e.g., "shitpost"):

1. Create `ShitpostComposition.tsx`
2. Add the composition to `Root.tsx` (maybe with id="Shitpost")
3. Add `generateShitpostContextContent` function in `contextGenerators.ts`
4. Update `invariantContext` function with new variables that are used by this new template.
5. Update types in `index.d.ts`
6. add generateShitpostTranscript function in `transcript.ts`
7. Add switch case for this new template in `build.ts`

## Project Structure

-   `src/tmp/context.tsx`: Dynamic context file for all templates
-   `src/Root.tsx`: Contains all template compositions
-   `contextGenerators.ts`: Generates template specific context
-   `utils/`: Helper functions and utilities
-   `data/`: Example story data

Video generation is slow because these templates run with concurrency 1 because adding concurrency adds a few minor visual bugs in the subtitles. But if you need it to go fast, change the concurrency in the scripts of package.json. To see the max concurrency your computer can do, run `bun run os.ts`.

## System Requirements

-   At least 8GB RAM recommended
-   FFmpeg installed on your system
-   Node.js 18+ (for Bun compatibility)
-   Disk space for video processing and docker image (at least 6GB recommended)

### Troubleshooting

#### Common Issues

1. **Docker Service Not Running**

    ```bash
    # Start Docker service
    sudo systemctl start docker
    ```

2. **Port 5005 Already in Use**

    ```bash
    # Find and kill process using port 5005
    lsof -i :5005
    kill -9 <PID>
    ```

3. **FFmpeg Missing**
    ```bash
    # MacOS
    brew install ffmpeg
    # Ubuntu
    sudo apt-get install ffmpeg
    ```

#### Logs

-   Check Docker logs: `docker logs transcribe`
-   Application logs are in `access.log` and `error.log`
