import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Configuration, OpenAIApi } from 'openai';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_MESSAGING_API_ENDPOINT = 'https://api.line.me/v2/bot/message';
const OPENAI_API_SECRET_KEY = process.env.OPENAI_API_SECRET_KEY;

const configuration = new Configuration({
    apiKey: OPENAI_API_SECRET_KEY,
  });
const openai = new OpenAIApi(configuration);

async function sendMessage(replyToken: string, messages: any[]): Promise<any> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
  };

  const body = {
    replyToken: replyToken,
    messages: messages
  };

  return await axios.post(LINE_MESSAGING_API_ENDPOINT + '/reply', body, {headers: headers});
}

async function getChatGPTContent(prompt: string): Promise<string | undefined> {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{role: "user", "content": `「${prompt}」カッコの中に記載されたこれらの食材を使ったズボラなレシピを1つ最初に材料費を掲示してから日本語で提案してください。必ずしも全ての食材を使う必要はありません。`}],
    temperature: 1,
  });
  return completion.data.choices[0].message?.content
}

export default async function chatbot(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const events = req.body.events;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.type === 'message') {
        const replyToken = event.replyToken;
        const messageText = event.message.text;
        const response = await getChatGPTContent(messageText);
        await sendMessage(replyToken, [{type: 'text', text: response}]);
      }
    }
    res.status(200).json({message: 'ok'});
  } else {
    res.status(405).json({message: 'Method Not Allowed'});
  }
}
