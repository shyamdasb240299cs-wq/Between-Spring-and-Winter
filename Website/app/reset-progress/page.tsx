import {notFound} from 'next/navigation';
import ProgressReset from './progress-reset';

/** Local playtest utility; never exposed by a production build. */
export default function ResetProgressPage(){
  if(process.env.NODE_ENV!=='development')notFound();
  return <ProgressReset/>;
}
