import { Community } from "../communities";

function getPublicUrl(bucket: string, fileName: string) {
  return `https://storage.googleapis.com/${bucket}/${fileName}`;
}

export async function sendReviewWebhook(
  url: string,
  community: Community,
  filename: string,
  user: string,
  userId: string,
  moderationKey: string
) {
  const result = await fetch(`${url}?wait=true&with_components=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      "flags": 1 << 15, // Components V2
      "components": [
        {
          "type": 17,
          "components": [
            {
              "type": 10,
              "content": `User ${user} uploaded a ${community}`
            },
            {
              "type": 12,
              "items": [
                {
                  "media": { "url": getPublicUrl('minawan-pics.firebasestorage.app', filename) + '?t=' + Date.now() },
                }
              ]
            },
            {
              "type": 1,
              "components": [
                {
                  "type": 2,
                  "label": "Approve",
                  "emoji": {
                    "id": null,
                    "name": "✅"
                  },
                  "style": 5,
                  "url": `https://us-central1-minawan-pics.cloudfunctions.net/moderationApproveImage?key=${moderationKey}&community=${community}&userId=${userId}`
                },
                {
                  "type": 2,
                  "label": "Remove",
                  "emoji": {
                    "id": null,
                    "name": "🗑️"
                  },
                  "style": 5,
                  "url": `https://us-central1-minawan-pics.cloudfunctions.net/moderationDeleteImage?key=${moderationKey}&community=${community}&userId=${userId}`,
                }
              ]
            }
          ]
        }
      ]
    })
  });
  console.info('Webhook submitted');
  const message: { id: string } = await result.json()
  return message.id;
}

export async function updateWebhookMessageToApproved(
  url: string,
  messageId: string,
  community: Community,
  filename: string,
  user: string,
  userId: string,
  moderationKey: string
) {
  const result = await fetch(`${url}/messages/${messageId}?wait=true&with_components=true`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      "flags": 1 << 15, // Components V2
      "components": [
        {
          "type": 17,
          "components": [
            {
              "type": 10,
              "content": `User ${user} uploaded a ${community}`
            },
            {
              "type": 12,
              "items": [
                {
                  "media": { "url": getPublicUrl('minawan-pics.firebasestorage.app', filename) + '?t=' + Date.now() },
                }
              ]
            },
            {
              "type": 1,
              "components": [
                {
                  "type": 2,
                  "label": "Already Approved",
                  "style": 5,
                  "url": `https://us-central1-minawan-pics.cloudfunctions.net/moderationApproveImage?key=${moderationKey}&community=${community}&userId=${userId}`,
                  "disabled": true
                },
                {
                  "type": 2,
                  "label": "Remove",
                  "emoji": {
                    "id": null,
                    "name": "🗑️"
                  },
                  "style": 5,
                  "url": `https://us-central1-minawan-pics.cloudfunctions.net/moderationDeleteImage?key=${moderationKey}&community=${community}&userId=${userId}`,
                }
              ]
            }
          ]
        }
      ]
    })
  });
  console.info('Webhook updated');
  const message: { id: string } = await result.json()
  return message.id;
}

export async function deleteWebhookMessage(webhook: string, messageId: string) {
  try {
    await fetch(`${webhook}/messages/${messageId}`, {
      method: 'DELETE'
    });
  } catch (e) {
    console.error(`Failed to delete webhook for message ID ${messageId}`, e);
  }
}
