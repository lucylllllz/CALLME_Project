# backend_deployment.md

Deploy CALLME GPU backend from `environment.yml` and expose via Cloudflare Tunnel.

## 0. Prerequisites
- NVIDIA GPU + CUDA  
- Anaconda  
- `environment.yml` in repo  
- Supabase CLI  

## 1. Create Environment
```bash
conda env create -f environment.yml
conda activate callme
```

## 2. Start Server
```bash
uvicorn api:app --host 0.0.0.0 --port 7777
```

## 3. Expose with Cloudflare Tunnel
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared
./cloudflared tunnel --url localhost:7777
# copy https URL
```

## 4. Deploy Edge Function
Create `supabase/functions/backend_server.ts` with the code below, replace `<tunnel>` with your URL, then:

```bash
supabase functions deploy backend_server --project-ref <ref>
```

### backend_server.ts
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GPU_BACKEND = "https://<tunnel>.trycloudflare.com";
console.info("backend_server started");

Deno.serve(async (req) => {
  let payload;
  try {
    const raw = await req.text();
    if (!raw) return new Response("empty body", { status: 400 });
    payload = JSON.parse(raw);
  } catch (e) {
    return new Response(`JSON parse fail: ${e.message}`, { status: 400 });
  }

  const form = new FormData();
  switch (payload.endpoint) {
    case "fluency":
      if (!payload.audio) return new Response("missing audio", { status: 400 });
      form.append("audio", await dataUriToBlob(payload.audio, "audio/wav"), "audio.wav");
      break;
    case "sketch2real":
      if (!payload.image) return new Response("missing image", { status: 400 });
      form.append("image", await dataUriToBlob(payload.image, "image/png"), "image.png");
      break;
    case "grounding":
      if (!payload.image) return new Response("missing image", { status: 400 });
      form.append("image", await dataUriToBlob(payload.image, "image/png"), "image.png");
      if (payload.text_queries) form.append("text_queries", payload.text_queries);
      if (payload.box_threshold !== undefined) form.append("box_threshold", String(payload.box_threshold));
      break;
    default:
      return new Response("unknown endpoint", { status: 400 });
  }

  const gpuRes = await fetch(`${GPU_BACKEND}/${payload.endpoint}`, { method: "POST", body: form });
  if (!gpuRes.ok) return new Response(`GPU service error: ${gpuRes.status}`, { status: gpuRes.status });
  const gpuJson = await gpuRes.json();

  return new Response(JSON.stringify(gpuJson), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

async function dataUriToBlob(dataUri: string, type: string): Promise<Blob> {
  const base64 = dataUri.split(",")[1];
  const bin = atob(base64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type });
}
```

## 5. Verify
```bash
curl -X POST https://<your-ref>.supabase.co/functions/v1/backend_server \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"fluency","audio":"data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="}'
```