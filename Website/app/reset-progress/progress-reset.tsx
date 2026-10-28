'use client';

import {useState} from 'react';

const backupKey='between-progress-reset-backup-v1';
const progressKey=/^(?:between-spring-fresh-trail-v\d+|between-seasons-(?:summer-v\d+|relic-(?:spring|summer|autumn|winter)-v\d+|reader-(?:spring|summer|autumn|winter)-v\d+|part-one-v\d+))$/;

export default function ProgressReset(){
  const [message,setMessage]=useState('Reset quests, inventory and reading positions in this local browser.');
  function reset(){
    try{
      const entries=Object.entries(localStorage).filter(([key])=>progressKey.test(key));
      if(entries.length){
        // Store the recovery copy successfully before removing any progress.
        localStorage.setItem(backupKey,JSON.stringify({savedAt:new Date().toISOString(),entries}));
        entries.forEach(([key])=>localStorage.removeItem(key));
      }
      setMessage('Progress reset to zero. Open the beginning to start a fresh playthrough.');
    }catch{setMessage('Progress could not be reset. Browser storage is unavailable.');}
  }
  function restore(){
    try{
      const backup=JSON.parse(localStorage.getItem(backupKey)??'null');
      if(!Array.isArray(backup?.entries)){setMessage('No recovery copy is available.');return;}
      const entries=backup.entries.filter((entry:unknown):entry is [string,string]=>Array.isArray(entry)&&entry.length===2&&typeof entry[0]==='string'&&typeof entry[1]==='string'&&progressKey.test(entry[0]));
      entries.forEach(([key,value]:[string,string])=>localStorage.setItem(key,value));
      setMessage('Previous progress restored. Open the beginning to load it.');
    }catch{setMessage('The recovery copy could not be restored.');}
  }
  return <main style={{minHeight:'100svh',display:'grid',placeItems:'center',padding:24,background:'#17241e',color:'#eee8d5'}}>
    <section style={{maxWidth:500,fontFamily:'Georgia,serif',lineHeight:1.7}}>
      <p>Local playtest</p><h1>Start again</h1>
      <p role="status">{message}</p>
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <button onClick={reset}>Reset progress to zero</button>
        <button onClick={restore}>Restore previous progress</button>
        <a href="/" style={{color:'#eee8d5'}}>Open the beginning</a>
      </div>
      <p style={{fontSize:13}}>A recovery copy stays in this browser. This tool is available only in the local development server.</p>
    </section>
  </main>;
}
