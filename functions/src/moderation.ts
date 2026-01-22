import { onObjectFinalized } from 'firebase-functions/storage';
import { defineString, type StringParam } from "firebase-functions/params";
import { Community } from "./updateJsonCatalog";

function getPublicUrl(bucket: string, fileName: string) {
  return `https://storage.googleapis.com/${bucket}/${fileName}`;
}

const hoopyWebhook = defineString('HOOPY_WEBHOOK');

const communityWebhooks: { [key in Community]: StringParam } = {
  minawan: defineString('MINAWAN_WEBHOOK'),
  goomer: defineString('GOOMER_WEBHOOK'),
  minyan: defineString('MINYAN_WEBHOOK'),
  wormpal: defineString('WORMPAL_WEBHOOK')
};

async function sendWebhook(url: string, bucket: string, filename: string, user: string) {
  await fetch(`${url}?wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      "content": null,
      "embeds": [
        {
          "title": "Delete this image",
          "url": "https://minawan.me/gallery/",
          "color": null,
          "footer": {
            "text": user
          },
          "timestamp": new Date().toISOString(),
          "image": {
            "url": getPublicUrl(bucket, filename)
          }
        }
      ],
      "attachments": []
    })
  });
  console.warn('Webhook submitted');
}

export const submitModerationWebhook = onObjectFinalized({bucket: "minawan-pics.firebasestorage.app"}, async (event) => {
  const pathParts = event.data.name.split('/');
  if (pathParts.length !== 3) return;

  const community = pathParts[0] as Community;
  const fileName = pathParts[2];

  if (fileName !== 'minasona_512x512.png') return;
  if (!Object.values(Community).includes(community)) return;

  const communityWebhook = communityWebhooks[community].value();

  if (communityWebhook && communityWebhook !== hoopyWebhook.value()) {
    await sendWebhook(communityWebhook, event.bucket, event.data.name, 'hoopykt');
  }
  await sendWebhook(hoopyWebhook.value(), event.bucket, event.data.name, 'hoopykt');
});
