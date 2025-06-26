// app/routes/logout.tsx
import { type ActionFunctionArgs, type LoaderFunctionArgs  } from '@remix-run/node';
import { logout } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  return logout(request);
}

export async function action({ request }: ActionFunctionArgs) {
  return logout(request);
}

// Redirect GET requests to home
// export async function loader() {
//  return new Response(null, {
//    status: 302,
//    headers: { Location: '/' },
//  });
//}

// This component should never render since we always redirect
export default function Logout() {
  return null;
}
