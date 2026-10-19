import {notFound} from 'next/navigation';
import VoidScene from '../shrine-void/void-scene';

/** Local asset QA surface. Production always returns 404. */
export default function WorldPreview(){
  if(process.env.NODE_ENV!=='development')notFound();
  return <VoidScene active paused={false} preview/>;
}
