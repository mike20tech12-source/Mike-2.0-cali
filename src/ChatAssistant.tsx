import React, { useState, useEffect, useRef } from 'react';
import { Theme, FONT } from './ui';
import { getOfflineResponse, SUGGESTED_QUESTIONS } from './chatbot';
import { AppData } from './types';

interface Message { id: string; role: 'user'|'assistant'; text: string; followUps?: string[]; }

function useSpeechRecognition(onResult: (text: string) => void) {
  const ref = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setSupported(true);
      const r = new SR();
      r.continuous = false; r.interimResults = false; r.lang = 'en-US';
      r.onresult = (e: any) => { onResult(e.results[0][0].transcript); setListening(false); };
      r.onerror = () => setListening(false);
      r.onend = () => setListening(false);
      ref.current = r;
    }
  }, []);
  return {
    listening, supported,
    start: () => { if (ref.current && !listening) { try { ref.current.start(); setListening(true); } catch {} } },
    stop: () => { if (ref.current) { try { ref.current.stop(); } catch {} setListening(false); } },
  };
}

export const ChatAssistant: React.FC<{ t: Theme; data: AppData; onClose: () => void }> = ({ t, data, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome', role: 'assistant',
    text: `Hey! You're on Day ${data.training.calendarDay} with a ${data.training.currentStreak}-day streak. Ask me anything — exercises, nutrition, recovery, or your stats.`,
    followUps: SUGGESTED_QUESTIONS.slice(0,4),
  }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { listening, supported, start, stop } = useSpeechRecognition(text => handleSend(text));

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, typing]);

  function handleSend(text: string) {
    const q = text.trim();
    if (!q) return;
    setMessages(prev => [...prev, { id:`u_${Date.now()}`, role:'user', text:q }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const res = getOfflineResponse(q, data);
      setMessages(prev => [...prev, { id:`a_${Date.now()}`, role:'assistant', text:res.answer, followUps:res.followUps }]);
      setTyping(false);
    }, 350);
  }

  return (
    <div style={{ position:'fixed', inset:0, background:t.bg, zIndex:2000, display:'flex', flexDirection:'column', fontFamily:FONT }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 16px 12px', borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
        <div><div style={{fontSize:9,color:t.txt2,letterSpacing:2,marginBottom:3}}>TRAINING ASSISTANT</div><div style={{fontSize:15,fontWeight:900}}>Ask Mike 2.0</div></div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}><div style={{fontSize:9,color:t.green,letterSpacing:1}}>● OFFLINE</div><button onClick={onClose} style={{background:'transparent',border:'none',color:t.txt2,fontSize:20,cursor:'pointer'}}>✕</button></div>
      </div>

      <div style={{ display:'flex', gap:8, padding:'8px 16px', borderBottom:`1px solid ${t.border}`, background:t.surface, flexShrink:0, overflowX:'auto' }}>
        {[[`Day ${data.training.calendarDay}`,t.blue],[`${data.training.currentStreak} streak`,t.gold],[`Score ${data.transformation?.overallScore ?? 0}`,t.green],[`Fatigue ${data.adaptation?.fatigueLevel ?? 0}/10`, (data.adaptation?.fatigueLevel ?? 0)>=7?t.red:t.txt2]].map(([label,color]) => (
          <div key={label as string} style={{fontSize:9,color:color as string,background:t.surface2,borderRadius:6,padding:'3px 8px',letterSpacing:1,fontWeight:700,whiteSpace:'nowrap'}}>{label}</div>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display:'flex', flexDirection:'column', alignItems:msg.role==='user'?'flex-end':'flex-start', gap:6 }}>
            <div style={{ maxWidth:'85%', background:msg.role==='user'?t.blue:t.surface, color:msg.role==='user'?'#fff':t.txt, border:msg.role==='user'?'none':`1px solid ${t.border}`, borderRadius:msg.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px', padding:'10px 14px', fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap' }}>
              {msg.text.split(/\*\*(.*?)\*\*/g).map((part,i) => i%2===1 ? <strong key={i} style={{color:msg.role==='user'?'#fff':t.blue}}>{part}</strong> : <span key={i}>{part}</span>)}
            </div>
            {msg.followUps && msg.followUps.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:4, maxWidth:'90%' }}>
                {msg.followUps.map(q => <button key={q} onClick={()=>handleSend(q)} style={{background:'transparent',border:`1px solid ${t.blue}44`,borderRadius:10,color:t.blue,fontSize:11,padding:'6px 12px',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>{q} →</button>)}
              </div>
            )}
          </div>
        ))}
        {typing && <div style={{ display:'flex', gap:6, padding:'10px 14px', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'14px 14px 14px 4px', alignSelf:'flex-start' }}>{[0,1,2].map(i => <div key={i} style={{width:6,height:6,borderRadius:3,background:t.blue,opacity:0.5}}/>)}</div>}
        <div ref={bottomRef}/>
      </div>

      <div style={{ padding:'12px 16px', borderTop:`1px solid ${t.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {supported && <button onTouchStart={start} onTouchEnd={stop} onMouseDown={start} onMouseUp={stop} style={{width:44,height:44,borderRadius:22,flexShrink:0,background:listening?t.red:t.surface,border:`1px solid ${listening?t.red:t.border}`,color:listening?'#fff':t.txt2,fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{listening?'🔴':'🎤'}</button>}
          <input style={{ flex:1, background:t.surface, border:`1px solid ${t.border}`, borderRadius:22, color:t.txt, fontSize:13, padding:'10px 16px', fontFamily:'inherit', outline:'none' }} placeholder={listening?'Listening...':'Ask anything...'} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend(input)}/>
          <button onClick={()=>handleSend(input)} disabled={!input.trim()} style={{width:44,height:44,borderRadius:22,flexShrink:0,background:input.trim()?t.blue:t.surface,border:`1px solid ${input.trim()?t.blue:t.border}`,color:input.trim()?'#fff':t.txt2,fontSize:16,cursor:input.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center'}}>→</button>
        </div>
      </div>
    </div>
  );
};

export const FloatingChatBtn: React.FC<{ t: Theme; onClick: () => void; visible: boolean }> = ({ t, onClick, visible }) => {
  if (!visible) return null;
  return (
    <button onClick={onClick} style={{ position:'fixed', bottom:24, right:20, width:52, height:52, borderRadius:26, background:`linear-gradient(135deg,${t.blue},${t.blueDk})`, border:'none', boxShadow:`0 4px 20px ${t.blue}55`, cursor:'pointer', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>🤖</button>
  );
};
