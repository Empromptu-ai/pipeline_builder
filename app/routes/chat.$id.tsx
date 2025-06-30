import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { default as IndexRoute } from './_index';

import { requireUserSession, type UserSession } from '~/utils/session.server';

// export async function loader(args: LoaderFunctionArgs) {
//   return json({ id: args.params.id });
// }

export async function loader(args: LoaderFunctionArgs) {
  const userSession = await requireUserSession(args.request);
  
  return json({ 
    id: args.params.id,
    user: userSession,
  });
}

export default IndexRoute;
