import type { AppLoadContext, EntryContext } from '@remix-run/cloudflare';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';
import { themeStore } from '~/lib/stores/theme';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  const readable = await renderToReadableStream(<RemixServer context={remixContext} url={request.url} />, {
    signal: request.signal,
    onError(error: unknown) {
      console.error(error);
      responseStatusCode = 500;
    },
  });

  const body = new ReadableStream({
    start(controller) {
      const head = renderHeadToString({ request, remixContext, Head });

      controller.enqueue(
        new Uint8Array(
          new TextEncoder().encode(
            `<!DOCTYPE html><html lang="en" data-theme="${themeStore.value}"><head>${head}</head><body><div id="root" class="w-full h-full">`,
          ),
        ),
      );

      const reader = readable.getReader();

      function read() {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              controller.enqueue(new Uint8Array(new TextEncoder().encode(`</div></body></html>`)));
              controller.close();

              return;
            }

            controller.enqueue(value);
            read();
          })
          .catch((error) => {
            controller.error(error);
            readable.cancel();
          });
      }
      read();
    },

    cancel() {
      readable.cancel();
    },
  });

  if (isbot(request.headers.get('user-agent') || '')) {
    await readable.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');

  // responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
  responseHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
 
  responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
  responseHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
  // responseHeaders.set('Cross-Origin-Resource-Policy', 'credentialless');

  // responseHeaders.set('Cross-Origin-Opener-Policy', 'unsafe-none');

  // original
  let csp = "default-src 'self'; ";
  csp += "frame-src 'self' https://analytics.impromptu-labs.com https://example.com https://analytics.empromptu.ai https:; ";
  csp += "script-src 'self' 'unsafe-inline' 'unsafe-eval'; ";
  csp += "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ";
  csp += "img-src 'self' data: https:; ";
  csp += "connect-src 'self' https: wss: ws:; ";
  csp += "font-src 'self' data: https://fonts.gstatic.com;";


  // Super permissive CSP
  // let csp = "default-src *; ";
  // csp += "frame-src *; ";
  // csp += "script-src * 'unsafe-inline' 'unsafe-eval'; ";
  // csp += "style-src * 'unsafe-inline'; ";
  // csp += "img-src * data: blob:; ";
  // csp += "connect-src *; ";
  // csp += "font-src *; ";
  // csp += "object-src *; ";
  // csp += "media-src *; ";


  // More permissive CSP that should work with credentialless COEP
  // let csp = "default-src 'self' https: data: blob:; ";
  // csp += "frame-src 'self' https: data: blob:; ";
  // csp += "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; ";
  // csp += "style-src 'self' 'unsafe-inline' https: data: blob:; ";
  // csp += "img-src 'self' https: data: blob:; ";
  // csp += "connect-src 'self' https: wss: ws: data: blob:; ";
  // csp += "font-src 'self' https: data: blob:; ";
  // csp += "object-src 'none'; ";
  // csp += "media-src 'self' https: data: blob:; ";

  responseHeaders.set('Content-Security-Policy', csp);
  // responseHeaders.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  // responseHeaders.set('Cross-Origin-Opener-Policy', 'unsafe-none');

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
