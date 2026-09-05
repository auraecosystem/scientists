import { google } from '@ai-sdk/google';
import { streamText, CoreMessage } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array required', { status: 400 });
    }

    const systemMessage = messages.find((m: any) => m.role === 'system')?.content;

    const formattedMessages: CoreMessage[] = messages
      .filter((m: any) => m.role !== 'system')
      .map((msg: any) => {
        if (typeof msg.content === 'string') {
          return { role: msg.role, content: msg.content };
        }

        const parts = msg.content.map((part: any) => {
          if (part.type === 'text') return { type: 'text', text: part.value };
          if (part.type === 'image') {
            return {
              type: 'image',
              image: `data:${part.mimeType || 'image/png'};base64,${part.base64Data}`,
            };
          }
          if (part.type === 'audio') {
            return {
              type: 'file',
              mimeType: part.mimeType || 'audio/wav',
              data: part.base64Data,
            };
          }
          return { type: 'text', text: '' };
        });

        return { role: msg.role, content: parts };
      });

    const result = streamText({
      model: google('gemini-1.5-flash'),
      system: systemMessage,
      messages: formattedMessages,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
