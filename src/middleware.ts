import { defineMiddleware } from 'astro:middleware';
import { auth } from '@/lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith('/api/admin')) {
    const session = await auth.api.getSession({ headers: context.request.headers });
    if (session?.user.role !== 'admin') {
      return new Response('Unauthorized', { status: 403 });
    }

    if (session) {
      context.locals.user = session.user;
      context.locals.session = session.session;
    } else {
      context.locals.user = null;
      context.locals.session = null;
    }
  }
  return next();
});
