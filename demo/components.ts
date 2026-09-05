import React, { useState, useEffect, useRef } from 'react';
import { SmartLanguageSession } from './SmartLanguageSession';

export default function MultimodalAIDemo() {
  const [session, setSession] = useState<SmartLanguageSession | null>(null);
  const [output, setOutput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    async function initSession() {
      const activeSession = await SmartLanguageSession.create({
        systemPrompt: 'You are an intelligent multimodal assistant.',
        maxTokenBudget: 3000,
        onContextOverflow: () => alert('Native Context Limit Exceeded! Evicting turns.'),
      });
      setSession(activeSession);
    }
    initSession();
  }, []);

  // Quick canvas draw helper for visual testing
  const drawSampleCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.font = '20px sans-serif';
    ctx.fillText('Hybrid AI Test Canvas', 20, 50);
  };

  const handleRunMultimodal = async () => {
    if (!session || !canvasRef.current) return;
    setIsProcessing(true);
    setOutput('');

    drawSampleCanvas();

    try {
      const stream = session.promptStreaming([
        {
          role: 'user',
          content: [
            { type: 'text', value: 'Describe what you see in this drawn canvas image:' },
            { type: 'image', value: canvasRef.current },
          ],
        },
      ]);

      for await (const chunk of stream) {
        setOutput(chunk);
      }
    } catch (err: any) {
      setOutput(`Execution error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Multimodal Hybrid AI Architecture Demo</h2>
      <canvas ref={canvasRef} width={300} height={100} style={{ border: '1px solid #ccc', marginBottom: '12px' }} />
      <div>
        <button onClick={handleRunMultimodal} disabled={isProcessing || !session} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          {isProcessing ? 'Streaming Response...' : 'Run Multimodal Prompt'}
        </button>
      </div>
      <div style={{ marginTop: '20px', padding: '16px', background: '#f4f4f4', borderRadius: '8px', minHeight: '100px' }}>
        <strong>Output Stream:</strong>
        <p style={{ whitespace: 'pre-wrap' }}>{output || 'Click run to execute...'}</p>
      </div>
    </div>
  );
}
