import React, { useMemo, useRef, useState } from 'react';
import { Theme, Card, Lbl, Btn, FONT } from './ui';
import { ProgressPhoto, ProgressPhotoPose } from './types';
import { useStore } from './useStore';

const POSES: ProgressPhotoPose[] = ['front','side','back'];

function compressImage(file: File, maxSide = 1100, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas unavailable')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const out = canvas.toDataURL('image/jpeg', quality);
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be read')); };
    img.src = url;
  });
}

export const ProgressPhotosView: React.FC<{t: Theme; store: ReturnType<typeof useStore>; onBack:()=>void}> = ({t, store, onBack}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pose, setPose] = useState<ProgressPhotoPose>('front');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');
  const photos = store.data.progressPhotos ?? [];

  const dates = useMemo(() => Array.from(new Set(photos.map(p=>p.date))).sort((a,b)=>b.localeCompare(a)), [photos]);
  const aPhotos = compareA ? photos.filter(p=>p.date===compareA) : [];
  const bPhotos = compareB ? photos.filter(p=>p.date===compareB) : [];

  const chooseFile = () => inputRef.current?.click();
  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const imageData = await compressImage(file);
      const today = new Date().toISOString().split('T')[0];
      const item: ProgressPhoto = { id:`photo_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, date:today, trainingDay:store.training.calendarDay, pose, imageData, note:note.trim() || undefined, createdAt:new Date().toISOString() };
      store.addProgressPhoto(item);
      setNote('');
    } catch (e) { console.error(e); alert('Could not save that image. Try another photo.'); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value=''; }
  };

  const latestDate = dates[0];
  return <ScrLike t={t}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}><Btn t={t} variant='ghost' onClick={onBack}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>PROGRESS PHOTOS</div></div>
    <div style={{fontSize:11,color:t.txt2,lineHeight:1.55,marginBottom:14}}>Mirror-based visual tracking. Keep lighting, camera position, distance, pose and clothing as consistent as practical.</div>

    <Lbl t={t} color={t.blue}>ADD TODAY'S PHOTO</Lbl>
    <Card t={t} style={{padding:'12px 14px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>{POSES.map(p=><button key={p} onClick={()=>setPose(p)} style={{padding:'9px 4px',borderRadius:8,border:`1px solid ${pose===p?t.blue:t.border}`,background:pose===p?t.blueGlow:t.surface,color:pose===p?t.blue:t.txt2,fontFamily:FONT,fontSize:10,fontWeight:700,textTransform:'uppercase'}}>{p}</button>)}</div>
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder='Optional note...' rows={2} style={{width:'100%',resize:'none',boxSizing:'border-box',background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,color:t.txt,padding:8,fontFamily:FONT,fontSize:10,marginBottom:8}}/>
      <input ref={inputRef} type='file' accept='image/*' capture='environment' onChange={e=>handleFile(e.target.files?.[0])} style={{display:'none'}}/>
      <Btn t={t} onClick={chooseFile} disabled={busy}>{busy?'SAVING PHOTO...':'TAKE / CHOOSE PHOTO'}</Btn>
    </Card>

    {latestDate && <>
      <Lbl t={t} color={t.blue}>PHOTO TIMELINE</Lbl>
      {dates.map(d=><Card key={d} t={t} style={{padding:'10px 12px',marginBottom:8}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div><div style={{fontWeight:800,fontSize:12}}>{d}</div><div style={{fontSize:9,color:t.txt3}}>Day {Math.max(...photos.filter(p=>p.date===d).map(p=>p.trainingDay))}</div></div><div style={{fontSize:9,color:t.txt2}}>{photos.filter(p=>p.date===d).length} pose{photos.filter(p=>p.date===d).length===1?'':'s'}</div></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>{POSES.map(p=>{const ph=photos.find(x=>x.date===d&&x.pose===p);return <div key={p} style={{aspectRatio:'3/4',background:t.surface2,borderRadius:7,overflow:'hidden',position:'relative'}}>{ph?<><img src={ph.imageData} alt={`${p} progress`} style={{width:'100%',height:'100%',objectFit:'cover'}}/><button onClick={()=>store.deleteProgressPhoto(ph.id)} style={{position:'absolute',right:4,top:4,border:0,borderRadius:5,background:'rgba(0,0,0,.65)',color:'#fff',fontSize:9,padding:'3px 5px'}}>×</button></>:<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:t.txt3,textTransform:'uppercase'}}>{p}</div>}</div>})}</div>
      </Card>)}
    </>}

    {dates.length>=2 && <>
      <Lbl t={t} color={t.blue}>COMPARE</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:10}}>{[[compareA,setCompareA,'EARLIER'],[compareB,setCompareB,'LATER']].map(([v,set,label]:any)=><div key={label}><div style={{fontSize:8,color:t.txt3,marginBottom:4}}>{label}</div><select value={v} onChange={e=>set(e.target.value)} style={{width:'100%',background:t.surface2,border:`1px solid ${t.border}`,borderRadius:7,color:t.txt,padding:7,fontFamily:FONT,fontSize:9}}><option value=''>Select date</option>{dates.map(d=><option key={d} value={d}>{d}</option>)}</select></div>)}</div>
        {compareA && compareB && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{[[compareA,aPhotos],[compareB,bPhotos]].map(([d,ps]:any)=><div key={d}><div style={{fontSize:9,color:t.txt2,marginBottom:5}}>{d}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:3}}>{POSES.map(p=>{const ph=ps.find((x:ProgressPhoto)=>x.pose===p);return ph?<img key={p} src={ph.imageData} alt={p} style={{width:'100%',aspectRatio:'3/4',objectFit:'cover',borderRadius:5}}/>:<div key={p} style={{aspectRatio:'3/4',background:t.surface2,borderRadius:5}}/>})}</div></div>)}</div>}
      </Card>
    </>}
  </ScrLike>;
};

const ScrLike: React.FC<{t:Theme;children:React.ReactNode}> = ({t,children}) => <div style={{maxWidth:620,margin:'0 auto',padding:'24px 16px 50px',color:t.txt,fontFamily:FONT}}>{children}</div>;
