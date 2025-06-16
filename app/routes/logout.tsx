// app/routes/logout.tsx
import { type ActionFunctionArgs } from '@remix-run/node';
import { logout } from '~/utils/session.server';

export async function action({ request }: ActionFunctionArgs) {
  return logout(request);
}

// Redirect GET requests to home
export async function loader() {
  return new Response(null, {
    status: 302,
    headers: { Location: '/' },
  });
}
