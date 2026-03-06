import { defineMiddleware } from 'astro:middleware';
import { auth } from '@/lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
context.locals.user = null;
  context.locals.session = null;

  const session = await auth.api.getSession({ headers: context.request.headers });

  if (session) {
    context.locals.user = session.user;
    context.locals.session = session.session;
  }

  if (context.url.pathname.startsWith('/api/admin')) {
    if (context.locals.user?.role !== 'admin') {
      return new Response('Unauthorized', { status: 403 });
    }
  }

  return next();
});
