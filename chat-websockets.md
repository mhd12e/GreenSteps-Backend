# WebSocket Voice Chat

This project exposes a WebSocket endpoint for real-time voice chat with the AI coach. The socket streams raw audio from the browser to the API and streams synthesized audio back to the client.

## Endpoint

- `GET /voice/stream/{step_id}` (WebSocket upgrade)
- Example: `wss://api.example.com/voice/stream/STEP_ID?token=ACCESS_TOKEN`

## Authentication

The WebSocket handshake is protected with the same access token issued by the `/auth/login` endpoint.

Accepted auth locations:

- Query string: `?token=ACCESS_TOKEN`
- Authorization header: `Authorization: Bearer ACCESS_TOKEN`

Auth flow enforced by the server (`api/routes/voice.py`):

1. Extract token from query string or `Authorization` header.
2. Verify token via `utils.tokens.verify_token`.
3. Load the user from the database.
4. Validate that the `step_id` belongs to the authenticated user.
5. Validate the step's parent impact belongs to the authenticated user.
6. On any auth or ownership failure, the server accepts the socket and closes it with:
   - Close code `1008` and a reason like `Not authenticated`, `User not found`, `Step not found`, or `Impact not found`.

If the AI client is not configured, the server closes the socket with:

- Close code `1011` and reason `Server configuration error for AI client`.

## Session context

After validation, the server builds a structured context object with:

- User profile (`full_name`, `user_data`)
- Impact metadata (`title`, `description`)
- Current step (`order`, `title`, `description`, `icon`)
- Previous/next step (if they exist)
- Progress (`current_order`, `total_steps`)

This context is sent to the Gemini Live session as part of the system instruction to keep responses grounded.

## Message format

The WebSocket uses binary frames only:

- Client -> server: 16 kHz 16-bit PCM audio (Int16Array), raw bytes.
- Server -> client: 24 kHz 16-bit PCM audio, raw bytes.

No JSON frames are exchanged during the live session; the payloads are audio buffers only.

## Frontend integration

A minimal browser flow (mirrors `index.html`) looks like:

```js
const base = "https://api.example.com";
const wsUrl = base.replace("https://", "wss://").replace("http://", "ws://");
const stepId = "...";
const accessToken = "...";

const ws = new WebSocket(`${wsUrl}/voice/stream/${stepId}?token=${accessToken}`);
ws.binaryType = "arraybuffer";

ws.onopen = async () => {
  // Start capturing audio and sending binary chunks.
};

ws.onmessage = (event) => {
  // event.data is an ArrayBuffer of Int16 PCM from the server.
};

ws.onclose = () => {
  // Cleanup audio nodes, UI state, etc.
};
```

### Capturing microphone audio

The reference UI uses an `AudioWorklet` to capture microphone input, resample to 16 kHz, and send Int16 PCM buffers to the socket:

```js
inputAudioContext = new AudioContext({ sampleRate: 16000 });
mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
mediaStreamSource = inputAudioContext.createMediaStreamSource(mediaStream);

await inputAudioContext.audioWorklet.addModule(workletUrl);
const workletNode = new AudioWorkletNode(inputAudioContext, "audio-processor");
workletNode.port.onmessage = (event) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(event.data);
  }
};

mediaStreamSource.connect(workletNode);
```

### Playing audio from the server

The client converts the incoming `Int16Array` to float audio and schedules playback at 24 kHz to avoid gaps:

```js
const pcmData = new Int16Array(event.data);
const floatData = new Float32Array(pcmData.length);
for (let i = 0; i < pcmData.length; i++) {
  floatData[i] = pcmData[i] / 0x8000;
}

const buffer = outputAudioContext.createBuffer(1, floatData.length, 24000);
buffer.copyToChannel(floatData, 0);
const source = outputAudioContext.createBufferSource();
source.buffer = buffer;
source.connect(outputAudioContext.destination);
source.start();
```

## Operational notes

- The server streams audio to/from Gemini Live inside a task group; the socket stays open until the client disconnects or an error occurs.
- Always stop microphone tracks and close audio contexts when the socket closes to avoid leaking resources.
- Use the `step_id` for the current plan step to keep the AI response aligned with the user's progress.
