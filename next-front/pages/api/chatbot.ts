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

async function getChatGPTContent(prompt: string): Promise<string | any> {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{role: "user", "content": `${prompt} これらの食材を使ったズボラなレシピを1つ日本語で提案してください。必ずしも全ての食材を使う必要はありません。`}],
    temperature: 1, // 生成された文の多様性をコントロールするための係数。0から1までを指定します。0に近いほど、より既存の文章に似た文になります。
    max_tokens: 60, // 生成する応答の最大単語数。この場合は60単語。
    n: 1, // 生成する文の数。1に設定することで、1つの文だけを生成!
    stop: '\n' // 生成されたテキストの終わりを示すトークン。例えば、改行文字などを指定することが出来る
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
